'use client';

import Link from 'next/link';
import { Gamepad2, Fish, Sprout, Trophy, Wrench, Store, Award } from 'lucide-react';

const SHORTCUTS = [
  { href: '/game', label: 'Nhân vật & RPG', icon: Gamepad2, desc: 'Combat, guild, trang bị' },
  { href: '/game/farm', label: 'Nông trại', icon: Sprout, desc: 'Trồng trọt & vật nuôi' },
  { href: '/game/fishing', label: 'Câu cá', icon: Fish, desc: '3 khu, cá hiếm' },
  { href: '/minigame', label: 'Minigame', icon: Trophy, desc: '11 game, chơi PvP' },
  { href: '/leaderboard', label: 'Xếp hạng', icon: Award, desc: 'Top danh hiệu & câu cá' },
  { href: '/marketplace', label: 'Chợ gian hàng', icon: Store, desc: 'Mua bán source' },
  { href: '/tools', label: 'Công cụ', icon: Wrench, desc: '44 tool dev' },
];

export function Sidebar() {
  return (
    <aside className="space-y-4">
      <div className="card p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">Khám phá</h3>
        <ul className="space-y-1">
          {SHORTCUTS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="flex items-center gap-3 rounded-lg p-2 hover:bg-ink-100 dark:hover:bg-ink-800">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-ink-800">
                  <s.icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{s.label}</span>
                  <span className="block text-xs text-ink-500">{s.desc}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Cộng đồng</h3>
        <p className="text-sm text-ink-500">
          Diễn đàn tích hợp game hoá: kiếm coin từ forum, tiêu trong game, mua bán ở chợ.
        </p>
      </div>
    </aside>
  );
}
