import type { ForumAccess } from '@prisma/client';
import { db } from './db';
import { canModerateForum } from './moderation';

export interface PostAccessForum {
  id: string;
  postAccess: ForumAccess;
  minLevel: number;
  /** Huy hiệu bắt buộc để XEM khu vực — xem được mới nói tới chuyện đăng bài. */
  requiredMedalId?: string | null;
}

/**
 * Kiểm tra người dùng có được mở chủ đề mới ở khu vực này không.
 *
 * Trả về câu báo lỗi tiếng Việt nếu không được, null nếu được. Gọi ở cả trang
 * đăng lẫn server action: trang để khỏi cho người ta gõ xong mới báo, action
 * để chặn thật — ai gửi thẳng biểu mẫu cũng không lách được.
 *
 * Huy hiệu bắt buộc kiểm TRƯỚC `postAccess`/`minLevel`: một khu vực đã khoá
 * xem thì dĩ nhiên khoá đăng luôn — không có ai vừa không xem được chủ đề bên
 * trong vừa mở được chủ đề mới ở đó. Trước đây trang `/new` không hề biết tới
 * huy hiệu, nên ai đoán ra đường dẫn `/forum/<slug>/new` là đăng thẳng vào một
 * khu vực mà chính họ không xem nổi.
 */
export async function checkForumPostAccess(
  userId: string,
  forum: PostAccessForum,
): Promise<string | null> {
  const me = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, level: true },
  });
  if (!me) return 'Không tìm thấy tài khoản của bạn.';

  // Điều hành viên của khu vực bỏ qua mọi hạn chế: họ vốn là người quản nó.
  const isMod = await canModerateForum(me, forum.id);
  if (isMod) return null;

  if (forum.requiredMedalId) {
    const own = await db.userMedal.findFirst({
      where: { userId, medalId: forum.requiredMedalId },
      select: { id: true },
    });
    if (!own) {
      const medal = await db.medal.findUnique({ where: { id: forum.requiredMedalId }, select: { name: true } });
      return medal ? `Cần có huy hiệu "${medal.name}" mới đăng được ở khu vực này.` : null;
    }
  }

  if (forum.postAccess === 'MODERATORS') {
    return 'Khu vực này chỉ điều hành viên mới được mở chủ đề.';
  }
  if (me.level < forum.minLevel) {
    return `Bạn cần đạt cấp ${forum.minLevel} để đăng ở diễn đàn này.`;
  }
  return null;
}
