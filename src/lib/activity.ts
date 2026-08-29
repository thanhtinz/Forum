import { db } from './db';
import { visiblePrivacies, type Viewer } from './album';
import { threadExcerpt } from './bbcode';
import { plainText, truncate } from './utils';

/**
 * Dòng hoạt động gần đây của một thành viên.
 *
 * Trang cá nhân trước đây chỉ liệt kê chủ đề người ta lập. Nhưng phần lớn thời
 * gian trên diễn đàn là ĐI TRẢ LỜI chỗ khác, đăng lên bảng tin câu lạc bộ, hay
 * bỏ ảnh vào album — nhìn hồ sơ của một người chăm chỉ mà thấy hai dòng thì
 * không nói lên điều gì.
 *
 * Nguyên tắc xuyên suốt: quyền xem nằm trong `where` của từng truy vấn, không
 * lấy hết về rồi lọc. Album riêng tư và bảng tin câu lạc bộ kín mà lấy về trước
 * thì nội dung đã nằm trong gói gửi xuống trình duyệt, xem mã nguồn là thấy.
 */

export type ActivityKind = 'THREAD' | 'REPLY' | 'CLUB_POST' | 'PHOTO';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  at: Date;
  /** Tiêu đề dòng — tên chủ đề, tên câu lạc bộ, tên album… */
  title: string;
  /** Vài chữ trích từ nội dung; ảnh thì để trống. */
  excerpt: string | null;
  href: string;
  /** Nơi diễn ra: tên khu vực, tên câu lạc bộ. */
  where: string | null;
  /** Ảnh nhỏ, chỉ có ở dòng ảnh mới. */
  thumb: string | null;
}

export const ACTIVITY_PER_PAGE = 12;

/**
 * Trần số trang xem được.
 *
 * Dòng hoạt động trộn từ bốn bảng nên muốn lấy trang thứ N phải kéo về N trang
 * ở MỖI nguồn rồi mới trộn — không có cách nào bảo cơ sở dữ liệu "bỏ qua 200
 * dòng" trên một danh sách chưa tồn tại. Càng lật sâu càng tốn, mà chẳng ai lật
 * tới trang hai mươi để xem một người đăng gì hồi nào; muốn đào sâu thì có
 * danh sách chủ đề đầy đủ ngay bên dưới.
 */
export const ACTIVITY_MAX_PAGES = 20;

export interface ActivityPage {
  items: ActivityItem[];
  page: number;
  totalPages: number;
  total: number;
}

