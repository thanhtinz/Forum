import Link from 'next/link';
import { redirect } from 'next/navigation';
import { nguoiHienTai } from '@/lib/xac-thuc';

export const dynamic = 'force-dynamic';

const MUC = [
  { duongDan: '/quan-tri', ten: 'Tổng quan' },
  { duongDan: '/quan-tri/game', ten: 'Game' },
  { duongDan: '/quan-tri/yeu-cau', ten: 'Yêu cầu' },
];

/**
 * Cổng chặn của khu quản trị.
 *
 * Kiểm quyền ở KHUNG chứ không ở từng trang: thêm một trang con mới mà quên
 * chép đoạn kiểm quyền vào là cả trang ấy mở toang. Đặt ở khung thì trang con
 * nào cũng đi qua đây, không quên được.
 *
 * Lưu ý: đây chỉ là lớp chặn cho GIAO DIỆN. Mỗi server action vẫn phải tự kiểm
 * quyền lấy, vì hàm trong tệp `'use server'` là một địa chỉ POST công khai —
 * gọi thẳng vào được, không đi qua khung này.
 */
export default async function KhungQuanTri({ children }: { children: React.ReactNode }) {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap');
  if (nguoi.vaiTro !== 'QUAN_TRI') redirect('/');

  return (
    <div className="space-y-5">
      <div className="ke gap-2">
        {MUC.map((m) => (
          <Link key={m.duongDan} href={m.duongDan} className="chip">{m.ten}</Link>
        ))}
      </div>
      {children}
    </div>
  );
}
