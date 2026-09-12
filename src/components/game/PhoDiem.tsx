import Link from 'next/link';
import { SaoNam } from './SaoNam';
import { gonSo } from '@/lib/tien-ich';

/**
 * PHỔ ĐIỂM — điểm to bên trái, năm thanh ngang bên phải.
 *
 * Bố cục này của CH Play, và nó nói được thứ mà con số trung bình giấu đi:
 * "4,3" có thể là ai cũng cho 4, mà cũng có thể là một nửa cho 5 còn một nửa
 * cho 2 — hai cửa hàng game hoàn toàn khác nhau, cùng in ra một con số.
 *
 * Thanh dài theo TỈ LỆ so với mức đông nhất chứ không so với tổng: nếu chia
 * theo tổng thì game nào cũng ra năm cái gạch bé tí gần bằng nhau, không đọc
 * ra hình dáng gì.
 *
 * Mỗi hàng còn là một lối LỌC: thấy phổ điểm lệch xuống 1 sao thì việc muốn
 * làm ngay là đọc xem mấy người ấy phàn nàn gì, nên bấm thẳng vào hàng ấy.
 */
export function PhoDiem({ sao, tong, phanBo, locSao, dungDuong }: {
  sao: number;
  tong: number;
  phanBo: Record<number, number>;
  /** Sao đang lọc; `null` là chưa lọc. Không truyền thì phổ điểm không bấm được. */
  locSao?: number | null;
  /*
   * Dựng địa chỉ cho một mức sao (`null` là bỏ lọc).
   *
   * Không truyền thì mặc định `?sao=N`, tức là XOÁ SẠCH tham số khác. Ở trang
   * chỉ có mỗi bộ lọc sao thì thế là đúng; còn trang đánh giá đầy đủ có thêm
   * cách sắp, mà đổi bộ lọc lại mất cách sắp đang chọn thì khó chịu.
   */
  dungDuong?: (sao: number | null) => string;
}) {
  if (tong === 0) {
    return <p className="phu">Chưa ai đánh giá game này. Bạn là người đầu tiên?</p>;
  }

  const dongNhat = Math.max(1, ...[1, 2, 3, 4, 5].map((s) => phanBo[s] ?? 0));

  return (
    <div className="flex items-center gap-6">
      <div className="shrink-0 text-center">
        <p className="text-[44px] font-bold leading-none">{sao.toFixed(1).replace('.', ',')}</p>
        <div className="mt-1.5 flex justify-center"><SaoNam diem={sao} co={13} /></div>
        <p className="phu mt-1">{gonSo(tong)} đánh giá</p>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        {[5, 4, 3, 2, 1].map((s) => {
          const n = phanBo[s] ?? 0;
          const dangChon = locSao === s;
          const than = (
            <>
              <span className="w-2 shrink-0 text-[11px] tabular-nums text-mo">{s}</span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-nen3">
                <span className={`block h-full rounded-full ${dangChon ? 'bg-cam' : 'bg-nhan'}`}
                  style={{ width: `${(n / dongNhat) * 100}%` }} />
              </span>
            </>
          );

          // Hàng không có bài nào thì lọc vào cũng chỉ ra trang trống, nên để
          // nguyên là chữ chứ không mời người ta bấm vào chỗ không có gì.
          if (locSao === undefined || n === 0) {
            return <div key={s} className="flex items-center gap-2">{than}</div>;
          }

          const dich = dangChon
            ? (dungDuong?.(null) ?? '?')
            : (dungDuong?.(s) ?? `?sao=${s}`);

          return (
            <Link key={s} href={dich} scroll={false}
              aria-label={dangChon ? `Bỏ lọc ${s} sao` : `Chỉ xem đánh giá ${s} sao (${n} bài)`}
              className="flex items-center gap-2 rounded-full py-0.5 transition-opacity hover:opacity-70">
              {than}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
