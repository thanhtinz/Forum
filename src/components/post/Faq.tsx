'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FaqItem {
  q: string;
  a: string;
}

export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  if (!items.length) {
    return (
      <div className="card flex flex-col items-center gap-2 p-10 text-center text-ink-400">
        <HelpCircle size={28} />
        <p>Bài viết này chưa có câu hỏi thường gặp.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="card overflow-hidden">
            <button type="button" onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left font-semibold hover:bg-ink-50 dark:hover:bg-ink-800/50">
              <span>{it.q}</span>
              <ChevronDown size={18} className={cn('shrink-0 text-ink-400 transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
              <div className="border-t border-ink-100 px-4 py-3.5 text-sm leading-relaxed text-ink-600 dark:border-ink-800 dark:text-ink-300">
                {it.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
