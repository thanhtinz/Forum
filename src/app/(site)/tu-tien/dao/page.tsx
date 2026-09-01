import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { chotBeQuan, xemNhanVat } from '@/lib/tu-tien';
import { CANH_GIOI, DAO, LINH_CAN, SO_TANG, TANG_TEN, tuViCanDe } from '@/lib/tu-tien-const';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Đạo Phổ — Vạn Đạo Tu Tiên' };
export const dynamic = 'force-dynamic';

/**
 * Đạo Phổ — bảng tra: năm đạo, thang cảnh giới, linh căn.
 *
 * Bảng cảnh giới bày tên theo TỪNG ĐẠO chứ không chỉ tên của đạo mình: đọc
 * cảnh giới của người khác mà biết ngay họ đi đạo nào, đó là chỗ hay của cách
 * đặt tên trong GDD, giấu đi thì phí.
 */
export default async function TrangDaoPho() {
  const s = await auth();
  const userId = s?.user?.id;
  if (!userId) redirect('/login?callbackUrl=/tu-tien/dao');

  await chotBeQuan(userId);
  const nv = await xemNhanVat(userId);
  if (!nv) redirect('/tu-tien');

  return (
    <>
      <h1 className="text-xl font-black">Đạo Phổ</h1>

      <section className="tien-giay p-5">
        <h2 className="mb-3 text-lg font-black">Thang cảnh giới</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--tien-vien)' }}>
                <th className="py-1 pr-3 font-bold">Bậc</th>
                {DAO.map((d) => <th key={d.ma} className="py-1 pr-3 font-bold">{d.ten}</th>)}
              </tr>
            </thead>
            <tbody>
              {CANH_GIOI.map((c) => (
                <tr key={c.bac} className={cn('border-b', c.bac === nv.bac && 'tien-son font-bold')}
                  style={{ borderColor: 'var(--tien-vien)' }}>
                  <td className="py-1 pr-3 tabular-nums">{c.bac}</td>
                  {DAO.map((d) => (
                    <td key={d.ma} className="py-1 pr-3">{c.ten[d.ma]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm opacity-75">
          Mỗi bậc {SO_TANG} tầng: {TANG_TEN.join(' · ')}. Lên tầng trong cùng
          một bậc thì tự động; qua bậc mới phải độ kiếp.
        </p>
        <ul className="tien-so mt-3 space-y-1 text-sm">
          {CANH_GIOI.map((c) => (
            <li key={c.bac}>
              Bậc {c.bac}: mỗi tầng cần {tuViCanDe(c.bac, 1).toLocaleString('vi')}
              {' → '}{tuViCanDe(c.bac, SO_TANG).toLocaleString('vi')} tu vi.
            </li>
          ))}
        </ul>
      </section>

      <section className="tien-giay p-5">
        <h2 className="mb-3 text-lg font-black">Năm đại đạo</h2>
        <ul className="space-y-3 text-sm">
          {DAO.map((d) => (
            <li key={d.ma} className={cn('border-b pb-2', d.ma === nv.dao && 'tien-son')}
              style={{ borderColor: 'var(--tien-vien)' }}>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <b className="text-base">{d.ten}</b>
                {d.ma === nv.dao && <span className="text-xs font-bold">đạo của bạn</span>}
                <span className="text-xs opacity-70">{d.taiNguyen}</span>
              </p>
              <p className="opacity-85">{d.loiChoi}</p>
              <p className="text-xs opacity-70">Mạnh: {d.manh} · Yếu: {d.yeu}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="tien-giay p-5">
        <h2 className="mb-3 text-lg font-black">Linh căn</h2>
        <ul className="grid gap-x-5 gap-y-1 text-sm sm:grid-cols-2">
          {LINH_CAN.map((l) => (
            <li key={l.id} className={cn('flex justify-between gap-2 border-b pb-0.5',
              l.id === nv.linhCan && 'tien-son font-bold')}
              style={{ borderColor: 'var(--tien-vien)' }}>
              <span>{l.ten}{l.di && ' (dị)'}</span>
              <span className="tabular-nums">×{l.heSo}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
