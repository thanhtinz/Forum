import type { Metadata } from 'next';
import { docThu, nguonCua } from '@/lib/cai-dat';
import { BieuMauCaiDat } from '@/components/quan-tri/BieuMauCaiDat';
import { luuThu } from '../viec';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Gửi thư · Cài đặt' };

/*
 * CẤU HÌNH MÁY CHỦ GỬI THƯ (SMTP).
 *
 * Khai thiếu thì cửa hàng TẮT HẲN mọi đường thư chứ không gửi hỏng trong im
 * lặng: đăng ký quay về lối tạo tài khoản ngay, quên mật khẩu phải nhờ ban
 * quản trị cấp mã, và công tắc "báo qua email" không bày ra nữa. Nên nói thẳng
 * điều ấy ngay trên trang, đừng để người trông cửa hàng đoán.
 */
export default async function CaiDatThu() {
  const t = await docThu();

  return (
    <BieuMauCaiDat
      hanh={luuThu}
      nguon={await nguonCua('thu')}
      chu="Lưu cấu hình thư"
      o={[
        {
          ten: 'mayChu', nhan: 'Máy chủ SMTP', hep: true, banDau: t.mayChu,
          goiY: 'smtp.gmail.com',
          yNghia: 'Bỏ trống là tắt hẳn đường thư của cửa hàng.',
        },
        {
          ten: 'cong', nhan: 'Cổng', hep: true, banDau: t.cong, goiY: '587',
          yNghia: '587 cho lối bắt tay STARTTLS, 465 cho lối mã hoá ngay từ đầu.',
        },
        { ten: 'nguoi', nhan: 'Tên đăng nhập', hep: true, banDau: t.nguoi, goiY: 'thu@sunnystore.vn' },
        {
          ten: 'tu', nhan: 'Gửi dưới tên', hep: true, banDau: t.tu,
          goiY: 'SunnyStore <thu@sunnystore.vn>',
          yNghia: 'Dòng người nhận thấy ở ô "Từ". Bỏ trống thì lấy tên đăng nhập ở trên.',
        },
        {
          ten: 'matKhau', nhan: 'Mật khẩu', kieu: 'biMat', daCo: !!t.matKhau,
          yNghia: 'Với Gmail thì đây là "mật khẩu ứng dụng", không phải mật khẩu tài khoản.',
        },
      ]} />
  );
}
