import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { OHoSo, OMatKhau, OXoaTaiKhoan } from '@/components/OCaiDatTaiKhoan';
import { thuBat } from '@/lib/gui-thu';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cài đặt tài khoản' };

export default async function CaiDat() {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap?tiep=/toi/cai-dat');

  const hang = await db.nguoiDung.findUnique({
    where: { id: nguoi.id },
    select: { tenHienThi: true, anh: true, thuThongBao: true },
  });
  if (!hang) redirect('/dang-nhap');

  return (
    <div className="cot space-y-5">
      <div>
        <Link href="/toi" className="phu inline-flex items-center gap-1 hover:text-chu">
          <ChevronLeft size={14} aria-hidden /> Tài khoản
        </Link>
        <h1 className="tieu-de-trang mt-1">Cài đặt</h1>
      </div>

      <OHoSo guiDuocThu={await thuBat()}
        banDau={{
          tenHienThi: hang.tenHienThi, anh: hang.anh, thuThongBao: hang.thuThongBao,
        }} />
      <OMatKhau />

      <OXoaTaiKhoan />
    </div>
  );
}
