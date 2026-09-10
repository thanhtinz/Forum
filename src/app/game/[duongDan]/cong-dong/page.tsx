import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChevronLeft, MessageSquare, Pin, PenLine } from 'lucide-react';
import { db } from '@/lib/db';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { cachDay } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ duongDan: string }> }): Promise<Metadata> {
  const { duongDan } = await params;
  const g = await db.game.findFirst({ where: { duongDan }, select: { ten: true } });
  return { title: g ? `Cộng đồng ${g.ten}` : 'Cộng đồng' };
}

export default async function TrangCongDong({ params }: { params: Promise<{ duongDan: string }> }) {
  const { duongDan } = await params;

  const game = await db.game.findFirst({
    where: { duongDan, trangThai: 'DANG_HIEN' },
    select: {
      id: true, ten: true, icon: true, duongDan: true,
      chuDe: {
        orderBy: [{ ghim: 'desc' }, { traLoiCuoiLuc: 'desc' }],
        take: 50,
        select: {
          id: true, tieuDe: true, ghim: true, khoa: true, soTraLoi: true, traLoiCuoiLuc: true,
          nguoi: { select: { tenHienThi: true } },
        },
      },
    },
  });
  if (!game) notFound();

  return (
    <div className="space-y-5">
      <Link href={`/game/${game.duongDan}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-mo hover:text-chu">
        <ChevronLeft size={15} /> Về trang game
      </Link>

      <div className="flex items-center gap-3">
        <BieuTuongGame ten={game.ten} icon={game.icon} co={52} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-bold tracking-tight">Cộng đồng {game.ten}</h1>
          <p className="phu">{game.chuDe.length} chủ đề</p>
        </div>
        <Link href={`/game/${game.duongDan}/cong-dong/dang`} className="nut-cai-dam shrink-0 !min-h-[38px] !px-4 !text-[13px]">
          <PenLine size={15} /> Đăng bài
        </Link>
      </div>

      {game.chuDe.length === 0 ? (
        <div className="the p-8 text-center">
          <MessageSquare size={24} className="mx-auto text-mo" />
          <p className="mt-2 text-[14px] font-semibold">Chưa ai mở lời</p>
          <p className="phu mt-1">Hỏi cách qua màn, báo lỗi gặp phải, hay chỉ để nói chuyện.</p>
        </div>
      ) : (
        <ul className="the divide-y divide-vien">
          {game.chuDe.map((c) => (
            <li key={c.id}>
              <Link href={`/game/${game.duongDan}/cong-dong/${c.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-nen3">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    {c.ghim && <Pin size={12} className="shrink-0 text-nhan" />}
                    <span className="truncate text-[14px] font-medium">{c.tieuDe}</span>
                  </span>
                  <span className="phu mt-0.5 block truncate">
                    {c.nguoi.tenHienThi} · {cachDay(c.traLoiCuoiLuc)}
                    {c.khoa && ' · đã khoá'}
                  </span>
                </span>
                <span className="phu flex shrink-0 items-center gap-1">
                  <MessageSquare size={12} /> {c.soTraLoi}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
