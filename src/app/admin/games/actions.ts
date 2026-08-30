'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { DownloadPlatform, GameFileType } from '@prisma/client';
import { assertSuperAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { DOWNLOAD_PLATFORMS, fileTypeFitsPlatform } from '@/lib/game';
import { recomputeTrending } from '@/lib/game-stats';
import { GAME_PRICE_MAX } from '@/lib/game-unlock';

export interface ActionState { ok?: boolean; error?: string }

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === 'string' && v.trim() ? v.trim() : null;
};
const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
const int = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};
const big = (fd: FormData, k: string) => {
  const n = int(fd, k);
  return n == null ? null : BigInt(n);
};

const gameSchema = z.object({
  title: z.string().min(1, 'Thiếu tên game').max(200),
  slug: z.string().max(80).optional(),
});

// ── Game ──────────────────────────────────────────────────

/** Tạo game mới rồi mở luôn trang sửa chi tiết. */
export async function createGame(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertSuperAdmin();

  const parsed = gameSchema.safeParse({ title: str(fd, 'title') ?? '', slug: str(fd, 'slug') ?? undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };

  const slug = slugify(parsed.data.slug || parsed.data.title);
  if (!slug) return { error: 'Slug không hợp lệ.' };
  if (await db.game.findUnique({ where: { slug }, select: { id: true } })) {
    return { error: 'Slug đã tồn tại.' };
  }

  const game = await db.game.create({
    data: { slug, title: parsed.data.title, titleVi: str(fd, 'titleVi') },
  });
  revalidatePath('/admin/games');
  redirect(`/admin/games/${game.id}`);
}

/** Cập nhật thông tin chính của game (kể cả phân loại). */
export async function updateGame(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertSuperAdmin();
  const id = str(fd, 'id');
  if (!id) return { error: 'Thiếu id game.' };

  const title = str(fd, 'title');
  if (!title) return { error: 'Thiếu tên game.' };

  const slug = slugify(str(fd, 'slug') ?? title);
  const clash = await db.game.findFirst({ where: { slug, NOT: { id } }, select: { id: true } });
  if (clash) return { error: 'Slug đã được game khác dùng.' };

  const current = await db.game.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!current) return { error: 'Không tìm thấy game.' };

  const status = str(fd, 'status') ?? 'DRAFT';
  const controlsRaw = str(fd, 'controls');
  let controls: unknown = undefined;
  if (controlsRaw) {
    try {
      controls = JSON.parse(controlsRaw);
    } catch {
      return { error: 'Trường Controls phải là JSON hợp lệ, ví dụ [{"key":"5","action":"Bắn"}].' };
    }
  }

  const genreIds = fd.getAll('genres').map(String).filter(Boolean);
  const tagNames = (str(fd, 'tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 20);

  // Giá mở khoá phần tải. Bỏ trống hoặc 0 = tải tự do.
  const priceRaw = int(fd, 'pricePoints') ?? 0;
  if (priceRaw < 0 || priceRaw > GAME_PRICE_MAX) {
    return { error: `Giá điểm phải từ 0 đến ${GAME_PRICE_MAX}.` };
  }
  const pricePoints = priceRaw > 0 ? priceRaw : null;

  await db.$transaction(async (tx) => {
    await tx.game.update({
      where: { id },
      data: {
        slug,
        title,
        titleVi: str(fd, 'titleVi'),
        series: str(fd, 'series'),
        description: str(fd, 'description'),
        gameplay: str(fd, 'gameplay'),
        icon: str(fd, 'icon'),
        cover: str(fd, 'cover'),
        trailerUrl: str(fd, 'trailerUrl'),
        developer: str(fd, 'developer'),
        publisher: str(fd, 'publisher'),
        releaseYear: int(fd, 'releaseYear'),
        language: str(fd, 'language') ?? 'en',
        vietnamized: bool(fd, 'vietnamized'),
        featured: bool(fd, 'featured'),
        pricePoints,
        status: status as 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'ARCHIVED',
        publishedAt: ngayDang(status, current.publishedAt),
        platformId: str(fd, 'platformId'),
        resolutionId: str(fd, 'resolutionId'),
        compatibilityNote: str(fd, 'compatibilityNote'),
        knownIssues: str(fd, 'knownIssues'),
        ...(controls !== undefined ? { controls: controls as never } : {}),
      },
    });

    await tx.genresOnGames.deleteMany({ where: { gameId: id } });
    if (genreIds.length) {
      await tx.genresOnGames.createMany({ data: genreIds.map((genreId) => ({ gameId: id, genreId })) });
    }

    await tx.tagsOnGames.deleteMany({ where: { gameId: id } });
    for (const name of tagNames) {
      const tagSlug = slugify(name);
      if (!tagSlug) continue;
      const tag = await tx.tag.upsert({ where: { slug: tagSlug }, update: {}, create: { slug: tagSlug, name } });
      await tx.tagsOnGames.create({ data: { gameId: id, tagId: tag.id } });
    }
  });

  revalidatePath('/admin/games');
  revalidatePath(`/admin/games/${id}`);
  revalidatePath(`/games/${slug}`);
  return { ok: true };
}

export async function deleteGame(id: string): Promise<void> {
  await assertSuperAdmin();
  await db.game.delete({ where: { id } });
  revalidatePath('/admin/games');
  redirect('/admin/games');
}

/** Bật/tắt nhanh một cờ trên danh sách game. */
export async function toggleGameFlag(id: string, field: 'featured'): Promise<void> {
  await assertSuperAdmin();
  const game = await db.game.findUnique({ where: { id }, select: { featured: true, slug: true } });
  if (!game) return;
  await db.game.update({ where: { id }, data: { [field]: !game[field] } });
  revalidatePath('/admin/games');
  revalidatePath(`/games/${game.slug}`);
}

/**
 * Ngày đăng đi theo trạng thái.
 *
 *  • Đăng: giữ ngày cũ nếu từng đăng, chưa có thì lấy bây giờ — đăng lại sau
 *    một lần sửa không phải là bài mới, cho nhảy lên đầu mọi danh sách là sai.
 *  • Nháp: xoá — nháp là thứ CHƯA đăng, mang ngày đăng thì tự mâu thuẫn, mà
 *    huy hiệu "mới" với điểm trending đều đọc cột này.
 *  • Chờ duyệt / đã ẩn: giữ — cả hai đều là bài đã từng ra mặt tiền, chỉ đang
 *    tạm rút, ngày ra mắt vẫn là ngày ra mắt.
 */
function ngayDang(trangThai: string, cu: Date | null): Date | null {
  if (trangThai === 'PUBLISHED') return cu ?? new Date();
  if (trangThai === 'DRAFT') return null;
  return cu;
}

export async function setGameStatus(id: string, status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'ARCHIVED'): Promise<void> {
  await assertSuperAdmin();
  const game = await db.game.findUnique({ where: { id }, select: { publishedAt: true, slug: true } });
  if (!game) return;
  await db.game.update({
    where: { id },
    data: { status, publishedAt: ngayDang(status, game.publishedAt) },
  });
  revalidatePath('/admin/games');
  revalidatePath(`/games/${game.slug}`);
}

// ── Version & file ────────────────────────────────────────

export async function upsertVersion(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertSuperAdmin();
  const gameId = str(fd, 'gameId');
  const version = str(fd, 'version');
  if (!gameId || !version) return { error: 'Thiếu game hoặc số hiệu version.' };

  const platform = str(fd, 'platform') as DownloadPlatform | null;
  if (!platform || !(platform in DOWNLOAD_PLATFORMS)) return { error: 'Nền tảng không hợp lệ.' };

  const id = str(fd, 'versionId');
  const releaseDate = str(fd, 'releaseDate');

  const data = {
    platform,
    version,
    releaseDate: releaseDate ? new Date(releaseDate) : null,
    changelog: str(fd, 'changelog'),
    sizeBytes: big(fd, 'sizeBytes'),
    note: str(fd, 'note'),
  };

  // Số hiệu chỉ cần duy nhất trong phạm vi một nền tảng — Windows 1.0 và
  // Android 1.0 là hai bản tải khác nhau của cùng một game.
  const clash = await db.gameVersion.findFirst({
    where: { gameId, platform, version, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (clash) return { error: `Nền tảng ${DOWNLOAD_PLATFORMS[platform].label} đã có version ${version}.` };

  // Nền tảng chưa có bản nào thì bản đầu tiên phải là Latest, không thì nút tải
  // của nền tảng đó không biết mở bản nào.
  const existing = await db.gameVersion.count({ where: { gameId, platform, ...(id ? { NOT: { id } } : {}) } });
  const latest = bool(fd, 'latest') || existing === 0;

  await db.$transaction(async (tx) => {
    // Mỗi nền tảng đúng một bản Latest.
    if (latest) await tx.gameVersion.updateMany({ where: { gameId, platform }, data: { latest: false } });
    if (id) await tx.gameVersion.update({ where: { id }, data: { ...data, latest } });
    else await tx.gameVersion.create({ data: { ...data, latest, gameId } });
  });

  revalidatePath(`/admin/games/${gameId}`);
  return { ok: true };
}

export async function deleteVersion(versionId: string): Promise<void> {
  await assertSuperAdmin();
  const v = await db.gameVersion.findUnique({
    where: { id: versionId },
    select: { gameId: true, platform: true, latest: true },
  });
  await db.gameVersion.delete({ where: { id: versionId } });
  if (!v) return;

  // Xoá mất bản Latest thì nền tảng đó không còn bản mặc định — đôn bản mới
  // nhất còn lại lên thay.
  if (v.latest) {
    const next = await db.gameVersion.findFirst({
      where: { gameId: v.gameId, platform: v.platform },
      orderBy: [{ releaseDate: 'desc' }, { createdAt: 'desc' }],
      select: { id: true },
    });
    if (next) await db.gameVersion.update({ where: { id: next.id }, data: { latest: true } });
  }
  revalidatePath(`/admin/games/${v.gameId}`);
}

export async function setLatestVersion(versionId: string): Promise<void> {
  await assertSuperAdmin();
  const v = await db.gameVersion.findUnique({
    where: { id: versionId },
    select: { gameId: true, platform: true },
  });
  if (!v) return;
  await db.$transaction([
    db.gameVersion.updateMany({ where: { gameId: v.gameId, platform: v.platform }, data: { latest: false } }),
    db.gameVersion.update({ where: { id: versionId }, data: { latest: true } }),
  ]);
  revalidatePath(`/admin/games/${v.gameId}`);
}

/** Gắn/cập nhật một file tải cho một version. */
export async function upsertFile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertSuperAdmin();
  const versionId = str(fd, 'versionId');
  const type = str(fd, 'type') as GameFileType | null;
  const storageKey = str(fd, 'storageKey');
  if (!versionId || !type || !storageKey) return { error: 'Thiếu version, loại file hoặc storage key.' };

  const version = await db.gameVersion.findUnique({
    where: { id: versionId },
    select: { gameId: true, platform: true },
  });
  if (!version) return { error: 'Không tìm thấy version.' };

  if (!fileTypeFitsPlatform(version.platform, type)) {
    const allowed = DOWNLOAD_PLATFORMS[version.platform].fileTypes.join(', ');
    return { error: `Nền tảng ${DOWNLOAD_PLATFORMS[version.platform].label} chỉ nhận file: ${allowed}.` };
  }

  const data = {
    storageKey,
    fileName: str(fd, 'fileName'),
    sizeBytes: big(fd, 'sizeBytes'),
    checksum: str(fd, 'checksum'),
    checksumAlgo: str(fd, 'checksumAlgo') ?? 'sha256',
    mimeType: str(fd, 'mimeType'),
    scanStatus: (str(fd, 'scanStatus') ?? 'PENDING') as 'PENDING' | 'CLEAN' | 'SUSPICIOUS' | 'QUARANTINED',
    scanNote: str(fd, 'scanNote'),
  };

  await db.gameFile.upsert({
    where: { versionId_type: { versionId, type } },
    update: data,
    create: { ...data, versionId, type },
  });

  revalidatePath(`/admin/games/${version.gameId}`);
  return { ok: true };
}

export async function deleteFile(fileId: string): Promise<void> {
  await assertSuperAdmin();
  const f = await db.gameFile.findUnique({ where: { id: fileId }, select: { version: { select: { gameId: true } } } });
  await db.gameFile.delete({ where: { id: fileId } });
  if (f) revalidatePath(`/admin/games/${f.version.gameId}`);
}

/** Cách ly file nghi ngờ — link tải bị chặn ngay. */
export async function quarantineFile(fileId: string, quarantine: boolean): Promise<void> {
  await assertSuperAdmin();
  const f = await db.gameFile.update({
    where: { id: fileId },
    data: { scanStatus: quarantine ? 'QUARANTINED' : 'CLEAN' },
    select: { version: { select: { gameId: true } } },
  });
  revalidatePath(`/admin/games/${f.version.gameId}`);
}

// ── Ảnh ───────────────────────────────────────────────────

export async function addImage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertSuperAdmin();
  const gameId = str(fd, 'gameId');
  const storageKey = str(fd, 'storageKey');
  if (!gameId || !storageKey) return { error: 'Thiếu game hoặc đường dẫn ảnh.' };

  await db.gameImage.create({
    data: {
      gameId,
      storageKey,
      type: (str(fd, 'type') ?? 'SCREENSHOT') as 'ICON' | 'COVER' | 'SCREENSHOT' | 'TRAILER',
      caption: str(fd, 'caption'),
      width: int(fd, 'width'),
      height: int(fd, 'height'),
      sortOrder: int(fd, 'sortOrder') ?? 0,
    },
  });
  revalidatePath(`/admin/games/${gameId}`);
  return { ok: true };
}

export async function deleteImage(imageId: string): Promise<void> {
  await assertSuperAdmin();
  const img = await db.gameImage.delete({ where: { id: imageId }, select: { gameId: true } });
  revalidatePath(`/admin/games/${img.gameId}`);
}

// ── Tiện ích ──────────────────────────────────────────────

/** Tính lại trending score cho toàn bộ game đã đăng. */
export async function refreshTrending(): Promise<void> {
  await assertSuperAdmin();
  await recomputeTrending();
  revalidatePath('/admin/games');
  revalidatePath('/games');
}

// ─────────────────── Danh mục kho game (thể loại, dòng máy…) ───────────────────

/**
 * Bốn bảng phân loại của kho game đều cùng một hình dạng: slug + tên + thứ tự.
 * Gộp chung một cặp hàm lưu/xoá thay vì viết bốn lần gần y hệt nhau.
 */
export type GameTaxonomy = 'genre' | 'platform' | 'resolution' | 'collection';

const TAXONOMY_LABEL: Record<GameTaxonomy, string> = {
  genre: 'thể loại',
  platform: 'dòng máy',
  resolution: 'độ phân giải',
  collection: 'bộ sưu tập',
};

function isTaxonomy(v: string): v is GameTaxonomy {
  return v in TAXONOMY_LABEL;
}

/** Thêm mới hoặc sửa một mục phân loại. */
export async function saveGameTaxonomy(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertSuperAdmin();

  const kind = str(fd, 'kind') ?? '';
  if (!isTaxonomy(kind)) return { error: 'Loại danh mục không hợp lệ.' };

  const id = str(fd, 'id');
  const name = str(fd, 'name');
  if (!name) return { error: `Thiếu tên ${TAXONOMY_LABEL[kind]}.` };

  const order = int(fd, 'order') ?? 0;
  const icon = str(fd, 'icon');

  if (kind === 'resolution') {
    const width = int(fd, 'width');
    const height = int(fd, 'height');
    if (!width || !height || width < 1 || height < 1) {
      return { error: 'Độ phân giải cần cả chiều rộng và chiều cao (> 0).' };
    }
    // Slug của độ phân giải suy ra từ chính hai số đó, không để người nhập tự bịa.
    const slug = `${width}x${height}`;
    const clash = await db.gameResolution.findFirst({ where: { slug, NOT: id ? { id } : undefined }, select: { id: true } });
    if (clash) return { error: `Độ phân giải ${slug} đã có rồi.` };
    const data = { slug, label: name, width, height, order };
    if (id) await db.gameResolution.update({ where: { id }, data, select: { id: true } });
    else await db.gameResolution.create({ data, select: { id: true } });
  } else {
    const slug = slugify(str(fd, 'slug') ?? name);
    if (!slug) return { error: 'Slug không hợp lệ.' };

    // Prisma sinh kiểu riêng cho từng bảng nên không gộp được vào một biến
    // `table` dùng chung — hỏi trùng slug theo đúng bảng của loại đang lưu.
    const where = { slug, NOT: id ? { id } : undefined };
    const clash =
      kind === 'genre' ? await db.gameGenre.findFirst({ where, select: { id: true } })
      : kind === 'platform' ? await db.gamePlatform.findFirst({ where, select: { id: true } })
      : await db.gameCollection.findFirst({ where, select: { id: true } });
    if (clash) return { error: 'Slug đã được mục khác dùng.' };

    if (kind === 'genre') {
      const data = { slug, name, icon, color: str(fd, 'color'), order };
      if (id) await db.gameGenre.update({ where: { id }, data, select: { id: true } });
      else await db.gameGenre.create({ data, select: { id: true } });
    } else if (kind === 'platform') {
      const data = { slug, name, icon, order };
      if (id) await db.gamePlatform.update({ where: { id }, data, select: { id: true } });
      else await db.gamePlatform.create({ data, select: { id: true } });
    } else {
      const data = { slug, name, description: str(fd, 'description'), featured: bool(fd, 'featured'), order };
      if (id) await db.gameCollection.update({ where: { id }, data, select: { id: true } });
      else await db.gameCollection.create({ data, select: { id: true } });
    }
  }

  revalidatePath('/admin/games/danh-muc');
  revalidatePath('/games');
  return { ok: true };
}

/**
 * Xoá một mục phân loại.
 *
 * Game đang gắn vào nó KHÔNG bị xoá theo: quan hệ đặt onDelete SetNull /
 * Cascade ở bảng nối, nên game chỉ mất nhãn đó thôi.
 */
export async function deleteGameTaxonomy(kind: string, id: string): Promise<ActionState> {
  await assertSuperAdmin();
  if (!isTaxonomy(kind)) return { error: 'Loại danh mục không hợp lệ.' };

  if (kind === 'genre') await db.gameGenre.delete({ where: { id } });
  else if (kind === 'platform') await db.gamePlatform.delete({ where: { id } });
  else if (kind === 'resolution') await db.gameResolution.delete({ where: { id } });
  else await db.gameCollection.delete({ where: { id } });

  revalidatePath('/admin/games/danh-muc');
  revalidatePath('/games');
  return { ok: true };
}
