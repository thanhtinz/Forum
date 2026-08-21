import type { EmulatorProfile, SessionStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { signedFileUrl } from '@/lib/game-files';
import { addPlaySeconds, recordGameEvent } from '@/lib/game-stats';

/**
 * Quản lý vòng đời phiên emulator (Session Manager).
 *
 * Web app không chạy emulator trong process của mình: nó chỉ tạo/đóng phiên,
 * cấp signed URL cho JAR/JAD và theo dõi heartbeat. Runtime J2ME chạy trong
 * iframe sandbox (worker riêng) và trao đổi với trang bằng postMessage.
 */

// ── Hạn mức toàn hệ thống (Resource Control) ──────────────

/** Số phiên đồng thời tối đa của toàn cụm trước khi phải xếp hàng. */
export const CLUSTER_MAX_SESSIONS = Number(process.env.EMU_CLUSTER_MAX ?? 200);
/** Số phiên đồng thời tối đa cho một người dùng / một khách. */
export const USER_MAX_SESSIONS = Number(process.env.EMU_USER_MAX ?? 2);
/** Số lỗi runtime trong 5 phút gần nhất để mở circuit breaker. */
export const BREAKER_ERROR_THRESHOLD = Number(process.env.EMU_BREAKER_ERRORS ?? 25);

/** Các trạng thái được coi là "phiên còn sống". */
export const LIVE_STATUSES: SessionStatus[] = ['CREATED', 'QUEUED', 'LOADING', 'RUNNING', 'PAUSED', 'RECONNECTING'];

export type PlayError =
  | 'GAME_NOT_FOUND'
  | 'PLAY_DISABLED'
  | 'VERSION_NOT_PLAYABLE'
  | 'NO_PROFILE'
  | 'NO_JAR'
  | 'FILE_QUARANTINED'
  | 'USER_LIMIT'
  | 'BREAKER_OPEN'
  | 'RATE_LIMITED';

export class PlayDenied extends Error {
  constructor(readonly code: PlayError, message: string) {
    super(message);
    this.name = 'PlayDenied';
  }
}

export const PLAY_ERROR_MESSAGE: Record<PlayError, string> = {
  GAME_NOT_FOUND: 'Không tìm thấy game.',
  PLAY_DISABLED: 'Game này chưa bật Play Online.',
  VERSION_NOT_PLAYABLE: 'Phiên bản đã chọn chỉ hỗ trợ tải về, không chơi online được.',
  NO_PROFILE: 'Chưa có emulator profile tương thích cho game này.',
  NO_JAR: 'Phiên bản này thiếu file JAR nên không khởi động được.',
  FILE_QUARANTINED: 'File game đang bị cách ly do nghi ngờ an toàn.',
  USER_LIMIT: 'Bạn đã đạt giới hạn số phiên chơi đồng thời.',
  BREAKER_OPEN: 'Hệ thống emulator đang quá tải, vui lòng thử lại sau ít phút.',
  RATE_LIMITED: 'Bạn mở phiên chơi quá nhanh, hãy chờ một chút.',
};

// ── Dọn dẹp phiên rác ─────────────────────────────────────

/**
 * Đóng các phiên quá hạn hoặc mất heartbeat quá lâu.
 * Gọi trước mỗi lần tạo phiên mới nên không cần cron riêng cho luồng cơ bản.
 */
export async function reapStaleSessions(): Promise<number> {
  const now = new Date();
  const expired = await db.emulatorSession.updateMany({
    where: { status: { in: LIVE_STATUSES }, expiresAt: { lte: now } },
    data: { status: 'EXPIRED', endedAt: now },
  });

  // Mất heartbeat quá idleTimeout + gracePeriod → coi như rác.
  const stale = await db.emulatorSession.findMany({
    where: { status: { in: LIVE_STATUSES }, lastHeartbeatAt: { not: null } },
    select: { id: true, lastHeartbeatAt: true, profile: { select: { idleTimeoutSec: true, gracePeriodSec: true } } },
    take: 500,
  });
  const dead = stale
    .filter((s) => {
      const limit = (s.profile.idleTimeoutSec + s.profile.gracePeriodSec) * 1000;
      return s.lastHeartbeatAt != null && now.getTime() - s.lastHeartbeatAt.getTime() > limit;
    })
    .map((s) => s.id);
  if (dead.length) {
    await db.emulatorSession.updateMany({
      where: { id: { in: dead } },
      data: { status: 'CLOSED', endedAt: now },
    });
  }

  // Phiên tạo ra nhưng không bao giờ bắt đầu (người dùng đóng tab ngay).
  await db.emulatorSession.updateMany({
    where: {
      status: { in: ['CREATED', 'QUEUED', 'LOADING'] },
      lastHeartbeatAt: null,
      createdAt: { lte: new Date(now.getTime() - 120_000) },
    },
    data: { status: 'CLOSED', endedAt: now },
  });

  return expired.count + dead.length;
}

/** Circuit breaker: quá nhiều lỗi runtime gần đây thì tạm ngừng nhận phiên mới. */
export async function breakerOpen(): Promise<boolean> {
  const errors = await db.emulatorSession.count({
    where: { status: 'ERROR', endedAt: { gte: new Date(Date.now() - 300_000) } },
  });
  return errors >= BREAKER_ERROR_THRESHOLD;
}

// ── Chọn emulator profile ─────────────────────────────────

/**
 * Chọn profile chạy cho một version: ưu tiên ma trận tương thích ở mức version,
 * rồi mức game, cuối cùng là profile mặc định của game.
 */
export async function resolveProfile(gameId: string, versionId: string): Promise<EmulatorProfile | null> {
  const matrix = await db.gameEmulatorProfile.findMany({
    where: { gameId, OR: [{ versionId }, { versionId: null }], support: { in: ['FULL', 'BETA'] } },
    include: { profile: true },
    orderBy: [{ support: 'asc' }],
  });
  const forVersion = matrix.find((m) => m.versionId === versionId && m.profile.active);
  if (forVersion) return forVersion.profile;
  const forGame = matrix.find((m) => m.versionId === null && m.profile.active);
  if (forGame) return forGame.profile;

  const game = await db.game.findUnique({ where: { id: gameId }, include: { emulatorProfile: true } });
  return game?.emulatorProfile?.active ? game.emulatorProfile : null;
}

// ── Tạo phiên ─────────────────────────────────────────────

export interface CreateSessionInput {
  gameSlugOrId: string;
  versionId?: string | null;
  profileId?: string | null;
  userId?: string | null;
  guestKey?: string | null;
  actorKey: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface CreateSessionResult {
  sessionId: string;
  status: SessionStatus;
  queuePosition: number | null;
  expiresAt: Date;
  heartbeatSec: number;
  profile: {
    id: string;
    slug: string;
    name: string;
    screenWidth: number;
    screenHeight: number;
    orientation: string;
    cldc: string;
    midp: string;
    keyLayout: string;
    softKeys: boolean;
    audio: boolean;
    rms: boolean;
    saveState: boolean;
    keymap: Record<string, string> | null;
    runtimeUrl: string | null;
    sessionMaxSec: number;
    idleTimeoutSec: number;
  };
  game: { id: string; slug: string; title: string };
  version: { id: string; version: string };
  /** Signed URL có hạn để runtime nạp JAR/JAD. */
  jarUrl: string;
  jadUrl: string | null;
  checksum: string | null;
}

/** Nhịp heartbeat client gửi lên (giây) — nhỏ hơn idle timeout nhiều lần. */
export const HEARTBEAT_SEC = 20;

export async function createEmulatorSession(input: CreateSessionInput): Promise<CreateSessionResult> {
  await reapStaleSessions();

  if (await breakerOpen()) throw new PlayDenied('BREAKER_OPEN', PLAY_ERROR_MESSAGE.BREAKER_OPEN);

  const game = await db.game.findFirst({
    where: { OR: [{ id: input.gameSlugOrId }, { slug: input.gameSlugOrId }], status: 'PUBLISHED' },
    select: { id: true, slug: true, title: true, playOnline: true },
  });
  if (!game) throw new PlayDenied('GAME_NOT_FOUND', PLAY_ERROR_MESSAGE.GAME_NOT_FOUND);
  if (!game.playOnline) throw new PlayDenied('PLAY_DISABLED', PLAY_ERROR_MESSAGE.PLAY_DISABLED);

  const version = input.versionId
    ? await db.gameVersion.findFirst({ where: { id: input.versionId, gameId: game.id }, include: { files: true } })
    : await db.gameVersion.findFirst({
        where: { gameId: game.id, playOnline: true },
        orderBy: [{ latest: 'desc' }, { releaseDate: 'desc' }],
        include: { files: true },
      });
  if (!version) throw new PlayDenied('VERSION_NOT_PLAYABLE', PLAY_ERROR_MESSAGE.VERSION_NOT_PLAYABLE);
  if (!version.playOnline) throw new PlayDenied('VERSION_NOT_PLAYABLE', PLAY_ERROR_MESSAGE.VERSION_NOT_PLAYABLE);

  const jar = version.files.find((f) => f.type === 'JAR');
  if (!jar) throw new PlayDenied('NO_JAR', PLAY_ERROR_MESSAGE.NO_JAR);
  if (jar.scanStatus === 'QUARANTINED') throw new PlayDenied('FILE_QUARANTINED', PLAY_ERROR_MESSAGE.FILE_QUARANTINED);
  const jad = version.files.find((f) => f.type === 'JAD');

  const profile = input.profileId
    ? await db.emulatorProfile.findFirst({ where: { id: input.profileId, active: true } })
    : await resolveProfile(game.id, version.id);
  if (!profile) throw new PlayDenied('NO_PROFILE', PLAY_ERROR_MESSAGE.NO_PROFILE);

  // Giới hạn phiên đồng thời theo người dùng / khách.
  const ownerWhere = input.userId ? { userId: input.userId } : { guestKey: input.guestKey ?? '—' };
  const mine = await db.emulatorSession.count({ where: { ...ownerWhere, status: { in: LIVE_STATUSES } } });
  if (mine >= USER_MAX_SESSIONS) throw new PlayDenied('USER_LIMIT', PLAY_ERROR_MESSAGE.USER_LIMIT);

  // Quá tải cụm → xếp hàng thay vì từ chối.
  const live = await db.emulatorSession.count({ where: { status: { in: LIVE_STATUSES } } });
  const queued = live >= CLUSTER_MAX_SESSIONS;
  const queuePosition = queued ? live - CLUSTER_MAX_SESSIONS + 1 : null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + profile.sessionMaxSec * 1000);

  const session = await db.emulatorSession.create({
    data: {
      userId: input.userId ?? null,
      guestKey: input.userId ? null : input.guestKey ?? null,
      gameId: game.id,
      gameVersionId: version.id,
      profileId: profile.id,
      status: queued ? 'QUEUED' : 'CREATED',
      queuePosition,
      runtimeUrl: profile.runtimeUrl,
      expiresAt,
      ip: input.ip ?? null,
      userAgent: input.userAgent?.slice(0, 512) ?? null,
    },
  });

  await recordGameEvent({
    gameId: game.id,
    versionId: version.id,
    userId: input.userId ?? null,
    sessionId: session.id,
    actorKey: input.actorKey,
    type: 'PLAY_START',
    meta: { profile: profile.slug, queued },
  });

  return {
    sessionId: session.id,
    status: session.status,
    queuePosition,
    expiresAt,
    heartbeatSec: HEARTBEAT_SEC,
    profile: {
      id: profile.id,
      slug: profile.slug,
      name: profile.name,
      screenWidth: profile.screenWidth,
      screenHeight: profile.screenHeight,
      orientation: profile.orientation,
      cldc: profile.cldc,
      midp: profile.midp,
      keyLayout: profile.keyLayout,
      softKeys: profile.softKeys,
      audio: profile.audio,
      rms: profile.rms,
      saveState: profile.saveState,
      keymap: (profile.keymap as Record<string, string> | null) ?? null,
      runtimeUrl: profile.runtimeUrl,
      sessionMaxSec: profile.sessionMaxSec,
      idleTimeoutSec: profile.idleTimeoutSec,
    },
    game: { id: game.id, slug: game.slug, title: game.title },
    version: { id: version.id, version: version.version },
    jarUrl: signedFileUrl(jar.storageKey, input.actorKey, Math.min(profile.sessionMaxSec, 3600)),
    jadUrl: jad ? signedFileUrl(jad.storageKey, input.actorKey, Math.min(profile.sessionMaxSec, 3600)) : null,
    checksum: jar.checksum,
  };
}

// ── Heartbeat / trạng thái / đóng ─────────────────────────

export interface HeartbeatResult {
  status: SessionStatus;
  remainingSec: number;
  playedSec: number;
  queuePosition: number | null;
}

/** Trạng thái client được phép tự báo lên. */
const CLIENT_REPORTABLE: SessionStatus[] = ['LOADING', 'RUNNING', 'PAUSED', 'RECONNECTING', 'ERROR'];

export async function heartbeat(
  sessionId: string,
  owner: { userId?: string | null; guestKey?: string | null },
  report?: { status?: SessionStatus; error?: string },
): Promise<HeartbeatResult | null> {
  const session = await db.emulatorSession.findUnique({
    where: { id: sessionId },
    include: { profile: { select: { idleTimeoutSec: true, sessionMaxSec: true } } },
  });
  if (!session || !ownsSession(session, owner)) return null;

  const now = new Date();
  if (!LIVE_STATUSES.includes(session.status)) {
    return { status: session.status, remainingSec: 0, playedSec: session.playedSec, queuePosition: null };
  }
  if (session.expiresAt <= now) {
    await db.emulatorSession.update({
      where: { id: session.id },
      data: { status: 'EXPIRED', endedAt: now, durationSec: secondsBetween(session.createdAt, now) },
    });
    await finalizePlay(session.gameId, session.playedSec);
    return { status: 'EXPIRED', remainingSec: 0, playedSec: session.playedSec, queuePosition: null };
  }

  // Thời gian chơi chỉ cộng khi phiên đang RUNNING và heartbeat còn liên tục.
  const last = session.lastHeartbeatAt ?? session.startedAt ?? session.createdAt;
  const gap = secondsBetween(last, now);
  const counted = session.status === 'RUNNING' && gap <= HEARTBEAT_SEC * 3 ? gap : 0;

  let next: SessionStatus = session.status;
  if (report?.status && CLIENT_REPORTABLE.includes(report.status)) next = report.status;
  else if (session.status === 'CREATED' || session.status === 'RECONNECTING') next = 'RUNNING';
  else if (session.status === 'QUEUED') {
    // Có chỗ trống thì rời hàng đợi.
    const live = await db.emulatorSession.count({
      where: { status: { in: ['CREATED', 'LOADING', 'RUNNING', 'PAUSED', 'RECONNECTING'] } },
    });
    if (live < CLUSTER_MAX_SESSIONS) next = 'LOADING';
  }

  const updated = await db.emulatorSession.update({
    where: { id: session.id },
    data: {
      status: next,
      lastHeartbeatAt: now,
      startedAt: session.startedAt ?? (next === 'RUNNING' ? now : undefined),
      pausedAt: next === 'PAUSED' ? now : null,
      playedSec: { increment: counted },
      durationSec: secondsBetween(session.createdAt, now),
      error: report?.error?.slice(0, 500) ?? session.error,
      endedAt: next === 'ERROR' ? now : null,
      queuePosition: next === 'QUEUED' ? session.queuePosition : null,
    },
  });

  if (next === 'ERROR') {
    await recordGameEvent({
      gameId: session.gameId,
      versionId: session.gameVersionId,
      userId: session.userId,
      sessionId: session.id,
      actorKey: session.userId ? `u:${session.userId}` : `g:${session.guestKey ?? 'unknown'}`,
      type: 'PLAY_ERROR',
      meta: { error: report?.error ?? 'unknown' },
    });
  }

  return {
    status: updated.status,
    remainingSec: Math.max(0, secondsBetween(now, updated.expiresAt)),
    playedSec: updated.playedSec,
    queuePosition: updated.queuePosition,
  };
}

export async function closeSession(
  sessionId: string,
  owner: { userId?: string | null; guestKey?: string | null },
): Promise<{ status: SessionStatus; playedSec: number } | null> {
  const session = await db.emulatorSession.findUnique({ where: { id: sessionId } });
  if (!session || !ownsSession(session, owner)) return null;
  if (!LIVE_STATUSES.includes(session.status)) {
    return { status: session.status, playedSec: session.playedSec };
  }

  const now = new Date();
  const updated = await db.emulatorSession.update({
    where: { id: session.id },
    data: { status: 'CLOSED', endedAt: now, durationSec: secondsBetween(session.createdAt, now) },
  });

  await finalizePlay(session.gameId, updated.playedSec);
  await recordGameEvent({
    gameId: session.gameId,
    versionId: session.gameVersionId,
    userId: session.userId,
    sessionId: session.id,
    actorKey: session.userId ? `u:${session.userId}` : `g:${session.guestKey ?? 'unknown'}`,
    type: 'PLAY_END',
    value: updated.playedSec,
  });

  return { status: updated.status, playedSec: updated.playedSec };
}

/** Admin buộc kết thúc một phiên. */
export async function terminateSession(sessionId: string, reason = 'Bị quản trị viên đóng'): Promise<void> {
  const now = new Date();
  await db.emulatorSession.updateMany({
    where: { id: sessionId, status: { in: LIVE_STATUSES } },
    data: { status: 'CLOSED', endedAt: now, error: reason },
  });
}

function ownsSession(
  session: { userId: string | null; guestKey: string | null },
  owner: { userId?: string | null; guestKey?: string | null },
): boolean {
  if (session.userId) return !!owner.userId && session.userId === owner.userId;
  return !!owner.guestKey && session.guestKey === owner.guestKey;
}

async function finalizePlay(gameId: string, playedSec: number): Promise<void> {
  await addPlaySeconds(gameId, playedSec);
}

function secondsBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 1000));
}

/** Thống kê cụm cho trang admin. */
export async function clusterStats() {
  const [live, running, queued, errors5m, byProfile] = await Promise.all([
    db.emulatorSession.count({ where: { status: { in: LIVE_STATUSES } } }),
    db.emulatorSession.count({ where: { status: 'RUNNING' } }),
    db.emulatorSession.count({ where: { status: 'QUEUED' } }),
    db.emulatorSession.count({ where: { status: 'ERROR', endedAt: { gte: new Date(Date.now() - 300_000) } } }),
    db.emulatorSession.groupBy({
      by: ['profileId'],
      where: { createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } },
      _count: { _all: true },
      orderBy: { _count: { profileId: 'desc' } },
      take: 10,
    }),
  ]);
  return {
    live,
    running,
    queued,
    errors5m,
    capacity: CLUSTER_MAX_SESSIONS,
    breakerOpen: errors5m >= BREAKER_ERROR_THRESHOLD,
    byProfile,
  };
}
