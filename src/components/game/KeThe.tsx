import { TheDoc } from './TheDoc';
import { TieuDeKe } from './TieuDeKe';
import type { TheGame } from './the-game';

/**
 * KỆ THẺ — hàng biểu tượng cuộn ngang.
 *
 * Dùng khi cái đáng khoe là BIỂU TƯỢNG chứ không phải thông tin: mục mới lên
 * kho, mục cùng thể loại. Muốn người ta cân nhắc và bấm cài ngay thì dùng
 * `KeDanhSach` — thẻ dọc không có chỗ cho nút cài.
 */
export function KeThe({ ten, phu, xemThem, game, rong = 104 }: {
  ten: string;
  phu?: string;
  xemThem?: string;
  game: TheGame[];
  rong?: number;
}) {
  if (game.length === 0) return null;

  return (
    <section>
      <TieuDeKe ten={ten} phu={phu} xemThem={xemThem} />
      <div className="ke -mx-4 gap-3 px-4 sm:mx-0 sm:px-0">
        {game.map((g) => <TheDoc key={g.id} game={g} rong={rong} />)}
      </div>
    </section>
  );
}
