import Link from 'next/link';
import type { Metadata } from 'next';
import { Gamepad2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Khu giải trí',
  description: 'Nông trại, Đảo Pokémon, Đảo Rồng và Trắc nghiệm — chơi bằng điểm kiếm được trên diễn đàn.',
};

/**
 * Khu giải trí — cửa vào của mấy trò chơi trên diễn đàn.
 *
 * TRƯỚC ĐÂY đây là bảy trò cầu may dựng lại từ bộ mod JohnCMS cũ: bầu cua, oẳn
 * tù tì, quay xèng, phi tiêu, sóc đĩa, đập trứng, sút phạt. Bấm một cái ăn
 * thua ngay, chơi vài lượt là hết chuyện. Nay bỏ hết; chỗ này thành cửa vào
 * của ba game dài cộng Trắc nghiệm, thứ mà nội dung do chính thành viên làm ra
 * chứ không phải máy bốc số.
 *
 * Trang này KHÔNG phải trang cha của ba game ấy: mỗi game đứng riêng ở đường
 * dẫn gốc của nó (`/nong-trai`, `/pokemon`, `/rong`) và có menu riêng, nên
 * trong game không có nút "quay lại khu giải trí" nào cả.
 *
 * Vẫn để ở `/giai-tri` chứ không phải `/games`: `/games` là KHO GAME tải về,
 * còn đây là mấy trò chơi ngay trên trang.
 *
 * TĨNH HOÀN TOÀN. Trước đây mỗi ô đeo một con số ("6 luống", "0 người", "10
 * câu"), tức mỗi lần mở trang là bốn câu đếm — mà mấy con số ấy chẳng giúp
 * người ta chọn chơi gì, thậm chí "0 người" còn làm game trông như đã chết.
 * Bỏ đi thì trang không còn hỏi cơ sở dữ liệu câu nào, dựng sẵn lúc build.
 */

/**
 * Biểu tượng của bốn game.
 *
 * Bốn tệp SVG vẽ mới cho khu này, mỗi tệp là một ô vuông 128×128 ĐÃ CÓ SẴN
 * NỀN — nên trang chỉ việc bo góc rồi dựng full-bleed, không phải xếp hình lên
 * một cái nền nào khác nữa. Xem `public/giai-tri/logo/NGUON.txt`.
 *
 * TRƯỚC ĐÂY mỗi ô là một ảnh cắt ra từ chính game phóng to lên. Đúng là không
 * vẽ gì thật, nhưng mấy ảnh ấy vốn là sprite 20–40 điểm ảnh dựng cho cỡ bé
 * xíu, phóng lên 120 điểm ảnh thì vỡ hạt và lệch tông nhau — bốn ô nhìn ra bốn
 * thứ nhặt về chứ không ra một bộ.
 */
const GAME = [
  { href: '/nong-trai', ten: 'Nông trại', logo: '/giai-tri/logo/nong-trai.svg' },
  { href: '/pokemon', ten: 'Đảo Pokémon', logo: '/giai-tri/logo/pokemon.svg' },
  { href: '/rong', ten: 'Đảo Rồng', logo: '/giai-tri/logo/rong.svg' },
  // Ô này là một CON DẤU CHỮ chứ không phải hình vẽ — Vạn Đạo Tu Tiên là game
  // chữ, và đây cũng là bản tạm cho tới khi có bộ ảnh thật.
  { href: '/tu-tien', ten: 'Vạn Đạo Tu Tiên', logo: '/giai-tri/logo/van-dao.svg' },
  { href: '/giai-tri/trac-nghiem', ten: 'Trắc nghiệm', logo: '/giai-tri/logo/trac-nghiem.svg' },
] as const;

export default function GiaiTriPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 flex items-center gap-2 text-xl font-black">
        <Gamepad2 size={22} className="text-brand-500" /> Khu giải trí
      </h1>

      {/* Hai cột trên điện thoại, năm trên máy tính: năm game vừa đúng một
          hàng, không có ô nào rơi xuống đứng lẻ. */}
      {/* Hai cột trên điện thoại, năm trên máy tính: năm game vừa đúng một
          hàng, không có ô nào rơi xuống đứng lẻ. */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-5">
        {GAME.map((g) => (
          <li key={g.href}>
            <Link href={g.href}
              className="group flex flex-col items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-ink-950">
              <div className="o-game aspect-square w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.logo} alt="" aria-hidden width={128} height={128}
                  className="h-full w-full object-cover" />
              </div>
              <span className="text-center text-sm font-bold text-ink-700 group-hover:text-brand-600 dark:text-ink-200">
                {g.ten}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
