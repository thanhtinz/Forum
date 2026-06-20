'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Coins, Lock, CheckCircle2, Plus, ShieldCheck, Users, Filter, Search, ArrowUpDown, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { PRED_CATEGORIES, PRED_STATUS, catLabel, typeLabel, statusLabel, type Prediction } from '@/lib/predictions';

const TABS = [
  { key: 'OPEN', label: 'Đang mở' },
  { key: 'LOCKED', label: 'Đã khoá' },
  { key: 'SETTLED', label: 'Đã chốt' },
  { key: '', label: 'Tất cả' },
];

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'OPEN' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : status === 'LOCKED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    : status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300';
  const Icon = status === 'LOCKED' ? Lock : status === 'SETTLED' ? CheckCircle2 : null;
  return <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${cls}`}>{Icon && <Icon size={11} />}{statusLabel(status)}</span>;
}

function PredCard({ p }: { p: Prediction }) {
  return (
    <Link href={`/prediction?id=${p.id}`} className="card block p-4 hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="chip bg-brand-100 text-brand-700">{catLabel(p.category)}</span>
            <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{typeLabel(p.marketType)}</span>
            {p.oddsMode === 'FIXED' && <span className="chip bg-violet-100 text-violet-700">Odds cố định</span>}
            {p.isAdminMarket && <span className="chip inline-flex items-center gap-0.5 bg-amber-100 text-amber-700"><ShieldCheck size={11} /> Nhà cái</span>}
          </div>
          <h3 className="truncate font-semibold">{p.title}</h3>
        </div>
        <StatusBadge status={p.status} />
      </div>

      <div className="mt-2 space-y-1.5">
        {p.options.slice(0, 4).map((opt, idx) => {
          const total = p.optionTotals[idx] ?? 0;
          const pct = p.pool > 0 ? Math.round((total / p.pool) * 100) : 0;
          const isWinner = p.status === 'SETTLED' && p.correctIndex === idx;
          return (
            <div key={idx} className="relative overflow-hidden rounded-lg border border-ink-200 dark:border-ink-700">
              <div className={`absolute inset-y-0 left-0 ${isWinner ? 'bg-green-100 dark:bg-green-900/40' : 'bg-brand-100/60 dark:bg-brand-900/30'}`} style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between px-3 py-1.5 text-sm">
                <span className="flex items-center gap-1.5 truncate">{opt || `Cửa ${idx + 1}`}{isWinner && <CheckCircle2 size={13} className="text-green-600" />}</span>
                <span className="shrink-0 text-xs text-ink-500">{p.oddsMode === 'FIXED' ? `x${(p.odds[idx] ?? 0).toFixed(2)}` : `${pct}%`}</span>
              </div>
            </div>
          );
        })}
        {p.options.length > 4 && <div className="text-xs text-ink-400">+{p.options.length - 4} cửa khác…</div>}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
        <span className="flex items-center gap-1"><Coins size={13} /> Pool {p.pool.toLocaleString()} · {p.betCount} lượt</span>
        {p.closesAt && p.status === 'OPEN' && <span>Đóng: {new Date(p.closesAt).toLocaleString('vi-VN')}</span>}
      </div>
    </Link>
  );
}

export default function PredictionsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('OPEN');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('new');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (tab) p.set('status', tab);
    if (category) p.set('category', category);
    if (sort) p.set('sort', sort);
    if (query.trim()) p.set('q', query.trim());
    api.get<Prediction[]>(`/quiz/predictions?${p.toString()}`)
      .then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [tab, category, sort, query]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 py-4">
      <header className="flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-card">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><TrendingUp size={24} /> Kèo dự đoán</h1>
          <p className="text-white/90">Tạo kèo & đặt cược bằng coin. Pool hoặc odds cố định.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/predictions/parlay" className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25"><Layers size={16} /> Xiên</Link>
          {user && <Link href="/predictions/mine" className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium hover:bg-white/25"><Users size={16} /> Của tôi</Link>}
          {user && <Link href="/predictions/new" className="inline-flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-white/90"><Plus size={16} /> Tạo kèo</Link>}
        </div>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); setQuery(q); }} className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input w-full pl-9" placeholder="Tìm kèo theo tiêu đề…" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>

      {/* Bộ lọc — gọn trên mobile */}
      <div className="space-y-2">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${tab === t.key ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="relative">
            <ArrowUpDown size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <select className="input w-full pl-9" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="new">Mới nhất</option>
              <option value="hot">Sôi động</option>
              <option value="closing">Sắp đóng</option>
              <option value="pool">Pool lớn</option>
            </select>
          </label>
          <label className="relative">
            <Filter size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <select className="input w-full pl-9" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Mọi danh mục</option>
              {Object.entries(PRED_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
      </div>

      {loading && <p className="text-sm text-ink-500">Đang tải…</p>}
      {!loading && items.length === 0 && <div className="card p-8 text-center text-ink-500">Chưa có kèo nào.</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((p) => <PredCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}
