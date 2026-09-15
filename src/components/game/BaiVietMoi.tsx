import Link from 'next/link';
import { Clock } from 'lucide-react';
import { db } from '@/lib/db';
import { cachDay } from '@/lib/tien-ich';
import { AnhDaiDien } from '@/components/NguoiDung';
import { BAI_MOI } from '@/lib/chat-const';

/**
 * NĂM CHUYỆN VỪA CÓ NGƯỜI NÓI, bày ngay đầu diễn đàn.
 *
 * Bảng chuyên mục trả lời "chỗ này bàn những gì" — một câu hỏi người ta chỉ
 * hỏi đúng lần đầu. Người quay lại lần thứ hai trở đi hỏi câu khác hẳn: "từ
 * hôm qua tới giờ có gì mới không". Bắt họ đi qua bảng mục lục rồi bấm vào
 * từng mục để tự so ngày tháng là bắt làm hộ máy một việc máy làm nhanh hơn.
 *
 * Xếp theo LƯỢT NÓI CUỐI chứ không theo lúc mở chủ đề: một chủ đề mở ba hôm
 * trước mà vừa có người đáp lúc nãy thì đúng là "mới", còn một chủ đề mở lúc
 * nãy chưa ai đáp thì cũng mới — cả hai đều lọt vào, đúng như người đọc mong.
 */
export async function BaiVietMoi({ gameId, duongDan }: { gameId: string; duongDan: string }) {
  const chuDe = await db.chuDe.findMany({
    where: { gameId },
    // Khoá phụ `id` như mọi chỗ xếp thứ tự khác: hai chủ đề cùng mốc thời gian
    // mà không có khoá phụ thì mỗi lượt tải lại ra một thứ tự khác.
    orderBy: [{ traLoiCuoiLuc: 'desc' }, { id: 'desc' }],
    take: BAI_MOI,
    select: {
      id: true, tieuDe: true, traLoiCuoiLuc: true, soTraLoi: true,
      chuyenMuc: { select: { ten: true, duongDan: true } },
      nguoi: { select: { tenHienThi: true, anh: true } },
      /* Người nói CUỐI CÙNG, lấy kèm trong cùng một câu — cùng lối với danh
         sách chủ đề: hỏi riêng cho từng hàng là năm câu truy vấn nữa. */
      traLoi: {
        orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
        take: 1,
        select: { nguoi: { select: { tenHienThi: true, anh: true } } },
      },
    },
  });
  if (chuDe.length === 0) return null;

  return (
    <section aria-label="Bài viết mới" className="the overflow-hidden">
      <h2 className="flex items-center gap-2 border-b border-vien bg-nen3/60 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-mo">
        <Clock size={14} aria-hidden /> Bài viết mới
      </h2>
      <ul className="divide-y divide-vien">
        {chuDe.map((c) => {
          const cuoi = c.traLoi[0]?.nguoi ?? c.nguoi;
          return (
            <li key={c.id}>
              <Link href={`/game/${duongDan}/dien-dan/${c.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-nen3/70">
                <AnhDaiDien ten={cuoi.tenHienThi} anh={cuoi.anh} co={30} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    {c.chuyenMuc && (
                      <span className="shrink-0 rounded-full bg-nen3 px-1.5 py-0.5 text-[11px] font-bold text-mo">
                        {c.chuyenMuc.ten}
                      </span>
                    )}
                    <span className="min-w-0 truncate text-[14px] font-semibold">{c.tieuDe}</span>
                  </span>
                  <span className="phu mt-0.5 block truncate text-[12px]">
                    {cuoi.tenHienThi} · {cachDay(c.traLoiCuoiLuc)}
                  </span>
                </span>
                <span className="phu shrink-0 tabular-nums text-[12px]">
                  {c.soTraLoi} trả lời
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
