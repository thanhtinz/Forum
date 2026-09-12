import Link from 'next/link';
import { Star } from 'lucide-react';
import { BieuTuongGame } from './BieuTuongGame';
import { NutCai } from './NutCai';
import { gonSo } from '@/lib/tien-ich';
import type { TheGame } from './the-game';

/**
 * MỘT HÀNG trong danh sách game — dáng của App Store và CH Play.
 *
 * Bốn phần, luôn đúng thứ tự ấy: biểu tượng, tên, dòng phụ, nút cài. Người
 * dùng hai cửa hàng lớn đã quét mắt theo đúng nếp này hàng nghìn lần rồi; đảo
 * chỗ đi thì mỗi hàng lại bắt họ đọc lại từ đầu.
 *
 * Dòng phụ ưu tiên thể loại chứ không phải nhà phát triển: người tìm game ở
 * cửa hàng cũ thường nhớ "game bắn súng ngày xưa" chứ ít ai nhớ tên hãng làm ra nó.
 */
export function HangGame({ game, soThuTu }: { game: TheGame; soThuTu?: number }) {
  return (
    <div className="flex items-center gap-3">
      {soThuTu != null && (
        <span className="w-5 shrink-0 text-center text-[15px] font-medium tabular-nums text-mo">
          {soThuTu}
        </span>
      )}

      <Link href={`/game/${game.duongDan}`} className="group flex min-w-0 flex-1 items-center gap-3">
        <BieuTuongGame ten={game.ten} icon={game.icon} co={56} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium leading-tight group-hover:underline">
            {game.ten}
          </span>
          <span className="phu mt-0.5 block truncate">{dongPhu(game)}</span>
          <span className="mt-1 flex items-center gap-1 text-[12px] text-mo">
            {game.soLuotDanhGia > 0 ? (
              <>
                {game.sao.toFixed(1).replace('.', ',')}
                <Star size={10} className="fill-mo text-mo" />
              </>
            ) : (
              <span className="text-mo">Chưa có đánh giá</span>
            )}
          </span>
        </span>
      </Link>

      <NutCai duongDan={game.duongDan} />
    </div>
  );
}

function dongPhu(game: TheGame): string {
  if (game.theLoai.length > 0) return game.theLoai.map((t) => t.ten).join(' · ');
  return `${gonSo(game.soLuotTai)} lượt tải`;
}
