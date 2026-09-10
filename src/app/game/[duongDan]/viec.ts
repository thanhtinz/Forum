'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { batBuocDangNhap } from '@/lib/xac-thuc';

export interface KetQua { ok?: boolean; loi?: string }

/**
 * Chấm sao và viết đánh giá. Chấm lại là SỬA bài cũ, không đẻ bài mới.
 *
 * `Game.tongSao` và `Game.soLuotDanhGia` phải khớp lại sau mỗi lần ghi. Cộng
 * dồn thủ công (`tongSao += sao`) thì lúc người ta sửa từ 5 xuống 2 là con số
 * lệch vĩnh viễn, mà không có chỗ nào phát hiện ra. Nên đếm lại từ chính bảng
 * đánh giá, trong CÙNG một giao dịch với lần ghi — đó là thứ luôn đúng.
 */
export async function chamSao(gameId: string, sao: number, noiDung: string): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để đánh giá.' }; }

  if (!Number.isInteger(sao) || sao < 1 || sao > 5) return { loi: 'Hãy chọn từ 1 đến 5 sao.' };

  const chu = noiDung.trim().slice(0, 2000);

  const game = await db.game.findFirst({
    where: { id: gameId, trangThai: 'DANG_HIEN' },
    select: { duongDan: true },
  });
  if (!game) return { loi: 'Không tìm thấy game này.' };

  await db.$transaction(async (tx) => {
    await tx.danhGia.upsert({
      where: { gameId_nguoiId: { gameId, nguoiId: nguoi.id } },
      update: { sao, noiDung: chu || null },
      create: { gameId, nguoiId: nguoi.id, sao, noiDung: chu || null },
      select: { id: true },
    });

    const gom = await tx.danhGia.aggregate({
      where: { gameId }, _sum: { sao: true }, _count: { _all: true },
    });
    await tx.game.update({
      where: { id: gameId },
      data: { tongSao: gom._sum.sao ?? 0, soLuotDanhGia: gom._count._all },
      select: { id: true },
    });
  });

  revalidatePath(`/game/${game.duongDan}`);
  return { ok: true };
}
