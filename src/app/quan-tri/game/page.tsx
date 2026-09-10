import Link from 'next/link';
import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { db } from '@/lib/db';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { gonSo, gop } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Quản lý game' };

const NHAN: Record<string, { ten: string; lop: string }> = {
  NHAP: { ten: 'Nháp', lop: 'bg-nen3 text-mo' },
  DANG_HIEN: { ten: 'Đang hiện', lop: 'bg-nhan/12 text-nhan' },
  DA_GO: { ten: 'Đã gỡ', lop: 'bg-xau/10 text-xau' },
};

export default async function DanhSachGame() {
  const game = await db.game.findMany({
    orderBy: [{ suaLuc: 'desc' }],
    take: 200,
    select: {
      id: true, ten: true, duongDan: true, icon: true, trangThai: true,
      soLuotTai: true, soLuotDanhGia: true,
      _count: { select: { banTai: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-[26px] font-bold tracking-tight">Game</h1>
        <Link href="/quan-tri/game/moi" className="nut-cai-dam !min-h-[38px] !px-4 !text-[13px]">
          <Plus size={15} /> Thêm game
        </Link>
      </div>

      {game.length === 0 ? (
        <p className="the p-8 text-center text-[13px] text-mo">Chưa có trò chơi nào.</p>
      ) : (
        <ul className="the divide-y divide-vien">
          {game.map((g) => {
            const n = NHAN[g.trangThai] ?? NHAN.NHAP;
            return (
              <li key={g.id}>
                <Link href={`/quan-tri/game/${g.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-nen3">
                  <BieuTuongGame ten={g.ten} icon={g.icon} co={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{g.ten}</span>
                    <span className="phu block truncate">
                      {g._count.banTai} bản tải · {gonSo(g.soLuotTai)} lượt tải · {g.soLuotDanhGia} đánh giá
                    </span>
                  </span>
                  <span className={gop('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', n.lop)}>
                    {n.ten}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
