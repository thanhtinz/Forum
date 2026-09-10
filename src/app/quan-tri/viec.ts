'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { batBuocQuanTri } from '@/lib/xac-thuc';
import { thanhDuongDan } from '@/lib/tien-ich';
import { HE_MAY, laLoaiTep, type MaHeMay, type MaLoaiTep } from '@/lib/he-may';

export interface KetQua { loi?: string }

function chu(form: FormData, ten: string): string {
  return String(form.get(ten) ?? '').trim();
}

/**
 * Thêm hoặc sửa một game.
 *
 * Mọi hàm export trong tệp `'use server'` là một địa chỉ POST CÔNG KHAI: ai
 * biết cách gọi đều gọi được, không đi qua khung `/quan-tri` nào cả. Nên câu
 * `batBuocQuanTri()` ở dòng đầu không phải thừa — nó là lớp chặn thật sự.
 */
export async function luuGame(_truoc: KetQua, form: FormData): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const id = chu(form, 'id') || null;
  const ten = chu(form, 'ten');
  if (ten.length < 2) return { loi: 'Hãy nhập tên game.' };

  const duongDanNhap = chu(form, 'duongDan');
  const duongDan = thanhDuongDan(duongDanNhap || ten);
  if (!duongDan) return { loi: 'Tên game không tạo được đường dẫn hợp lệ.' };

  // Đường dẫn là thứ nằm trên URL nên phải là duy nhất. Kiểm trước để báo một
  // câu người đọc hiểu được, thay vì để ràng buộc của CSDL ném ra lỗi thô.
  const trung = await db.game.findFirst({
    where: { duongDan, ...(id ? { NOT: { id } } : {}) }, select: { id: true },
  });
  if (trung) return { loi: `Đường dẫn “${duongDan}” đã có game khác dùng.` };

  const namRaw = parseInt(chu(form, 'namPhatHanh'), 10);
  const duLieu = {
    duongDan,
    ten,
    tenViet: chu(form, 'tenViet') || null,
    nhaPhatTrien: chu(form, 'nhaPhatTrien') || null,
    namPhatHanh: Number.isFinite(namRaw) && namRaw > 1970 && namRaw < 2100 ? namRaw : null,
    gioiThieu: chu(form, 'gioiThieu') || null,
    cachChoi: chu(form, 'cachChoi') || null,
    luuY: chu(form, 'luuY') || null,
    icon: chu(form, 'icon') || null,
    ngonNgu: chu(form, 'ngonNgu') || 'en',
    vietHoa: form.get('vietHoa') === 'on',
    noiBat: form.get('noiBat') === 'on',
  };

  const game = id
    ? await db.game.update({ where: { id }, data: duLieu, select: { id: true } })
    : await db.game.create({ data: duLieu, select: { id: true } });

  // Thể loại: xoá hết rồi gắn lại. Danh sách chỉ vài mục nên rẻ, mà so từng
  // cái để thêm/bớt thì dài gấp ba lần và dễ sót đúng cái vừa bỏ chọn.
  const theLoaiId = form.getAll('theLoai').map(String).filter(Boolean);
  await db.theLoaiTrenGame.deleteMany({ where: { gameId: game.id } });
  if (theLoaiId.length > 0) {
    await db.theLoaiTrenGame.createMany({
      data: theLoaiId.map((t) => ({ gameId: game.id, theLoaiId: t })),
      skipDuplicates: true,
    });
  }

  revalidatePath('/quan-tri/game');
  revalidatePath(`/game/${duongDan}`);
  redirect(`/quan-tri/game/${game.id}`);
}

