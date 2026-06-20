'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Wrench, Search, ArrowRight, Sparkles, Flame } from 'lucide-react';
import { fetcher } from '@/lib/api';

interface Tool { slug: string; name: string; description: string; isPro: boolean; usageCount: number }
interface ToolCat { slug: string; name: string; description: string; icon: string; tools: Tool[] }

function ToolCard({ t }: { t: Tool }) {
  return (
    <a key={t.slug} href={`/tool?slug=${t.slug}`}
      className="card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold group-hover:text-brand-600">{t.name}</h3>
        {t.isPro && <span className="chip shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">PRO</span>}
      </div>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-ink-500">{t.description}</p>
      <div className="mt-3 flex items-center justify-between text-xs text-ink-400">
        <span>{t.usageCount.toLocaleString()} lượt dùng</span>
        <span className="inline-flex items-center gap-0.5 text-brand-500 opacity-0 transition group-hover:opacity-100">Mở <ArrowRight size={12} /></span>
      </div>
    </a>
  );
}

export default function ToolsPage() {
  const { data, isLoading } = useSWR<ToolCat[]>('/tools', fetcher);
  const [q, setQ] = useState('');
  const [active, setActive] = useState('');

  const allTools = useMemo(() => (data || []).flatMap((c) => c.tools), [data]);
  const popular = useMemo(() => [...allTools].sort((a, b) => b.usageCount - a.usageCount).slice(0, 6), [allTools]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const kw = q.trim().toLowerCase();
    return data
      .filter((c) => !active || c.slug === active)
      .map((c) => ({ ...c, tools: kw ? c.tools.filter((t) => (t.name + t.description).toLowerCase().includes(kw)) : c.tools }))
      .filter((c) => c.tools.length > 0);
  }, [data, q, active]);

  const total = allTools.length;

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-slate-600 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Wrench size={24} /> Bộ công cụ Dev</h1>
        <p className="mt-1 text-white/80">{total > 0 ? `${total} công cụ` : 'Công cụ'} cho lập trình viên — format, mã hoá, tạo dữ liệu, chuyển đổi…</p>
        <div className="relative mt-4">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm công cụ…" className="input w-full pl-10 text-ink-900" />
        </div>
      </header>

      {isLoading && <div className="card p-10 text-center text-ink-500">Đang tải…</div>}

      {/* Lọc danh mục */}
      {data && data.length > 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button onClick={() => setActive('')} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${!active ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}>Tất cả</button>
          {data.map((c) => (
            <button key={c.slug} onClick={() => setActive(c.slug)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${active === c.slug ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}>
              {c.icon ? `${c.icon} ` : ''}{c.name}
            </button>
          ))}
        </div>
      )}

      {/* Phổ biến (khi không lọc/tìm) */}
      {!q && !active && popular.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-lg font-semibold"><Flame size={18} className="text-orange-500" /> Phổ biến</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((t) => <ToolCard key={t.slug} t={t} />)}
          </div>
        </section>
      )}

      {/* Theo danh mục */}
      <div className="space-y-6">
        {filtered.map((cat) => (
          <section key={cat.slug}>
            <div className="mb-3">
              <h2 className="flex items-center gap-1.5 text-lg font-semibold">{cat.icon && <span>{cat.icon}</span>} {cat.name}</h2>
              {cat.description && <p className="text-sm text-ink-500">{cat.description}</p>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cat.tools.map((t) => <ToolCard key={t.slug} t={t} />)}
            </div>
          </section>
        ))}
        {data && filtered.length === 0 && (
          <div className="card flex flex-col items-center gap-2 p-10 text-center text-ink-500">
            <Sparkles size={28} className="text-ink-300" /> Không tìm thấy công cụ phù hợp.
          </div>
        )}
      </div>
    </div>
  );
}
