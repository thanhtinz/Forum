import Link from 'next/link';
import type { Metadata } from 'next';
import { Gamepad2, Coins, Dices, Hand } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fmtAgo, fmtCount } from '@/lib/utils';
import { GiftButton } from '@/components/giaitri/GiftButton';
import {
  ANH, GAME_LABELS, GIFT_COOLDOWN_MS, VAN_MOI_NGAY, conLai, luotGanDay,
} from '@/lib/mini-game';

export const metadata: Metadata = {
  title: 'Khu giải trí',
  description: 'Hộp quà mỗi ngày, bầu cua tôm cá, oẳn tù tì — chơi bằng điểm.',
};
export const dynamic = 'force-dynamic';

/**
 * Khu giải trí — dựng lại từ bộ mod JohnCMS Việt hoá quãng 2008–2011.
 *
 * Để ở `/giai-tri` chứ không phải `/games`: `/games` là KHO GAME tải về, còn
 * đây là mấy trò bấm ngay trên trang. Hai thứ khác hẳn nhau, trộn đường dẫn là
 * người đọc lạc ngay.
 */
export default async function GiaiTriPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [me, gan] = await Promise.all([
    userId
      ? db.user.findUnique({ where: { id: userId }, select: { points: true, lastGiftAt: true } })
      : Promise.resolve(null),
    luotGanDay(8),
  ]);

  const conPhut = me?.lastGiftAt
    ? Math.ceil((me.lastGiftAt.getTime() + GIFT_COOLDOWN_MS - Date.now()) / 60000)
    : 0;
  const [conBauCua, conOtt] = userId
    ? await Promise.all([conLai(userId, 'BAUCUA'), conLai(userId, 'OANTUTI')])
    : [VAN_MOI_NGAY, VAN_MOI_NGAY];

  const tro = [
    {
      href: '/giai-tri/bau-cua', ten: GAME_LABELS.BAUCUA, anh: `${ANH}/baucua/1.gif`,
      mo: 'Đặt một cửa, xóc ba viên. Trúng mấy con ăn bấy nhiêu lần cược.',
      con: conBauCua, icon: <Dices size={15} />,
    },
    {
      href: '/giai-tri/oan-tu-ti', ten: GAME_LABELS.OANTUTI, anh: `${ANH}/ott/bua.png`,
      mo: 'Búa, kéo, bao. Thắng ăn đúng số cược, hoà thì không mất gì.',
      con: conOtt, icon: <Hand size={15} />,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <header className="card mb-4 p-5">
        <h1 className="flex items-center gap-2 text-xl font-black">
          <Gamepad2 size={22} className="text-brand-500" /> Khu giải trí
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Mấy trò quen thuộc của diễn đàn wap ngày trước, dựng lại nguyên luật và
          nguyên bộ ảnh cũ. Chơi bằng <b>điểm</b> kiếm được trên diễn đàn — chơi
          cho vui thôi, nhà cái vẫn ăn như hồi ấy.
        </p>
        {me && (
          <p className="mt-2 flex items-center gap-1.5 text-sm">
            <Coins size={15} className="text-amber-500" />
            Bạn đang có <b>{fmtCount(me.points)}</b> điểm
          </p>
        )}
      </header>

      {userId ? (
        <section className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="zib-title">{GAME_LABELS.GIFT}</h2>
            <p className="retro-sub mt-1 text-ink-400">
              Cứ đủ 24 giờ lại mở được một hộp, không cần chờ sang ngày mới.
            </p>
          </div>
          <GiftButton sanSang={conPhut <= 0} conPhut={conPhut} />
        </section>
      ) : (
        <section className="card mb-4 p-5 text-sm text-ink-500">
          <Link href="/login?callbackUrl=/giai-tri" className="font-semibold text-brand-600 hover:underline">
            Đăng nhập
          </Link>{' '}để nhận quà mỗi ngày và chơi các trò bên dưới.
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {tro.map((t) => (
          <Link key={t.href} href={t.href}
            className="card flex gap-3 p-4 transition-shadow hover:shadow-card-hover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.anh} alt="" className="size-12 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-bold text-ink-800 dark:text-ink-100">
                {t.icon} {t.ten}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">{t.mo}</p>
              {userId && <p className="retro-sub mt-1 text-ink-400">Còn {t.con} ván hôm nay</p>}
            </div>
          </Link>
        ))}
      </div>

      {gan.length > 0 && (
        <section className="card mt-4 p-5">
          <h2 className="zib-title mb-3">Vừa có người chơi</h2>
          <ul className="retro-stripe divide-y divide-ink-100 text-sm dark:divide-ink-800">
            {gan.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 py-2">
                <Link href={`/u/${l.user.username}`} className="font-semibold hover:text-brand-600">
                  {l.user.name ?? l.user.username}
                </Link>
                <span className="text-ink-400">{GAME_LABELS[l.game]}</span>
                <span className={l.delta > 0 ? 'font-bold text-emerald-600' : 'font-bold text-ink-400'}>
                  {l.delta > 0 ? `+${l.delta}` : l.delta}
                </span>
                <span className="retro-sub ml-auto text-ink-400">{fmtAgo(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
