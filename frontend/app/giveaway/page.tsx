'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Gift, Coins, Gem, Users, Trophy, Dices, XCircle, Crown } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';

interface GiveawayUser { id: string; username: string; displayName?: string | null; avatar?: string | null }
interface Entry { id: string; userId: string; isWinner: boolean; amountWon: number; createdAt: string; user: GiveawayUser }
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
  drawnAt?: string | null;
  hostId: string;
  host: GiveawayUser;
  entries: Entry[];
}

function RewardLabel({ kind }: { kind: string }) {
  return kind === 'gem'
    ? <span className="inline-flex items-center gap-1"><Gem size={14} className="text-fuchsia-500" /> Gem</span>
    : <span className="inline-flex items-center gap-1"><Coins size={14} className="text-amber-500" /> Coin</span>;
}

function GiveawayView() {
  const id = useSearchParams().get('id') || '';
  const { user } = useAuth();
  const [g, setG] = useState<Giveaway | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.get<Giveaway>(`/giveaways/${id}`);
      setG(data);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (id) load(); /* eslint-disable-next-line */ }, [id]);

  async function act(path: string, successMsg: string) {
    setErr(''); setMsg(''); setBusy(true);
    try {
      await api.post(`/giveaways/${id}/${path}`, {});
      setMsg(successMsg);
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (err && !g) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!g) return null;

  const isHost = !!user && user.id === g.hostId;
  const isAdmin = !!user && user.role === 'ADMIN';
  const myEntry = user ? g.entries.find((e) => e.userId === user.id) : undefined;
  const expired = !!g.endsAt && new Date(g.endsAt).getTime() < Date.now();
  const winners = g.entries.filter((e) => e.isWinner);
  const canJoin = !!user && g.status === 'OPEN' && !isHost && !myEntry && !expired;
  const canDraw = (isHost || isAdmin) && g.mode === 'raffle' && g.status === 'OPEN';
  const canCancel = (isHost || isAdmin) && g.mode === 'raffle' && g.status === 'OPEN' && winners.length === 0;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-start justify-between gap-2">
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Gift size={22} className="text-brand-600" /> {g.title}
          </h1>
          <span className={`chip shrink-0 ${g.mode === 'envelope' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
            {g.mode === 'envelope' ? 'Lì xì' : 'Rút thăm'}
          </span>
        </div>
        {g.description && <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{g.description}</p>}

        <div className="mt-3 flex items-center gap-2 text-sm">
          <Avatar user={g.host} size={28} />
          <span className="text-ink-500">Tạo bởi {g.host.displayName || g.host.username}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-900/50">
            <div className="text-xs text-ink-500">Tổng thưởng</div>
            <div className="mt-0.5 font-semibold">{g.totalAmount} <RewardLabel kind={g.rewardKind} /></div>
          </div>
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-900/50">
            <div className="text-xs text-ink-500">Mỗi người</div>
            <div className="mt-0.5 font-semibold">{g.perWinner}</div>
          </div>
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-900/50">
            <div className="flex items-center gap-1 text-xs text-ink-500"><Trophy size={12} /> Người thắng</div>
            <div className="mt-0.5 font-semibold">{g.winnersCount}</div>
          </div>
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-900/50">
            <div className="flex items-center gap-1 text-xs text-ink-500"><Users size={12} /> Tham gia</div>
            <div className="mt-0.5 font-semibold">{g.entries.length}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-500">
          <span className={`chip ${g.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : g.status === 'DRAWN' ? 'bg-blue-100 text-blue-700' : 'bg-ink-200 text-ink-600'}`}>
            {g.status === 'OPEN' ? 'Đang mở' : g.status === 'DRAWN' ? 'Đã quay' : 'Đã đóng'}
          </span>
          {g.endsAt && (
            <span>{expired ? 'Đã hết hạn' : 'Kết thúc'} {(() => { try { return formatDistanceToNow(new Date(g.endsAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}</span>
          )}
        </div>

        {myEntry && (
          <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-950/30 dark:text-brand-300">
            {myEntry.isWinner
              ? `Bạn đã trúng ${myEntry.amountWon} ${g.rewardKind === 'gem' ? 'Gem' : 'Coin'}!`
              : 'Bạn đã tham gia. Chờ host quay thưởng.'}
          </p>
        )}

        {(err || msg) && (
          <p className={`mt-3 text-sm ${err ? 'text-red-500' : 'text-emerald-600'}`}>{err || msg}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {canJoin && (
            <button onClick={() => act('join', 'Tham gia thành công!')} disabled={busy} className="btn-primary flex items-center gap-1 !py-1.5 text-sm disabled:opacity-50">
              <Gift size={16} /> Tham gia
            </button>
          )}
          {canDraw && (
            <button onClick={() => act('draw', 'Đã quay xong!')} disabled={busy} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              <Dices size={16} /> Quay chọn người thắng
            </button>
          )}
          {canCancel && (
            <button onClick={() => act('cancel', 'Đã hủy giveaway.')} disabled={busy} className="flex items-center gap-1 rounded-lg bg-ink-100 px-4 py-1.5 text-sm font-medium hover:bg-ink-200 dark:bg-ink-800">
              <XCircle size={16} /> Hủy
            </button>
          )}
          {!user && g.status === 'OPEN' && (
            <a href="/login" className="text-sm text-brand-600">Đăng nhập để tham gia</a>
          )}
        </div>
      </div>

      {winners.length > 0 && (
        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Crown size={18} className="text-amber-500" /> Người thắng</h2>
          <div className="mt-3 space-y-2">
            {winners.map((e) => (
              <div key={e.id} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/20">
                <Avatar user={e.user} size={28} />
                <span className="font-medium">{e.user.displayName || e.user.username}</span>
                <span className="ml-auto text-sm font-semibold text-amber-600">+{e.amountWon} {g.rewardKind === 'gem' ? 'Gem' : 'Coin'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Users size={18} /> Danh sách tham gia ({g.entries.length})</h2>
        {g.entries.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">Chưa có ai tham gia.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {g.entries.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-sm">
                <Avatar user={e.user} size={24} />
                <span>{e.user.displayName || e.user.username}</span>
                {e.isWinner && <span className="ml-auto flex items-center gap-1 text-xs font-medium text-amber-600"><Trophy size={12} /> +{e.amountWon}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GiveawayPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <GiveawayView />
    </Suspense>
  );
}
