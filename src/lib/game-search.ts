import { db } from '@/lib/db';
import {
  gameCardSelect, gameOrderBy, gameWhere, relevanceScore, toGameCard,
  type GameCardData, type GameFilter, type GameSort,
} from '@/lib/game';

/**
 * Tìm game với fuzzy fallback.
 *
 * Bước 1 dùng `contains` của Postgres cho nhanh. Nếu chưa đủ kết quả (gõ sai
 * chính tả, thiếu dấu, viết tắt) thì mở rộng sang một tập ứng viên rộng hơn và
 * xếp hạng bằng `relevanceScore` — nhờ vậy "kontra" vẫn ra "Contra 4".
 */

/** Số ứng viên tối đa lấy về cho vòng xếp hạng fuzzy. */
const FUZZY_POOL = 300;
/** Điểm liên quan tối thiểu để một game được coi là khớp fuzzy. */
const MIN_SCORE = 30;

export interface SearchResult {
  items: GameCardData[];
  total: number;
  /** true khi kết quả đến từ vòng fuzzy chứ không phải khớp trực tiếp. */
  fuzzy: boolean;
}

export interface SearchOptions {
  sort: GameSort;
  page?: number;
  pageSize: number;
}

export async function searchGames(filter: GameFilter, { sort, page = 1, pageSize }: SearchOptions): Promise<SearchResult> {
  const q = filter.q?.trim() ?? '';
  const slice = (list: GameCardData[]) => list.slice((page - 1) * pageSize, page * pageSize);

  // Không có từ khoá → chỉ là danh sách có lọc + sắp xếp thông thường.
  if (!q) {
    const where = gameWhere(filter);

    // Lọc theo rating trung bình phải làm ở tầng ứng dụng, nên phải lấy cả tập
    // rồi mới phân trang — nếu không tổng số trang sẽ sai.
    if (filter.minRating != null) {
      const all = await db.game.findMany({ where, orderBy: gameOrderBy(sort), take: FUZZY_POOL, select: gameCardSelect });
      const items = applyRatingFilter(all.map(toGameCard), filter);
      return { items: slice(items), total: items.length, fuzzy: false };
    }

    const [total, rows] = await Promise.all([
      db.game.count({ where }),
      db.game.findMany({ where, orderBy: gameOrderBy(sort), skip: (page - 1) * pageSize, take: pageSize, select: gameCardSelect }),
    ]);
    return { items: rows.map(toGameCard), total, fuzzy: false };
  }

  // Vòng 1: khớp trực tiếp.
  const direct = await db.game.findMany({
    where: gameWhere(filter),
    orderBy: gameOrderBy(sort),
    take: FUZZY_POOL,
    select: gameCardSelect,
  });
  let items = applyRatingFilter(direct.map(toGameCard), filter);

  // Vòng 2: chưa đủ kết quả thì thử fuzzy trên tập ứng viên rộng hơn.
  let fuzzy = false;
  if (items.length < pageSize) {
    const pool = await db.game.findMany({
      where: gameWhere({ ...filter, q: undefined }),
      orderBy: gameOrderBy(sort),
      take: FUZZY_POOL,
      select: gameCardSelect,
    });
    const seen = new Set(items.map((g) => g.id));
    const extra = applyRatingFilter(pool.map(toGameCard), filter)
      .filter((g) => !seen.has(g.id))
      .map((g) => ({ g, s: scoreOf(g, q) }))
      .filter((x) => x.s >= MIN_SCORE)
      .sort((a, b) => b.s - a.s || b.g.downloadCount - a.g.downloadCount)
      .map((x) => x.g);
    if (extra.length > 0) fuzzy = items.length === 0;
    items = [...items, ...extra];
  }

  if (sort === 'relevance') {
    items = items
      .map((g) => ({ g, s: scoreOf(g, q) }))
      .sort((a, b) => b.s - a.s || b.g.downloadCount - a.g.downloadCount)
      .map((x) => x.g);
  }

  return { items: slice(items), total: items.length, fuzzy };
}

/** Điểm liên quan cao nhất trong các trường có thể khớp tên. */
function scoreOf(g: GameCardData, q: string): number {
  return Math.max(
    relevanceScore(g.title, q),
    g.titleVi ? relevanceScore(g.titleVi, q) : 0,
  );
}

/**
 * Rating trung bình không lưu sẵn thành cột nên Prisma không lọc được
 * (không so sánh hai cột) — lọc nốt ở tầng ứng dụng.
 */
function applyRatingFilter(items: GameCardData[], filter: GameFilter): GameCardData[] {
  return filter.minRating != null ? items.filter((g) => g.rating >= filter.minRating!) : items;
}
