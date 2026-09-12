import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { CHON_THE, thanhThe } from '@/components/game/the-game';
import { HangGame } from '@/components/game/HangGame';
import { AnhDaiDien } from '@/components/NguoiDung';
import { PhanTrang } from '@/components/PhanTrang';
import { dungChuDam } from '@/lib/chu-dam';
import { gonSo, kep, soTrang } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

const MOI_TRANG = 20;

export async function generateMetadata({ params }: {
  params: Promise<{ ten: string }>;
}): Promise<Metadata> {
  const { ten } = await params;
  const t = await db.nguoiDung.findUnique({
    where: { tenDangNhap: ten }, select: { tenTacGia: true, tenHienThi: true },
  });
  return t ? { title: t.tenTacGia ?? t.tenHienThi } : { title: 'Tác giả' };
}

/*
 * TRANG CÔNG KHAI CỦA MỘT TÁC GIẢ — chỉ game của họ.
 *
 * Khác `/nha-phat-trien/[ten]` ở chỗ căn bản: trang kia gom theo CHUỖI tên
 * hãng ghi trên từng game, nên hai cách gõ khác nhau thành hai hãng. Trang này
 * gom theo TÀI KHOẢN, nên nó là thật — và nó là chỗ tác giả tự giới thiệu.
 *
 * Chỉ bày game `DANG_HIEN`: nháp và game đang chờ duyệt là chuyện riêng giữa
 * tác giả với ban quản trị, người ngoài không có lý do gì thấy chúng.
 */
export default async function TrangTacGia({ params, searchParams }: {
  params: Promise<{ ten: string }>;
  searchParams: Promise<{ trang?: string }>;
}) {
  const { ten } = await params;
  const sp = await searchParams;

  const nguoi = await db.nguoiDung.findUnique({
    where: { tenDangNhap: ten },
    select: {
      id: true, tenHienThi: true, tenTacGia: true, anh: true,
      gioiThieuTacGia: true, vaiTro: true,
    },
  });
  /*
   * Không phải tác giả thì 404, không phải "trang trống".
   *
   * Mọi tài khoản đều có `tenDangNhap`, nên nếu không chặn thì `/tac-gia/<ai
   * đó>` trả về 200 cho bất kỳ thành viên nào — hoá ra một cách dò xem tên nào
   * đã có người dùng.
   */
  if (!nguoi || nguoi.vaiTro !== 'TAC_GIA') notFound();

  const cua = { ...DANG_HIEN, tacGiaId: nguoi.id };
  const gom = await db.game.aggregate({
    where: cua, _count: { _all: true }, _sum: { soLuotTai: true },
  });
  const tong = gom._count._all;
  const tongTrang = soTrang(tong, MOI_TRANG);
  const trang = kep(sp.trang, 1, tongTrang, 1);

  const game = await db.game.findMany({
    where: cua,
    orderBy: [{ soLuotTai: 'desc' }, { id: 'desc' }],
    skip: (trang - 1) * MOI_TRANG,
    take: MOI_TRANG,
    select: CHON_THE,
  });

  const tenHien = nguoi.tenTacGia ?? nguoi.tenHienThi;

  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      <header className="flex items-center gap-4">
        {nguoi.anh
          ? <AnhDaiDien ten={tenHien} anh={nguoi.anh} co={64} />
          : (
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-nhan/12 text-nhan">
              <UserRound size={28} aria-hidden />
            </span>
          )}
        <div className="min-w-0">
          <p className="phu">Tác giả</p>
          <h1 className="tieu-de-trang truncate">{tenHien}</h1>
          <p className="phu mt-0.5">
            {gonSo(tong)} game · {gonSo(gom._sum.soLuotTai ?? 0)} lượt tải
          </p>
        </div>
      </header>

      {nguoi.gioiThieuTacGia && (
        <section className="the p-4">
          <div className="chu-dam"
            dangerouslySetInnerHTML={{ __html: dungChuDam(nguoi.gioiThieuTacGia) }} />
        </section>
      )}

      <section>
        <h2 className="tieu-de mb-3">Game của {tenHien}</h2>
        {tong === 0 ? (
          <p className="phu">Tác giả này chưa có game nào đang bày.</p>
        ) : (
          <>
            <ul className="grid gap-x-8 gap-y-3.5 xl:grid-cols-2">
              {game.map((g) => (
                <li key={g.id} className="min-w-0"><HangGame game={thanhThe(g)} /></li>
              ))}
            </ul>
            <PhanTrang trang={trang} tongTrang={tongTrang}
              dungDuong={(t) => `/tac-gia/${ten}${t > 1 ? `?trang=${t}` : ''}`} />
          </>
        )}
      </section>
    </div>
  );
}
