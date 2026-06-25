'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ChevronDown, ChevronUp, Lock, MessageSquare, FileText } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { Avatar } from './Header';

interface Latest {
  title: string; slug: string; at?: string | null;
  prefixLabel?: string | null; prefixColor?: string | null;
  author?: string | null; authorAvatar?: string | null;
}
interface Category {
  id: string; name: string; slug: string;
  icon?: string | null; iconUrl?: string | null; color?: string | null;
  threadCount?: number; postCount?: number;
  description?: string | null; moduleType?: string | null;
  parentId?: string | null; minRolePost?: string | null;
  latest?: Latest | null;
}

function CategoryIcon({ c, size = 40 }: { c: Category; size?: number }) {
  if (c.iconUrl) return <img src={c.iconUrl} alt="" className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />;
  const bg = c.color || '#6366f1';
  return (
    <span className="grid shrink-0 place-items-center rounded-xl text-base font-bold text-white"
      style={{ width: size, height: size, backgroundColor: bg }}>
      {c.icon?.trim() || c.name?.[0]?.toUpperCase() || '#'}
    </span>
  );
}

function fmtCount(n?: number) {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  return String(v);
}

function timeShort(at?: string | null) {
  if (!at) return '';
  const d = new Date(at);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin || 1} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h trước`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} ngày trước`;
  return d.toLocaleDateString('vi');
}

function isStaffOnly(minRolePost?: string | null) {
  return minRolePost === 'MODERATOR' || minRolePost === 'ADMIN';
}

function ChildRow({ c }: { c: Category }) {
  const restricted = isStaffOnly(c.minRolePost);
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <CategoryIcon c={c} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/category?id=${c.id}`} className="font-semibold text-ink-900 hover:text-brand-600 dark:text-ink-100">
            {c.name}
          </Link>
          {restricted && (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Lock size={9} /> BQT
            </span>
          )}
        </div>
        {c.description && <p className="mt-0.5 text-xs text-ink-500 line-clamp-1">{c.description}</p>}
        <div className="mt-1 flex items-center gap-3 text-xs text-ink-400">
          <span className="flex items-center gap-1"><MessageSquare size={11} /> {fmtCount(c.threadCount)} chủ đề</span>
          <span className="flex items-center gap-1"><FileText size={11} /> {fmtCount(c.postCount)} bài</span>
        </div>
      </div>
      {/* Latest post */}
      <div className="hidden w-52 shrink-0 sm:block">
        {c.latest ? (
          <div className="flex items-start gap-2">
            <Avatar user={{ username: c.latest.author || '?', avatar: c.latest.authorAvatar }} size={28} />
            <div className="min-w-0">
              {c.latest.prefixLabel && (
                <span className="mb-0.5 inline-block rounded px-1 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: c.latest.prefixColor || '#6366f1' }}>
                  {c.latest.prefixLabel}
                </span>
              )}
              <Link href={`/thread?slug=${c.latest.slug}`}
                className="block truncate text-xs font-medium text-ink-700 hover:text-brand-600 dark:text-ink-300">
                {c.latest.title}
              </Link>
              <p className="mt-0.5 text-[11px] text-ink-400">
                {c.latest.author && <span>{c.latest.author} · </span>}
                {timeShort(c.latest.at)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-400">Chưa có bài viết</p>
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

        if (sec.parent && sec.children.length === 0) {
          return (
            <section key={key} className="card overflow-hidden">
              <ChildRow c={sec.parent} />
            </section>
          );
        }

        const accentColor = sec.parent?.color || '#6366f1';
        return (
          <section key={key} className="card overflow-hidden">
            {/* Group header */}
            <button
              onClick={() => setCollapsed((s) => ({ ...s, [key]: !s[key] }))}
              className="flex w-full items-center justify-between border-b border-ink-200/70 px-4 py-2.5 dark:border-ink-800"
              style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-ink-700 dark:text-ink-200">{sec.parent?.name || 'Danh mục khác'}</h2>
                {sec.parent?.description && (
                  <span className="hidden text-xs text-ink-400 md:block">— {sec.parent.description}</span>
                )}
              </div>
              {isCollapsed ? <ChevronDown size={16} className="text-ink-400" /> : <ChevronUp size={16} className="text-ink-400" />}
            </button>

            {/* Column headers (desktop) */}
            {!isCollapsed && (
              <>
                <div className="hidden border-b border-ink-100 bg-ink-50/50 px-4 py-1.5 dark:border-ink-800 dark:bg-ink-800/30 sm:grid"
                  style={{ gridTemplateColumns: '1fr 208px' }}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Diễn đàn</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Bài viết gần nhất</span>
                </div>
                <div className="divide-y divide-ink-100 dark:divide-ink-800">
                  {sec.children.map((c) => <ChildRow key={c.id} c={c} />)}
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
