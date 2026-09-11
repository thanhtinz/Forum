import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { OTraLoiYeuCau } from '@/components/quan-tri/OTraLoiYeuCau';
import { cachDay } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Yêu cầu game' };

export default async function QuanTriYeuCau() {
  const yeuCau = await db.yeuCau.findMany({
    // Việc chưa xử lý lên đầu: xếp thuần theo thời gian thì mấy dòng cần trả
    // lời trôi mất xuống dưới hàng trăm dòng đã xong.
    orderBy: [{ trangThai: 'asc' }, { taoLuc: 'desc' }],
    take: 100,
    select: {
      id: true, ten: true, ghiChu: true, trangThai: true, loiNhan: true, taoLuc: true,
      nguoi: { select: { tenHienThi: true, email: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="tieu-de-trang">Yêu cầu game</h1>

      {yeuCau.length === 0 ? (
        <p className="the p-8 text-center text-[13px] text-mo">Chưa có yêu cầu nào.</p>
      ) : (
        <ul className="space-y-3">
          {yeuCau.map((y) => (
            <li key={y.id} className="the p-4">
              <p className="text-[15px] font-semibold">{y.ten}</p>
              <p className="phu mt-0.5">
                {y.nguoi.tenHienThi} · {y.nguoi.email} · {cachDay(y.taoLuc)}
              </p>
              {y.ghiChu && (
                <p className="mt-2 whitespace-pre-line rounded-nut bg-nen3 px-3 py-2 text-[13px] leading-relaxed">
                  {y.ghiChu}
                </p>
              )}
              <div className="mt-3">
                <OTraLoiYeuCau id={y.id} trangThai={y.trangThai} loiNhan={y.loiNhan ?? ''} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
