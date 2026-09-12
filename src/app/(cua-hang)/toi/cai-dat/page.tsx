import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { OHoSo, OMatKhau } from '@/components/OCaiDatTaiKhoan';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cài đặt tài khoản' };

export default async function CaiDat() {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap?tiep=/toi/cai-dat');

  const hang = await db.nguoiDung.findUnique({
    where: { id: nguoi.id },
    select: { tenHienThi: true, anh: true, email: true, tenDangNhap: true },
  });
  if (!hang) redirect('/dang-nhap');

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <Link href="/toi" className="phu inline-flex items-center gap-1 hover:text-chu">
          <ChevronLeft size={14} aria-hidden /> Tài khoản
        </Link>
        <h1 className="tieu-de-trang mt-1">Cài đặt</h1>
      </div>

      <OHoSo banDau={{ tenHienThi: hang.tenHienThi, anh: hang.anh }} />
      <OMatKhau />

      {/*
        Tên đăng nhập và email chỉ ĐỌC, và nói rõ vì sao ngay tại chỗ.
        Bày ra một ô xám không giải thích gì thì người ta sẽ đi tìm chỗ đổi,
        không thấy, rồi kết luận trang này hỏng.
      */}
      <section className="the p-4">
        <h2 className="text-[15px] font-bold">Không đổi được</h2>
        <dl className="mt-2 space-y-2 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-mo">Tên đăng nhập</dt>
            <dd className="font-medium">@{hang.tenDangNhap}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-mo">Email</dt>
            <dd className="truncate font-medium">{hang.email}</dd>
          </div>
        </dl>
        <p className="phu mt-3">
          Tên đăng nhập nằm trong mọi bài viết cũ của bạn, còn email là thứ duy nhất
          dùng để nhận ra tài khoản. Cần đổi thì nhắn cho SunnyStore.
        </p>
      </section>
    </div>
  );
}
