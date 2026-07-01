'use client';

import Link from 'next/link';
import { Gamepad2, Sprout, ShoppingBag, Dices, Warehouse, Rabbit, Cherry, Spade, Grid3x3, ChevronRight, Shell } from 'lucide-react';

// Game trên web — mỗi game là 1 trang riêng
const WEB_GAMES = [
  { href: '/game/farm', label: 'Nông trại', desc: 'Trồng trọt & thu hoạch', icon: Sprout, color: 'from-emerald-500 to-green-600' },
  { href: '/game/shop', label: 'Cửa hàng', desc: 'Hạt giống & dụng cụ nông trại', icon: ShoppingBag, color: 'from-teal-500 to-emerald-600' },
  { href: '/game/kho', label: 'Kho chung', desc: 'Nông sản & món ăn', icon: Warehouse, color: 'from-amber-500 to-yellow-600' },
];

// Minigame
const MINIGAMES = [
  { href: '/minigame/live?game=tai-xiu', label: 'Tài Xỉu (phòng chung)', color: 'from-rose-500 to-red-600', icon: Dices },
  { href: '/minigame/live?game=bau-cua', label: 'Bầu Cua (phòng chung)', color: 'from-amber-500 to-orange-600', icon: Shell },
  { href: '/minigame/live?game=dua-thu', label: 'Đua Thú (phòng chung)', color: 'from-lime-500 to-green-600', icon: Rabbit },
  { href: '/minigame/solo?game=jackpot', label: 'Jackpot 777', color: 'from-purple-500 to-fuchsia-600', icon: Cherry },
  { href: '/minigame/tien-len', label: 'Tiến Lên (PvP)', color: 'from-sky-500 to-blue-600', icon: Spade },
  { href: '/minigame/caro', label: 'Cờ Caro (PvP)', color: 'from-teal-500 to-cyan-600', icon: Grid3x3 },
];

function Tile({ href, label, desc, icon: Icon, color }: { href: string; label: string; desc?: string; icon: any; color: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-ink-800 dark:bg-ink-900">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${color} text-white shadow`}><Icon size={22} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {desc && <span className="block truncate text-xs text-ink-500">{desc}</span>}
      </span>
      <ChevronRight size={16} className="text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export default function GiaiTriPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 p-6 text-white shadow-card">
        <Gamepad2 size={28} />
        <div>
          <h1 className="text-2xl font-bold">Giải trí</h1>
          <p className="text-sm text-white/80">Trồng trọt, minigame, bói toán… kiếm Xu và thư giãn ngay trên web.</p>
        </div>
      </header>

      <Section title="Game trên web">
        {WEB_GAMES.map((g) => <Tile key={g.href} {...g} />)}
      </Section>

      <Section title="Minigame">
        {MINIGAMES.map((g) => <Tile key={g.href} {...g} />)}
      </Section>
    </div>
  );
}
