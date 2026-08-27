import type { DownloadPlatform, GameFileType, GameStatus, Prisma } from '@prisma/client';

// ============================================================
// Nhãn / badge
// ============================================================

export const GAME_STATUS_LABEL: Record<GameStatus, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  PUBLISHED: 'Đã đăng',
  ARCHIVED: 'Lưu trữ',
};

/**
 * Nút tải trên trang chi tiết game.
 *
 * `order` quyết định thứ tự nút; `fileTypes` là các loại file hợp lệ của nền
 * tảng đó, dùng cho cả dropdown trong admin lẫn kiểm tra ở API tải.
 */
export const DOWNLOAD_PLATFORMS: Record<DownloadPlatform, {
  label: string;
  /** Tên icon lucide — component tra ở phía client để giữ file này thuần dữ liệu. */
  icon: 'Monitor' | 'Apple' | 'Terminal' | 'Smartphone' | 'Globe' | 'Coffee';
  order: number;
  fileTypes: GameFileType[];
}> = {
  WINDOWS: { label: 'Windows', icon: 'Monitor', order: 1, fileTypes: ['EXE', 'MSI', 'ZIP', 'PATCH'] },
  MAC: { label: 'macOS', icon: 'Apple', order: 2, fileTypes: ['DMG', 'PKG', 'ZIP', 'PATCH'] },
  LINUX: { label: 'Linux', icon: 'Terminal', order: 3, fileTypes: ['DEB', 'ZIP', 'PATCH'] },
  ANDROID: { label: 'Android', icon: 'Smartphone', order: 4, fileTypes: ['APK', 'ZIP', 'PATCH'] },
  IOS: { label: 'iOS', icon: 'Apple', order: 5, fileTypes: ['IPA', 'ZIP', 'PATCH'] },
  WEB: { label: 'Web', icon: 'Globe', order: 6, fileTypes: ['ZIP', 'PATCH'] },
  JAR: { label: 'Java ME (JAR)', icon: 'Coffee', order: 7, fileTypes: ['JAR', 'JAD', 'PATCH'] },
};

/** Danh sách nền tảng theo đúng thứ tự nút hiển thị. */
export const DOWNLOAD_PLATFORM_ORDER = (Object.keys(DOWNLOAD_PLATFORMS) as DownloadPlatform[])
  .sort((a, b) => DOWNLOAD_PLATFORMS[a].order - DOWNLOAD_PLATFORMS[b].order);

/** Loại file có hợp với nền tảng không — chặn gán nhầm APK cho bản Windows. */
export function fileTypeFitsPlatform(platform: DownloadPlatform, type: GameFileType): boolean {
  return DOWNLOAD_PLATFORMS[platform].fileTypes.includes(type);
}

export const LANGUAGE_LABEL: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'Tiếng Anh',
  multi: 'Đa ngôn ngữ',
};

