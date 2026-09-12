import Link from 'next/link';
import type { Metadata } from 'next';
import { UserPlus } from 'lucide-react';
import { db } from '@/lib/db';
import { OXetDon } from '@/components/quan-tri/OXetDon';
import { cachDay } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Đơn tác giả' };

/*
 * HÀNG CHỜ ĐƠN XIN LÀM TÁC GIẢ.
 *
 * Xếp theo AI GỬI TRƯỚC, cùng lẽ với hàng chờ duyệt game: người gửi hôm qua mà
 * cứ bị đẩy xuống cuối mỗi lần có người mới gửi thì họ chờ mãi không tới lượt.
 *
 * Đơn đã xét vẫn bày, nhưng xuống dưới và in nhạt: người trực cần thấy mình
 * vừa quyết gì trong hôm nay — nhất là mấy đơn bị trả lại, vì đó là chỗ dễ
 * quyết vội nhất.
 */
export default async function DonTacGia() {
  const [cho, daXet] = await Promise.all([
    db.donTacGia.findMany({
      where: { trangThai: 'CHO_XEM' },
      orderBy: [{ taoLuc: 'asc' }, { id: 'asc' }],
      take: 50,
      select: {
        id: true, tenTacGia: true, gioiThieu: true, lyDo: true, taoLuc: true,
        nguoi: { select: { tenDangNhap: true, tenHienThi: true, khoa: true } },
      },
    }),
    db.donTacGia.findMany({
      where: { trangThai: { not: 'CHO_XEM' } },
      orderBy: [{ xetLuc: 'desc' }, { id: 'desc' }],
      take: 20,
      select: {
        id: true, tenTacGia: true, trangThai: true, loiNhan: true, xetLuc: true,
        nguoi: { select: { tenDangNhap: true, tenHienThi: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="tieu-de-trang">Đơn tác giả</h1>
        <p className="phu mt-0.5">
          {cho.length > 0
            ? `${cho.length} người đang chờ trả lời`
            : 'Không có đơn nào đang chờ'}
        </p>
      </div>

      {cho.length === 0 ? (
        <div className="the p-8 text-center">
          <UserPlus size={24} className="mx-auto text-mo" aria-hidden />
          <p className="mt-2 text-[14px] font-semibold">Hàng chờ trống</p>
          <p className="phu mt-1">
            Đơn gửi từ trang “Đăng game của bạn lên SunnyStore” sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {cho.map((d) => (
            <li key={d.id} className="the space-y-2 p-4">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[15px] font-bold">{d.tenTacGia}</span>
                <Link href={`/thanh-vien/${d.nguoi.tenDangNhap}`}
                  className="text-[13px] font-semibold text-nhan hover:underline">
                  {d.nguoi.tenHienThi}
                </Link>
                <span className="phu">· gửi {cachDay(d.taoLuc)}</span>
                {d.nguoi.khoa && (
                  <span className="rounded-full bg-xau/10 px-2 py-0.5 text-[11px] font-bold text-xau">
                    đang bị khoá
                  </span>
                )}
              </div>

              {d.gioiThieu && (
                <p className="whitespace-pre-line text-[13px] text-mo">{d.gioiThieu}</p>
              )}
              <p className="whitespace-pre-line text-[14px] leading-relaxed">{d.lyDo}</p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <OXetDon donId={d.id} ten={d.tenTacGia} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {daXet.length > 0 && (
        <section>
          <h2 className="tieu-de mb-3">Đã xét gần đây</h2>
          <ul className="the divide-y divide-vien">
            {daXet.map((d) => (
              <li key={d.id} className="px-4 py-3">
                <p className="text-[13px]">
                  <span className="font-semibold">{d.tenTacGia}</span>
                  <span className="phu"> · {d.nguoi.tenHienThi} · </span>
                  <span className={d.trangThai === 'DONG_Y' ? 'font-semibold text-nhan' : 'font-semibold text-xau'}>
                    {d.trangThai === 'DONG_Y' ? 'đã đồng ý' : 'đã trả lại'}
                  </span>
                  {d.xetLuc && <span className="phu"> · {cachDay(d.xetLuc)}</span>}
                </p>
                {d.loiNhan && <p className="phu mt-0.5">{d.loiNhan}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
