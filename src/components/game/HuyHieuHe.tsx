import { MO_TA_HE, type MaHeMay } from '@/lib/he-may';
import { HinhHeMay } from '@/components/game/HinhHeMay';

/**
 * Dãy biểu tượng hệ máy một game có bản tải.
 *
 * Đây là câu hỏi THỨ HAI của mọi người sau "game gì" — "máy tôi chạy được
 * không". Nên nó phải trả lời được bằng cái liếc mắt, không bắt đọc chữ.
 *
 * Hình lấy ở `HinhHeMay` chứ không mượn bộ `lucide` nữa: bộ ấy không có hình
 * cho Android hay iOS, nên chỗ này từng bày một cái điện thoại chữ nhật và một
 * quả táo có cuống — liếc mắt qua thì đọc ra "điện thoại" với "trái cây", đúng
 * thứ mà cái liếc mắt ấy KHÔNG được phép đọc nhầm.
 */
export function HuyHieuHe({ heMay, co = 12 }: { heMay: MaHeMay[]; co?: number }) {
  if (heMay.length === 0) return null;
  return (
    <span className="flex items-center gap-1 text-mo">
      {heMay.map((h) => (
        <span key={h} role="img" aria-label={MO_TA_HE[h].ten} className="inline-flex">
          <HinhHeMay he={h} co={co} />
        </span>
      ))}
    </span>
  );
}