/** Bảng màu nhấn cho icon game khi game chưa có icon riêng. */
const GAME_TINTS = ['#2c7bfe', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#ef4444', '#14b8a6'];

export function gameTint(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return GAME_TINTS[h % GAME_TINTS.length];
}

// ============================================================
// Asset URL (thuần, dùng được cả ở client)
// ============================================================

/** Gốc CDN phục vụ file/ảnh game (rỗng = phục vụ qua chính app). */
export const GAME_CDN_BASE = (process.env.NEXT_PUBLIC_GAME_CDN_URL ?? '').replace(/\/+$/, '');

/** URL công khai cho icon/ảnh/screenshot. Giữ nguyên nếu đã là URL tuyệt đối. */
export function assetUrl(storageKey: string | null | undefined): string | null {
  if (!storageKey) return null;
  if (/^(https?:)?\/\//.test(storageKey) || storageKey.startsWith('data:') || storageKey.startsWith('/')) return storageKey;
  return GAME_CDN_BASE ? `${GAME_CDN_BASE}/${storageKey}` : `/${storageKey}`;
}

// ============================================================
// Card data
// ============================================================

/** Select dùng chung cho mọi lưới/hàng game — giữ payload nhỏ. */
export const gameCardSelect = {
  id: true,
  slug: true,
  title: true,
  titleVi: true,
  icon: true,
  language: true,
  vietnamized: true,
  featured: true,
  ratingSum: true,
  ratingCount: true,
  pricePoints: true,
  downloadCount: true,
  viewCount: true,
  publishedAt: true,
  updatedAt: true,
  platform: { select: { slug: true, name: true } },
  resolution: { select: { slug: true, label: true } },
  genres: { select: { genre: { select: { slug: true, name: true } } }, take: 2 },
  // Bản mới nhất của mỗi nền tảng xếp lên đầu, nên `take` bằng số nền tảng + 1
  // là đủ để thẻ game liệt kê hết nút tải mà không kéo cả lịch sử version về.
  versions: {
    orderBy: [{ latest: 'desc' }, { releaseDate: 'desc' }, { createdAt: 'desc' }],
    take: 8,
    select: { id: true, version: true, sizeBytes: true, platform: true, latest: true },
  },
} satisfies Prisma.GameSelect;

export type GameCardRow = Prisma.GameGetPayload<{ select: typeof gameCardSelect }>;

export interface GameCardData {
  id: string;
  slug: string;
  title: string;
  titleVi: string | null;
  icon: string | null;
  genres: { slug: string; name: string }[];
  rating: number;
  ratingCount: number;
  downloadCount: number;
  viewCount: number;
  version: string | null;
  sizeBytes: number | null;
  language: string;
  vietnamized: boolean;
  resolution: string | null;
  platform: string | null;
  /** Các nền tảng có bản tải, theo thứ tự nút. */
  downloads: DownloadPlatform[];
  /** Số điểm phải trả để mở phần tải; 0 = tải tự do. */
  pricePoints: number;
  badges: GameBadge[];
}

export interface GameBadge {
  label: string;
  className: string;
}

const BADGE_NEW = { label: 'New', className: 'bg-emerald-500 text-white' };
const BADGE_POPULAR = { label: 'Popular', className: 'bg-accent-500 text-white' };
const BADGE_FEATURED = { label: 'Featured', className: 'bg-brand-500 text-white' };
const BADGE_VI = { label: 'Việt hóa', className: 'bg-amber-500 text-white' };

/** Game đăng trong 14 ngày gần nhất được coi là mới. */
const NEW_WINDOW_MS = 14 * 24 * 3600 * 1000;
/** Ngưỡng lượt tải để gắn nhãn Popular. */
export const POPULAR_DOWNLOAD_THRESHOLD = 1000;

export function gameBadges(g: {
  featured: boolean;
  vietnamized: boolean;
  downloadCount: number;
  publishedAt: Date | null;
}): GameBadge[] {
  const out: GameBadge[] = [];
  if (g.featured) out.push(BADGE_FEATURED);
  if (g.publishedAt && Date.now() - g.publishedAt.getTime() < NEW_WINDOW_MS) out.push(BADGE_NEW);
  if (g.downloadCount >= POPULAR_DOWNLOAD_THRESHOLD) out.push(BADGE_POPULAR);
  if (g.vietnamized) out.push(BADGE_VI);
  return out;
}

/** Điểm trung bình (0 nếu chưa ai chấm). */
export function avgRating(ratingSum: number, ratingCount: number): number {
  return ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;
}

export function toGameCard(g: GameCardRow): GameCardData {
  // Bản đại diện cho thẻ game: bản mới nhất bất kể nền tảng nào.
  const latest = g.versions[0];
  const downloads = DOWNLOAD_PLATFORM_ORDER.filter((p) => g.versions.some((v) => v.platform === p));
  return {
    id: g.id,
    slug: g.slug,
    title: g.title,
    titleVi: g.titleVi,
    icon: assetUrl(g.icon),
    genres: g.genres.map((x) => x.genre),
    rating: avgRating(g.ratingSum, g.ratingCount),
    ratingCount: g.ratingCount,
    downloadCount: g.downloadCount,
    viewCount: g.viewCount,
    version: latest?.version ?? null,
    sizeBytes: latest?.sizeBytes != null ? Number(latest.sizeBytes) : null,
    language: g.language,
    vietnamized: g.vietnamized,
    resolution: g.resolution?.label ?? null,
    platform: g.platform?.name ?? null,
    downloads,
    pricePoints: g.pricePoints ?? 0,
    badges: gameBadges(g),
  };
}

// ============================================================
// Bộ lọc & sắp xếp catalog
// ============================================================

export const GAME_SORTS = {
  relevance: 'Liên quan',
  newest: 'Mới nhất',
  updated: 'Mới cập nhật',
  popular: 'Phổ biến',
  downloaded: 'Tải nhiều',
  rating: 'Đánh giá',
  name: 'Tên A–Z',
} as const;

export type GameSort = keyof typeof GAME_SORTS;

export function isGameSort(v: string | undefined): v is GameSort {
  return !!v && v in GAME_SORTS;
}

export interface GameFilter {
  q?: string;
  genre?: string;
  platform?: string;
  resolution?: string;
  language?: string;
  vietnamized?: boolean;
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
  maxSizeKb?: number;
  minDownloads?: number;
  updatedWithinDays?: number;
  collection?: string;
}

/** Dựng `where` Prisma từ bộ lọc catalog (chỉ game đã đăng). */
export function gameWhere(f: GameFilter): Prisma.GameWhereInput {
  const and: Prisma.GameWhereInput[] = [{ status: 'PUBLISHED' }];

  if (f.q) {
    const q = f.q.trim();
    and.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { titleVi: { contains: q, mode: 'insensitive' } },
        { series: { contains: q, mode: 'insensitive' } },
        { developer: { contains: q, mode: 'insensitive' } },
        { publisher: { contains: q, mode: 'insensitive' } },
        { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
      ],
    });
  }
  if (f.genre) and.push({ genres: { some: { genre: { slug: f.genre } } } });
  if (f.platform) and.push({ platform: { slug: f.platform } });
  if (f.resolution) and.push({ resolution: { slug: f.resolution } });
  if (f.language) and.push({ language: f.language });
  if (f.vietnamized) and.push({ vietnamized: true });
  if (f.collection) and.push({ collections: { some: { collection: { slug: f.collection } } } });
  if (f.yearFrom != null) and.push({ releaseYear: { gte: f.yearFrom } });
  if (f.yearTo != null) and.push({ releaseYear: { lte: f.yearTo } });
  if (f.minDownloads != null) and.push({ downloadCount: { gte: f.minDownloads } });
  if (f.updatedWithinDays != null) {
    and.push({ updatedAt: { gte: new Date(Date.now() - f.updatedWithinDays * 86400_000) } });
  }
  if (f.maxSizeKb != null) {
    and.push({ versions: { some: { latest: true, sizeBytes: { lte: BigInt(f.maxSizeKb * 1024) } } } });
  }
  // Rating trung bình không lưu sẵn → xấp xỉ bằng ratingSum >= minRating * ratingCount
  // Prisma không so sánh 2 cột, nên lọc theo số lượt tối thiểu rồi lọc tiếp ở tầng ứng dụng.
  if (f.minRating != null) and.push({ ratingCount: { gt: 0 } });

  return { AND: and };
}

