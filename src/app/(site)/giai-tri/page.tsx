import Link from 'next/link';
import type { Metadata } from 'next';
import { Gamepad2 } from 'lucide-react';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { DU_BO, anhRong } from '@/lib/rong-const';
import { FARM_ANH } from '@/lib/farm-const';
import { ANH_POKE, SO_GYM } from '@/lib/pokemon-const';

export const metadata: Metadata = {
  title: 'Khu giải trí',
  description: 'Nông trại, Đảo Pokémon, Đảo Rồng và Trắc nghiệm — chơi bằng điểm kiếm được trên diễn đàn.',
};
export const dynamic = 'force-dynamic';

/**
 * Khu giải trí — cửa vào của mấy trò chơi trên diễn đàn.
 *
 * TRƯỚC ĐÂY đây là bảy trò cầu may dựng lại từ bộ mod JohnCMS cũ: bầu cua, oẳn
 * tù tì, quay xèng, phi tiêu, sóc đĩa, đập trứng, sút phạt. Bấm một cái ăn
 * thua ngay, chơi vài lượt là hết chuyện, mà lại là bảy đường tiêu điểm khác
 * nhau phải trông chừng. Nay bỏ hết; chỗ này thành cửa vào của ba game dài —
 * Nông trại, Đảo Pokémon, Đảo Rồng — cộng Trắc nghiệm, thứ mà nội dung do
 * chính thành viên làm ra chứ không phải máy bốc số.
 *
 * Trang này KHÔNG phải trang cha của ba game ấy: mỗi game đứng riêng ở đường
 * dẫn gốc của nó (`/nong-trai`, `/pokemon`, `/rong`) và có menu riêng, nên
 * trong game không có nút "quay lại khu giải trí" nào cả. Đây chỉ là một chỗ
 * để nhìn thấy cả bốn thứ cùng lúc.
 *
 * Vẫn để ở `/giai-tri` chứ không phải `/games`: `/games` là KHO GAME tải về,
 * còn đây là mấy trò chơi ngay trên trang. Hai thứ khác hẳn nhau.
 */
export default async function GiaiTriPage() {
  const [soCauHoi, soRongDaNo, soNhanVat, soLuong] = await Promise.all([
    db.quizQuestion.count({ where: { status: 'APPROVED' } }),
    db.rong.count({ where: { noAt: { not: null } } }),
    db.pokeNhanVat.count(),
    db.farmPlot.count({ where: { cropId: { not: null } } }),
  ]);

  const tro = [
    {
      href: '/nong-trai',
      ten: 'Nông trại',
      mo: 'Gieo hạt, tưới nước, chờ tới ngày hái rồi bán lấy điểm. Có đơn hàng và bảng giá riêng.',
      nhan: `${soLuong} luống`,
      anh: [1, 4, 7].map((i) => `${FARM_ANH}/nong-san/${i}.png`),
      anhPixel: false,
      nen: 'from-lime-500/15 via-green-400/10 to-emerald-400/20',
      vien: 'hover:border-lime-300 dark:hover:border-lime-800',
      pill: 'bg-lime-50 text-lime-700 dark:bg-lime-950/50 dark:text-lime-300',
    },
    {
      href: '/pokemon',
      ten: 'Đảo Pokémon',
      mo: `Bắt thú, luyện cấp, hạ ${SO_GYM} Gym rồi ra đấu trường. Game dài nhất ở đây.`,
      // Ba con mở màn lấy ba dáng khác hẳn nhau, để nhìn ô này là thấy ngay
      // trò có nhiều loài chứ không phải một con đổi màu.
      anh: [1, 4, 7].map((i) => `${ANH_POKE}/thu/${i}.gif`),
      anhPixel: true,
      nhan: `${soNhanVat} người`,
      nen: 'from-rose-500/15 via-amber-400/10 to-orange-400/20',
      vien: 'hover:border-rose-300 dark:hover:border-rose-800',
      pill: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
    },
    {
      href: '/rong',
      ten: 'Đảo Rồng',
      mo: `Ấp trứng, nuôi lớn, lai tạo rồi mang đi đấu. Sưu tầm đủ ${DU_BO} con.`,
      anh: [[6, 1], [8, 3], [3, 5]].map(([l, m]) => anhRong(l, m)),
      anhPixel: true,
      nhan: `${soRongDaNo} con`,
      nen: 'from-emerald-500/15 via-teal-400/10 to-lime-400/20',
      vien: 'hover:border-emerald-300 dark:hover:border-emerald-800',
      pill: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
    },
    {
      href: '/giai-tri/trac-nghiem',
      ten: 'Trắc nghiệm',
      mo: 'Tự ra câu hỏi và đặt cọc điểm. Trả lời đúng thì ăn cọc của người ra câu.',
      // Trò này không có tranh trong bộ ảnh cũ, nên bày ba dấu hỏi kiểu chữ
      // pixel cho hợp với ba ô bên cạnh, thay vì mượn tạm một cái icon lạc đề.
      anh: [] as string[],
      anhPixel: true,
      chu: ['?', '?', '?'],
      nhan: `${soCauHoi} câu`,
      nen: 'from-violet-500/15 via-fuchsia-400/10 to-indigo-400/20',
      vien: 'hover:border-violet-300 dark:hover:border-violet-800',
      pill: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',
    },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-black">
        <Gamepad2 size={22} className="text-brand-500" /> Khu giải trí
      </h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {tro.map((t) => (
          <Link key={t.href} href={t.href}
            className={cn(
              'group overflow-hidden rounded-2xl border-2 border-ink-100 bg-white transition-all',
              'hover:-translate-y-0.5 hover:shadow-card-hover dark:border-ink-800 dark:bg-ink-900',
              t.vien,
            )}>
            <div className={cn(
              'flex h-28 items-center justify-center gap-1.5 bg-gradient-to-br px-4', t.nen,
            )}>
              {'chu' in t && t.chu
                ? t.chu.map((c, i) => (
                    <span key={i} aria-hidden
                      className="font-mono text-4xl font-black text-violet-500/70 transition-transform duration-200 group-hover:-translate-y-1 dark:text-violet-300/70"
                      style={{
                        transitionDelay: `${i * 45}ms`,
                        transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (4 + i * 2)}deg)`,
                      }}>
                      {c}
                    </span>
                  ))
                : t.anh.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    // Khoá theo VỊ TRÍ chứ không theo đường dẫn: hai ô có thể
                    // bày trùng một ảnh, lấy `src` làm khoá là React kêu ngay.
                    <img key={i} src={src} alt="" aria-hidden
                      className="h-14 w-auto object-contain drop-shadow-sm transition-transform duration-200 group-hover:-translate-y-1"
                      style={{
                        // Ảnh pixel cũ bé tí, phóng lên mà để trình duyệt nội
                        // suy thì nhoè hết nét; còn ảnh vẽ mượt (nông sản) thì
                        // ngược lại, ép pixel hoá là viền tròn thành răng cưa.
                        imageRendering: t.anhPixel ? 'pixelated' : 'auto',
                        transitionDelay: `${i * 45}ms`,
                        transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (3 + i)}deg)`,
                      }} />
                  ))}
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-ink-800 dark:text-ink-100">{t.ten}</p>
                <span className={cn('chip shrink-0 !py-0.5 text-[11px] font-bold', t.pill)}>
                  {t.nhan}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-500">{t.mo}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
