import type { Metadata } from 'next';
import { docTrang, nguonCua } from '@/lib/cai-dat';
import { BieuMauCaiDat } from '@/components/quan-tri/BieuMauCaiDat';
import { luuTrang } from './viec';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Thông tin trang · Cài đặt' };

/** Tên, câu giới thiệu và địa chỉ liên hệ của cửa hàng. */
export default async function CaiDatTrang() {
  const t = await docTrang();

  return (
    <BieuMauCaiDat
      hanh={luuTrang}
      nguon={await nguonCua('trang')}
      chu="Lưu thông tin trang"
      o={[
        {
          ten: 'ten', nhan: 'Tên cửa hàng', batBuoc: true, hep: true, banDau: t.ten,
          goiY: 'SunnyStore',
          yNghia: 'Hiện ở đầu trang, chân trang và trên tiêu đề mỗi thẻ của trình duyệt.',
        },
        {
          ten: 'emailLienHe', nhan: 'Email liên hệ', kieu: 'email', hep: true,
          banDau: t.emailLienHe, goiY: 'lienhe@sunnystore.vn',
          yNghia: 'Chỗ khách viết thư khi cần tới ban quản trị. Bỏ trống thì chân trang không bày ra.',
        },
        {
          ten: 'moTa', nhan: 'Câu giới thiệu', kieu: 'doan', banDau: t.moTa,
          yNghia: 'Câu này đi theo đường dẫn cửa hàng lúc ai đó dán lên mạng xã hội, và là câu máy tìm kiếm đọc được.',
        },
      ]} />
  );
}
