import { HangGame } from './HangGame';
import { gop } from '@/lib/tien-ich';
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

      {/*
        HAI BỐ CỤC, KHÔNG PHẢI MỘT BỐ CỤC CO GIÃN.

        Điện thoại: cột lật ngang bằng ngón cái — thao tác tự nhiên nhất trên
        màn hình cầm tay, và là cách cả hai cửa hàng lớn đang làm.

        Máy bàn: LƯỚI ba cột đứng yên. Cuộn ngang bằng chuột là cực hình — hoặc
        phải kéo thanh cuộn, hoặc phải giữ Shift mà lăn. Cùng ngần ấy game, cùng
        ngần ấy chỗ, mà không bắt ai kéo gì cả. Đây chính là chỗ máy bàn phải
        khác điện thoại, chứ không phải chỉ rộng hơn.
      */}
      <div className="ke -mx-4 px-4 lg:hidden">
        {cot.map((c, iCot) => (
          <div key={iCot} className="ke-cot space-y-3">
            {c.map((g, i) => (
              <HangGame key={g.id} game={g} soThuTu={danhSo ? iCot * moiCot + i + 1 : undefined} />
            ))}
          </div>
        ))}
      </div>

      {/* Bảng xếp hạng đọc XUỐNG từng cột (1,2,3 rồi mới 4,5,6), như bảng xếp
          hạng của CH Play trên máy bàn — hạng 1 tới 3 đứng cạnh nhau theo
          chiều dọc thì mắt bắt được thứ hạng ngay, khỏi phải nhảy ngang. */}
      <div className={gop(
        'hidden gap-x-8 gap-y-3.5 lg:grid lg:grid-cols-3',
        danhSo && 'lg:grid-flow-col lg:grid-rows-3',
      )}>
        {game.map((g, i) => (
          <HangGame key={g.id} game={g} soThuTu={danhSo ? i + 1 : undefined} />
        ))}
      </div>
    </section>
  );
}