/** Đăng game ra kho, hoặc rút về nháp. */
export async function doiTrangThai(gameId: string, trangThai: 'NHAP' | 'DANG_HIEN' | 'DA_GO'): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const game = await db.game.update({
    where: { id: gameId },
    data: {
      trangThai,
      // Ngày đăng chỉ đặt LẦN ĐẦU. Rút về nháp rồi đăng lại mà đặt lại ngày thì
      // game cũ nhảy lên đầu kệ "Mới lên kho", đẩy game mới thật xuống dưới.
      ...(trangThai === 'DANG_HIEN' ? { dangLuc: { set: undefined } } : {}),
    },
    select: { id: true, duongDan: true, dangLuc: true },
  });

  if (trangThai === 'DANG_HIEN' && !game.dangLuc) {
    await db.game.update({ where: { id: gameId }, data: { dangLuc: new Date() }, select: { id: true } });
  }

  revalidatePath('/quan-tri/game');
  revalidatePath(`/game/${game.duongDan}`);
  revalidatePath('/');
  return {};
}

/** Thêm một bản tải kèm một tệp. Gộp làm một vì bản không tệp thì tải bằng gì. */
export async function themBanTai(_truoc: KetQua, form: FormData): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const gameId = chu(form, 'gameId');
  const heMay = chu(form, 'heMay') as MaHeMay;
  const soHieu = chu(form, 'soHieu');
  const duongDanTep = chu(form, 'duongDanTep');
  const loaiTep = chu(form, 'loaiTep') as MaLoaiTep;
  const cuaHang = chu(form, 'duongDanCuaHang');

  if (!(HE_MAY as readonly string[]).includes(heMay)) return { loi: 'Hệ máy không hợp lệ.' };
  if (!soHieu) return { loi: 'Hãy nhập số hiệu bản, ví dụ 1.0.' };

  const game = await db.game.findUnique({ where: { id: gameId }, select: { duongDan: true } });
  if (!game) return { loi: 'Không tìm thấy game.' };

  const daCo = await db.banTai.findFirst({
    where: { gameId, heMay, soHieu }, select: { id: true },
  });
  if (daCo) return { loi: `Bản ${soHieu} của ${heMay} đã có rồi.` };

  await db.$transaction(async (tx) => {
    // Bản mới thành bản mới nhất CỦA HỆ ẤY, và hạ cờ của bản cũ cùng hệ —
    // mỗi hệ chỉ được đúng một bản mang cờ, không thì trang game không biết
    // bày bản nào ra trước.
    await tx.banTai.updateMany({ where: { gameId, heMay }, data: { moiNhat: false } });

    const ban = await tx.banTai.create({
      data: {
        gameId, heMay, soHieu, moiNhat: true,
        ghiChu: chu(form, 'ghiChu') || null,
        doiMoi: chu(form, 'doiMoi') || null,
        duongDanCuaHang: cuaHang || null,
        ngayRa: new Date(),
      },
      select: { id: true },
    });

    if (duongDanTep && laLoaiTep(loaiTep)) {
      await tx.tepTai.create({
        data: { banId: ban.id, loai: loaiTep, duongDan: duongDanTep },
        select: { id: true },
      });
    }
  });

  revalidatePath(`/quan-tri/game/${gameId}`);
  revalidatePath(`/game/${game.duongDan}`);
  return {};
}

export async function xoaBanTai(banId: string): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const ban = await db.banTai.findUnique({ where: { id: banId }, select: { gameId: true } });
  if (!ban) return {};
  await db.banTai.delete({ where: { id: banId } });
  revalidatePath(`/quan-tri/game/${ban.gameId}`);
  return {};
}

/** Trả lời một yêu cầu game. */
export async function traLoiYeuCau(id: string, trangThai: string, loiNhan: string): Promise<KetQua> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const hopLe = ['CHO_XEM', 'DANG_TIM', 'DA_THEM', 'TU_CHOI'];
  if (!hopLe.includes(trangThai)) return { loi: 'Trạng thái không hợp lệ.' };

  await db.yeuCau.update({
    where: { id },
    data: { trangThai: trangThai as 'CHO_XEM', loiNhan: loiNhan.trim().slice(0, 500) || null },
    select: { id: true },
  });

  revalidatePath('/quan-tri/yeu-cau');
  revalidatePath('/yeu-cau');
  return {};
}
