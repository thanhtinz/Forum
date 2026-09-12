import Link from 'next/link';
import { MO_TA_SU_KIEN, type MaLoaiSuKien } from '@/lib/su-kien-const';

export interface SuKienXem {
  id: string;
  loai: string;
  tieuDe: string;
  moTaNgan: string;
  anh: string | null;
  batDau: string;
  ketThuc: string;
}

/**
 * THẺ SỰ KIỆN — ảnh nằm ngang, huy hiệu loại, tiêu đề, một dòng mô tả.
 *
 * Dáng thẻ sự kiện của App Store: ảnh 16:9 chiếm phần trên, chữ nằm dưới. Tỉ lệ
 * ấy không phải tuỳ hứng — nó là tỉ lệ của mọi ảnh chụp trong game ở chế độ
 * nằm ngang, nên người bày hàng cắt được thẳng từ ảnh sẵn có.
 *
 * Chưa có ảnh thì dựng dải màu theo LOẠI sự kiện thay vì bỏ trống: một thẻ
 * trống trông như thẻ hỏng, còn dải màu vẫn nói được "đây là giải đấu".
 */
export function TheSuKien({ s, duongDanGame }: { s: SuKienXem; duongDanGame: string }) {
  const mo = MO_TA_SU_KIEN[s.loai as MaLoaiSuKien] ?? { ten: 'Sự kiện', mau: '#475569' };

  return (
    <Link href={`/game/${duongDanGame}/su-kien/${s.id}`}
      className="the-bam block w-[260px] overflow-hidden">
      {s.anh ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.anh} alt="" loading="lazy"
          className="aspect-[16/9] w-full object-cover" />
      ) : (
        <span aria-hidden className="block aspect-[16/9] w-full"
          style={{ backgroundImage: `linear-gradient(135deg, ${mo.mau}, ${mo.mau}bb)` }} />
      )}

      <span className="block p-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: mo.mau }}>
          {mo.ten}
        </span>
        <span className="mt-0.5 block truncate text-[14px] font-bold leading-tight">{s.tieuDe}</span>
        <span className="phu mt-0.5 block truncate">{s.moTaNgan}</span>
        <span className="phu mt-1 block">{khoangNgay(s.batDau, s.ketThuc)}</span>
      </span>
    </Link>
  );
}

/**
 * "Tới 30/9" khi đang diễn ra, "Từ 1/10" khi còn chưa mở.
 *
 * In cả hai mốc thì thành một dòng ngày tháng dài mà mắt phải đọc hết mới hiểu.
 * Người xem chỉ cần biết một con số: còn kịp tới bao giờ, hoặc mở lúc nào.
 */
function khoangNgay(batDau: string, ketThuc: string): string {
  const gio = (d: string) => {
    const t = new Date(d);
    return `${t.getDate()}/${t.getMonth() + 1}`;
  };
  return new Date(batDau).getTime() > Date.now() ? `Từ ${gio(batDau)}` : `Tới ${gio(ketThuc)}`;
}
