'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Star, Gift, ShoppingBag, Calendar, Info, Download, Smartphone, Apple } from 'lucide-react';
import { gamePortal, GameDetail, GiftcodePublic } from '@/lib/gamePortal';

type Tab = 'info' | 'giftcode' | 'events';

export default function GameDetailPage() {
  const slug = useParams().slug as string;
  const [game, setGame] = useState<GameDetail | null>(null);
  const [codes, setCodes] = useState<GiftcodePublic[]>([]);
  const [tab, setTab] = useState<Tab>('info');
  const [err, setErr] = useState('');

  useEffect(() => {
    gamePortal.getGame(slug).then(setGame).catch((e) => setErr(e.message));
    gamePortal.listGiftcodes(slug).then(setCodes).catch(() => {});
  }, [slug]);

  if (err) return <div className="card p-8 text-center text-rose-500">{err}</div>;
  if (!game) return <div className="card p-8 text-center text-ink-400">Đang tải...</div>;

  const initials = game.name.split(' ').slice(0, 2).map((w) => w[0]).join('');

  return (
    <div className="space-y-4">
      <nav className="text-sm text-ink-400">
        <Link href="/cong-game" className="hover:text-brand-600">Cổng game</Link> <span className="mx-1">/</span> <span className="text-ink-200">{game.name}</span>
      </nav>

      {/* Header game */}
      <div className="card overflow-hidden">
        <div className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start">
          {game.iconUrl
            ? <img src={game.iconUrl} alt={game.name} className="h-24 w-24 rounded-2xl object-cover" />
            : <div className="grid h-24 w-24 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-fuchsia-700 text-3xl font-bold text-white">{initials}</div>}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold">{game.name}</h1>
            <div className="mt-1 flex items-center justify-center gap-1 sm:justify-start">
              {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={16} className={i <= (game.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-ink-300 dark:text-ink-600'} />)}
            </div>
            <p className="mt-1 text-sm text-ink-400">{game.genre} | {game.publisher}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {game.links?.googlePlay && <a href={game.links.googlePlay} className="btn-outline !py-1.5 text-xs"><Smartphone size={14} /> Google Play</a>}
              {game.links?.appStore && <a href={game.links.appStore} className="btn-outline !py-1.5 text-xs"><Apple size={14} /> App Store</a>}
              {game.links?.apk && <a href={game.links.apk} className="btn-outline !py-1.5 text-xs"><Download size={14} /> APK</a>}
            </div>
          </div>
        </div>

        {/* Hành động chính */}
        <div className="grid grid-cols-2 gap-2 border-t border-ink-200/70 p-3 dark:border-ink-800">
          <Link href={`/cong-game/${slug}/giftcode`} className="btn-primary"><Gift size={16} /> Nhập Giftcode</Link>
          <Link href={`/cong-game/${slug}/shop`} className="btn-primary !bg-amber-600 hover:!bg-amber-700"><ShoppingBag size={16} /> Mua vật phẩm</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-900">
        {([['info', 'Giới thiệu', Info], ['giftcode', 'Giftcode', Gift], ['events', 'Sự kiện', Calendar]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${tab === k ? 'bg-white shadow-card dark:bg-ink-800' : 'text-ink-500'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="card space-y-3 p-5">
          {game.screenshots.length > 0 && (
            <div className="flex gap-3 overflow-x-auto">
              {game.screenshots.map((s, i) => <img key={i} src={s} alt="" className="h-40 rounded-lg object-cover" />)}
            </div>
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600 dark:text-ink-300">{game.description}</p>
        </div>
      )}

      {tab === 'giftcode' && (
        <div className="space-y-3">
          <Link href={`/cong-game/${slug}/giftcode`} className="btn-primary w-full"><Gift size={16} /> Nhập mã nhận thưởng</Link>
          <div className="grid gap-3 sm:grid-cols-2">
            {codes.map((c) => (
              <div key={c.code} className="card p-4">
                <p className="text-center text-lg font-bold tracking-wide">{c.code}</p>
                <p className="mt-1 text-center text-xs text-ink-400">{c.totalItems ?? c.rewards.length} vật phẩm</p>
                <ul className="mt-2 space-y-1 text-sm text-ink-500">
                  {c.rewards.map((r, i) => <li key={i} className="flex justify-between"><span>{r.label}</span>{r.qty && <span className="text-brand-500">x{r.qty}</span>}</li>)}
                </ul>
              </div>
            ))}
            {codes.length === 0 && <p className="col-span-full text-center text-sm text-ink-400">Chưa có giftcode.</p>}
          </div>
        </div>
      )}

      {tab === 'events' && (
        <div className="space-y-3">
          {game.events.map((e) => (
            <div key={e.id} className="card p-4">
              <p className="font-semibold">{e.title}</p>
              {e.date && <p className="text-xs text-ink-400">{e.date}</p>}
              {e.excerpt && <p className="mt-1 text-sm text-ink-500">{e.excerpt}</p>}
            </div>
          ))}
          {game.events.length === 0 && <p className="text-center text-sm text-ink-400">Chưa có sự kiện.</p>}
        </div>
      )}
    </div>
  );
}
