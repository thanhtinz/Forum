'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ShieldAlert, Download, Megaphone, Ban, ListChecks, Flag, Trash2, EyeOff, Eye } from 'lucide-react';
import { api, fetcher, getToken } from '@/lib/api';
import { TARGET_TYPES, REASONS, STATUSES, STATUS_COLOR, RISK } from '@/lib/scam';

const STATUS_OPTS = Object.keys(STATUSES);
const RISK_OPTS = Object.keys(RISK);
const BL_KINDS = { WALLET: 'Ví crypto', IP: 'IP', DOMAIN: 'Domain', EMAIL: 'Email' };

type Tab = 'cases' | 'appeals' | 'blacklist' | 'broadcast';

export default function AdminScamPage() {
  const [tab, setTab] = useState<Tab>('cases');
  const { data: stats } = useSWR<any>('/scam/admin/stats', fetcher);

  return (
    <div className="space-y-4 p-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldAlert className="text-rose-600" /> Quản lý Tố Cáo Scam</h1>

      {stats && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat label="Tổng báo cáo" value={stats.total} />
          <Stat label="Đã xác nhận" value={stats.byStatus?.CONFIRMED || 0} color="text-rose-600" />
          <Stat label="Chờ duyệt" value={stats.byStatus?.PENDING || 0} />
          <Stat label="Khiếu nại chờ" value={stats.pendingAppeals} color="text-amber-600" />
          <Stat label="Blacklist" value={stats.blacklisted} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-ink-200 dark:border-ink-800">
        {([['cases', 'Báo cáo'], ['appeals', 'Khiếu nại'], ['blacklist', 'Blacklist'], ['broadcast', 'Cảnh báo']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-sm font-medium ${tab === k ? 'border-b-2 border-brand-600 text-brand-600' : 'text-ink-500'}`}>{l}</button>
        ))}
      </div>

      {tab === 'cases' && <CasesTab />}
      {tab === 'appeals' && <AppealsTab />}
      {tab === 'blacklist' && <BlacklistTab />}
      {tab === 'broadcast' && <BroadcastTab />}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color?: string }) {
  return <div className="card p-3 text-center"><div className={`text-xl font-bold ${color || ''}`}>{value}</div><div className="text-xs text-ink-500">{label}</div></div>;
}

function CasesTab() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const key = `/scam/admin/cases?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}) })}`;
  const { data, mutate } = useSWR<any>(key, fetcher);

  async function setStatusFor(c: any) {
    const newStatus = prompt(`Trạng thái mới (${STATUS_OPTS.join('/')})`, c.status);
    if (!newStatus || !STATUS_OPTS.includes(newStatus)) return;
    let riskLevel: string | undefined;
    if (newStatus === 'CONFIRMED') { riskLevel = prompt(`Mức rủi ro (${RISK_OPTS.join('/')})`, 'HIGH') || undefined; }
    const modNote = prompt('Ghi chú kiểm duyệt (tùy chọn)') || undefined;
    await api.patch(`/scam/admin/cases/${c.id}/status`, { status: newStatus, riskLevel, modNote });
    mutate();
  }

  function exportCsv() {
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${base}/api/scam/admin/export.csv${status ? `?status=${status}` : ''}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.blob()).then((b) => {
        const u = URL.createObjectURL(b); const a = document.createElement('a');
        a.href = u; a.download = 'scam-cases.csv'; a.click(); URL.revokeObjectURL(u);
      });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả</option>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{STATUSES[s]}</option>)}
        </select>
        <input className="input w-56" placeholder="Tìm tiêu đề/đối tượng" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-outline ml-auto" onClick={exportCsv}><Download size={15} /> Xuất CSV</button>
      </div>
      <div className="space-y-2">
        {data?.data?.map((c: any) => (
          <div key={c.id} className="card p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`chip ${STATUS_COLOR[c.status]}`}>{STATUSES[c.status]}</span>
              <span className="chip bg-ink-100 dark:bg-ink-800">{TARGET_TYPES[c.targetType]}</span>
              <span className="chip bg-rose-50 text-rose-600 dark:bg-rose-900/30">{REASONS[c.reason]}</span>
              {c.riskLevel && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-900/40">{RISK[c.riskLevel]}</span>}
              {c.hidden && <span className="chip bg-ink-300 text-ink-700">ẩn</span>}
              <a href={`/scam/detail?id=${c.id}`} target="_blank" rel="noreferrer" className="font-semibold hover:text-brand-600">{c.title}</a>
            </div>
            <p className="mt-1 text-xs text-ink-500">
              Bởi {c.reporter?.username} → {c.reportedUser?.username || c.targetName || '—'} ·
              {c._count?.evidence} bằng chứng · {c._count?.comments} bình luận · {c._count?.appeals} khiếu nại
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              <button className="btn-outline text-xs px-2 py-1" onClick={() => setStatusFor(c)}><ListChecks size={14} /> Đổi trạng thái</button>
              <button className="btn-outline text-xs px-2 py-1" onClick={async () => { await api.post(`/scam/admin/cases/${c.id}/hide`, { hidden: !c.hidden }); mutate(); }}>
                {c.hidden ? <><Eye size={14} /> Hiện</> : <><EyeOff size={14} /> Ẩn</>}
              </button>
              {c.reportedUser && <button className="btn-outline text-xs px-2 py-1 text-rose-600" onClick={async () => { if (confirm(`Khóa tài khoản ${c.reportedUser.username}?`)) { await api.post(`/scam/admin/ban/${c.reportedUser.id}`, {}); alert('Đã khóa'); } }}><Ban size={14} /> Khóa TK</button>}
              <button className="btn-outline text-xs px-2 py-1 text-rose-600" onClick={async () => { if (confirm('Xóa vĩnh viễn báo cáo?')) { await api.del(`/scam/admin/cases/${c.id}`); mutate(); } }}><Trash2 size={14} /> Xóa</button>
            </div>
          </div>
        ))}
        {!data?.data?.length && <p className="card p-6 text-center text-ink-500">Không có báo cáo.</p>}
      </div>
    </div>
  );
}

function AppealsTab() {
  const [status, setStatus] = useState('PENDING');
  const { data, mutate } = useSWR<any[]>(`/scam/admin/appeals?status=${status}`, fetcher);
  async function resolve(id: string, action: 'accept' | 'reject') {
    const modNote = prompt('Ghi chú (tùy chọn)') || undefined;
    await api.patch(`/scam/admin/appeals/${id}`, { action, modNote });
    mutate();
  }
  return (
    <div className="space-y-3">
      <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="PENDING">Chờ xử lý</option><option value="RESOLVED">Đã chấp nhận</option><option value="DISMISSED">Đã từ chối</option>
      </select>
      {data?.map((a) => (
        <div key={a.id} className="card p-3">
          <div className="flex items-center gap-2 text-sm">
            <Flag size={15} className="text-amber-600" />
            <a href={`/scam/detail?id=${a.case?.id}`} target="_blank" rel="noreferrer" className="font-semibold hover:text-brand-600">{a.case?.title}</a>
            <span className="text-ink-400">bởi {a.user?.username}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{a.reason}</p>
          {a.status === 'PENDING' && (
            <div className="mt-2 flex gap-1">
              <button className="btn-primary text-xs px-2 py-1" onClick={() => resolve(a.id, 'accept')}>Chấp nhận (minh oan)</button>
              <button className="btn-outline text-xs px-2 py-1" onClick={() => resolve(a.id, 'reject')}>Từ chối</button>
            </div>
          )}
        </div>
      ))}
      {!data?.length && <p className="card p-6 text-center text-ink-500">Không có khiếu nại.</p>}
    </div>
  );
}

function BlacklistTab() {
  const [kind, setKind] = useState('WALLET');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const { data, mutate } = useSWR<any[]>('/scam/admin/blacklist', fetcher);
  async function add() {
    if (!value.trim()) return;
    await api.post('/scam/admin/blacklist', { kind, value: value.trim(), note: note.trim() || undefined });
    setValue(''); setNote(''); mutate();
  }
  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-end gap-2 p-3">
        <label className="text-sm">Loại<select className="input mt-1 w-32" value={kind} onChange={(e) => setKind(e.target.value)}>
          {Object.entries(BL_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <input className="input flex-1" placeholder="Giá trị (ví/IP/domain/email)" value={value} onChange={(e) => setValue(e.target.value)} />
        <input className="input flex-1" placeholder="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn-primary" onClick={add}>Thêm</button>
      </div>
      <div className="space-y-1">
        {data?.map((b) => (
          <div key={b.id} className="card flex items-center justify-between p-2 text-sm">
            <span><span className="chip bg-ink-100 dark:bg-ink-800">{BL_KINDS[b.kind as keyof typeof BL_KINDS]}</span> <b className="ml-1">{b.value}</b> {b.note && <span className="text-ink-400">— {b.note}</span>}</span>
            <button className="btn-ghost text-rose-500" onClick={async () => { await api.del(`/scam/admin/blacklist/${b.id}`); mutate(); }}><Trash2 size={15} /></button>
          </div>
        ))}
        {!data?.length && <p className="card p-6 text-center text-ink-500">Chưa có mục nào.</p>}
      </div>
    </div>
  );
}

function BroadcastTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');
  async function send() {
    if (title.trim().length < 4 || body.trim().length < 4) { setMsg('Nhập đủ tiêu đề & nội dung'); return; }
    if (!confirm('Gửi cảnh báo tới TẤT CẢ người dùng?')) return;
    const r = await api.post<{ sent: number }>('/scam/admin/broadcast', { title: title.trim(), body: body.trim() });
    setMsg(`Đã gửi tới ${r.sent} người dùng`); setTitle(''); setBody('');
  }
  return (
    <div className="card max-w-xl space-y-3 p-4">
      <h2 className="flex items-center gap-2 font-semibold"><Megaphone size={16} /> Cảnh báo toàn hệ thống</h2>
      <input className="input" placeholder="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input min-h-[100px]" placeholder="Nội dung cảnh báo" value={body} onChange={(e) => setBody(e.target.value)} />
      <button className="btn-primary" onClick={send}>Gửi cảnh báo</button>
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
    </div>
  );
}
