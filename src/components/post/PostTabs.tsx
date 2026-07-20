'use client';

import { useState } from 'react';
import { FileText, HelpCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PostTabsProps {
  detail: React.ReactNode;
  faq: React.ReactNode;
  comments: React.ReactNode;
  faqCount: number;
  commentCount: number;
}

const ICONS = [FileText, HelpCircle, MessageSquare];

export function PostTabs({ detail, faq, comments, faqCount, commentCount }: PostTabsProps) {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: 'Chi tiết giới thiệu', badge: undefined as number | undefined },
    { label: 'Câu hỏi thường gặp', badge: faqCount || undefined },
    { label: 'Bình luận', badge: commentCount || undefined },
  ];

  return (
    <div className="mt-6">
      <div className="flex gap-1 border-b border-ink-200 dark:border-ink-800">
        {tabs.map((t, i) => {
          const Icon = ICONS[i];
          const active = tab === i;
          return (
            <button key={i} type="button" onClick={() => setTab(i)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4',
                active ? 'text-brand-600' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200',
              )}>
              <Icon size={16} />
              <span className="whitespace-nowrap">{t.label}</span>
              {t.badge != null && (
                <span className="rounded-full bg-ink-100 px-1.5 text-xs font-bold text-ink-500 dark:bg-ink-800">{t.badge}</span>
              )}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}
            </button>
          );
        })}
      </div>
      <div className="pt-5">
        <div className={tab === 0 ? '' : 'hidden'}>{detail}</div>
        <div className={tab === 1 ? '' : 'hidden'}>{faq}</div>
        <div className={tab === 2 ? '' : 'hidden'}>{comments}</div>
      </div>
    </div>
  );
}
