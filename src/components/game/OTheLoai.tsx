import Link from 'next/link';
import {
  CarFront, Coffee, Compass, Crown, Gamepad2, Joystick,
  Puzzle, Shield, Sprout, Swords, Volleyball, type LucideIcon,
} from 'lucide-react';
import { hinhCuaTheLoai } from '@/lib/the-loai-hinh';

/*
 * Bảng tra từ TÊN sang chính thành phần biểu tượng.
 *
 * Phải viết tay từng dòng chứ không nạp động được: gói lucide xuất hàng nghìn
 * biểu tượng, mà `import * as` một phát là kéo cả nghìn cái vào bản dựng cho
 * trình duyệt tải. Mười dòng này giữ cho bản dựng chỉ mang đúng mười cái.
 */
const BANG: Record<string, LucideIcon> = {
  CarFront, Coffee, Compass, Crown, Gamepad2, Joystick, Puzzle, Shield, Sprout, Swords, Volleyball,
};

/** Một ô trong lưới thể loại: hình tròn có màu riêng, tên, và số game. */
export function OTheLoai({ ten, duongDan, soGame }: {
  ten: string;
  duongDan: string;
  soGame: number;
}) {
  const { icon, sac } = hinhCuaTheLoai(duongDan);
  const Hinh = BANG[icon] ?? Gamepad2;

  return (
    <Link href={`/duyet?the-loai=${duongDan}`}
      className="the-bam group flex items-center gap-3 px-3.5 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: `rgb(${sac} / .12)`, color: `rgb(${sac})` }}>
        <Hinh size={19} strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{ten}</span>
        <span className="phu block">{soGame} game</span>
      </span>
    </Link>
  );
}
