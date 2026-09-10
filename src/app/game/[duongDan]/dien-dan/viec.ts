'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { batBuocDangNhap } from '@/lib/xac-thuc';

export interface KetQua { loi?: string }

const TIEU_DE_TOI_DA = 150;
const NOI_DUNG_TOI_DA = 8000;

/** Mở một chủ đề mới trong khu diễn đàn của một game. */
export async function dangChuDe(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để đăng bài.' }; }

  const duongDan = String(form.get('duongDan') ?? '');
  const tieuDe = String(form.get('tieuDe') ?? '').trim();
  const noiDung = String(form.get('noiDung') ?? '').trim();

  if (tieuDe.length < 5) return { loi: 'Tiêu đề cần ít nhất 5 ký tự.' };
  if (tieuDe.length > TIEU_DE_TOI_DA) return { loi: `Tiêu đề tối đa ${TIEU_DE_TOI_DA} ký tự.` };
  if (noiDung.length < 10) return { loi: 'Nội dung cần ít nhất 10 ký tự.' };
  if (noiDung.length > NOI_DUNG_TOI_DA) return { loi: `Nội dung tối đa ${NOI_DUNG_TOI_DA} ký tự.` };

  // Điều kiện "game đang hiện" nằm trong truy vấn: đăng bài vào một game đã bị
  // gỡ thì bài ấy không có chỗ nào hiện ra, coi như mất trắng công người viết.
  const game = await db.game.findFirst({
    where: { duongDan, trangThai: 'DANG_HIEN' }, select: { id: true },
  });
  if (!game) return { loi: 'Không tìm thấy game này.' };

  const chuDe = await db.chuDe.create({
    data: { gameId: game.id, nguoiId: nguoi.id, tieuDe, noiDung },
    select: { id: true },
  });

  revalidatePath(`/game/${duongDan}`);
  redirect(`/game/${duongDan}/dien-dan/${chuDe.id}`);
}

/**
 * Trả lời một chủ đề.
 *
 * Bộ đếm `soTraLoi` và mốc `traLoiCuoiLuc` cập nhật trong CÙNG giao dịch với
 * bài trả lời. Tách ra hai lần ghi thì chỉ cần một lần lỗi giữa chừng là con
 * số đếm lệch hẳn khỏi số bài thật, và không có gì kéo nó về đúng nữa.
 */
export async function traLoi(_truoc: KetQua, form: FormData): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để trả lời.' }; }

  const chuDeId = String(form.get('chuDeId') ?? '');
  const duongDan = String(form.get('duongDan') ?? '');
  const noiDung = String(form.get('noiDung') ?? '').trim();

  if (noiDung.length < 2) return { loi: 'Hãy viết vài chữ đã.' };
  if (noiDung.length > NOI_DUNG_TOI_DA) return { loi: `Tối đa ${NOI_DUNG_TOI_DA} ký tự.` };

  // Chủ đề bị khoá thì không nhận thêm bài — kiểm trong `where`, không lọc sau.
  const chuDe = await db.chuDe.findFirst({
    where: { id: chuDeId, khoa: false, game: { trangThai: 'DANG_HIEN' } },
    select: { id: true },
  });
  if (!chuDe) return { loi: 'Chủ đề này đã khoá hoặc không còn.' };

  await db.$transaction(async (tx) => {
    await tx.traLoi.create({ data: { chuDeId, nguoiId: nguoi.id, noiDung }, select: { id: true } });
    await tx.chuDe.update({
      where: { id: chuDeId },
      data: { soTraLoi: { increment: 1 }, traLoiCuoiLuc: new Date() },
      select: { id: true },
    });
  });

  revalidatePath(`/game/${duongDan}/dien-dan/${chuDeId}`);
  return {};
}