export function gameOrderBy(sort: GameSort): Prisma.GameOrderByWithRelationInput[] {
  switch (sort) {
    case 'newest':
      return [{ publishedAt: 'desc' }, { createdAt: 'desc' }];
    case 'updated':
      return [{ updatedAt: 'desc' }];
    case 'downloaded':
      return [{ downloadCount: 'desc' }, { publishedAt: 'desc' }];
    case 'rating':
      return [{ ratingSum: 'desc' }, { ratingCount: 'desc' }];
    case 'name':
      return [{ title: 'asc' }];
    case 'popular':
    case 'relevance':
    default:
      return [{ trendingScore: 'desc' }, { viewCount: 'desc' }, { publishedAt: 'desc' }];
  }
}

/** Đọc bộ lọc từ query string của trang catalog. */
export function parseGameFilter(sp: Record<string, string | string[] | undefined>): GameFilter {
  const one = (k: string) => {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() ? s.trim() : undefined;
  };
  const num = (k: string) => {
    const s = one(k);
    if (!s) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    q: one('q'),
    genre: one('genre'),
    platform: one('platform'),
    resolution: one('resolution'),
    language: one('language'),
    vietnamized: one('vi') === '1',
    yearFrom: num('yearFrom'),
    yearTo: num('yearTo'),
    minRating: num('minRating'),
    maxSizeKb: num('maxSizeKb'),
    minDownloads: num('minDownloads'),
    updatedWithinDays: num('updatedIn'),
    collection: one('collection'),
  };
}

/** Chuỗi query chuẩn hoá (bỏ giá trị rỗng) để dựng link phân trang. */
export function gameFilterQuery(f: GameFilter, extra: Record<string, string | undefined> = {}): string {
  const p = new URLSearchParams();
  const put = (k: string, v: string | number | undefined | null) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  };
  put('q', f.q);
  put('genre', f.genre);
  put('platform', f.platform);
  put('resolution', f.resolution);
  put('language', f.language);
  if (f.vietnamized) p.set('vi', '1');
  put('yearFrom', f.yearFrom);
  put('yearTo', f.yearTo);
  put('minRating', f.minRating);
  put('maxSizeKb', f.maxSizeKb);
  put('minDownloads', f.minDownloads);
  put('updatedIn', f.updatedWithinDays);
  put('collection', f.collection);
  for (const [k, v] of Object.entries(extra)) put(k, v);
  return p.toString();
}

// ============================================================
// Fuzzy search (autocomplete)
// ============================================================

/** Khoảng cách Levenshtein rút gọn (dùng cho fuzzy match tên game ngắn). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Bỏ dấu tiếng Việt + hạ chữ thường để so khớp "viet hoa" ~ "Việt hóa". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Điểm liên quan cho fuzzy search: khớp đầu chuỗi > khớp chứa > khớp gần đúng.
 * Trả 0 nếu không liên quan.
 */
export function relevanceScore(haystack: string, needle: string): number {
  const h = normalize(haystack);
  const n = normalize(needle);
  if (!n) return 0;
  if (h === n) return 100;
  if (h.startsWith(n)) return 90 - Math.min(20, h.length - n.length) * 0.5;
  const idx = h.indexOf(n);
  if (idx >= 0) return 70 - Math.min(20, idx);
  // Fuzzy: so cả chuỗi và từng từ, chấp nhận sai lệch tăng dần theo độ dài từ
  // khoá — từ khoá càng ngắn thì một ký tự sai càng dễ tạo kết quả rác.
  const words = h.split(/\s+/);
  let best = Infinity;
  for (const w of [h, ...words]) best = Math.min(best, levenshtein(w, n));
  const tolerance = n.length <= 3 ? 0 : n.length <= 5 ? 1 : Math.floor(n.length / 3);
  return best <= tolerance ? 50 - best * 5 : 0;
}
