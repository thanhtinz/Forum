'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';

export interface KetQuaLuu { loi?: string; daLuu?: boolean }

/**
 * Bật hoặc tắt "lưu lại" cho một game.
 *
 * MỘT HÀM cho cả hai chiều, và trạng thái mới do MÁY CHỦ quyết chứ không nhận
 * từ trình duyệt: nhận `muon: boolean` gửi lên thì hai tab mở song song sẽ đá
 * nhau — tab cũ vẫn tưởng game chưa lưu lại và gửi lên "bật", ghi đè lên cú
 * tắt vừa xong ở tab kia.
 *
 * Mỗi người mỗi game đúng một hàng (khoá duy nhất trong lược đồ), nên bấm hai
 * lần thật nhanh cũng không đẻ ra hai hàng: `create` thứ hai vấp khoá ấy, và
 * ta coi lỗi trùng khoá là "đã bật rồi" chứ không báo hỏng — người bấm không
 * quan tâm ai thắng cuộc đua, họ chỉ muốn thấy trái tim sáng lên.
 *
 * Hàm này là địa chỉ POST công khai, nên `nguoiId` lấy từ phiên đăng nhập chứ
 * không bao giờ nhận từ ngoài.
 */
export async function doiLuu(gameId: string): Promise<KetQuaLuu> {
  const nguoi = await nguoiHienTai();
  if (!nguoi) return { loi: 'Bạn cần đăng nhập để lưu lại game.' };

  const khoa = { gameId_nguoiId: { gameId, nguoiId: nguoi.id } };
  const dangCo = await db.daLuu.findUnique({ where: khoa, select: { id: true } });

  if (dangCo) {
    // `deleteMany` chứ không `delete`: hai tab cùng bấm tắt thì tab chậm hơn
    // sẽ xoá một hàng không còn nữa, và `delete` ném lỗi vì chuyện ấy.
    await db.daLuu.deleteMany({ where: { gameId, nguoiId: nguoi.id } });
  } else {
    try {
      await db.daLuu.create({ data: { gameId, nguoiId: nguoi.id }, select: { id: true } });
    } catch {
      // Trùng khoá duy nhất — ai đó (hoặc chính người này ở tab khác) vừa bật.
      return { daLuu: true };
    }
  }

  revalidatePath('/da-luu');
  return { daLuu: !dangCo };
}

/**
 * Bỏ một game khỏi danh sách đã lưu.
 *
 * Riêng một hàm chứ không mượn `doiLuu`: ở trang Đã lưu, cái nút trên mỗi
 * hàng CHỈ có nghĩa "bỏ đi". Mượn hàm bật/tắt thì hai cú bấm vội — hoặc một cú
 * bấm trong lúc trang đang tải lại — sẽ bỏ rồi thêm lại, và người dùng thấy
 * game biến mất xong hiện lên như trêu.
 *
 * `deleteMany` nên gọi mấy lần cũng thế, và không ném lỗi khi hàng đã mất.
 */
export async function boLuu(gameId: string): Promise<KetQuaLuu> {
  const nguoi = await nguoiHienTai();
  if (!nguoi) return { loi: 'Bạn cần đăng nhập.' };

  await db.daLuu.deleteMany({ where: { gameId, nguoiId: nguoi.id } });
  revalidatePath('/da-luu');
  return { daLuu: false };
}
