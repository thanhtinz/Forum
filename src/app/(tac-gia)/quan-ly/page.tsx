import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowRight, Clock, Download, Eye, Star, TriangleAlert } from 'lucide-react';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { NhanTrangThai } from '@/components/tac-gia/NhanTrangThai';
import { cachDay, diemSao, gonSo } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tổng quan' };

/*
 * TỔNG QUAN CỦA TÁC GIẢ.
 *
 * Mở ra là biết hai chuyện, theo đúng thứ tự ấy: CÓ GÌ ĐANG CHỜ MÌNH (game bị
 * trả lại, game đang chờ duyệt), rồi mới tới số liệu. Play Console cũng mở
 * bằng mấy thẻ việc tồn đọng chứ không mở bằng biểu đồ — số liệu đẹp mà đang
 * có một game bị trả lại thì cái cần làm vẫn là sửa game ấy.
 */
export default async function TongQuanTacGia() {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap');

  const [gom, game, bịTraLai] = await Promise.all([
    db.game.aggregate({
      where: { tacGiaId: nguoi.id },
      _count: { _all: true },
      _sum: { soLuotTai: true, soLuotXem: true, tongSao: true, soLuotDanhGia: true },
    }),
    db.game.findMany({
      where: { tacGiaId: nguoi.id },
      orderBy: [{ suaLuc: 'desc' }, { id: 'desc' }],
      take: 5,
      select: {
        id: true, ten: true, icon: true, trangThai: true, soLuotTai: true,
        tongSao: true, soLuotDanhGia: true, suaLuc: true,
      },
    }),
    db.game.findMany({
      where: { tacGiaId: nguoi.id, trangThai: 'TU_CHOI' },
      orderBy: { suaLuc: 'desc' },
      take: 5,
      select: { id: true, ten: true, lyDoTuChoi: true },
    }),
  ]);

  const sao = diemSao(gom._sum.tongSao ?? 0, gom._sum.soLuotDanhGia ?? 0);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="tieu-de-trang">Tổng quan</h1>
        <p className="phu mt-1">Game của bạn trên SunnyStore</p>
      </div>

      {/* Game bị trả lại lên ĐẦU trang, trước cả số liệu: đó là thứ duy nhất
          ở đây đang chờ tác giả làm gì đó. */}
      {bịTraLai.length > 0 && (
        <section className="the border-canh/30 bg-cam/5 p-4">
          <p className="flex items-center gap-2 text-[15px] font-bold text-canh">
            <TriangleAlert size={17} aria-hidden />
            {bịTraLai.length} game bị trả lại
          </p>
          <ul className="mt-3 space-y-2.5">
            {bịTraLai.map((g) => (
              <li key={g.id}>
                <Link href={`/quan-ly/game/${g.id}`} className="group block">
                  <span className="text-[14px] font-semibold group-hover:underline">{g.ten}</span>
                  {g.lyDoTuChoi && (
                    <span className="phu mt-0.5 block line-clamp-2">{g.lyDoTuChoi}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <O hinh={<Clock size={16} />} nhan="Game" so={gonSo(gom._count._all)} />
        <O hinh={<Download size={16} />} nhan="Lượt tải" so={gonSo(gom._sum.soLuotTai ?? 0)} />
        <O hinh={<Eye size={16} />} nhan="Lượt xem" so={gonSo(gom._sum.soLuotXem ?? 0)} />
        <O hinh={<Star size={16} />} nhan="Điểm trung bình"
          so={(gom._sum.soLuotDanhGia ?? 0) > 0 ? sao.toFixed(1).replace('.', ',') : '—'} />
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="tieu-de">Vừa sửa gần đây</h2>
          <Link href="/quan-ly/game"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-nhan hover:underline">
            Tất cả game <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        {game.length === 0 ? (
          <div className="the p-8 text-center">
            <p className="text-[14px] font-semibold">Bạn chưa đăng game nào</p>
            <p className="phu mt-1">Game mới nằm ở nháp cho tới khi bạn gửi duyệt.</p>
            <Link href="/quan-ly/game/moi" className="nut-cai-dam mt-4">Thêm game đầu tiên</Link>
          </div>
        ) : (
          <ul className="the-noi danh-sach-the">
            {game.map((g) => (
              <li key={g.id} className="p-3.5">
                <Link href={`/quan-ly/game/${g.id}`} className="flex items-center gap-3">
                  <BieuTuongGame ten={g.ten} icon={g.icon} co={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{g.ten}</span>
                    <span className="phu mt-0.5 block truncate">
                      {gonSo(g.soLuotTai)} lượt tải · sửa {cachDay(g.suaLuc)}
                    </span>
                  </span>
                  <NhanTrangThai trangThai={g.trangThai} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function O({ hinh, nhan, so }: { hinh: React.ReactNode; nhan: string; so: string }) {
  return (
    <div className="the p-3.5">
      <p className="phu flex items-center gap-1.5">{hinh} {nhan}</p>
      <p className="mt-1 text-[24px] font-bold leading-none tabular-nums">{so}</p>
    </div>
  );
}
