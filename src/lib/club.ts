import { db } from './db';
import { toSlug } from './post-form';
import {
  CLUBS_PER_PAGE, CLUB_MEMBERS_PER_PAGE, CLUB_POSTS_PER_PAGE,
} from './club-const';
import { authorChipSelect, toAuthorChip, type AuthorChip } from './shop';

export * from './club-const';

/** Khoá cấu hình câu lạc bộ trong bảng cài đặt chung. */
const CLUB_SETTING_KEY = 'club';

export interface ClubConfig {
  /** Số điểm phải trả để lập một câu lạc bộ; 0 nghĩa là lập tự do. */
  createCost: number;
}

export const CLUB_DEFAULTS: ClubConfig = { createCost: 500 };

export async function getClubConfig(): Promise<ClubConfig> {
  const row = await db.siteSetting.findUnique({ where: { key: CLUB_SETTING_KEY } }).catch(() => null);
  const v = (row?.value ?? {}) as Partial<ClubConfig>;
  const cost = Number(v.createCost);
  return { createCost: Number.isFinite(cost) && cost >= 0 ? Math.floor(cost) : CLUB_DEFAULTS.createCost };
}

export async function saveClubConfig(cfg: ClubConfig): Promise<void> {
  await db.siteSetting.upsert({
    where: { key: CLUB_SETTING_KEY },
    create: { key: CLUB_SETTING_KEY, value: { ...cfg } },
    update: { value: { ...cfg } },
    select: { key: true },
  });
}

/**
 * Đường dẫn của câu lạc bộ.
 *
 * Tên câu lạc bộ hay trùng và hay toàn dấu, nên chốt đuôi ngẫu nhiên thay vì
 * dò xem đã có chưa rồi thêm số: dò-rồi-ghi là hai bước, hai người lập cùng
 * lúc thì cả hai cùng thấy "chưa có" và cùng ghi.
 */
export function clubSlug(name: string): string {
  const base = toSlug(name).slice(0, 40) || 'clb';
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface ClubCard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  avatar: string | null;
  memberCount: number;
  postCount: number;
  joinMode: string;
  privacy: string;
  owner: AuthorChip | null;
}

const clubCardSelect = {
  id: true, slug: true, name: true, description: true, avatar: true,
  memberCount: true, postCount: true, joinMode: true, privacy: true,
  owner: { select: authorChipSelect },
} as const;

function toCard(c: {
  id: string; slug: string; name: string; description: string | null; avatar: string | null;
  memberCount: number; postCount: number; joinMode: string; privacy: string;
  owner: Parameters<typeof toAuthorChip>[0];
}): ClubCard {
  return { ...c, owner: toAuthorChip(c.owner) };
}

/** Danh sách câu lạc bộ, sắp theo đông thành viên. `q` lọc theo tên. */
export async function getClubs(opts: { page?: number; q?: string } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const q = opts.q?.trim();
  const where = q ? { name: { contains: q, mode: 'insensitive' as const } } : {};

  const [total, rows] = await Promise.all([
    db.club.count({ where }),
    db.club.findMany({
      where,
      orderBy: [{ memberCount: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * CLUBS_PER_PAGE,
      take: CLUBS_PER_PAGE,
      select: clubCardSelect,
    }),
  ]);

  return {
    items: rows.map(toCard),
    page,
    totalPages: Math.max(1, Math.ceil(total / CLUBS_PER_PAGE)),
    total,
  };
}

/** Câu lạc bộ của một người: nơi họ là thành viên đã được nhận. */
export async function getMyClubs(userId: string) {
  const rows = await db.clubMember.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: CLUBS_PER_PAGE,
    select: { role: true, club: { select: clubCardSelect } },
  });
  return rows.map((r) => ({ role: r.role, club: toCard(r.club) }));
}

export interface ClubViewer {
  /** Chưa xin vào thì null. */
  status: 'PENDING' | 'ACTIVE' | null;
  role: 'OWNER' | 'MOD' | 'MEMBER' | null;
  isOwner: boolean;
  /** Được đọc bảng tin không. */
  canRead: boolean;
  /** Được đăng lên bảng tin không. */
  canPost: boolean;
}

/**
 * Quan hệ giữa người đang xem và một câu lạc bộ.
 *
 * Gom vào một chỗ vì mọi trang của câu lạc bộ đều cần đúng bộ câu hỏi này, mà
 * trả lời lệch nhau ở một trang là hở đúng ở trang đó.
 */
export async function getClubViewer(
  club: { id: string; ownerId: string; privacy: string },
  userId: string | null,
  isAdmin = false,
): Promise<ClubViewer> {
  if (!userId) {
    return { status: null, role: null, isOwner: false, canRead: club.privacy === 'PUBLIC', canPost: false };
  }

  const m = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: club.id, userId } },
    select: { role: true, status: true },
  });
  const active = m?.status === 'ACTIVE';
  const isOwner = club.ownerId === userId;

  return {
    status: m?.status ?? null,
    role: m?.role ?? null,
    isOwner,
    // Quản trị viên đọc được để còn xử lý báo cáo, nhưng không được đăng thay.
    canRead: club.privacy === 'PUBLIC' || active || isAdmin,
    canPost: active,
  };
}

/** Thành viên đã được nhận, có phân trang. */
export async function getClubMembers(clubId: string, page = 1) {
  const p = Math.max(1, page);
  const where = { clubId, status: 'ACTIVE' as const };
  const [total, rows] = await Promise.all([
    db.clubMember.count({ where }),
    db.clubMember.findMany({
      where,
      // Chủ và ban quản lý lên đầu, còn lại theo thứ tự vào nhóm.
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      skip: (p - 1) * CLUB_MEMBERS_PER_PAGE,
      take: CLUB_MEMBERS_PER_PAGE,
      select: { id: true, role: true, createdAt: true, user: { select: authorChipSelect } },
    }),
  ]);

  return {
    items: rows.map((r) => ({ id: r.id, role: r.role, createdAt: r.createdAt, user: toAuthorChip(r.user) })),
    page: p,
    totalPages: Math.max(1, Math.ceil(total / CLUB_MEMBERS_PER_PAGE)),
    total,
  };
}

/** Những người đang chờ duyệt — chỉ chủ câu lạc bộ hỏi tới. */
export async function getClubPending(clubId: string) {
  const rows = await db.clubMember.findMany({
    where: { clubId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: CLUB_MEMBERS_PER_PAGE,
    select: { id: true, createdAt: true, user: { select: authorChipSelect } },
  });
  return rows.map((r) => ({ id: r.id, createdAt: r.createdAt, user: toAuthorChip(r.user) }));
}

/** Bảng tin câu lạc bộ. Người gọi phải tự chắc là đọc được (`getClubViewer`). */
export async function getClubPosts(clubId: string, page = 1) {
  const p = Math.max(1, page);
  const [total, rows] = await Promise.all([
    db.clubPost.count({ where: { clubId } }),
    db.clubPost.findMany({
      where: { clubId },
      orderBy: { createdAt: 'desc' },
      skip: (p - 1) * CLUB_POSTS_PER_PAGE,
      take: CLUB_POSTS_PER_PAGE,
      select: { id: true, content: true, createdAt: true, authorId: true, author: { select: authorChipSelect } },
    }),
  ]);

  return {
    items: rows.map((r) => ({ ...r, author: toAuthorChip(r.author) })),
    page: p,
    totalPages: Math.max(1, Math.ceil(total / CLUB_POSTS_PER_PAGE)),
    total,
  };
}
