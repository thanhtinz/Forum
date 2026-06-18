'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { MessageSquare } from 'lucide-react';
import { fetcher } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  color?: string | null;
  threadCount?: number;
  description?: string | null;
  moduleType?: string | null;
}

function CategoryIcon({ c }: { c: Category }) {
  const bg = c.color || '#6366f1';
  // icon có thể là emoji; nếu không có thì dùng chữ cái đầu
  const label = c.icon?.trim() || c.name?.[0]?.toUpperCase() || '#';
  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-bold text-white"
      style={{ backgroundColor: bg }}
    >
      {label}
    </span>
  );
}

export function CategoryList() {
  const { data, isLoading } = useSWR<Category[]>('/forum/categories', fetcher);

  if (isLoading) return <div className="card p-8 text-center text-ink-500">Đang tải danh mục…</div>;
  if (!data || data.length === 0) return null;

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
        <h2 className="font-semibold">Danh mục diễn đàn</h2>
      </div>
      <ul className="divide-y divide-ink-200/70 dark:divide-ink-800">
        {data.map((c) => (
          <li key={c.id}>
            <Link href={`/?cat=${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-50 dark:hover:bg-ink-800/50">
              <CategoryIcon c={c} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                {c.description && <p className="truncate text-sm text-ink-500">{c.description}</p>}
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm text-ink-400">
                <MessageSquare size={14} /> {c.threadCount ?? 0}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
