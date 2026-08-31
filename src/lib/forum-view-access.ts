import { db } from './db';
import { canModerateForum } from './moderation';

export interface ViewAccessForum {
  id: string;
  requiredMedalId: string | null;
}

export interface ForumViewAccess {
  /** Được xem nội dung khu vực này chưa? */
  allowed: boolean;
  /** Tên huy hiệu cần có; null nghĩa là khu vực công khai. */
  medalName: string | null;
}

/**
 * Ai được xem một khu vực diễn đàn đặt huy hiệu bắt buộc.
 *
 * Khác `checkForumPostAccess` (chỉ chặn MỞ CHỦ ĐỀ MỚI): đây chặn cả việc XEM
 * — khu vực không đặt huy hiệu thì ai cũng xem được như trước giờ; đặt rồi thì
 * phải có đúng huy hiệu ấy trong `UserMedal`, không cần hiển thị (`displayed`
 * false cũng tính, vì đó là quyền sở hữu chứ không phải chuyện khoe ra).
 * Điều hành viên của khu vực và ADMIN/MODERATOR toàn site luôn xem được — họ
 * là người quản lý nội dung bên trong.
 */
export async function checkForumViewAccess(
  userId: string | null,
  role: string | null | undefined,
  forum: ViewAccessForum,
): Promise<ForumViewAccess> {
  if (!forum.requiredMedalId) return { allowed: true, medalName: null };

  const medal = await db.medal.findUnique({
    where: { id: forum.requiredMedalId },
    select: { name: true },
  });
  // Huy hiệu bị xoá mà khu vực còn trỏ tới id cũ: coi như hết khoá, không
  // biến khu vực thành ngõ cụt vì một tham chiếu treo.
  if (!medal) return { allowed: true, medalName: null };

  if (userId) {
    const isMod = await canModerateForum({ id: userId, role }, forum.id);
    if (isMod) return { allowed: true, medalName: medal.name };

    const own = await db.userMedal.findFirst({
      where: { userId, medalId: forum.requiredMedalId },
      select: { id: true },
    });
    if (own) return { allowed: true, medalName: medal.name };
  }

  return { allowed: false, medalName: medal.name };
}
