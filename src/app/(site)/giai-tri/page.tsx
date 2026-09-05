import Link from 'next/link';
import type { Metadata } from 'next';
import { Gamepad2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Khu giải trí',
  description: 'Nông trại và Trắc nghiệm — chơi bằng điểm kiếm được trên diễn đàn.',
};

/**
 * Khu giải trí — cửa vào của mấy trò chơi trên diễn đàn.
 *
 * TRƯỚC ĐÂY đây là bảy trò cầu may dựng lại từ bộ mod JohnCMS cũ: bầu cua, oẳn
 * tù tì, quay xèng, phi tiêu, sóc đĩa, đập trứng, sút phạt. Bấm một cái ăn
 * thua ngay, chơi vài lượt là hết chuyện. Nay bỏ hết; chỗ này thành cửa vào
 * của Nông trại và Trắc nghiệm — hai thứ chơi được lâu, mà nội dung Trắc
 * nghiệm còn do chính thành viên làm ra chứ không phải máy bốc số.
 *
 * Ba game từng đứng ở đây — Đảo Pokémon, Đảo Rồng, Vạn Đạo Tu Tiên — đã gỡ
 * khỏi dự án.
 *
 * Trang này KHÔNG phải trang cha của hai trò còn lại: Nông trại đứng riêng ở
 * `/nong-trai` và có menu riêng, nên trong đó không có nút "quay lại khu giải
 * trí" nào cả.
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
 * Biểu tượng của hai trò.
 *
 * Tệp SVG vẽ mới cho khu này, mỗi tệp là một ô vuông 128×128 ĐÃ CÓ SẴN
 * NỀN — nên trang chỉ việc bo góc rồi dựng full-bleed, không phải xếp hình lên
 * một cái nền nào khác nữa. Xem `public/giai-tri/logo/NGUON.txt`.
 *
 * TRƯỚC ĐÂY mỗi ô là một ảnh cắt ra từ chính game phóng to lên. Đúng là không
 * vẽ gì thật, nhưng mấy ảnh ấy vốn là sprite 20–40 điểm ảnh dựng cho cỡ bé
 * xíu, phóng lên 120 điểm ảnh thì vỡ hạt và lệch tông nhau — mấy ô nhìn ra
 * mấy thứ nhặt về chứ không ra một bộ.
 */
const GAME = [
  { href: '/nong-trai', ten: 'Nông trại', logo: '/giai-tri/logo/nong-trai.svg' },
  { href: '/giai-tri/trac-nghiem', ten: 'Trắc nghiệm', logo: '/giai-tri/logo/trac-nghiem.svg' },
] as const;

export default function GiaiTriPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 flex items-center gap-2 text-xl font-black">
        <Gamepad2 size={22} className="text-brand-500" /> Khu giải trí
      </h1>

      {/* Hai cột: hai trò vừa đúng một hàng ở mọi khổ, không có ô nào rơi
          xuống đứng lẻ. Giữ lưới hai cột cả trên máy tính thay vì giãn ra cho
          rộng — hai tấm logo kéo hết bề ngang trang thì to như tấm áp phích. */}
      <ul className="mx-auto grid max-w-sm grid-cols-2 gap-x-4 gap-y-5">
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
