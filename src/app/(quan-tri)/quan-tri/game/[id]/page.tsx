import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { db } from '@/lib/db';
import { BieuMauGame } from '@/components/quan-tri/BieuMauGame';
import { KhungAnhChup } from '@/components/quan-tri/KhungAnhChup';
import { KhungSuKien } from '@/components/quan-tri/KhungSuKien';
import { KhungPhim } from '@/components/quan-tri/KhungPhim';
import { KhungBanTai } from '@/components/quan-tri/KhungBanTai';
import { NutTrangThai } from '@/components/quan-tri/NutTrangThai';
import { KhuNguyHiem } from '@/components/quan-tri/KhuNguyHiem';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sửa game' };

export default async function SuaGame({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [game, theLoai] = await Promise.all([
    db.game.findUnique({
      where: { id },
      select: {
        id: true, ten: true, duongDan: true, tenViet: true, nhaPhatTrien: true,
        namPhatHanh: true, gioiThieu: true, icon: true, bia: true, doTuoi: true,
        ngonNgu: true, vietHoa: true, noiBat: true, trangThai: true,
        theLoai: { select: { theLoaiId: true } },
        _count: { select: { danhGia: true, chuDe: true } },
        anhChup: {
          orderBy: [{ thuTu: 'asc' }, { id: 'asc' }],
          take: 30,
          select: { id: true, duongDan: true, chuThich: true },
        },
        phim: {
          orderBy: [{ thuTu: 'asc' }, { id: 'asc' }],
          select: { id: true, duongDan: true, anhBia: true, dungLuong: true },
        },
        suKien: {
          orderBy: [{ batDau: 'desc' }, { id: 'desc' }],
          take: 20,
          select: {
            id: true, loai: true, tieuDe: true, moTaNgan: true, anh: true,
            batDau: true, ketThuc: true, hien: true,
          },
        },
        banTai: {
          orderBy: [{ heMay: 'asc' }, { moiNhat: 'desc' }],
          take: 50,
          select: {
            id: true, heMay: true, soHieu: true, moiNhat: true, duongDanCuaHang: true,
            ghiChu: true, doiMoi: true, ngayRa: true,
            tep: { select: { id: true, loai: true, duongDan: true, dungLuong: true, tenTep: true, maKiemTra: true } },
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
        <h2 className="tieu-de mb-3">Phim xem trước</h2>
        <KhungPhim gameId={game.id}
          phim={game.phim.map((f) => ({
            ...f,
            // `BigInt` không qua được ranh giới máy chủ → máy khách.
            dungLuong: f.dungLuong != null ? Number(f.dungLuong) : null,
          }))} />
      </section>

      <section>
        <h2 className="tieu-de mb-3">Sự kiện</h2>
        <KhungSuKien gameId={game.id}
          suKien={game.suKien.map((s) => ({
            ...s,
            // Ngày giờ qua ranh giới máy chủ → máy khách phải là CHUỖI: đối
            // tượng `Date` không đi qua được, và Next sẽ báo lỗi dựng trang.
            batDau: s.batDau.toISOString(),
            ketThuc: s.ketThuc.toISOString(),
          }))} />
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
            ghiChu: b.ghiChu,
            doiMoi: b.doiMoi,
            // Ô <input type="date"> chỉ nhận đúng dạng YYYY-MM-DD.
            ngayRa: b.ngayRa ? b.ngayRa.toISOString().slice(0, 10) : null,
            duongDanCuaHang: b.duongDanCuaHang,
            tep: b.tep.map((t) => ({
              id: t.id, loai: t.loai, duongDan: t.duongDan,
              dungLuong: t.dungLuong != null ? Number(t.dungLuong) : null,
              tenTep: t.tenTep, maKiemTra: t.maKiemTra,
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
            icon: game.icon,
            bia: game.bia,
            doTuoi: game.doTuoi,
            ngonNgu: game.ngonNgu,
            vietHoa: game.vietHoa,
            noiBat: game.noiBat,
            theLoaiId: game.theLoai.map((t) => t.theLoaiId),
          }}
        />
      </section>

      {/* Cuối trang, tách hẳn bằng một vạch: xem chú thích trong `KhuNguyHiem`. */}
      <section className="vach pt-6">
        <KhuNguyHiem gameId={game.id} ten={game.ten}
          soDanhGia={game._count.danhGia} soChuDe={game._count.chuDe} />
      </section>
    </div>
  );
}
