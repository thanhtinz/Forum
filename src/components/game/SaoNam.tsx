import { Star } from 'lucide-react';

/**
 * Năm ngôi sao, ngôi cuối cắt theo phần lẻ.
 *
 * Cắt bằng bề rộng của một lớp sao vàng đè lên lớp sao xám, chứ không đổi
 * từng ngôi thành nửa sao: 4,3 sao mà làm tròn thành 4 hay 4,5 thì con số in
 * bên cạnh nói một đằng, hình vẽ nói một nẻo.
 *
 * `w-max` TRÊN CẢ HAI HÀNG SAO, và đây là chỗ đã hỏng thật.
 *
 * Lớp sao vàng nằm trong một ô bị đặt cứng bề ngang (`width: 86%` chẳng hạn)
 * và `overflow-hidden`. Hàng sao bên trong là một `flex`, mà flex thì mặc định
 * cho phép CO ITEM LẠI để vừa chỗ — nên năm ngôi sao vàng bị nén vào 86% chỗ
 * thay vì bị CẮT ở mốc 86%. Kết quả: sao vàng nhỏ hơn và sát nhau hơn sao
 * xám, hai lớp lệch nhau, mắt thấy đúng như chữ "đè lên nhau".
 *
 * `w-max` buộc hàng sao giữ đúng bề ngang tự nhiên của nó, và lúc ấy `width`
 * của ô ngoài mới làm đúng việc nó sinh ra để làm: cắt, không nén.
 */
export function SaoNam({ diem, co = 14 }: { diem: number; co?: number }) {
  const phanTram = Math.max(0, Math.min(100, (diem / 5) * 100));

  return (
    <span className="relative inline-flex shrink-0" role="img" aria-label={`${diem.toFixed(1)} trên 5 sao`}>
      <span className="flex w-max gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={co} className="shrink-0 text-vien" fill="currentColor" aria-hidden />
        ))}
      </span>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${phanTram}%` }}>
        <span className="flex w-max gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={co} className="shrink-0 text-canh" fill="currentColor" aria-hidden />
          ))}
        </span>
      </span>
    </span>
  );
}
