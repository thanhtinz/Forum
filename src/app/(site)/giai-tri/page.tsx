import Link from 'next/link';
import type { Metadata } from 'next';
import { Gamepad2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { phienConLai } from '@/lib/bau-cua';
import { DU_BO, anhRong } from '@/lib/rong-const';
import {
  ANH, BAUCUA_ROUND_MS, GAME_LABELS, OTT_MAX, OTT_MIN, VAN_MOI_NGAY, conLai,
} from '@/lib/mini-game';

export const metadata: Metadata = {
  title: 'Khu giải trí',
  description: 'Bầu cua tôm cá, oẳn tù tì — chơi bằng điểm kiếm được trên diễn đàn.',
};
export const dynamic = 'force-dynamic';

/**
 * Khu giải trí — dựng lại từ bộ mod JohnCMS Việt hoá quãng 2008–2011.
 *
 * Để ở `/giai-tri` chứ không phải `/games`: `/games` là KHO GAME tải về, còn
 * đây là mấy trò bấm ngay trên trang. Hai thứ khác hẳn nhau, trộn đường dẫn là
 * người đọc lạc ngay.
 *
 * Trang này cố ý chỉ có ĐÚNG mấy ô trò chơi. Số điểm đã nằm sẵn trên thanh đầu
 * trang rồi, nhắc lại là thừa; còn mấy dòng giới thiệu với "vừa có người chơi"
 * thì đẩy chính mấy ô trò chơi — thứ người ta vào đây để bấm — xuống dưới.
 */
export default async function GiaiTriPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [conBauCua, conOtt] = userId
    ? await Promise.all([phienConLai(userId), conLai(userId, 'OANTUTI')])
    : [VAN_MOI_NGAY, VAN_MOI_NGAY];
  const soCauHoi = await db.quizQuestion.count({ where: { status: 'APPROVED' } });
  const soRongDaNo = await db.rong.count({ where: { noAt: { not: null } } });

  const tro = [
    {
      href: '/giai-tri/bau-cua',
      ten: GAME_LABELS.BAUCUA,
      mo: `Bàn chung, mỗi phiên ${BAUCUA_ROUND_MS / 1000} giây. Đặt nhiều cửa, trúng mấy viên ăn bấy nhiêu.`,
      nhan: `${conBauCua} lượt`,
      anh: [1, 5, 6, 3].map((i) => `${ANH}/baucua/${i}.gif`),
      chu: null as string[] | null,
      nen: 'from-rose-500/15 via-orange-400/10 to-amber-400/20',
      vien: 'hover:border-rose-300 dark:hover:border-rose-800',
      pill: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
    },
    {
      href: '/giai-tri/oan-tu-ti',
      ten: GAME_LABELS.OANTUTI,
      mo: `Đấu tay đôi với máy, cược ${OTT_MIN}–${OTT_MAX} điểm. Hoà thì không mất gì.`,
      nhan: `${conOtt} lượt`,
      anh: ['bua', 'keo', 'bao'].map((t) => `${ANH}/ott/${t}.png`),
      chu: null as string[] | null,
      nen: 'from-sky-500/15 via-cyan-400/10 to-emerald-400/20',
      vien: 'hover:border-sky-300 dark:hover:border-sky-800',
      pill: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300',
    },
    {
      href: '/giai-tri/trac-nghiem',
      ten: 'Trắc nghiệm',
      mo: 'Tự ra câu hỏi và đặt cọc điểm. Trả lời đúng thì ăn cọc của người ra câu.',
      // Trò này không có tranh trong bộ ảnh cũ, nên bày ba dấu hỏi kiểu chữ
      // pixel cho hợp với hai ô bên cạnh, thay vì mượn tạm một cái icon lạc đề.
      anh: [] as string[],
      chu: ['?', '?', '?'] as string[] | null,
      nhan: `${soCauHoi} câu`,
      nen: 'from-violet-500/15 via-fuchsia-400/10 to-indigo-400/20',
      vien: 'hover:border-violet-300 dark:hover:border-violet-800',
      pill: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300',
    },
    {
      href: '/rong',
      ten: 'Đảo rồng',
      mo: `Ấp trứng, nuôi lớn rồi mang đi đấu. Sưu tầm đủ ${DU_BO} con.`,
      // Ba con mở màn lấy ba loài khác hẳn nhau về dáng, để nhìn ô này là
      // thấy ngay trò có nhiều loài chứ không phải một con đổi màu.
      anh: [[6, 1], [8, 3], [3, 5]].map(([l, m]) => anhRong(l, m)),
      chu: null as string[] | null,
      nhan: `${soRongDaNo} con`,
      nen: 'from-emerald-500/15 via-teal-400/10 to-lime-400/20',
      vien: 'hover:border-emerald-300 dark:hover:border-emerald-800',
      pill: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
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
            {/* Dải ảnh: chính bộ ảnh cũ, bày hơi nghiêng như quân bày trên chiếu */}
            <div className={cn(
              'flex h-28 items-center justify-center gap-1.5 bg-gradient-to-br px-4', t.nen,
            )}>
              {t.chu
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
                    <img key={src} src={src} alt="" aria-hidden
                      className="h-14 w-auto object-contain drop-shadow-sm transition-transform duration-200 group-hover:-translate-y-1"
                      style={{
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

      {!userId && (
        <p className="mt-4 text-sm text-ink-500">
          <Link href="/login?callbackUrl=/giai-tri" className="font-semibold text-brand-600 hover:underline">
            Đăng nhập
          </Link>{' '}để ngồi vào bàn.
        </p>
      )}
    </div>
  );
}
