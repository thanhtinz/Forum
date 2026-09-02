import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { chotBeQuan, xemNhanVat } from '@/lib/tu-tien';
import { BeQuan } from '@/components/tutien/BeQuan';
import { THUOC_TINH, timDao } from '@/lib/tu-tien-const';

export const metadata: Metadata = { title: 'Bế quan — Vạn Đạo Tu Tiên' };
export const dynamic = 'force-dynamic';

export default async function TrangTuLuyen() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/tu-tien/tu-luyen');

  await chotBeQuan(userId);
  const nv = await xemNhanVat(userId);
  if (!nv) redirect('/tu-tien');

  const d = timDao(nv.dao);
  const nuoi = (d?.nuoi ?? []).map((m) => THUOC_TINH.find((t) => t.ma === m)).filter(Boolean);

  return (
    <>
      <h1 className="text-xl font-black">Bế quan</h1>
      <BeQuan nv={nv} />

      <section className="tien-tam p-5">
        <h2 className="mb-1 text-lg font-black">Tốc độ tu vi</h2>
        <p className="mb-3 text-sm opacity-75">
          GDD chốt rằng người chơi phải nhìn được lý do mình mạnh lên, nên chỗ
          này bóc thẳng công thức ra chứ không giấu.
        </p>
        <ul className="tien-so space-y-1 text-sm">
          <li>Đạo <b>{nv.tenDao}</b> ăn hai thuộc tính: {nuoi.map((t) => t!.ten).join(' và ')}.</li>
          {nuoi.map((t) => (
            <li key={t!.ma}>{t!.ten}: <b>{nv.thuocTinh[t!.ma] ?? 0}</b></li>
          ))}
          <li>Linh căn <b>{nv.tenLinhCan}</b> nhân vào hiệu suất.</li>
          <li>Cảnh giới càng cao càng chậm — hiện ở bậc <b>{nv.bac}</b>.</li>
          <li className="pt-1">Kết quả: <b className="tien-dao-mau">{nv.moiPhut.toFixed(2)}</b> tu vi mỗi phút.</li>
        </ul>
      </section>
    </>
  );
}
