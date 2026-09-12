import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { NhanTrangThai } from '@/components/tac-gia/NhanTrangThai';
import { PhanTrang } from '@/components/PhanTrang';
import { cachDay, gonSo, kep, soTrang } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Game của tôi' };

const MOI_TRANG = 20;

/*
 * DANH SÁCH GAME CỦA CHÍNH TÁC GIẢ.
 *
 * `tacGiaId` nằm trong `where` chứ không lọc sau — và đây là trang dễ quên
 * nhất, vì nhìn nó giống hệt trang game của khu quản trị. Quên một chỗ là tác
 * giả này đọc được danh sách game của tác giả kia.
 */
export default async function GameCuaToi({ searchParams }: {
  searchParams: Promise<{ trang?: string }>;
}) {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap');
  const sp = await searchParams;

  const cua = { tacGiaId: nguoi.id };
  const tong = await db.game.count({ where: cua });
  const tongTrang = soTrang(tong, MOI_TRANG);
  const trang = kep(sp.trang, 1, tongTrang, 1);

  const game = await db.game.findMany({
    where: cua,
    // Game đang cần làm gì đó lên trước: bị trả lại, rồi nháp, rồi chờ duyệt.
    orderBy: [{ suaLuc: 'desc' }, { id: 'desc' }],
    skip: (trang - 1) * MOI_TRANG,
    take: MOI_TRANG,
    select: {
      id: true, ten: true, icon: true, trangThai: true, soLuotTai: true,
      suaLuc: true, _count: { select: { banTai: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="tieu-de-trang">Game của tôi</h1>
          <p className="phu mt-1">{gonSo(tong)} game</p>
        </div>
        <Link href="/quan-ly/game/moi" className="nut-cai-dam">
          <Plus size={16} aria-hidden /> Thêm game
        </Link>
      </div>

      {tong === 0 ? (
        <div className="the p-8 text-center">
          <p className="text-[14px] font-semibold">Chưa có game nào</p>
          <p className="phu mt-1">
            Thêm game, gắn bản tải, rồi bấm gửi duyệt. Ban quản trị xem xong mới bày ra cửa hàng.
          </p>
          <Link href="/quan-ly/game/moi" className="nut-cai-dam mt-4">Thêm game đầu tiên</Link>
        </div>
      ) : (
        <>
          <ul className="the-noi danh-sach-the">
            {game.map((g) => (
              <li key={g.id} className="p-3.5">
                <Link href={`/quan-ly/game/${g.id}`} className="flex items-center gap-3">
                  <BieuTuongGame ten={g.ten} icon={g.icon} co={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{g.ten}</span>
                    <span className="phu mt-0.5 block truncate">
                      {g._count.banTai} bản tải · {gonSo(g.soLuotTai)} lượt tải · sửa {cachDay(g.suaLuc)}
                    </span>
                  </span>
                  <NhanTrangThai trangThai={g.trangThai} />
                </Link>
              </li>
            ))}
          </ul>
          <PhanTrang trang={trang} tongTrang={tongTrang}
            dungDuong={(t) => (t > 1 ? `/quan-ly/game?trang=${t}` : '/quan-ly/game')} />
        </>
      )}
    </div>
  );
}
