'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fetcher } from '@/lib/api';

interface Latest { title: string; slug: string; at?: string | null; prefix?: string | null; author?: string | null }
interface Category {
  id: string; name: string; slug: string;
  icon?: string | null; iconUrl?: string | null; color?: string | null;
  threadCount?: number; description?: string | null; moduleType?: string | null;
  parentId?: string | null; latest?: Latest | null;
}

function CategoryIcon({ c, size = 44 }: { c: Category; size?: number }) {
  if (c.iconUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={c.iconUrl} alt="" className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />;
  }
  const bg = c.color || '#6366f1';
  const label = c.icon?.trim() || c.name?.[0]?.toUpperCase() || '#';
  return (
    <span className="grid shrink-0 place-items-center rounded-xl text-lg font-bold text-white" style={{ width: size, height: size, backgroundColor: bg }}>
      {label}
    </span>
  );
}

function fmtCount(n?: number) {
  const v = n ?? 0;
  return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K` : String(v);
}
function fmtAt(at?: string | null) {
  if (!at) return '';
  return new Date(at).toLocaleDateString('vi');
}

function ChildRow({ c }: { c: Category }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <CategoryIcon c={c} />
      <div className="min-w-0 flex-1">
        <Link href={`/?cat=${c.id}`} className="font-semibold hover:text-brand-600">{c.name}</Link>
        <p className="text-xs text-ink-500">Chủ đề: <b>{fmtCount(c.threadCount)}</b></p>
        {c.latest && (
          <p className="mt-0.5 truncate text-sm text-ink-500">
            {c.latest.prefix && <span className="mr-1 rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-medium text-rose-700">{c.latest.prefix}</span>}
            <Link href={`/thread?slug=${c.latest.slug}`} className="hover:text-brand-600">{c.latest.title}</Link>
            <span className="block text-xs text-ink-400">{fmtAt(c.latest.at)}{c.latest.author ? ` · ${c.latest.author}` : ''}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export function CategoryList() {
  const { data, isLoading } = useSWR<Category[]>('/forum/categories', fetcher);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (isLoading) return <div className="card p-8 text-center text-ink-500">Đang tải danh mục…</div>;
  if (!data || data.length === 0) return null;

  const parents = data.filter((c) => !c.parentId);
  const childrenOf = (id: string) => data.filter((c) => c.parentId === id);
  const orphans = data.filter((c) => c.parentId && !data.some((p) => p.id === c.parentId));

  const sections = [
    ...parents.map((p) => ({ parent: p, children: childrenOf(p.id) })),
    ...(orphans.length ? [{ parent: null as Category | null, children: orphans }] : []),
  ];

  return (
    <div className="space-y-4">
      {sections.map((sec, i) => {
        const key = sec.parent?.id || `orphan-${i}`;
        const isCollapsed = collapsed[key];
        const title = sec.parent?.name || 'Danh mục khác';
        // Danh mục cha không có con -> hiển thị như 1 mục đơn
        if (sec.parent && sec.children.length === 0) {
          return <section key={key} className="card overflow-hidden"><ChildRow c={sec.parent} /></section>;
        }
        return (
          <section key={key} className="card overflow-hidden">
            <button onClick={() => setCollapsed((s) => ({ ...s, [key]: !s[key] }))}
              className="flex w-full items-center justify-between border-b-2 border-ink-300 bg-ink-50 px-4 py-3 dark:border-ink-700 dark:bg-ink-800/60">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-700 dark:text-ink-200">{title}</h2>
              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
            {!isCollapsed && (
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {sec.children.map((c) => <ChildRow key={c.id} c={c} />)}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