export async function getUserActivity(
  owner: { id: string; username: string | null },
  viewer: Viewer,
  opts: { page?: number; pageSize?: number } = {},
): Promise<ActivityPage> {
  const ownerId = owner.id;
  const pageSize = opts.pageSize ?? ACTIVITY_PER_PAGE;
  const page = Math.min(ACTIVITY_MAX_PAGES, Math.max(1, opts.page ?? 1));
  /**
   * Lấy đủ cho tới hết trang đang xem ở TỪNG nguồn.
   *
   * Một dòng nằm trong `page * pageSize` dòng mới nhất của cả bốn nguồn gộp lại
   * thì chắc chắn cũng nằm trong ngần ấy dòng mới nhất của chính nguồn nó — nên
   * lấy chừng này ở mỗi nguồn là đủ, không sót dòng nào.
   */
  const perSource = page * pageSize;
  const privacies = await visiblePrivacies(viewer, ownerId);

  const threadWhere = { authorId: ownerId, status: 'PUBLISHED' as const };
  const replyWhere = { authorId: ownerId, hidden: false, thread: { status: 'PUBLISHED' as const } };
  const clubWhere = {
    authorId: ownerId,
    club: viewer.id
      ? {
          OR: [
            { privacy: 'PUBLIC' as const },
            { members: { some: { userId: viewer.id, status: 'ACTIVE' as const } } },
          ],
        }
      : { privacy: 'PUBLIC' as const },
  };
  const photoWhere = { album: { ownerId, privacy: { in: privacies } } };

  const [threads, replies, clubPosts, photos, total] = await Promise.all([
    db.thread.findMany({
      where: threadWhere,
      orderBy: { createdAt: 'desc' },
      take: perSource,
      select: {
        id: true, title: true, content: true, createdAt: true,
        forum: { select: { slug: true, name: true } },
      },
    }),

    db.reply.findMany({
      where: replyWhere,
      orderBy: { createdAt: 'desc' },
      take: perSource,
      select: {
        id: true, content: true, createdAt: true,
        thread: { select: { id: true, title: true, forum: { select: { slug: true, name: true } } } },
      },
    }),

    // Bảng tin câu lạc bộ: chỉ lấy bài của nhóm công khai, hoặc nhóm mà chính
    // người đang xem có chân. Điều kiện nằm ngay trong `where`.
    db.clubPost.findMany({
      where: clubWhere,
      orderBy: { createdAt: 'desc' },
      take: perSource,
      select: {
        id: true, content: true, createdAt: true,
        club: { select: { slug: true, name: true } },
      },
    }),

    db.photo.findMany({
      where: photoWhere,
      orderBy: { createdAt: 'desc' },
      take: perSource,
      select: {
        id: true, url: true, caption: true, createdAt: true,
        album: { select: { id: true, name: true } },
      },
    }),

    // Tổng để biết có bao nhiêu trang. Bốn phép đếm chạy trên chỉ mục, cơ sở dữ
    // liệu tự đếm chứ không gửi hàng nào về.
    Promise.all([
      db.thread.count({ where: threadWhere }),
      db.reply.count({ where: replyWhere }),
      db.clubPost.count({ where: clubWhere }),
      db.photo.count({ where: photoWhere }),
    ]).then((n) => n.reduce((a, b) => a + b, 0)),
  ]);

  const items: ActivityItem[] = [
    ...threads.map((t) => ({
      id: `thread-${t.id}`, kind: 'THREAD' as const, at: t.createdAt,
      title: t.title, excerpt: threadExcerpt(t.content, 120),
      href: `/forum/${t.forum.slug}/${t.id}`, where: t.forum.name, thumb: null,
    })),

    ...replies.map((r) => ({
      id: `reply-${r.id}`, kind: 'REPLY' as const, at: r.createdAt,
      title: r.thread.title, excerpt: truncate(plainText(r.content), 120),
      href: `/forum/${r.thread.forum.slug}/${r.thread.id}`, where: r.thread.forum.name, thumb: null,
    })),

    ...clubPosts.map((c) => ({
      id: `clubpost-${c.id}`, kind: 'CLUB_POST' as const, at: c.createdAt,
      // Bài bảng tin cũng dựng bằng `bbcodeToHtml` nên có thể mang khối `[hide]`,
      // mà `plainText` bóc mất hai cái mốc chú thích rồi để lại đúng phần ruột.
      // Dòng hoạt động đi ra ngoài câu lạc bộ, nên phải cắt trước khi bóc thẻ.
      title: c.club.name, excerpt: threadExcerpt(c.content, 120),
      href: `/clb/${c.club.slug}`, where: 'Câu lạc bộ', thumb: null,
    })),

    ...photos.map((p) => ({
      id: `photo-${p.id}`, kind: 'PHOTO' as const, at: p.createdAt,
      title: p.album.name, excerpt: p.caption ? truncate(p.caption, 120) : null,
      href: `/u/${owner.username ?? ''}/album/${p.album.id}`, where: 'Album ảnh', thumb: p.url,
    })),
  ];

  items.sort((a, b) => b.at.getTime() - a.at.getTime());

  const totalPages = Math.min(ACTIVITY_MAX_PAGES, Math.max(1, Math.ceil(total / pageSize)));
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    totalPages,
    total,
  };
}
