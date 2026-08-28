import type { Prisma } from '@prisma/client';

/**
 * Bộ lọc của tìm kiếm chủ đề.
 *
 * Trước đây ô tìm kiếm chỉ nhận mỗi từ khoá, mà diễn đàn dùng lâu thì một từ
 * thông dụng trả về hàng trăm dòng — người tìm biết rõ mình cần bài của ai,
 * trong khu nào, hồi nào, nhưng không có cách nào nói ra.
 *
 * Tệp này thuần: nhận tham số trên URL, trả về mệnh đề `where` và `orderBy`.
 * Không đụng cơ sở dữ liệu nên trang nào cũng gọi được, và kiểm được bằng mắt.
 */

export const SEARCH_WHEN = [
  { key: 'all', label: 'Mọi lúc', days: 0 },
  { key: 'day', label: '24 giờ qua', days: 1 },
  { key: 'week', label: '7 ngày qua', days: 7 },
  { key: 'month', label: '30 ngày qua', days: 30 },
  { key: 'year', label: '1 năm qua', days: 365 },
] as const;

export type SearchWhen = (typeof SEARCH_WHEN)[number]['key'];

export const SEARCH_SORTS = [
  { key: 'recent', label: 'Mới hoạt động' },
  { key: 'new', label: 'Mới lập' },
  { key: 'replies', label: 'Nhiều trả lời' },
  { key: 'views', label: 'Nhiều lượt xem' },
] as const;

export type SearchSort = (typeof SEARCH_SORTS)[number]['key'];

export function isSearchWhen(v: string | undefined): v is SearchWhen {
  return SEARCH_WHEN.some((x) => x.key === v);
}

export function isSearchSort(v: string | undefined): v is SearchSort {
  return SEARCH_SORTS.some((x) => x.key === v);
}

const ORDER: Record<SearchSort, Prisma.ThreadOrderByWithRelationInput[]> = {
  recent: [{ lastReplyAt: 'desc' }, { createdAt: 'desc' }],
  new: [{ createdAt: 'desc' }],
  replies: [{ replyCount: 'desc' }, { createdAt: 'desc' }],
  views: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
};

export interface ThreadSearchInput {
  q: string;
  /** Slug khu vực; rỗng là tìm khắp diễn đàn. */
  forum?: string;
  /** Tên đăng nhập của người lập chủ đề. */
  author?: string;
  when?: SearchWhen;
  sort?: SearchSort;
  /** Chỉ chủ đề đã có lời giải. */
  solved?: boolean;
}

export interface ThreadSearchQuery {
  where: Prisma.ThreadWhereInput;
  orderBy: Prisma.ThreadOrderByWithRelationInput[];
  /** Có bộ lọc nào đang bật ngoài từ khoá không — để giao diện biết mà mở sẵn bảng lọc. */
  filtered: boolean;
}

/** Dựng câu truy vấn từ các lựa chọn trên URL. */
export function buildThreadSearch(input: ThreadSearchInput): ThreadSearchQuery {
  const q = input.q.trim();
  const when: SearchWhen = input.when ?? 'all';
  const sort: SearchSort = input.sort ?? 'recent';
  const forum = input.forum?.trim();
  const author = input.author?.trim();

  const like = { contains: q, mode: 'insensitive' as const };
  const where: Prisma.ThreadWhereInput = {
    status: 'PUBLISHED',
    ...(q ? { OR: [{ title: like }, { content: like }] } : {}),
    ...(forum ? { forum: { slug: forum } } : {}),
    // Lọc theo QUAN HỆ chứ không tra tên ra id rồi lọc: bớt một lượt hỏi, mà
    // tên không có thật thì tự khắc ra rỗng chứ không phải xử lý riêng.
    ...(author ? { author: { username: author } } : {}),
    ...(input.solved ? { solvedReplyId: { not: null } } : {}),
  };

  const days = SEARCH_WHEN.find((x) => x.key === when)?.days ?? 0;
  if (days > 0) {
    where.createdAt = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
  }

  return {
    where,
    orderBy: ORDER[sort],
    filtered: !!forum || !!author || when !== 'all' || sort !== 'recent' || !!input.solved,
  };
}
