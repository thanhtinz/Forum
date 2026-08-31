import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { NHIEM_VU } from '@/lib/pokemon-const';
import { nhiemVuNgayHomNay, tienDoNhiemVu } from '@/lib/pokemon';
import { BangNhiemVu } from '@/components/pokemon/BangNhiemVu';
import { ViecHangNgay } from '@/components/pokemon/ViecHangNgay';

export const metadata: Metadata = { title: 'Nhiệm vụ — Đảo Pokémon' };
export const dynamic = 'force-dynamic';

export default async function TrangNhiemVu() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/pokemon/nhiem-vu');

  const nv = await db.pokeNhanVat.findUnique({ where: { userId } });
  if (!nv) redirect('/pokemon');

  const tienDo = await tienDoNhiemVu(nv.id);
  // Mở LƯỜI ngay lúc có người xem trang — không tiến trình nền nào cả.
  const viecNgay = await nhiemVuNgayHomNay(nv.id);

  return (
    <>
      <section className="dao-tam p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Chuỗi nhiệm vụ</h1>
          <span className="retro-sub text-ink-400">{nv.nhiemVu}/{NHIEM_VU.length} đã nhận</span>
        </div>
        <p className="mb-4 text-sm text-ink-500">
          Nhận thưởng theo thứ tự. Tiến độ đọc thẳng từ dữ liệu thật — số thú trong
          kho, huy chương, cấp, số trận thắng — nên không có chỗ nào để lệch.
        </p>
        <BangNhiemVu daNhan={nv.nhiemVu} tienDo={tienDo} />
      </section>

      <section className="dao-tam mt-4 p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Việc hằng ngày</h1>
          <span className="retro-sub text-ink-400">
            {viecNgay.filter((v) => v.daNhan).length}/{viecNgay.length} đã nhận hôm nay
          </span>
        </div>
        <p className="mb-4 text-sm text-ink-500">
          Đặt lại mỗi ngày theo lịch giờ Việt Nam, cùng mốc với điểm danh. Tiến độ
          đọc từ bộ đếm thật chứ không có cột riêng nào để lệch.
        </p>
        <ViecHangNgay viec={viecNgay} />
      </section>
    </>
  );
}
