import { Star } from 'lucide-react';

/**
 * Năm ngôi sao, ngôi cuối cắt theo phần lẻ.
 *
 * Cắt bằng bề rộng của một lớp sao vàng đè lên lớp sao xám, chứ không đổi
 * từng ngôi thành nửa sao: 4,3 sao mà làm tròn thành 4 hay 4,5 thì con số in
 * bên cạnh nói một đằng, hình vẽ nói một nẻo.
 */
export function SaoNam({ diem, co = 14 }: { diem: number; co?: number }) {
  const phanTram = Math.max(0, Math.min(100, (diem / 5) * 100));

  return (
    <span className="relative inline-flex shrink-0" role="img" aria-label={`${diem.toFixed(1)} trên 5 sao`}>
      <span className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={co} className="text-vien" fill="currentColor" />)}
      </span>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${phanTram}%` }}>
        <span className="flex gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={co} className="text-canh" fill="currentColor" />)}
        </span>
      </span>
    </span>
  );
}
