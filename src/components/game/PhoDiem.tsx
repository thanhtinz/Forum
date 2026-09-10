import { SaoNam } from './SaoNam';
import { gonSo } from '@/lib/tien-ich';

/**
 * PHỔ ĐIỂM — điểm to bên trái, năm thanh ngang bên phải.
 *
 * Bố cục này của CH Play, và nó nói được thứ mà con số trung bình giấu đi:
 * "4,3" có thể là ai cũng cho 4, mà cũng có thể là một nửa cho 5 còn một nửa
 * cho 2 — hai kho game hoàn toàn khác nhau, cùng in ra một con số.
 *
 * Thanh dài theo TỈ LỆ so với mức đông nhất chứ không so với tổng: nếu chia
 * theo tổng thì game nào cũng ra năm cái gạch bé tí gần bằng nhau, không đọc
 * ra hình dáng gì.
 */
export function PhoDiem({ sao, tong, phanBo }: {
  sao: number;
  tong: number;
  phanBo: Record<number, number>;
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
          return (
            <div key={s} className="flex items-center gap-2">
              <span className="w-2 shrink-0 text-[11px] tabular-nums text-mo">{s}</span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-nen3">
                <span className="block h-full rounded-full bg-nhan"
                  style={{ width: `${(n / dongNhat) * 100}%` }} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
