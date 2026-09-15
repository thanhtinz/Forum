import type { Metadata } from 'next';
import { docAnhDong, nguonCua } from '@/lib/cai-dat';
import { BieuMauCaiDat } from '@/components/quan-tri/BieuMauCaiDat';
import { luuAnhDong } from '../viec';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ảnh động · Cài đặt' };

/*
 * KHOÁ DỊCH VỤ ẢNH ĐỘNG cho tab GIF của bảng cảm xúc.
 *
 * Chưa khai thì tab GIF vẫn bày ra nhưng nói thẳng là chưa bật — không giấu
 * tab đi: giấu thì người quản trị chẳng bao giờ biết cửa hàng có tính năng ấy
 * để mà đi lấy khoá.
 *
 * Khoá là Ô BÍ MẬT: không in ngược ra trang, để trống là giữ nguyên. Và nó
 * không bao giờ ra tới trình duyệt — mọi lượt hỏi ảnh động đều đi qua máy chủ,
 * xem `timGif`.
 */
export default async function CaiDatAnhDong() {
  const a = await docAnhDong();

  return (
    <BieuMauCaiDat
      hanh={luuAnhDong}
      nguon={await nguonCua('anh-dong')}
      chu="Lưu cấu hình ảnh động"
      o={[
        {
          ten: 'nhaCungCap', nhan: 'Nhà cung cấp', hep: true, banDau: a.nhaCungCap,
          goiY: 'tenor',
          yNghia: 'Nhận “tenor” hoặc “giphy”. Cả hai đều phát khoá miễn phí cho lượng dùng nhỏ.',
        },
        {
          ten: 'khoaApi', nhan: 'Khoá API', kieu: 'biMat', daCo: !!a.khoaApi,
          yNghia: 'Chưa có khoá thì tab GIF nói rõ là chưa bật, chứ không hiện lưới trống.',
        },
      ]} />
  );
}
