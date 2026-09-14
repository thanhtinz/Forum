import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Bell, ChevronLeft, CircleCheckBig, Lock, MessageSquare } from 'lucide-react';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { PhanTrang } from '@/components/PhanTrang';
import { cachDay, kep, soTrang } from '@/lib/tien-ich';
import { rutGon } from '@/lib/trich-dan-const';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';

const MOI_TRANG = 20;

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Chủ đề đang theo dõi' };

/*
 * CHỖ XEM MÌNH ĐANG THEO DÕI NHỮNG GÌ.
 *
 * Không có trang này thì cái công tắc "Theo dõi" trong diễn đàn là một nút chỉ
 * bấm được chứ không xem lại được: người ta theo dõi năm chủ đề ở năm game
 * khác nhau rồi không còn đường nào tìm lại, trừ khi nhớ tên từng game. Thông
 * báo có dẫn tới nơi, nhưng thông báo thì trôi đi.
 *
 * Xếp theo LẦN CÓ BÀI GẦN NHẤT chứ không theo lúc bấm theo dõi: người mở trang
 * này đang hỏi "có gì mới không", không hỏi "mình bấm cái nào trước".
 */
export default async function ChuDeTheoDoi({ searchParams }: {
  searchParams: Promise<{ trang?: string }>;
}) {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap?tiep=/toi/theo-doi');

  const { trang: trangNhap } = await searchParams;

  const tong = await db.theoDoiChuDe.count({ where: { nguoiId: nguoi.id } });
  const tongTrang = soTrang(tong, MOI_TRANG);
  const trang = kep(trangNhap, 1, tongTrang, 1);

  const theoDoi = await db.theoDoiChuDe.findMany({
    where: { nguoiId: nguoi.id },
    // Khoá phụ `chuDeId`: hai chủ đề cùng mốc trả lời cuối thì không có khoá
    // phụ là thứ tự đổi mỗi lần hỏi, và phân trang lặp hàng.
    orderBy: [{ chuDe: { traLoiCuoiLuc: 'desc' } }, { chuDeId: 'desc' }],
    skip: (trang - 1) * MOI_TRANG,
    take: MOI_TRANG,
    select: {
      chuDe: {
        select: {
          id: true, tieuDe: true, noiDung: true, khoa: true, loiGiaiId: true,
          soTraLoi: true, traLoiCuoiLuc: true,
          game: { select: { ten: true, duongDan: true, icon: true } },
          traLoi: {
            orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
            take: 1,
            select: { nguoi: { select: { tenHienThi: true } } },
          },
        },
      },
    },
  });

  return (
    <div className="cot space-y-5">
      <div>
        <Link href="/toi" className="phu inline-flex items-center gap-1 hover:text-chu">
          <ChevronLeft size={14} aria-hidden /> Tài khoản
        </Link>
        <h1 className="tieu-de-trang mt-1">Chủ đề đang theo dõi</h1>
        <p className="phu mt-1">
          Có bài mới trong mấy chủ đề này thì cửa hàng báo cho bạn.
        </p>
      </div>

      {tong === 0 ? (
        <div className="the p-8 text-center">
          <Bell size={24} className="mx-auto text-mo" aria-hidden />
          <p className="mt-2 text-[14px] font-semibold">Chưa theo dõi chủ đề nào</p>
          <p className="phu mt-1">
            Mở một chủ đề trong diễn đàn của game rồi bấm “Theo dõi”. Viết một bài
            thì cũng tự theo dõi luôn.
          </p>
        </div>
      ) : (
        <>
          <ul aria-label="Chủ đề đang theo dõi" className="the divide-y divide-vien">
            {theoDoi.map(({ chuDe: c }) => (
              <li key={c.id}>
                <Link href={`/game/${c.game.duongDan}/dien-dan/${c.id}`}
                  className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-nen3/70">
                  {/* Biểu tượng game chứ không phải ảnh người mở: ở đây mấy chủ
                      đề tới từ nhiều game khác nhau, nên câu hỏi đầu tiên là
                      "chuyện này của game nào". */}
                  <span className="mt-0.5 shrink-0">
                    <BieuTuongGame ten={c.game.ten} icon={c.game.icon} co={38} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {c.loiGiaiId && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-nhan/12 px-1.5 py-0.5 text-[11px] font-bold text-nhan">
                          <CircleCheckBig size={10} aria-label="đã có lời giải" /> Đã giải
                        </span>
                      )}
                      {c.khoa && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-nen3 px-1.5 py-0.5 text-[11px] font-bold text-mo">
                          <Lock size={10} aria-label="đã khoá" /> Khoá
                        </span>
                      )}
                      <span className="min-w-0 truncate text-[15px] font-semibold">{c.tieuDe}</span>
                    </span>

                    <span className="phu mt-0.5 block truncate">{rutGon(c.noiDung, 110)}</span>

                    <span className="phu mt-1 block truncate text-[12px]">
                      {c.game.ten}
                      {c.traLoi[0]
                        ? ` · ${c.traLoi[0].nguoi.tenHienThi} trả lời ${cachDay(c.traLoiCuoiLuc)}`
                        : ` · ${cachDay(c.traLoiCuoiLuc)}`}
                    </span>
                  </span>

                  <span className="phu flex shrink-0 flex-col items-center justify-center px-1">
                    <MessageSquare size={14} aria-hidden />
                    <span className="mt-0.5 text-[12px]">{c.soTraLoi}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <PhanTrang trang={trang} tongTrang={tongTrang}
            dungDuong={(t) => `/toi/theo-doi${t > 1 ? `?trang=${t}` : ''}`} />
        </>
      )}
    </div>
  );
}
