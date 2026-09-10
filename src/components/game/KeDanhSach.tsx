import { HangGame } from './HangGame';
import { TieuDeKe } from './TieuDeKe';
import type { TheGame } from './the-game';

/**
 * KỆ DANH SÁCH — mỗi cột ba hàng, lật ngang từng cột.
 *
 * Đây là dáng kệ đặc trưng nhất của App Store, và CH Play cũng dùng cho mục
 * "Đề xuất cho bạn". Lý do nó tồn tại: một hàng game cao chừng 72px, xếp dọc
 * mười hai game là hết ba màn hình điện thoại. Gom ba hàng vào một cột rồi lật
 * ngang thì mười hai game chỉ ăn đúng một khối, mà vẫn đọc được tên đầy đủ và
 * vẫn có chỗ cho nút cài — thứ mà thẻ dọc không có.
 *
 * Cột cuối cùng cố ý KHÔNG lấp đầy nếu thiếu game: dựng hàng rỗng cho đủ ba
 * thì cột cuối trông như bị hỏng.
 */
export function KeDanhSach({ ten, phu, xemThem, game, moiCot = 3, danhSo = false }: {
  ten: string;
  phu?: string;
  xemThem?: string;
  game: TheGame[];
  moiCot?: number;
  /** Đánh số 1, 2, 3… xuyên suốt các cột — dùng cho bảng xếp hạng. */
  danhSo?: boolean;
}) {
  if (game.length === 0) return null;

  const cot: TheGame[][] = [];
  for (let i = 0; i < game.length; i += moiCot) cot.push(game.slice(i, i + moiCot));

  return (
    <section>
      <TieuDeKe ten={ten} phu={phu} xemThem={xemThem} />
      {/* `-mx-4 px-4` cho kệ tràn ra sát mép màn hình điện thoại: cột kế tiếp
          ló ra ở mép chứ không bị chặn lại bởi một dải lề trắng. */}
      <div className="ke -mx-4 px-4 sm:mx-0 sm:px-0">
        {cot.map((c, iCot) => (
          <div key={iCot} className="ke-cot space-y-3">
            {c.map((g, i) => (
              <HangGame key={g.id} game={g} soThuTu={danhSo ? iCot * moiCot + i + 1 : undefined} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
