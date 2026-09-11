'use server';

import { db } from '@/lib/db';
import { batBuocDangNhap } from '@/lib/xac-thuc';
import { GHI_CHU_TOI_DA, laLyDo } from '@/lib/bao-xau-const';

export interface KetQua { ok?: boolean; loi?: string }

/** Ba loại nội dung báo được. Nhận từ trình duyệt nên phải tra qua bảng này. */
const LOAI = ['danhGia', 'chuDe', 'traLoi'] as const;
type MaLoai = (typeof LOAI)[number];

/**
 * Báo một nội dung là xấu.
 *
 * Ban quản kho đã xoá được bài rác từ lâu, nhưng chưa có cách nào BIẾT bài nào
 * rác: họ phải tự đi đọc hết diễn đàn và mọi đánh giá. Người đọc thì gặp bài
 * rác trước tiên, nên để chính họ chỉ chỗ là cách duy nhất chạy được.
 *
 * KHÔNG cho báo bài của chính mình: bài của mình thì sửa hoặc xoá thẳng được,
 * báo nó chỉ tạo một việc cho người khác làm hộ.
 *
 * Báo hai lần cùng một mục thì lần sau coi như xong, không báo lỗi. Ràng buộc
 * duy nhất ở CSDL chặn hàng trùng, còn ở đây trả về `ok` để người bấm không
 * phải đoán xem mình đã báo chưa — họ chỉ cần biết chuyện đã tới tay ai đó.
 */
export async function baoXau(
  loai: string,
  mucId: string,
  lyDo: string,
  ghiChu: string,
): Promise<KetQua> {
  let nguoi;
  try { nguoi = await batBuocDangNhap(); }
  catch { return { loi: 'Bạn cần đăng nhập để báo xấu.' }; }

  if (!(LOAI as readonly string[]).includes(loai)) return { loi: 'Loại nội dung không hợp lệ.' };
  if (!laLyDo(lyDo)) return { loi: 'Hãy chọn một lý do.' };

  const chu = ghiChu.trim().slice(0, GHI_CHU_TOI_DA);

  /*
   * Điều kiện "không phải bài của tôi" nằm TRONG `where` của lượt đọc, không
   * phải một câu `if` sau đó. Cùng lẽ với mọi chỗ khác trong dự án: quên câu
   * `if` là chuyện xảy ra được, còn quên một dòng trong `where` thì truy vấn
   * không khớp gì cả — hỏng về phía an toàn.
   */
  const co = await timMuc(loai as MaLoai, mucId, nguoi.id);
  if (!co) return { loi: 'Không tìm thấy nội dung này, hoặc đây là bài của chính bạn.' };

  try {
    await db.baoXau.create({
      data: {
        nguoiId: nguoi.id,
        lyDo, ghiChu: chu || null,
        ...(loai === 'danhGia' ? { danhGiaId: mucId } : {}),
        ...(loai === 'chuDe' ? { chuDeId: mucId } : {}),
        ...(loai === 'traLoi' ? { traLoiId: mucId } : {}),
      },
      select: { id: true },
    });
  } catch {
    // Đụng ràng buộc duy nhất = đã báo rồi. Với người bấm thì hai trường hợp
    // ấy giống hệt nhau, nên trả lời giống hệt nhau.
    return { ok: true };
  }

  return { ok: true };
}

/** Mục có tồn tại và KHÔNG phải của chính người báo. */
async function timMuc(loai: MaLoai, id: string, nguoiId: string): Promise<boolean> {
  const khongPhaiCuaToi = { id, NOT: { nguoiId } };
  if (loai === 'danhGia') return !!(await db.danhGia.findFirst({ where: khongPhaiCuaToi, select: { id: true } }));
  if (loai === 'chuDe') return !!(await db.chuDe.findFirst({ where: khongPhaiCuaToi, select: { id: true } }));
  return !!(await db.traLoi.findFirst({ where: khongPhaiCuaToi, select: { id: true } }));
}
