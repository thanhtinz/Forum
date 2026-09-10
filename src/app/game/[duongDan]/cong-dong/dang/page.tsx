import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { BieuMauGui } from '@/components/BieuMauGui';
import { dangChuDe } from '../viec';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Đăng chủ đề' };

export default async function TrangDangBai({ params }: { params: Promise<{ duongDan: string }> }) {
  const { duongDan } = await params;

  const game = await db.game.findFirst({
    where: { duongDan, trangThai: 'DANG_HIEN' },
    select: { ten: true, duongDan: true },
  });
  if (!game) notFound();

  if (!(await nguoiHienTai())) redirect('/dang-nhap');

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/game/${game.duongDan}/cong-dong`}
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-mo hover:text-chu">
        <ChevronLeft size={15} /> Về cộng đồng {game.ten}
      </Link>

      <div>
        <h1 className="text-[22px] font-bold tracking-tight">Đăng chủ đề</h1>
        <p className="phu mt-0.5">Bài này sẽ nằm trong khu thảo luận của {game.ten}.</p>
      </div>

      <BieuMauGui viec={dangChuDe} nut="Đăng chủ đề" nutDangChay="Đang đăng…">
        <input type="hidden" name="duongDan" value={game.duongDan} />
        <label className="block">
          <span className="phu mb-1 block">Tiêu đề</span>
          <input name="tieuDe" required minLength={5} maxLength={150} className="o-nhap"
            placeholder="Hỏi gì, kể gì, hay báo lỗi gì?" />
        </label>
        <label className="block">
          <span className="phu mb-1 block">Nội dung</span>
          <textarea name="noiDung" required minLength={10} maxLength={8000} rows={9} className="o-nhap"
            placeholder="Máy bạn đời nào, chạy bản nào, kẹt ở đoạn nào… càng rõ càng dễ có người giúp." />
        </label>
      </BieuMauGui>
    </div>
  );
}
