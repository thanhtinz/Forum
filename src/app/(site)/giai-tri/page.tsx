import Link from 'next/link';
import type { Metadata } from 'next';
import { Gamepad2 } from 'lucide-react';
import { anhRong } from '@/lib/rong-const';
import { FARM_ANH } from '@/lib/farm-const';
import { ANH_POKE } from '@/lib/pokemon-const';

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
 * Mỗi ô là một ảnh CÓ SẴN TRONG GAME đặt giữa một nền màu riêng, chứ không vẽ
 * mới cái gì: quả cầu là đúng quả cầu dùng để bắt thú, con rồng là đúng một
 * trong 54 con nuôi được, luống cây là đúng ô đất lúc chín. Repo này đã một
 * lần vẽ tay ảnh thay thế cho kho game rồi phải gỡ đi (hai lượt commit chỉ để
 * dọn), nên phần "thiết kế" ở đây là cái khuôn — nền, bo góc, vệt sáng, bố cục
 * — còn hình thì mượn nguyên của game.
 *
 * `mượt` = ảnh vẽ mượt, không được ép pixel hoá; nông sản là ảnh vector còn ba
 * thứ kia là ảnh pixel cũ, ép sai chiều nào cũng xấu.
 */
const GAME = [
  {
    href: '/nong-trai',
    ten: 'Nông trại',
    anh: `${FARM_ANH}/o-dat/4-chin.png`,
    muot: true,
    nen: 'linear-gradient(160deg,#8fd14f 0%,#4ea72e 55%,#2f7a1f 100%)',
  },
  {
    href: '/pokemon',
    ten: 'Đảo Pokémon',
    // `icon/quacau.gif` chứ không phải `icon/ball.png`: ảnh kia 19×20 và KHÔNG
    // có kênh trong suốt, phóng lên là một khối vuông trắng chình ình giữa ô.
    anh: `${ANH_POKE}/icon/quacau.gif`,
    muot: false,
    // Nền XANH chứ không đỏ: quả cầu vốn đỏ, để lên nền đỏ là chìm nghỉm.
    nen: 'linear-gradient(160deg,#93c5fd 0%,#3b82f6 55%,#1e40af 100%)',
  },
  {
    href: '/rong',
    // Thanh Long Lục: mình dài, uốn kín cả ô vuông — mấy loài đứng hai chân để
    // trong ô vuông thì thừa hai bên, nhìn ra một con thú bị nhốt.
    ten: 'Đảo Rồng',
    anh: anhRong(8, 3),
    muot: false,
    nen: 'linear-gradient(160deg,#6ee7d3 0%,#0d9488 55%,#0f5f5c 100%)',
  },
  {
    href: '/giai-tri/trac-nghiem',
    ten: 'Trắc nghiệm',
    // Trò này không có ảnh nào trong game, nên biểu tượng là chính dấu hỏi —
    // mượn tạm một cái icon lạc đề còn tệ hơn.
    chu: '?',
    nen: 'linear-gradient(160deg,#c4b5fd 0%,#7c3aed 55%,#4c1d95 100%)',
  },
] as const;

export default function GiaiTriPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 flex items-center gap-2 text-xl font-black">
        <Gamepad2 size={22} className="text-brand-500" /> Khu giải trí
      </h1>

      {/* Hai cột trên điện thoại, bốn trên máy tính: bốn game vừa đúng một
          hàng, không có ô nào rơi xuống đứng lẻ. */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        {GAME.map((g) => (
          <li key={g.href}>
            <Link href={g.href}
              className="group flex flex-col items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-ink-950">
              <div className="o-game flex aspect-square w-full items-center justify-center p-4"
                style={{ background: 'nen' in g ? g.nen : undefined }}>
                {'chu' in g ? (
                  <span aria-hidden
                    className="font-mono text-[3.5rem] font-black leading-none text-white/85 drop-shadow-md transition-transform duration-200 group-hover:scale-110">
                    {g.chu}
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.anh} alt="" aria-hidden
                    className="h-full w-full object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-110"
                    style={{ imageRendering: g.muot ? 'auto' : 'pixelated' }} />
                )}
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
