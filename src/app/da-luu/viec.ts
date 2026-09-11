'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { batBuocDangNhap } from '@/lib/xac-thuc';

export interface KetQuaLuu { daLuu?: boolean; loi?: string }

/**
 * Bật/tắt việc lưu một game.
 *
 * Một hàm cho cả hai chiều, và trạng thái mới TÍNH TỪ CSDL chứ không nhận từ
 * trình duyệt gửi lên. Nếu để trình duyệt gửi "hãy lưu" hay "hãy bỏ lưu" thì
 * hai tab mở cùng lúc sẽ đá nhau: tab kia bấm lưu rồi, tab này vẫn tưởng
 * chưa, gửi "hãy lưu" lần nữa và vấp ràng buộc duy nhất.
 *
 * `deleteMany` rồi xét `count` chứ không `findFirst` rồi mới xoá: đọc-rồi-ghi
 * là hai lượt, mà giữa hai lượt ấy tab khác chen vào được.
 */
export async function batTatLuu(gameId: string): Promise<KetQuaLuu> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để lưu game.' }; }

  // Điều kiện "game đang hiện" nằm TRONG truy vấn: lưu một game đã bị gỡ thì
  // nó nằm mãi trong danh sách mà bấm vào ra trang không tìm thấy.
  const game = await db.game.findFirst({
    where: { id: gameId, trangThai: 'DANG_HIEN' },
    select: { duongDan: true },
  });
  if (!game) return { loi: 'Không tìm thấy game này.' };

  const daXoa = await db.daLuu.deleteMany({ where: { gameId, nguoiId: nguoi.id } });

  let daLuu = false;
  if (daXoa.count === 0) {
    try {
      await db.daLuu.create({ data: { gameId, nguoiId: nguoi.id }, select: { id: true } });
      daLuu = true;
    } catch {
      // Hai tab bấm cùng lúc: ràng buộc duy nhất chặn hàng thứ hai. Hàng đã
      // có nghĩa là game đang được lưu — đúng thứ ta muốn, coi như xong.
      daLuu = true;
    }
  }

  revalidatePath('/da-luu');
  revalidatePath(`/game/${game.duongDan}`);
  return { daLuu };
}
