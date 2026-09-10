import Link from 'next/link';
import { Star } from 'lucide-react';
import { BieuTuongGame } from './BieuTuongGame';
import type { TheGame } from './the-game';

/**
 * Thẻ game xếp DỌC: biểu tượng lớn, tên dưới, điểm sao dưới cùng.
 *
 * Dáng này dùng cho các kệ "đề xuất" — chỗ cần khoe biểu tượng hơn là khoe
 * chữ, vì người ta nhận ra game cũ bằng cái hình trước khi kịp đọc tên.
 *
 * Điểm sao in MỘT ngôi kèm con số chứ không in năm ngôi: trên thẻ rộng chừng
 * trăm điểm ảnh, năm ngôi sao mỗi ngôi còn vài pixel, nhìn ra một vệt xám chứ
 * không đọc được là mấy sao.
 */
export function TheDoc({ game, rong = 104 }: { game: TheGame; rong?: number }) {
  return (
    <Link href={`/game/${game.duongDan}`} className="group block" style={{ width: rong }}>
      <BieuTuongGame ten={game.ten} icon={game.icon} co={rong} />
      <span className="mt-2 block dong-2 text-[13px] font-medium leading-tight group-hover:underline">
        {game.ten}
      </span>
      <span className="mt-1 flex items-center gap-1 text-[12px] text-mo">
        {game.soLuotDanhGia > 0 ? (
          <>
            {game.sao.toFixed(1).replace('.', ',')}
            <Star size={10} className="fill-mo text-mo" />
          </>
        ) : (
          'Mới'
        )}
      </span>
    </Link>
  );
}
