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
    <span aria-hidden
      className={gop('bieu-tuong grid shrink-0 place-items-center font-black text-white', className)}
      style={{
        width: co,
        height: co,
        backgroundImage: `linear-gradient(140deg, ${tu}, ${den})`,
        fontSize: Math.round(co * 0.34),
        letterSpacing: '-0.02em',
      }}>
      {chuTat(ten)}
    </span>
  );
}
