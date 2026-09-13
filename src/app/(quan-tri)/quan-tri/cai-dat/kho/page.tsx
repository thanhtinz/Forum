import type { Metadata } from 'next';
import { docKho, nguonCua } from '@/lib/cai-dat';
import { BieuMauCaiDat } from '@/components/quan-tri/BieuMauCaiDat';
import { luuKho } from '../viec';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Kho tệp · Cài đặt' };

/*
 * CHỖ CẤT ẢNH, PHIM VÀ TỆP GAME (Cloudflare R2).
 *
 * Khai đủ năm ô thì tệp bay thẳng lên R2; thiếu một ô là cửa hàng lùi về cất
 * ngay trên đĩa máy chủ. Lùi được như thế nên máy vừa dựng lên đã chạy được,
 * nhưng đĩa máy chủ thì không sống qua một lượt triển khai mới — vậy nên trang
 * này phải nói rõ đang ở lối nào.
 */
export default async function CaiDatKho() {
  const k = await docKho();

  return (
    <BieuMauCaiDat
      hanh={luuKho}
      nguon={await nguonCua('kho')}
      chu="Lưu cấu hình kho tệp"
      o={[
        {
          ten: 'taiKhoan', nhan: 'Mã tài khoản Cloudflare', hep: true, banDau: k.taiKhoan,
          yNghia: 'Thiếu bất kỳ ô nào thì tệp cất ngay trên đĩa máy chủ.',
        },
        { ten: 'thung', nhan: 'Tên thùng', hep: true, banDau: k.thung, goiY: 'sunnystore' },
        { ten: 'khoa', nhan: 'Mã khoá truy cập', hep: true, banDau: k.khoa },
        {
          ten: 'diaChi', nhan: 'Địa chỉ công khai của thùng', hep: true, banDau: k.diaChi,
          goiY: 'https://tep.sunnystore.vn',
          yNghia: 'Đường dẫn khách tải tệp về. Gạch chéo cuối dòng tự bỏ đi.',
        },
        {
          ten: 'biMat', nhan: 'Khoá bí mật', kieu: 'biMat', daCo: !!k.biMat,
          yNghia: 'Cloudflare chỉ cho xem khoá này đúng một lần lúc tạo.',
        },
      ]} />
  );
}
