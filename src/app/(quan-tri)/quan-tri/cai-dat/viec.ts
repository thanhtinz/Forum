'use server';

import { revalidatePath } from 'next/cache';
import { batBuocQuanTri } from '@/lib/xac-thuc';
import { O_BI_MAT, luuNhom, type NhomCaiDat } from '@/lib/cai-dat';

export interface KetQuaCaiDat { loi?: string; ok?: string }

const NHOM: Record<NhomCaiDat, readonly string[]> = {
  thu: ['mayChu', 'cong', 'nguoi', 'matKhau', 'tu'],
  kho: ['taiKhoan', 'khoa', 'biMat', 'thung', 'diaChi'],
  trang: ['ten', 'moTa', 'emailLienHe'],
};

/**
 * Lưu một nhóm cấu hình.
 *
 * DANH SÁCH Ô CHO PHÉP NẰM Ở MÁY CHỦ, không đọc bừa mọi thứ biểu mẫu gửi lên:
 * hàm này là một endpoint POST công khai, nên nếu cứ nhận hết thì ai cũng nhét
 * thêm được khoá lạ vào khối JSON trong cơ sở dữ liệu.
 *
 * Ô bí mật để TRỐNG nghĩa là giữ nguyên, không phải xoá — trang không bao giờ
 * in mật khẩu ra, nên hiểu ngược lại là chỉ cần bấm Lưu một lần là mất sạch
 * cấu hình mà chẳng ai cố ý làm gì. Muốn xoá thật thì tích ô "xoá".
 */
export async function luuCaiDat(
  nhom: NhomCaiDat, _truoc: KetQuaCaiDat, form: FormData,
): Promise<KetQuaCaiDat> {
  try { await batBuocQuanTri(); }
  catch { return { loi: 'Bạn không có quyền làm việc này.' }; }

  const cho = NHOM[nhom];
  if (!cho) return { loi: 'Nhóm cấu hình không hợp lệ.' };

  const moi: Record<string, string> = {};
  for (const o of cho) moi[o] = String(form.get(o) ?? '').trim();

  // Địa chỉ thùng hay bị dán kèm gạch chéo cuối; để nguyên là mọi đường dẫn
  // ảnh sinh ra đều có hai gạch liền nhau.
  if (nhom === 'kho' && moi.diaChi) moi.diaChi = moi.diaChi.replace(/\/+$/, '');

  if (nhom === 'thu' && moi.cong && !/^\d{1,5}$/.test(moi.cong)) {
    return { loi: 'Cổng phải là một con số, ví dụ 587 hoặc 465.' };
  }

  const xoa = O_BI_MAT[nhom].filter((o) => form.get(`xoa-${o}`) !== null);

  try {
    await luuNhom(nhom, moi, xoa);
  } catch {
    return { loi: 'Không lưu được lúc này. Thử lại giúp mình nhé.' };
  }

  /*
   * Dọn bộ nhớ đệm của CẢ cửa hàng, không chỉ trang cài đặt.
   *
   * Tên cửa hàng in ở đầu trang và chân trang của mọi trang; đổi nó mà chỉ dọn
   * mỗi trang này thì ban quản trị thấy đã đổi, còn khách vẫn thấy tên cũ cho
   * tới khi bộ đệm tự hết hạn — mà bộ đệm ấy thì không ai đoán được khi nào hết.
   */
  revalidatePath('/', 'layout');
  revalidatePath('/quan-tri/cai-dat', 'layout');
  return { ok: 'Đã lưu.' };
}

export async function luuThu(t: KetQuaCaiDat, f: FormData) { return luuCaiDat('thu', t, f); }
export async function luuKho(t: KetQuaCaiDat, f: FormData) { return luuCaiDat('kho', t, f); }
export async function luuTrang(t: KetQuaCaiDat, f: FormData) { return luuCaiDat('trang', t, f); }
