import { db } from './db';
import { toSlug } from './post-form';
import {
  CLUBS_PER_PAGE, CLUB_MEMBERS_PER_PAGE, CLUB_POSTS_PER_PAGE,
  CLUB_COMMENTS_SHOWN, CLUB_COMMENTS_EXPANDED, CLUB_REPLIES_PER_ROOT,
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
  /** Chưa dính dáng gì tới nhóm thì null. */
  status: 'PENDING' | 'INVITED' | 'ACTIVE' | null;
  role: 'OWNER' | 'MOD' | 'MEMBER' | null;
  isOwner: boolean;
  /** Được đọc bảng tin không. */
  canRead: boolean;
  /** Được đăng lên bảng tin không. */
  canPost: boolean;
  /** Được duyệt đơn, đuổi người, ghim và xoá bài không — chủ và phó nhóm. */
  canManage: boolean;
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
    return {
      status: null, role: null, isOwner: false,
      canRead: club.privacy === 'PUBLIC', canPost: false, canManage: false,
    };
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
    // Phó nhóm gánh việc thay chủ, nhưng đổi cấu hình và giải tán thì không —
    // hai việc ấy chỉ chủ nhóm làm, xét riêng bằng `isOwner`.
    canManage: (active && (isOwner || m?.role === 'MOD')) || isAdmin,
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

/** Đơn xin vào đang chờ — chỉ chủ và phó nhóm hỏi tới. */
export async function getClubPending(clubId: string) {
  const rows = await db.clubMember.findMany({
    where: { clubId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: CLUB_MEMBERS_PER_PAGE,
    select: { id: true, createdAt: true, user: { select: authorChipSelect } },
  });
  return rows.map((r) => ({ id: r.id, createdAt: r.createdAt, user: toAuthorChip(r.user) }));
}

/**
 * Bạn bè của một người mà CHƯA dính dáng gì tới nhóm — danh sách để mời.
 *
 * Lọc ngay trong truy vấn chứ không lấy hết bạn rồi loại sau: người có vài
 * trăm bạn thì lấy hết về chỉ để bỏ đi gần hết là phí, mà lọc sau còn dễ quên
 * một trạng thái (đã mời rồi vẫn hiện ra để mời tiếp).
 */
export async function getInvitableFriends(userId: string, clubId: string) {
  const rows = await db.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    take: CLUB_MEMBERS_PER_PAGE,
    orderBy: { acceptedAt: 'desc' },
    select: {
      requesterId: true,
      requester: { select: { id: true, ...authorChipSelect } },
      addressee: { select: { id: true, ...authorChipSelect } },
    },
  });

  const friends = rows.map((r) => (r.requesterId === userId ? r.addressee : r.requester));
  if (friends.length === 0) return [];

  const taken = await db.clubMember.findMany({
    where: { clubId, userId: { in: friends.map((f) => f.id) } },
    select: { userId: true },
  });
  const skip = new Set(taken.map((t) => t.userId));

  return friends
    .filter((f) => !skip.has(f.id))
    .map((f) => ({ id: f.id, chip: toAuthorChip(f) }));
}

const commentSelect = {
  id: true, content: true, createdAt: true, authorId: true, parentId: true, depth: true,
  likeCount: true, author: { select: authorChipSelect },
} as const;

/** Một bình luận kèm cả nhánh con của nó. */
export interface ClubCommentNode {
  id: string;
  content: string;
  createdAt: Date;
  authorId: string;
  parentId: string | null;
  depth: number;
  likeCount: number;
  /** Người đang xem đã thả tim bình luận này chưa. */
  liked: boolean;
  author: AuthorChip | null;
  children: ClubCommentNode[];
}

/**
 * Bảng tin câu lạc bộ. Người gọi phải tự chắc là đọc được (`getClubViewer`).
 *
 * `expandId` là bài đang được người đọc mở hết bình luận; các bài còn lại chỉ
 * lấy vài bình luận mới nhất. Không có mốc ấy thì mười lăm bài mỗi trang kéo
 * về cả nghìn hàng bình luận chỉ để in ra ba dòng đầu mỗi bài.
 */
