import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { OHoSoTacGia } from '@/components/tac-gia/OHoSoTacGia';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Hồ sơ tác giả' };

export default async function HoSoTacGia() {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap');

  const hoSo = await db.nguoiDung.findUnique({
    where: { id: nguoi.id },
    select: { tenTacGia: true, gioiThieuTacGia: true, tenDangNhap: true },
  });
  if (!hoSo) redirect('/dang-nhap');

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="tieu-de-trang">Hồ sơ tác giả</h1>
        <p className="phu mt-1">
          Đây là thứ người tải thấy ở trang của bạn.{' '}
          <Link href={`/tac-gia/${hoSo.tenDangNhap}`}
            className="inline-flex items-center gap-1 font-semibold text-nhan hover:underline">
            Xem trang công khai <ExternalLink size={12} aria-hidden />
          </Link>
        </p>
      </div>

      <OHoSoTacGia tenTacGia={hoSo.tenTacGia ?? ''} gioiThieu={hoSo.gioiThieuTacGia ?? ''}
        tenDuPhong={nguoi.tenHienThi} />
    </div>
  );
}
