'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { guiThongBao } from '@/lib/thong-bao';
import { LOI_KHONG_QUYEN } from '@/lib/quyen-game';
import { DIA_CHI_TOI_DA, laDiaChiHopLe } from '@/lib/dia-chi-an-toan';

export interface KetQuaTacGia { loi?: string; ok?: boolean }

const LOI_TOI_DA = 1000;

/**
 * Tác giả trả lời một bài đánh giá GAME CỦA MÌNH.
 *
 * Ban quản trị đã có hàm riêng ở khu quản trị, và hai hàm không gộp làm một
 * được: hàm kia mở cho MỌI bài đánh giá trong cửa hàng, còn hàm này phải khép
 * đúng vào mấy game người gọi đứng tên. Gộp lại rồi cài thêm một câu `if` thì
 * câu `if` ấy là thứ duy nhất giữ cửa — mà hàm này là một địa chỉ POST công
 * khai, ai cũng gọi thẳng được.
 *
 * Nên điều kiện quyền nằm trong `where` của cả phép ĐỌC lẫn phép GHI, và nó là
 * `tacGiaId` của chính người gọi — kể cả khi người gọi là quản trị. Quản trị
 * muốn đáp bài của game người khác thì đã có trang riêng của họ; mở rộng ở đây
 * chỉ làm cùng một việc có hai đường vào, mà một trong hai đường thì không ai
 * nhớ ra mà canh.
 *
 * Người chưa được duyệt làm tác giả gọi thẳng vào đây cũng không ăn thua: họ
 * không đứng tên game nào nên câu truy vấn không khớp hàng nào. Hỏng về phía
 * an toàn, không phải phía mở toang.
 */
export async function tacGiaTraLoiDanhGia(
  danhGiaId: string, loi: string, anh = '',
): Promise<KetQuaTacGia> {
  const nguoi = await nguoiHienTai();
  if (!nguoi) return { loi: 'Bạn cần đăng nhập trước đã.' };

  const chuLoi = loi.trim().slice(0, LOI_TOI_DA);
  const tam = anh.trim();
  /*
   * Ảnh đi THẲNG vào thuộc tính `src` lúc bày, nên nó phải qua đúng bộ kiểm
   * địa chỉ của dự án — không tự so đầu chuỗi.
   *
   * `startsWith('/')` là cái bẫy `dia-chi-an-toan.ts` sinh ra để giết:
   * `//may-chu-la/x.png` và `/\may-chu-la/x.png` đều bắt đầu bằng `/`, mà
   * trình duyệt đọc chúng thành "cùng giao thức, KHÁC MÁY CHỦ". Lọt là cửa
   * hàng bày ảnh của người lạ dưới tên mình, và mỗi lượt xem là một lượt gửi
   * địa chỉ IP người xem sang máy chủ ấy.
   */
  if (tam && (tam.length > DIA_CHI_TOI_DA || !laDiaChiHopLe(tam))) {
    return { loi: 'Ảnh không hợp lệ.' };
  }

  const bai = await db.danhGia.findFirst({
    where: { id: danhGiaId, game: { tacGiaId: nguoi.id } },
    select: { nguoiId: true, game: { select: { ten: true, duongDan: true } } },
  });
  if (!bai) return { loi: LOI_KHONG_QUYEN };

  /*
   * `updateMany` chứ không `update`: `update` chỉ nhận khoá chính, nên muốn
   * kèm điều kiện chủ sở hữu thì phải lọc ở ngoài — tức là quay lại đúng cái
   * khe hở vừa nói ở trên.
   */
  const { count } = await db.danhGia.updateMany({
    where: { id: danhGiaId, game: { tacGiaId: nguoi.id } },
    data: chuLoi || tam
      ? { traLoi: chuLoi || null, traLoiAnh: tam || null, traLoiLuc: new Date() }
      : { traLoi: null, traLoiAnh: null, traLoiLuc: null },
  });
  if (count === 0) return { loi: LOI_KHONG_QUYEN };

  // Chỉ báo khi THÊM lời đáp: "tác giả đã rút lại lời đáp" là một tin chẳng ai
  // cần biết.
  if (chuLoi || tam) {
    await guiThongBao({
      nguoiNhanId: bai.nguoiId,
      loai: 'DAP_DANH_GIA',
      tieuDe: `${bai.game.ten} đã trả lời đánh giá của bạn`,
      chiTiet: chuLoi,
      duongDan: `/game/${bai.game.duongDan}`,
    });
  }

  // Trang game công khai và cả huy hiệu "chưa trả lời" trên thanh trên của
  // cổng nhà phát triển đều đọc từ con số này, nên quên một chỗ là vừa trả lời
  // xong mà huy hiệu vẫn nguyên số cũ.
  revalidatePath(`/game/${bai.game.duongDan}`);
  revalidatePath('/quan-ly/danh-gia');
  revalidatePath('/quan-ly', 'layout');
  return { ok: true };
}
