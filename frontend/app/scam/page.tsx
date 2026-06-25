'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ShieldAlert, Search, Plus, TriangleAlert, BadgeCheck, TrendingUp, Eye, Users, ThumbsUp } from 'lucide-react';
import { fetcher } from '@/lib/api';
import {
  ScamCaseCard, TARGET_TYPES, REASONS, STATUSES, STATUS_COLOR, RISK, RISK_COLOR,
  targetLabel, formatMoney,
} from '@/lib/scam';

interface Paginated { data: ScamCaseCard[]; meta: { total: number; page: number; limit: number } }

function CaseRow({ c }: { c: ScamCaseCard }) {
  return (
    <Link href={`/scam/detail?id=${c.id}`} className="card block p-4 transition hover:border-brand-400">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`chip ${STATUS_COLOR[c.status]}`}>{STATUSES[c.status]}</span>
            <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{TARGET_TYPES[c.targetType]}</span>
            <span className="chip bg-rose-50 text-rose-600 dark:bg-rose-900/30">{REASONS[c.reason]}</span>
            {c.riskLevel && <span className={`chip ${RISK_COLOR[c.riskLevel]}`}>Rủi ro: {RISK[c.riskLevel]}</span>}
          </div>
          <h3 className="mt-1.5 truncate font-semibold">{c.title}</h3>
          <p className="text-sm text-ink-500">Đối tượng: <b>{targetLabel(c)}</b>{c.damageValue ? ` · Thiệt hại ~ ${formatMoney(c.damageValue)}` : ''}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-400">
        <span className="inline-flex items-center gap-1"><Users size={13} /> {c.meTooCount} cùng bị</span>
        <span className="inline-flex items-center gap-1"><ThumbsUp size={13} /> {c.helpfulCount}</span>
        <span className="inline-flex items-center gap-1"><Eye size={13} /> {c.viewCount}</span>
        <span>{new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
      </div>
    </Link>
  );
}

export default function ScamHomePage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const urlQ = new URLSearchParams(window.location.search).get('q');
    if (urlQ) setQ(urlQ);
  }, []);

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (reason) params.set('reason', reason);
  if (q.trim()) params.set('q', q.trim());
  params.set('page', String(page));

  const { data, isLoading } = useSWR<Paginated>(`/scam/cases?${params}`, fetcher);
  const { data: top } = useSWR<any[]>('/scam/public/top?limit=8', fetcher);
  const { data: recent } = useSWR<ScamCaseCard[]>('/scam/public/recent?limit=6', fetcher);
  const { data: cleared } = useSWR<ScamCaseCard[]>('/scam/public/cleared?limit=6', fetcher);

  const totalPages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.limit)) : 1;

  return (
    <div className="space-y-5">
      {/* Hero — chỉ tiêu đề + mô tả */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldAlert /> Tố Cáo Lừa Đảo</h1>
        <p className="mt-1 text-sm text-white/80">Tra cứu &amp; cảnh báo scammer — bảo vệ cộng đồng bằng bằng chứng.</p>
      </div>

      {/* Thanh công cụ: tạo tố cáo · tìm kiếm · cẩm nang */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-ink-400" size={18} />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Tìm UID, email, SĐT, ví crypto, domain, Discord, Telegram…"
            className="input w-full pl-10" />
        </div>
        <div className="flex gap-2">
          <Link href="/scam/new" className="btn-primary flex-1 justify-center sm:flex-none"><Plus size={16} /> Tạo tố cáo</Link>
          <Link href="/scam/guide" className="btn-outline flex-1 justify-center sm:flex-none">Cẩm nang</Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Danh sách + filter */}
        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="input w-auto" value={reason} onChange={(e) => { setReason(e.target.value); setPage(1); }}>
              <option value="">Mọi lý do</option>
              {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {isLoading ? <div className="card p-8 text-center text-ink-500">Đang tải…</div>
            : !data?.data.length ? <div className="card p-8 text-center text-ink-500">Chưa có báo cáo nào.</div>
            : <div className="space-y-3">{data.data.map((c) => <CaseRow key={c.id} c={c} />)}</div>}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</button>
              <span className="text-sm text-ink-500">{page}/{totalPages}</span>
              <button className="btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Sau</button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="mb-2 flex items-center gap-1 font-semibold text-rose-600"><TrendingUp size={16} /> Top bị tố cáo</h2>
            <div className="space-y-1.5">
              {top?.length ? top.map((t, i) => (
                <Link key={i} href={t.user ? `/scam?q=${t.user.username}` : '#'} className="flex items-center justify-between rounded-lg px-2 py-1 text-sm hover:bg-ink-100 dark:hover:bg-ink-800">
                  <span className="truncate">{i + 1}. {t.user?.displayName || t.user?.username || 'Ẩn danh'}</span>
                  <span className="flex items-center gap-2">
                    <span className={`chip ${RISK_COLOR[t.riskLevel]}`}>{RISK[t.riskLevel]}</span>
                    <span className="text-ink-400">{t.reportCount}</span>
                  </span>
                </Link>
              )) : <p className="text-sm text-ink-500">Chưa có dữ liệu.</p>}
            </div>
          </div>

          <div className="card p-4">
            <h2 className="mb-2 flex items-center gap-1 font-semibold text-amber-600"><TriangleAlert size={16} /> Cảnh báo mới</h2>
            <div className="space-y-1">
              {recent?.length ? recent.map((c) => (
                <Link key={c.id} href={`/scam/detail?id=${c.id}`} className="block truncate rounded px-1 py-0.5 text-sm hover:text-brand-600">• {c.title}</Link>
              )) : <p className="text-sm text-ink-500">Chưa có.</p>}
            </div>
          </div>

          <div className="card p-4">
            <h2 className="mb-2 flex items-center gap-1 font-semibold text-sky-600"><BadgeCheck size={16} /> Đã minh oan</h2>
            <div className="space-y-1">
              {cleared?.length ? cleared.map((c) => (
                <Link key={c.id} href={`/scam/detail?id=${c.id}`} className="block truncate rounded px-1 py-0.5 text-sm hover:text-brand-600">• {c.title}</Link>
              )) : <p className="text-sm text-ink-500">Chưa có.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
