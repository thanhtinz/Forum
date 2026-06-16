'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Gamepad2, Fish, Sprout, Trophy, Wrench, Store, Award, Bookmark, BellRing, FileText, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface NavPage { slug: string; title: string }
interface NavLinkItem { id: string; label: string; url: string; openNewTab: boolean }

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
  const { user } = useAuth();
  const [pages, setPages] = useState<NavPage[]>([]);
  const [links, setLinks] = useState<NavLinkItem[]>([]);

  useEffect(() => {
    api.get<NavPage[]>('/nav/pages').then(setPages).catch(() => {});
    api.get<NavLinkItem[]>('/nav/links').then(setLinks).catch(() => {});
  }, []);

  const hasCustom = pages.length > 0 || links.length > 0;

  return (
    <aside className="space-y-4">
      {user && (
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Của tôi</h3>
          <div className="flex flex-col gap-1">
            <Link href="/bookmarks" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"><Bookmark size={16} className="text-amber-500" /> Chủ đề đã lưu</Link>
            <Link href="/subscriptions" className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"><BellRing size={16} className="text-brand-600" /> Đang theo dõi</Link>
          </div>
        </div>
      )}

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

      {hasCustom && (
        <div className="card p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Thông tin</h3>
          <div className="flex flex-col gap-1">
            {pages.map((p) => (
              <Link key={p.slug} href={`/p?slug=${p.slug}`} className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"><FileText size={15} className="text-ink-400" /> {p.title}</Link>
            ))}
            {links.map((l) => (
              <a key={l.id} href={l.url} target={l.openNewTab ? '_blank' : undefined} rel={l.openNewTab ? 'noopener noreferrer' : undefined} className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"><ExternalLink size={15} className="text-ink-400" /> {l.label}</a>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">Cộng đồng</h3>
        <p className="text-sm text-ink-500">
          Diễn đàn tích hợp game hoá: kiếm coin từ forum, tiêu trong game, mua bán ở chợ.
        </p>
      </div>
    </aside>
  );
}
