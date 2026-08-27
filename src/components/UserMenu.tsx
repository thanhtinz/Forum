'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  User as UserIcon, FileText, Bookmark, Coins, Download, Users,
  Settings, ShieldAlert, ShieldOff, LogOut, ChevronDown, MessageSquare,
} from 'lucide-react';
import { logout } from '@/app/(auth)/actions';
import { fmtCount } from '@/lib/utils';
import { LevelBadge } from '@/components/LevelBadge';

export interface UserMenuProps {
  name: string;
  image: string | null;
  points: number;
  level: number;
  levelIcon?: string | null;
  levelColor?: string | null;
  levelName?: string | null;
  isStaff: boolean;
}

const LINKS = [
  { href: '/user/dashboard', label: 'Trang cá nhân', icon: UserIcon },
  { href: '/user/messages', label: 'Tin nhắn', icon: MessageSquare },
  { href: '/user/friends', label: 'Bạn bè', icon: Users },
  { href: '/user/posts', label: 'Bài viết của tôi', icon: FileText },
  { href: '/user/favorites', label: 'Đã lưu', icon: Bookmark },
  { href: '/user/downloads', label: 'Đã tải', icon: Download },
  { href: '/user/blocked', label: 'Đã chặn', icon: ShieldOff },
  { href: '/user/settings', label: 'Cài đặt', icon: Settings },
];

/** Nút hồ sơ ở header: gom điểm, số dư và các lối tắt vào một menu. */
export function UserMenu({ name, image, points, level, levelIcon, levelColor, levelName, isStaff }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex items-center gap-1 rounded-full p-0.5 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image
          ? <img src={image} alt="" className="size-8 rounded-full object-cover" />
          : <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">{name[0]?.toUpperCase()}</span>}
        <ChevronDown size={14} className="hidden text-ink-400 sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl dark:border-ink-700 dark:bg-ink-900">
          {/* Danh tính */}
          <div className="border-b border-ink-100 px-4 py-3 dark:border-ink-800">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-ink-900 dark:text-white">{name}</span>
              <LevelBadge level={level} icon={levelIcon} color={levelColor} name={levelName} />
            </div>
          </div>

          {/* Điểm — loại tiền duy nhất của diễn đàn */}
          <div className="border-b border-ink-100 dark:border-ink-800">
            <Link href="/user/points" onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-ink-50 dark:hover:bg-ink-800/60">
              <span className="flex items-center gap-1 text-[11px] text-ink-400"><Coins size={11} /> Điểm</span>
              <span className="block text-sm font-bold text-amber-600">{fmtCount(points)}</span>
            </Link>
          </div>

          {/* Lối tắt */}
          <div className="py-1">
            {LINKS.map((l) => {
              const Icon = l.icon;
              return (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800">
                  <Icon size={15} className="text-ink-400" /> {l.label}
                </Link>
              );
            })}
            {isStaff && (
              <Link href="/admin" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                <ShieldAlert size={15} /> Trang quản trị
              </Link>
            )}
          </div>

          <form action={logout} className="border-t border-ink-100 dark:border-ink-800">
            <button type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800">
              <LogOut size={15} className="text-ink-400" /> Đăng xuất
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
