import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { db } from '@/lib/db';
import { BieuMauGame } from '@/components/quan-tri/BieuMauGame';
import { KhungAnhChup } from '@/components/quan-tri/KhungAnhChup';
import { KhungBanTai } from '@/components/quan-tri/KhungBanTai';
import { NutTrangThai } from '@/components/quan-tri/NutTrangThai';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sửa game' };

export default async function SuaGame({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [game, theLoai] = await Promise.all([
    db.game.findUnique({
      where: { id },
      select: {
        id: true, ten: true, duongDan: true, tenViet: true, nhaPhatTrien: true,
        namPhatHanh: true, gioiThieu: true, cachChoi: true, luuY: true, icon: true,
        ngonNgu: true, vietHoa: true, noiBat: true, trangThai: true,
        theLoai: { select: { theLoaiId: true } },
        anhChup: {
          orderBy: [{ thuTu: 'asc' }, { id: 'asc' }],
          take: 30,
          select: { id: true, duongDan: true, chuThich: true },
        },
        banTai: {
          orderBy: [{ heMay: 'asc' }, { moiNhat: 'desc' }],
          take: 50,
          select: {
            id: true, heMay: true, soHieu: true, moiNhat: true, duongDanCuaHang: true,
            tep: { select: { id: true, loai: true, duongDan: true, dungLuong: true } },
          },
        },
      },
    }),
    db.theLoai.findMany({ orderBy: [{ thuTu: 'asc' }], take: 50, select: { id: true, ten: true } }),
  ]);
  if (!game) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="tieu-de-trang truncate">{game.ten}</h1>
          <Link href={`/game/${game.duongDan}`}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-nhan hover:underline">
            Xem trang công khai <ExternalLink size={13} />
          </Link>
        </div>
        <NutTrangThai gameId={game.id} trangThai={game.trangThai} />
      </div>

      <section>
        <h2 className="tieu-de mb-3">Ảnh chụp</h2>
        <KhungAnhChup gameId={game.id} anh={game.anhChup} />
      </section>

      <section>
        <h2 className="tieu-de mb-3">Bản tải</h2>
        <KhungBanTai
          gameId={game.id}
          ban={game.banTai.map((b) => ({
            id: b.id,
            heMay: b.heMay,
            soHieu: b.soHieu,
            moiNhat: b.moiNhat,
            duongDanCuaHang: b.duongDanCuaHang,
            tep: b.tep.map((t) => ({
              id: t.id, loai: t.loai, duongDan: t.duongDan,
              dungLuong: t.dungLuong != null ? Number(t.dungLuong) : null,
            })),
          }))}
        />
      </section>

      <section>
        <h2 className="tieu-de mb-3">Thông tin game</h2>
        <BieuMauGame
          theLoai={theLoai}
          game={{
            id: game.id,
            ten: game.ten,
            duongDan: game.duongDan,
            tenViet: game.tenViet,
            nhaPhatTrien: game.nhaPhatTrien,
            namPhatHanh: game.namPhatHanh,
            gioiThieu: game.gioiThieu,
            cachChoi: game.cachChoi,
            luuY: game.luuY,
            icon: game.icon,
            ngonNgu: game.ngonNgu,
            vietHoa: game.vietHoa,
            noiBat: game.noiBat,
            theLoaiId: game.theLoai.map((t) => t.theLoaiId),
          }}
        />
      </section>
    </div>
  );
}
