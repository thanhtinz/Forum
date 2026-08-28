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

/** Lấy dư một ít ở mỗi nguồn rồi mới trộn: nguồn nào cũng có thể chiếm hết. */
const PER_SOURCE = 10;

export async function getUserActivity(
  owner: { id: string; username: string | null },
  viewer: Viewer,
  limit = 12,
): Promise<ActivityItem[]> {
  const ownerId = owner.id;
  const privacies = await visiblePrivacies(viewer, ownerId);

  const [threads, replies, clubPosts, photos] = await Promise.all([
    db.thread.findMany({
      where: { authorId: ownerId, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: PER_SOURCE,
      select: {
        id: true, title: true, content: true, createdAt: true,
        forum: { select: { slug: true, name: true } },
      },
    }),

    db.reply.findMany({
      where: { authorId: ownerId, hidden: false, thread: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      take: PER_SOURCE,
      select: {
        id: true, content: true, createdAt: true,
        thread: { select: { id: true, title: true, forum: { select: { slug: true, name: true } } } },
      },
    }),

    // Bảng tin câu lạc bộ: chỉ lấy bài của nhóm công khai, hoặc nhóm mà chính
    // người đang xem có chân. Điều kiện nằm ngay trong `where`.
    db.clubPost.findMany({
      where: {
        authorId: ownerId,
        club: viewer.id
          ? {
              OR: [
                { privacy: 'PUBLIC' },
                { members: { some: { userId: viewer.id, status: 'ACTIVE' } } },
              ],
            }
          : { privacy: 'PUBLIC' },
      },
      orderBy: { createdAt: 'desc' },
      take: PER_SOURCE,
      select: {
        id: true, content: true, createdAt: true,
        club: { select: { slug: true, name: true } },
      },
    }),

    db.photo.findMany({
      where: { album: { ownerId, privacy: { in: privacies } } },
      orderBy: { createdAt: 'desc' },
      take: PER_SOURCE,
      select: {
        id: true, url: true, caption: true, createdAt: true,
        album: { select: { id: true, name: true } },
      },
    }),
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
      title: c.club.name, excerpt: truncate(plainText(c.content), 120),
      href: `/clb/${c.club.slug}`, where: 'Câu lạc bộ', thumb: null,
    })),

    ...photos.map((p) => ({
      id: `photo-${p.id}`, kind: 'PHOTO' as const, at: p.createdAt,
      title: p.album.name, excerpt: p.caption ? truncate(p.caption, 120) : null,
      href: `/u/${owner.username ?? ''}/album/${p.album.id}`, where: 'Album ảnh', thumb: p.url,
    })),
  ];

  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  return items.slice(0, limit);
}
