import { db } from './db';
import { grantPoints } from './points';
import { notify } from './notify';
import { lockUsers } from './lock';

/** Điểm thưởng cho người giới thiệu khi mời thành công một thành viên mới. */
export const INVITE_BONUS_POINTS = 20;

/**
 * Số lượt mời được thưởng tối đa trong một ngày (giờ VN).
 *
 * Mời thật thì mỗi ngày vài người đã là nhiều; con số này để một người không
 * biến việc mời thành cỗ máy in điểm.
 */
export const INVITE_DAILY_MAX = 5;

/** Mốc 00:00 hôm nay theo giờ Việt Nam, quy về giờ UTC để so trong truy vấn. */
function dauNgayVN(now = new Date()): Date {
  const ngay = new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  return new Date(Date.parse(`${ngay}T00:00:00Z`) - 7 * 3600 * 1000);
}

/**
 * Thưởng cho người đã giới thiệu `userId` — gọi khi người này ĐĂNG BÀI ĐẦU TIÊN.
 *
 * Trước đây phần thưởng trả ngay lúc tạo tài khoản, không kiểm gì cả: mỗi email
 * mới là thêm điểm cho người mời, lặp bao nhiêu lần cũng được. Tài khoản trống
 * thì tạo bao nhiêu chẳng tốn gì, nên đó là máy in điểm chứ không phải phần
 * thưởng cho việc kéo người thật về.
 *
 * Nay phần thưởng chỉ trả khi người được mời làm ra nội dung thật. Ba lớp chặn:
 *   • chỉ trả MỘT lần cho mỗi người được mời — nhận diện bằng `PointsLog.refId`
 *     vốn đã mang đúng id của người ấy, nên không phải đẻ thêm bảng hay cột,
 *   • trần số lượt được thưởng mỗi ngày của người mời,
 *   • (ở `registerAction`) chặn số lần đăng ký từ cùng một địa chỉ IP.
 *
 * Gọi SAU khi bài đã lưu xong, trong transaction riêng của nó, và KHÔNG bao giờ
 * ném lỗi ra ngoài: hỏng phần thưởng thì cũng không được làm hỏng bài người ta
 * vừa viết. Khoá hàng người được mời để hai bài đăng cùng lúc không cùng đọc
 * thấy "chưa thưởng" rồi cùng thưởng.
 */
export async function thuongNguoiMoi(userId: string): Promise<void> {
  try {
    await db.$transaction(async (tx) => {
      await lockUsers(tx, userId);

      const me = await tx.user.findUnique({
        where: { id: userId },
        select: { username: true, invitedById: true },
      });
      if (!me?.invitedById) return;

      // Đã thưởng cho người này rồi thì thôi — đây cũng là thứ khiến bài thứ
      // hai, thứ ba của cùng một người không sinh thêm điểm.
      const daThuong = await tx.pointsLog.findFirst({
        where: { userId: me.invitedById, reason: 'INVITE_BONUS', refId: userId },
        select: { id: true },
      });
      if (daThuong) return;

      const trongNgay = await tx.pointsLog.count({
        where: { userId: me.invitedById, reason: 'INVITE_BONUS', createdAt: { gte: dauNgayVN() } },
      });
      if (trongNgay >= INVITE_DAILY_MAX) return;

      const ten = me.username ?? 'Thành viên mới';
      await grantPoints({
        userId: me.invitedById, amount: INVITE_BONUS_POINTS, reason: 'INVITE_BONUS',
        refId: userId, note: `Mời thành công @${ten}`,
      }, tx);
      await notify({
        userId: me.invitedById, type: 'SYSTEM', title: 'Mời bạn thành công',
        content: `@${ten} bạn mời đã đăng bài đầu tiên. Bạn nhận ${INVITE_BONUS_POINTS} điểm.`,
        link: '/user/invite',
      }, tx);
    });
  } catch {
    // Thưởng hỏng thì im lặng bỏ qua: bài vừa viết mới là thứ phải giữ.
  }
}
