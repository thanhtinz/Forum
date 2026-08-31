import { Prisma } from '@prisma/client';
import { db } from './db';
import { authorChipSelect, toAuthorChip } from './shop';
import { threadExcerpt } from './bbcode';
import type { ThreadRowData } from '@/components/forum/ThreadRow';
import { tinhSoTrang } from '@/lib/utils';

/**
 * Trang "Chưa đọc" — gom mọi chủ đề có bài mới kể từ lần mình ghé.
 *
 * Dấu chấm mới trên từng danh sách đã có sẵn (xem `thread-read.ts`), nhưng nó
 * chỉ trả lời được "trang đang mở có gì mới không". Cái người ta thật sự muốn
 * là câu hỏi ngược lại: "đi vắng mấy hôm, giờ có gì mới ở KHẮP diễn đàn?" —
 * mà câu ấy thì phải lọc từ dưới cơ sở dữ liệu lên.
 *
 * Vì sao phải viết SQL thô: điều kiện "chưa đọc" là so hai cột ở HAI bảng khác
 * nhau — hoạt động cuối của chủ đề với mốc đọc của riêng người này. Prisma chỉ
 * so được cột với cột trong cùng một bảng, nên nếu làm bằng Prisma thì phải
 * lấy về rồi lọc trong JS. Lọc trong JS thì đếm tổng sai, mà đếm sai thì thanh
 * phân trang chỉ ra những trang trống — lỗi khó chịu hơn nhiều so với việc
 * phải đọc một câu SQL.
 */

export const NEW_PER_PAGE = 20;
/**
 * Trần số trang. Người đi vắng nửa năm về có thể có hàng nghìn chủ đề chưa
 * đọc; lật tới trang 500 thì chẳng để làm gì mà `OFFSET` càng sâu càng chậm.
 */
export const NEW_MAX_PAGES = 25;

export const NEW_TABS = [
  { key: 'tat-ca', label: 'Tất cả' },
  { key: 'theo-doi', label: 'Đang theo dõi' },
] as const;
export type NewTabKey = (typeof NEW_TABS)[number]['key'];

export function isNewTab(v: string | undefined): v is NewTabKey {
  return NEW_TABS.some((t) => t.key === v);
}

export interface NewThreadsResult {
  rows: (ThreadRowData & { forum: { slug: string; name: string } })[];
  page: number;
  totalPages: number;
  /** Tổng số chủ đề chưa đọc — dùng cho dòng tóm tắt, không kẹp theo trần trang. */
  total: number;
}

/**
 * Một chủ đề là CHƯA ĐỌC với người này khi hoạt động cuối của nó muộn hơn cả
 * hai mốc: mốc "đã đọc hết" chung, và mốc mở riêng chủ đề đó (nếu có).
 *
 * Bài của chính mình vẫn tính, giống forum ngày trước: đăng xong là được đưa
 * thẳng vào chủ đề nên nó tự thành đã đọc ngay, không đọng lại trong danh sách.
 */
function dieuKien(userId: string, allRead: Date, tab: NewTabKey): Prisma.Sql {
  const theoDoi = tab === 'theo-doi'
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM "ThreadFollow" f
        WHERE f."threadId" = t.id AND f."userId" = ${userId}
      )`
    : Prisma.empty;

  return Prisma.sql`
    FROM "Thread" t
    LEFT JOIN "ThreadRead" r ON r."threadId" = t.id AND r."userId" = ${userId}
    WHERE t.status = 'PUBLISHED'
      AND COALESCE(t."lastReplyAt", t."createdAt") > ${allRead}
      AND (r."readAt" IS NULL OR COALESCE(t."lastReplyAt", t."createdAt") > r."readAt")
      -- Khu vực đặt huy hiệu bắt buộc thì chỉ lọt vào "chưa đọc" của người CÓ
      -- huy hiệu ấy — không thì thông báo chưa đọc lại là chỗ rò rỉ đầu tiên
      -- (không tính điều hành viên riêng của khu vực, một khoảng hụt nhỏ
      -- chấp nhận được: họ chỉ mất thông báo ở ô này, trang khu vực vẫn mở
      -- bình thường vì checkForumViewAccess() kiểm riêng, đầy đủ hơn ở đó).
      AND NOT EXISTS (
        SELECT 1 FROM "Forum" gf
        WHERE gf.id = t."forumId" AND gf."requiredMedalId" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "UserMedal" um
            WHERE um."userId" = ${userId} AND um."medalId" = gf."requiredMedalId"
          )
      )
      ${theoDoi}
  `;
}

export async function getNewThreads(
  userId: string,
  tab: NewTabKey,
  pageRaw: number,
): Promise<NewThreadsResult> {
  const me = await db.user.findUnique({ where: { id: userId }, select: { forumReadAt: true } });
  // Chưa từng bấm "đọc hết" thì lấy mốc xa nhất có thể, để điều kiện luôn đúng.
  const allRead = me?.forumReadAt ?? new Date(0);

  const loc = dieuKien(userId, allRead, tab);

  const [dem] = await db.$queryRaw<{ n: bigint }[]>(
    Prisma.sql`SELECT COUNT(*)::bigint AS n ${loc}`,
  );
  const total = Number(dem?.n ?? 0);
  const totalPages = Math.min(NEW_MAX_PAGES, tinhSoTrang(total, NEW_PER_PAGE));
  const page = Math.min(Math.max(1, pageRaw), totalPages);

  const ids = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT t.id ${loc}
    ORDER BY COALESCE(t."lastReplyAt", t."createdAt") DESC
    LIMIT ${NEW_PER_PAGE} OFFSET ${(page - 1) * NEW_PER_PAGE}
  `);
  if (ids.length === 0) return { rows: [], page, totalPages, total };

  // Lấy nội dung hiển thị bằng Prisma cho khỏi phải tự ghép người viết, khung
  // avatar, màu tên… — số hàng đã bị chặn bởi danh sách id ở trên.
  const threads = await db.thread.findMany({
    where: { id: { in: ids.map((x) => x.id) } },
    include: {
      author: { select: authorChipSelect },
      forum: { select: { slug: true, name: true } },
    },
  });

  // `in:` không giữ thứ tự, mà thứ tự mới là thứ ta vừa nhọc công sắp ở SQL.
  const theoId = new Map(threads.map((t) => [t.id, t]));
  const rows = ids
    .map((x) => theoId.get(x.id))
    .filter((t): t is (typeof threads)[number] => !!t)
    .map((t) => ({
      id: t.id, title: t.title, createdAt: t.createdAt, lastReplyAt: t.lastReplyAt,
      pinned: t.pinned, locked: t.locked, solved: !!t.solvedReplyId, bountyPoints: t.bountyPoints,
      viewCount: t.viewCount, replyCount: t.replyCount, author: toAuthorChip(t.author),
      excerpt: threadExcerpt(t.content),
      // Cả trang này chỉ toàn bài chưa đọc nên dòng nào cũng mang dấu mới.
      unread: true,
      forum: t.forum,
    }));

  return { rows, page, totalPages, total };
}
