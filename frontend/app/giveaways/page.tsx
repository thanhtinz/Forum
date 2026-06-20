'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, Coins, Gem, Users, Trophy, X, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';

interface GiveawayUser { id: string; username: string; displayName?: string | null; avatar?: string | null }
interface Giveaway {
  id: string;
  title: string;
  description?: string | null;
  rewardKind: 'coin' | 'gem';
  totalAmount: number;
  winnersCount: number;
  perWinner: number;
  mode: 'raffle' | 'envelope';
  status: 'OPEN' | 'DRAWN' | 'CLOSED';
  endsAt?: string | null;
  createdAt: string;
  host: GiveawayUser;
  _count?: { entries: number };
}
interface Paginated<T> { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } }

function RewardIcon({ kind, size = 14 }: { kind: string; size?: number }) {
  return kind === 'gem'
    ? <Gem size={size} className="text-fuchsia-500" />
    : <Coins size={size} className="text-amber-500" />;
}

export default function GiveawaysPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'OPEN' | 'DRAWN'>('OPEN');
  const [items, setItems] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<Paginated<Giveaway>>(`/giveaways?status=${tab}&limit=50`);
      setItems(r.data);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <Gift size={24} className="text-brand-600" /> Lì xì / Rút thăm
        </h1>
        {user && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1 !py-1.5 text-sm">
            <Plus size={16} /> Tạo giveaway
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(['OPEN', 'DRAWN'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${tab === t ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
            {t === 'OPEN' ? 'Đang mở' : 'Đã quay'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 text-center text-ink-500">Đang tải…</div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-ink-500">Chưa có giveaway nào.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((g) => (
            <Link key={g.id} href={`/giveaway?id=${g.id}`} className="card block p-4 transition hover:shadow-card">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{g.title}</h3>
                <span className={`chip shrink-0 ${g.mode === 'envelope' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {g.mode === 'envelope' ? 'Lì xì' : 'Rút thăm'}
                </span>
              </div>
              {g.description && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{g.description}</p>}
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Avatar user={g.host} size={24} />
                <span className="text-ink-500">{g.host.displayName || g.host.username}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-500">
                <span className="flex items-center gap-1 font-medium text-ink-700 dark:text-ink-200">
                  <RewardIcon kind={g.rewardKind} /> {g.totalAmount} {g.rewardKind === 'gem' ? 'Gem' : 'Coin'}
                </span>
                <span className="flex items-center gap-1"><Trophy size={13} /> {g.winnersCount} người thắng</span>
                <span className="flex items-center gap-1"><Users size={13} /> {g._count?.entries ?? 0} tham gia</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showForm && <CreateModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); setTab('OPEN'); load(); }} />}
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardKind, setRewardKind] = useState<'coin' | 'gem'>('coin');
  const [totalAmount, setTotalAmount] = useState('');
  const [winnersCount, setWinnersCount] = useState('1');
  const [mode, setMode] = useState<'raffle' | 'envelope'>('raffle');
  const [endsAt, setEndsAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await api.post('/giveaways', {
        title,
        description: description || undefined,
        rewardKind,
        totalAmount: Number(totalAmount),
        winnersCount: Number(winnersCount),
        mode,
        endsAt: endsAt || undefined,
      });
      onCreated();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && onClose()}>
      <div className="card w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold"><Gift size={18} className="text-brand-600" /> Tạo giveaway</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input className="input w-full" placeholder="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea className="input w-full resize-y" rows={2} placeholder="Mô tả (tuỳ chọn)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-ink-500">Loại thưởng</span>
              <select className="input mt-1 w-full" value={rewardKind} onChange={(e) => setRewardKind(e.target.value as any)}>
                <option value="coin">Coin</option>
                <option value="gem">Gem</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-ink-500">Hình thức</span>
              <select className="input mt-1 w-full" value={mode} onChange={(e) => setMode(e.target.value as any)}>
                <option value="raffle">Rút thăm</option>
                <option value="envelope">Lì xì (nhận ngay)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-ink-500">Tổng phần thưởng</span>
              <input type="number" min={1} className="input mt-1 w-full" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
            </label>
            <label className="block">
              <span className="text-xs text-ink-500">Số người thắng</span>
              <input type="number" min={1} className="input mt-1 w-full" value={winnersCount} onChange={(e) => setWinnersCount(e.target.value)} required />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-ink-500">Thời gian kết thúc (tuỳ chọn)</span>
            <input type="datetime-local" className="input mt-1 w-full" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg bg-ink-100 px-4 py-1.5 text-sm dark:bg-ink-800">Hủy</button>
            <button type="submit" disabled={busy} className="btn-primary !py-1.5 text-sm disabled:opacity-50">{busy ? 'Đang tạo…' : 'Tạo'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
