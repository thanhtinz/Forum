'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { MessageSquare, ShoppingBag, Crown, Heart, UserPlus, Award, Bell } from 'lucide-react';
import { markRead } from '@/app/(site)/user/notifications/actions';
import { cn } from '@/lib/utils';

const ICONS: Record<string, React.ReactNode> = {
  COMMENT: <MessageSquare size={16} />, REPLY: <MessageSquare size={16} />, MENTION: <MessageSquare size={16} />,
  LIKE: <Heart size={16} />, FOLLOW: <UserPlus size={16} />, ORDER: <ShoppingBag size={16} />,
  MEDAL: <Award size={16} />, VIP: <Crown size={16} />, SYSTEM: <Bell size={16} />,
};

export function NotificationItem({ n }: {
  n: { id: string; type: string; title: string; content: string | null; link: string | null; read: boolean; createdAt: string };
}) {
  const [, start] = useTransition();
  const onClick = () => { if (!n.read) start(() => markRead(n.id)); };
  const body = (
    <div className={cn('flex gap-3 p-4 transition-colors', !n.read && 'bg-brand-50/60 dark:bg-brand-950/20')}>
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', !n.read ? 'bg-brand-100 text-brand-600 dark:bg-brand-950/50' : 'bg-ink-100 text-ink-500 dark:bg-ink-800')}>
        {ICONS[n.type] ?? <Bell size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{n.title}</p>
        {n.content && <p className="truncate text-sm text-ink-500">{n.content}</p>}
        <p className="mt-0.5 text-xs text-ink-400">{n.createdAt}</p>
      </div>
      {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
    </div>
  );
  return n.link
    ? <Link href={n.link} onClick={onClick} className="block hover:bg-ink-50 dark:hover:bg-ink-800/40">{body}</Link>
    : <button type="button" onClick={onClick} className="block w-full text-left hover:bg-ink-50 dark:hover:bg-ink-800/40">{body}</button>;
}
