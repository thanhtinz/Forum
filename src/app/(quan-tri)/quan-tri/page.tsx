import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight, Download, FileText, Inbox, MessageSquare, Plus, Star, Users,
} from 'lucide-react';
import { db } from '@/lib/db';
import { demViecTonDong } from '@/lib/quan-tri-dem';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { cachDay, gonSo } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tổng quan' };

/*
 * TỔNG QUAN — mở ra là biết CÓ GÌ PHẢI LÀM, rồi mới tới kho lớn cỡ nào.
 *
 * Bản trước chỉ có bảy ô đếm. Bảy con số ấy không sai, nhưng chúng không trả
 * lời được câu hỏi duy nhất người mở trang quản trị đang có: "hôm nay tôi phải
 * động tay vào chỗ nào?". Đếm xong rồi vẫn phải tự đi lục từng mục.
 *
 * Nên trang này xếp theo đúng thứ tự ấy:
 *   1. CẦN XỬ LÝ — chỉ hiện khi thật sự có việc, mỗi dòng là một lối đi thẳng.
 *   2. Số liệu kho — bốn con số, không phải bảy.
 *   3. Việc vừa xảy ra — để biết ngoài kia đang động tĩnh gì.
 */
export default async function TongQuan() {
  const [dem, dangHien, nguoiDung, soChuDe, tongTai, danhGiaMoi, chuDeMoi, yeuCauMoi] = await Promise.all([
    demViecTonDong(),
    db.game.count({ where: { trangThai: 'DANG_HIEN' } }),
    db.nguoiDung.count(),
    db.chuDe.count(),
    db.game.aggregate({ _sum: { soLuotTai: true } }),
    db.danhGia.findMany({
      where: { noiDung: { not: null } },
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      take: 5,
      select: {
        id: true, sao: true, noiDung: true, taoLuc: true, traLoi: true,
        nguoi: { select: { tenHienThi: true } },
        game: { select: { ten: true, icon: true, duongDan: true } },
      },
    }),
    db.chuDe.findMany({
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      take: 4,
      select: {
        id: true, tieuDe: true, taoLuc: true,
        game: { select: { ten: true, duongDan: true } },
      },
    }),
    db.yeuCau.findMany({
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      take: 4,
      select: { id: true, ten: true, taoLuc: true, trangThai: true },
    }),
  ]);

  const viec = [
    { so: dem.yeuCauCho, ten: 'yêu cầu game chờ xem', di: '/quan-tri/yeu-cau', icon: <Inbox size={16} /> },
    { so: dem.danhGiaChuaDap, ten: 'đánh giá chưa được trả lời', di: '/quan-tri/danh-gia', icon: <Star size={16} /> },
    { so: dem.gameNhap, ten: 'game còn ở dạng nháp', di: '/quan-tri/game?trangThai=NHAP', icon: <FileText size={16} /> },
  ].filter((v) => v.so > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="tieu-de-trang">Tổng quan</h1>
          <p className="phu mt-1">Tình hình kho và những việc đang chờ</p>
        </div>
        <Link href="/quan-tri/game/moi" className="nut-cai-dam !min-h-[38px] !px-4 !text-[13px]">
          <Plus size={15} aria-hidden /> Thêm game
        </Link>
      </div>

      {/* Khối này BIẾN MẤT khi hết việc, thay vì đứng đó ghi ba số không.
          Một danh sách việc rỗng vẫn bắt mắt đọc qua rồi mới biết là rỗng. */}
      {viec.length > 0 ? (
        <section className="the overflow-hidden">
          <h2 className="vach-duoi px-4 py-3 text-[13px] font-bold">Cần xử lý</h2>
          <ul className="divide-y divide-vien">
            {viec.map((v) => (
              <li key={v.di}>
                <Link href={v.di} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-nen3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cam/15 text-canh">
                    {v.icon}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px]">
                    <strong className="font-bold">{v.so}</strong> {v.ten}
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-mo" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="the px-4 py-3 text-[13px] text-mo">Không còn việc nào đang chờ.</p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <O nhan="Game đang hiện" so={gonSo(dangHien)} icon={<Download size={15} />} di="/quan-tri/game" />
        <O nhan="Tổng lượt tải" so={gonSo(tongTai._sum.soLuotTai ?? 0)} icon={<Download size={15} />} />
        <O nhan="Thành viên" so={gonSo(nguoiDung)} icon={<Users size={15} />} di="/quan-tri/thanh-vien" />
        <O nhan="Chủ đề diễn đàn" so={gonSo(soChuDe)} icon={<MessageSquare size={15} />} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="the overflow-hidden">
          <div className="vach-duoi flex items-center justify-between gap-3 px-4 py-3">
            <h2 className="text-[13px] font-bold">Đánh giá mới nhất</h2>
            <Link href="/quan-tri/danh-gia" className="text-[12px] font-semibold text-nhan hover:underline">
              Xem hết
            </Link>
          </div>
          {danhGiaMoi.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-mo">Chưa có đánh giá nào.</p>
          ) : (
            <ul className="divide-y divide-vien">
              {danhGiaMoi.map((d) => (
                <li key={d.id} className="flex gap-3 px-4 py-3">
                  <BieuTuongGame ten={d.game.ten} icon={d.game.icon} co={34} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold">
                      <span className="truncate">{d.game.ten}</span>
                      <span className="shrink-0 text-mo">{d.sao}★</span>
                      {!d.traLoi && (
                        <span className="shrink-0 rounded-full bg-cam/15 px-1.5 py-0.5 text-[10px] font-bold text-canh">
                          chưa đáp
                        </span>
                      )}
                    </p>
                    <p className="phu mt-0.5 dong-2">{d.noiDung}</p>
                    <p className="phu mt-0.5">{d.nguoi.tenHienThi} · {cachDay(d.taoLuc)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          <section className="the overflow-hidden">
            <h2 className="vach-duoi px-4 py-3 text-[13px] font-bold">Chủ đề mới</h2>
            {chuDeMoi.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-mo">Chưa có chủ đề nào.</p>
            ) : (
              <ul className="divide-y divide-vien">
                {chuDeMoi.map((c) => (
                  <li key={c.id}>
                    <Link href={`/game/${c.game.duongDan}/dien-dan/${c.id}`} target="_blank" rel="noreferrer"
                      className="block px-4 py-2.5 transition-colors hover:bg-nen3">
                      <p className="truncate text-[13px] font-medium">{c.tieuDe}</p>
                      <p className="phu mt-0.5 truncate">{c.game.ten} · {cachDay(c.taoLuc)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="the overflow-hidden">
            <div className="vach-duoi flex items-center justify-between gap-3 px-4 py-3">
              <h2 className="text-[13px] font-bold">Yêu cầu game</h2>
              <Link href="/quan-tri/yeu-cau" className="text-[12px] font-semibold text-nhan hover:underline">
                Xem hết
              </Link>
            </div>
            {yeuCauMoi.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-mo">Chưa có yêu cầu nào.</p>
            ) : (
              <ul className="divide-y divide-vien">
                {yeuCauMoi.map((y) => (
                  <li key={y.id} className="flex items-center gap-2 px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{y.ten}</span>
                    <span className="phu shrink-0">{cachDay(y.taoLuc)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Một ô số liệu. Bấm được thì bọc liên kết — số nào cũng có chỗ để đi tới. */
function O({ nhan, so, icon, di }: {
  nhan: string;
  so: string;
  icon: React.ReactNode;
  di?: string;
}) {
  const ruot = (
    <>
      <span className="flex items-center gap-1.5 text-mo">
        {icon}
        <span className="phu">{nhan}</span>
      </span>
      <span className="mt-1.5 block text-[24px] font-bold leading-none tracking-tight">{so}</span>
    </>
  );

  if (!di) return <div className="the p-4">{ruot}</div>;
  return <Link href={di} className="the-bam block p-4">{ruot}</Link>;
}