export async function getClubPosts(
  clubId: string,
  page = 1,
  opts: { viewerId?: string | null; expandId?: string | null } = {},
) {
  const p = Math.max(1, page);
  const [total, rows] = await Promise.all([
    db.clubPost.count({ where: { clubId } }),
    db.clubPost.findMany({
      where: { clubId },
      // Bài ghim luôn nằm trên đầu, trong nhóm ghim thì mới nhất trước.
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      skip: (p - 1) * CLUB_POSTS_PER_PAGE,
      take: CLUB_POSTS_PER_PAGE,
      select: {
        id: true, content: true, createdAt: true, authorId: true, pinned: true,
        likeCount: true, commentCount: true,
        author: { select: authorChipSelect },
      },
    }),
  ]);

  const ids = rows.map((r) => r.id);
  const [liked, roots] = await Promise.all([
    opts.viewerId && ids.length > 0
      ? db.clubPostLike.findMany({
          where: { userId: opts.viewerId, postId: { in: ids } },
          select: { postId: true },
        })
      : Promise.resolve([]),
    // Chỉ lấy bình luận GỐC ở bước này; nhánh con lấy sau theo `rootId`, một
    // lượt cho cả trang. Lấy lẫn lộn cả cây ngay từ đây thì "ba bình luận mỗi
    // bài" hoá ra ba dòng bất kỳ, có khi toàn dòng con của cùng một nhánh.
    ids.length > 0
      ? Promise.all(ids.map(async (id) => ({
          id,
          rows: await db.clubComment.findMany({
            where: { postId: id, depth: 0 },
            orderBy: { createdAt: 'desc' },
            take: id === opts.expandId ? CLUB_COMMENTS_EXPANDED : CLUB_COMMENTS_SHOWN,
            select: commentSelect,
          }),
        })))
      : Promise.resolve([]),
  ]);

  const rootIds = roots.flatMap((r) => r.rows.map((c) => c.id));
  const children = rootIds.length > 0
    ? await db.clubComment.findMany({
        where: { rootId: { in: rootIds } },
        orderBy: { createdAt: 'asc' },
        take: rootIds.length * CLUB_REPLIES_PER_ROOT,
        select: commentSelect,
      })
    : [];

  // Tim của người đang xem, hỏi một lượt cho cả trang.
  const allCommentIds = [...rootIds, ...children.map((c) => c.id)];
  const likedComments = opts.viewerId && allCommentIds.length > 0
    ? await db.clubCommentLike.findMany({
        where: { userId: opts.viewerId, commentId: { in: allCommentIds } },
        select: { commentId: true },
      })
    : [];
  const likedCommentSet = new Set(likedComments.map((l) => l.commentId));

  const likedSet = new Set(liked.map((l) => l.postId));
  const byParent = new Map<string, typeof children>();
  for (const c of children) {
    const key = c.parentId ?? '';
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }

  /** Dựng cây từ một bình luận gốc xuống hết nhánh của nó. */
  const tree = (c: (typeof children)[number]): ClubCommentNode => ({
    ...c,
    author: toAuthorChip(c.author),
    liked: likedCommentSet.has(c.id),
    children: (byParent.get(c.id) ?? []).map(tree),
  });

  const commentMap = new Map(
    roots.map((r) => [
      r.id,
      // Lấy mới nhất trước cho đúng trần, nhưng in ra thì cũ trước cho dễ đọc.
      r.rows.slice().reverse().map(tree),
    ]),
  );

  return {
    items: rows.map((r) => ({
      ...r,
      author: toAuthorChip(r.author),
      liked: likedSet.has(r.id),
      comments: commentMap.get(r.id) ?? [],
    })),
    page: p,
    totalPages: Math.max(1, Math.ceil(total / CLUB_POSTS_PER_PAGE)),
    total,
  };
}
