import Link from 'next/link';
import type { LichSuTran as DuLieu } from '@/lib/rong';
import { anhRong, tenRong } from '@/lib/rong-const';
import { Pagination } from '@/components/Pagination';
import { cn, tinhSoTrang } from '@/lib/utils';

/**
 * Sổ trận đã đánh.
 *
 * Chỉ còn trận của những con rồng ĐANG NUÔI: bảng `RongTran` cascade theo cả
 * hai con rồng, mà thả rồng thì lúc nào cũng thả được. Nói thẳng chuyện ấy ra
 * dưới bảng, chứ không để người chơi tự đoán vì sao lịch sử ngắn đi.
 */
export function LichSuTran({ d, trang, moiTrang }: {
  d: DuLieu; trang: number; moiTrang: number;
}) {
  const soTrang = tinhSoTrang(d.tong, moiTrang);

  return (
    <section className="rong-tam p-4">
      <h2 className="zib-title mb-3">Trận đã đánh</h2>

      {d.tran.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-500">Chưa đánh trận nào.</p>
      ) : (
        <ol className="space-y-1.5">
          {d.tran.map((t) => (
            <li key={t.id} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm dark:bg-ink-800/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={anhRong(t.a.loai, t.a.mau)} alt="" aria-hidden
                className="size-9 shrink-0 object-contain" style={{ imageRendering: 'pixelated' }} />
              <span className="min-w-0 flex-1 truncate">
                <b>{t.a.ten || tenRong(t.a.loai, t.a.mau)}</b>
                <span className="text-ink-400"> vs </span>
                <b>{t.b.ten || tenRong(t.b.loai, t.b.mau)}</b>
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={anhRong(t.b.loai, t.b.mau)} alt="" aria-hidden
                className="size-9 shrink-0 object-contain" style={{ imageRendering: 'pixelated' }} />
              <span className={cn('shrink-0 text-xs font-bold',
                t.ai === 'a' ? 'text-emerald-600' : t.ai === 'hoa' ? 'text-ink-400' : 'text-rose-500')}>
                {t.ai === 'a' ? 'thắng' : t.ai === 'hoa' ? 'hoà' : 'thua'}
              </span>
              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-ink-400">
                {t.duoc > 0 ? `+${t.duoc}` : t.duoc}
              </span>
            </li>
          ))}
        </ol>
      )}

      <Pagination page={trang} totalPages={soTrang} pageParam="trang" basePath="/rong/dau-truong" />

      <p className="retro-sub mt-3 text-ink-400">
        Thả một con rồng thì trận của nó cũng đi theo — số trận mỗi ngày đếm ở
        chỗ khác nên không ai xoá được bộ đếm của mình bằng cách ấy.{' '}
        <Link href="/rong" className="rong-nhan hover:underline">Về chuồng</Link>
      </p>
    </section>
  );
}
