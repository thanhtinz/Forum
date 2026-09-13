import Link from 'next/link';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
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
 * THẺ SỰ KIỆN — một tấm ảnh lớn, chữ đè lên nửa dưới.
 *
 * Dáng thẻ sự kiện của App Store, và bản trước làm khác: ảnh trên, chữ nằm
 * trong một khối trắng bên dưới. Khác biệt ấy đáng kể vì thẻ sự kiện phải bán
 * được cái KHÔNG KHÍ của sự kiện — ảnh càng to càng ăn. Tách chữ xuống một
 * khối riêng là cắt mất một phần ba chiều cao của ảnh để in ba dòng chữ mà
 * hai trong ba dòng ấy đã nói được bằng chính tấm ảnh.
 *
 * Dòng nhãn ĐANG DIỄN RA / SẮP TỚI nằm NGOÀI thẻ, ngay trên nó — App Store
 * xếp thế. Nó là chuyện thời gian, không phải chuyện nội dung, nên để trong
 * thẻ thì lẫn với tên sự kiện; mà đặt trên đầu thì lướt qua cả kệ là biết
 * ngay cái nào còn kịp.
 *
 * Chưa có ảnh thì dựng dải màu theo LOẠI sự kiện thay vì bỏ trống: một thẻ
 * trống trông như thẻ hỏng, còn dải màu vẫn nói được "đây là giải đấu".
 */
export function TheSuKien({ s, duongDanGame, game, trongKe, anTinhTrang }: {
  s: SuKienXem;
  duongDanGame: string;
  /**
   * Game chủ của sự kiện — CHỈ truyền ở chỗ trộn sự kiện của nhiều game.
   *
   * Ở trang game thì thừa: cả trang đang nói về đúng game ấy, in lại tên nó
   * dưới mỗi thẻ chỉ tổ chiếm chỗ. Nhưng ở trang sự kiện chung hay kệ ngoài
   * trang chủ thì thiếu nó là thẻ mất nghĩa — "Giải đua mùa hè" của game nào?
   */
  game?: { ten: string; icon: string | null };
  /**
   * Thẻ đang nằm trên KỆ CUỘN NGANG nên phải có bề ngang cố định.
   *
   * Trong lưới thì ngược lại: ô lưới quyết bề ngang, thẻ cứ giãn cho vừa. Để
   * bề ngang cứng trong thành phần rồi dùng chung cả hai chỗ thì lưới ba cột
   * hoá ra ba cái thẻ hẹp dính bên trái, chừa một khoảng trống bên phải.
   */
  trongKe?: boolean;
  /**
   * Bỏ chữ ĐANG DIỄN RA / SẮP TỚI, chỉ giữ lại mốc ngày.
   *
   * Dùng ở trang sự kiện chung, nơi thẻ đã nằm dưới đúng cái đầu mục nói y
   * hệt điều đó — in lại trên từng thẻ là bắt người đọc đọc cùng một chữ ba
   * lần trên một hàng. Mốc ngày thì vẫn phải giữ: nó khác nhau ở từng thẻ.
   */
  anTinhTrang?: boolean;
}) {
  const mo = MO_TA_SU_KIEN[s.loai as MaLoaiSuKien] ?? { ten: 'Sự kiện', mau: '#475569' };
  const chuaMo = new Date(s.batDau).getTime() > Date.now();

  return (
    <div className={trongKe ? 'w-[280px] shrink-0 sm:w-[320px]' : 'w-full'}>
      {anTinhTrang ? (
        <p className="phu mb-1.5 font-semibold">{khoangNgay(s.batDau, s.ketThuc)}</p>
      ) : (
        <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.04em] text-nhan">
          {chuaMo ? 'Sắp tới' : 'Đang diễn ra'}
          <span className="phu ml-1.5 font-semibold normal-case tracking-normal">
            {khoangNgay(s.batDau, s.ketThuc)}
          </span>
        </p>
      )}

      <Link href={`/game/${duongDanGame}/su-kien/${s.id}`}
        className="the-bam relative block aspect-[4/3] overflow-hidden">
        {s.anh ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.anh} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span aria-hidden className="absolute inset-0"
            style={{ backgroundImage: `linear-gradient(135deg, ${mo.mau}, ${mo.mau}bb)` }} />
        )}

        {/*
          MÀN TỐI CHUYỂN DẦN Ở NỬA DƯỚI, không phải một lớp mờ phủ cả ảnh.

          Ảnh chụp trong game sáng tối tuỳ cảnh, nên chữ trắng đặt thẳng lên có
          lúc đọc được có lúc mất hút. Màn tối chỉ ăn phần dưới nên giữ nguyên
          được phần ảnh đắt nhất — nhân vật, khung cảnh — mà vẫn bảo đảm chữ
          luôn có nền sẫm để tựa vào.
        */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5
          bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

        <span className="absolute inset-x-0 bottom-0 p-3.5 text-white">
          <span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-white/85">
            {mo.ten}
          </span>
          <span className="mt-0.5 block truncate text-[17px] font-bold leading-tight">{s.tieuDe}</span>
          <span className="mt-0.5 block truncate text-[13px] text-white/80">{s.moTaNgan}</span>
        </span>
      </Link>

      {game && (
        <Link href={`/game/${duongDanGame}`}
          className="mt-2 flex items-center gap-2 hover:opacity-70">
          <BieuTuongGame ten={game.ten} icon={game.icon} co={28} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{game.ten}</span>
        </Link>
      )}
    </div>
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
