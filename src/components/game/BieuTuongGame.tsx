import { chuTat, mauCuaGame } from '@/lib/mau-game';
import { gop } from '@/lib/tien-ich';

/**
 * Biểu tượng vuông bo góc của một game.
 *
 * Chưa có ảnh thì dựng một ô màu kèm chữ tắt, màu suy ra từ chính tên game —
 * xem `mau-game.ts` để biết vì sao không để trống.
 *
 * Kích thước truyền bằng `px` chứ không bằng lớp Tailwind: thẻ game dùng đúng
 * một thành phần này ở năm cỡ khác nhau, mà sinh lớp động thì Tailwind không
 * quét ra được và lớp ấy biến mất khỏi bản dựng.
 */
export function BieuTuongGame({ ten, icon, co, className }: {
  ten: string;
  icon: string | null;
  co: number;
  className?: string;
}) {
  if (icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={icon} alt="" width={co} height={co} loading="lazy"
        className={gop('bieu-tuong shrink-0 object-cover', className)}
        style={{ width: co, height: co }} />
    );
  }

  const { tu, den } = mauCuaGame(ten);
  return (
    /*
     * Ô màu này phải trông như một BIỂU TƯỢNG ỨNG DỤNG, không như một ô bảng
     * màu. Ba lớp làm nên khác biệt ấy, và cả ba đều rất nhẹ:
     *
     *   • dải màu chéo — cái đã có;
     *   • một vệt sáng ở góc trên trái, như ánh sáng hắt vào một mặt bóng;
     *   • một sợi viền trong bằng màu trắng mờ, đúng cái viền mà biểu tượng
     *     iOS nào cũng có để tách khỏi nền sáng.
     *
     * Chữ tắt hạ từ `font-black` xuống `font-bold`: ở cỡ 56px thì chữ đen
     * kịt bít gần hết ô, mà biểu tượng thật thì hình bao giờ cũng có chỗ thở.
     */
    <span aria-hidden
      className={gop('bieu-tuong grid shrink-0 place-items-center font-bold text-white', className)}
      style={{
        width: co,
        height: co,
        backgroundImage:
          `radial-gradient(105% 85% at 18% 2%, rgb(255 255 255 / .34), transparent 58%),`
          + `linear-gradient(145deg, ${tu}, ${den})`,
        boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / .18), inset 0 -1px 2px rgb(0 0 0 / .12)',
        fontSize: Math.round(co * 0.33),
        letterSpacing: '-0.03em',
        textShadow: '0 1px 2px rgb(0 0 0 / .18)',
      }}>
      {chuTat(ten)}
    </span>
  );
}
