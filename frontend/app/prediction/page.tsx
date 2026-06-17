'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  TrendingUp, Coins, Lock, CheckCircle2, ShieldCheck, Users2, Clock, Tag,
  Gavel, XCircle, AlertTriangle, Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import {
  catLabel, typeLabel, statusLabel, ODDS_MODES, VISIBILITIES, type Prediction,
} from '@/lib/predictions';

function PredView() {
  const id = useSearchParams().get('id') || '';
  const { user } = useAuth();
  const [p, setP] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [optIdx, setOptIdx] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [betBusy, setBetBusy] = useState(false);

  const [resultIdx, setResultIdx] = useState<number | null>(null);
  const [resultNote, setResultNote] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try { setP(await api.get<Prediction>(`/quiz/predictions/${id}`)); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id, user?.id]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setErr(''); setMsg('');
    try { await fn(); setMsg(ok); await load(); }
    catch (e: any) { setErr(e.message || 'Có lỗi'); }
  }

  async function placeBet(e: React.FormEvent) {
    e.preventDefault();
    if (optIdx === null) { setErr('Hãy chọn một cửa'); return; }
    setBetBusy(true); setErr(''); setMsg('');
    try {
      await api.post(`/quiz/predictions/${id}/bet`, { optionIndex: optIdx, amount: Number(amount), password: password || undefined });
      setAmount(''); setOptIdx(null); setMsg('Đặt cược thành công'); await load();
    } catch (e: any) { setErr(e.message || 'Đặt cược thất bại'); }
    finally { setBetBusy(false); }
  }

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (err && !p) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!p) return null;

  const canBet = p.status === 'OPEN' && user && !(p.isOwner && !p.isAdminMarket);
  const canManage = p.isOwner || (user && (user.role === 'ADMIN' || user.role === 'MODERATOR'));
  const expected = optIdx !== null && p.oddsMode === 'FIXED' && amount
    ? Math.round(Number(amount) * (p.odds[optIdx] ?? 0))
    : optIdx !== null && p.oddsMode === 'POOL' && amount && p.optionTotals[optIdx] != null
      ? Math.round(((p.pool + Number(amount)) * Number(amount)) / ((p.optionTotals[optIdx] ?? 0) + Number(amount)) || 0)
      : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {p.banner && <img src={p.banner} alt="" className="h-40 w-full rounded-2xl object-cover" />}

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip bg-brand-100 text-brand-700">{catLabel(p.category)}</span>
          <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{typeLabel(p.marketType)}</span>
          <span className="chip bg-violet-100 text-violet-700">{ODDS_MODES[p.oddsMode]}</span>
          {p.isAdminMarket && <span className="chip inline-flex items-center gap-0.5 bg-amber-100 text-amber-700"><ShieldCheck size={11} /> Nhà cái hệ thống</span>}
          <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{statusLabel(p.status)}</span>
          {p.visibility !== 'PUBLIC' && <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800">{VISIBILITIES[p.visibility]}</span>}
        </div>
        <div className="mt-2 flex items-start gap-3">
          {p.image && <img src={p.image} alt="" className="h-16 w-16 rounded-xl object-cover" />}
          <div>
            <h1 className="text-2xl font-bold">{p.title}</h1>
            {p.line != null && <p className="text-sm text-ink-500">Mức: {p.line}</p>}
          </div>
        </div>
        {p.description && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{p.description}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
          {p.creator && <span className="flex items-center gap-1"><Avatar user={p.creator} size={20} /> {p.creator.displayName || p.creator.username}</span>}
          <span className="flex items-center gap-1"><Coins size={14} /> Pool {p.pool.toLocaleString()}</span>
          <span className="flex items-center gap-1"><Users2 size={14} /> {p.betCount} lượt cược</span>
          {p.closesAt && <span className="flex items-center gap-1"><Clock size={14} /> Khoá: {new Date(p.closesAt).toLocaleString('vi-VN')}</span>}
        </div>
        {p.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">{p.tags.map((t) => <span key={t} className="flex items-center gap-0.5 text-xs text-ink-400"><Tag size={11} />{t}</span>)}</div>
        )}
        <div className="mt-2 text-xs text-ink-400">Cược {p.minBet}{p.maxBet ? `–${p.maxBet}` : '+'} coin · hoa hồng {(p.commissionBps / 100).toFixed(1)}%{p.oddsMode === 'FIXED' && !p.isAdminMarket ? ` · ký quỹ nhà cái: ${p.creatorStake.toLocaleString()} (còn ${p.creatorEscrow.toLocaleString()})` : ''}</div>
      </div>

      {/* Các cửa + đặt cược */}
      <div className="card space-y-2 p-5">
        <h2 className="font-semibold">Các cửa</h2>
        {p.options.map((opt, idx) => {
          const total = p.optionTotals[idx] ?? 0;
          const pct = p.pool > 0 ? Math.round((total / p.pool) * 100) : 0;
          const isWinner = p.status === 'SETTLED' && p.correctIndex === idx;
          const picked = optIdx === idx;
          return (
            <button key={idx} type="button" disabled={!canBet} onClick={() => setOptIdx(idx)}
              className={`relative block w-full overflow-hidden rounded-lg border text-left ${picked ? 'border-brand-600 ring-1 ring-brand-400' : isWinner ? 'border-green-500' : 'border-ink-200 dark:border-ink-700'}`}>
              <div className={`absolute inset-y-0 left-0 ${isWinner ? 'bg-green-100 dark:bg-green-900/40' : 'bg-brand-100/60 dark:bg-brand-900/30'}`} style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between px-3 py-2.5 text-sm">
                <span className="flex items-center gap-1.5">{opt || `Cửa ${idx + 1}`}{isWinner && <CheckCircle2 size={14} className="text-green-600" />}</span>
                <span className="flex items-center gap-2 text-xs text-ink-500">
                  <span className="font-semibold text-brand-600">{p.oddsMode === 'FIXED' ? `x${(p.odds[idx] ?? 0).toFixed(2)}` : (p.odds[idx] ? `~x${p.odds[idx].toFixed(2)}` : '—')}</span>
                  <span>{pct}% · {total.toLocaleString()} ({p.optionCounts[idx] ?? 0})</span>
                </span>
              </div>
            </button>
          );
        })}

        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
        {err && <p className="text-sm text-red-500">{err}</p>}

        {canBet && (
          <form onSubmit={placeBet} className="mt-2 space-y-2 border-t border-ink-200 pt-3 dark:border-ink-800">
            {p.visibility === 'PRIVATE' && p.hasPassword && (
              <input className="input w-full" type="password" placeholder="Mật khẩu kèo riêng tư" value={password} onChange={(e) => setPassword(e.target.value)} />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input className="input w-40" type="number" min={p.minBet} placeholder={`Số coin (≥${p.minBet})`} value={amount} onChange={(e) => setAmount(e.target.value)} required />
              <button className="btn-primary inline-flex items-center gap-1" disabled={betBusy || optIdx === null}><Wallet size={15} /> {betBusy ? 'Đang đặt…' : 'Đặt cược'}</button>
              {optIdx !== null && amount && expected > 0 && (
                <span className="text-sm text-ink-500">Dự kiến nhận: <b className="text-emerald-600">{expected.toLocaleString()}</b> coin</span>
              )}
            </div>
          </form>
        )}
        {!user && p.status === 'OPEN' && <p className="border-t border-ink-200 pt-3 text-sm text-ink-500 dark:border-ink-800">Vui lòng <a href="/login" className="text-brand-600 font-medium">đăng nhập</a> để đặt cược.</p>}
      </div>

      {/* Vé cược của tôi */}
      {p.myBets && p.myBets.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Vé cược của tôi</h2>
          <div className="space-y-2">
            {p.myBets.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-800">
                <span>{p.options[b.optionIndex] || `Cửa ${b.optionIndex + 1}`} · {b.amount.toLocaleString()} coin{b.odds > 0 ? ` · x${b.odds.toFixed(2)}` : ''}</span>
                <span className={`font-medium ${b.status === 'WON' ? 'text-emerald-600' : b.status === 'LOST' ? 'text-red-500' : b.status === 'REFUNDED' ? 'text-amber-600' : 'text-ink-500'}`}>
                  {b.status === 'ACTIVE' ? 'Đang chờ' : b.status === 'WON' ? `Thắng +${b.payout.toLocaleString()}` : b.status === 'LOST' ? 'Thua' : `Hoàn ${b.payout.toLocaleString()}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.status === 'SETTLED' && (
        <div className="card border-green-300 p-4 text-sm">
          <div className="flex items-center gap-1 font-medium text-green-700 dark:text-green-400"><CheckCircle2 size={16} /> Kết quả: {p.options[p.correctIndex ?? -1] || '—'}</div>
          {p.resultNote && <p className="mt-1 text-ink-500">{p.resultNote}</p>}
        </div>
      )}
      {p.status === 'CANCELLED' && (
        <div className="card border-red-300 p-4 text-sm text-red-500"><XCircle size={16} className="mr-1 inline" /> Kèo đã huỷ, coin đã được hoàn.{p.resultNote ? ` Lý do: ${p.resultNote}` : ''}</div>
      )}

      {/* Công cụ người tạo / mod */}
      {canManage && p.status !== 'SETTLED' && p.status !== 'CANCELLED' && (
        <div className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Gavel size={18} /> Quản lý kèo</h2>
          <div className="flex flex-wrap gap-2">
            {p.status === 'OPEN' && <button onClick={() => act(() => api.post(`/quiz/predictions/${id}/lock`, {}), 'Đã khoá cược')} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm"><Lock size={15} /> Khoá cược</button>}
            <button onClick={() => act(() => api.post(`/quiz/predictions/${id}/cancel`, { reason: resultNote || undefined }), 'Đã huỷ kèo & hoàn coin')} className="btn-outline inline-flex items-center gap-1 !py-1.5 text-sm text-red-500"><XCircle size={15} /> Huỷ & hoàn coin</button>
          </div>
          <div className="space-y-2 rounded-lg border border-ink-200 p-3 dark:border-ink-800">
            <div className="text-sm font-medium">Công bố kết quả</div>
            <div className="flex flex-wrap gap-2">
              {p.options.map((o, i) => (
                <button key={i} type="button" onClick={() => setResultIdx(i)} className={`rounded-lg border px-3 py-1.5 text-sm ${resultIdx === i ? 'border-green-600 bg-green-50 text-green-700 dark:bg-green-900/30' : 'border-ink-200 dark:border-ink-700'}`}>{o || `Cửa ${i + 1}`}</button>
              ))}
            </div>
            <input className="input w-full" placeholder="Ghi chú kết quả (tuỳ chọn)" value={resultNote} onChange={(e) => setResultNote(e.target.value)} />
            <button onClick={() => resultIdx !== null && act(() => api.post(`/quiz/predictions/${id}/settle`, { correctIndex: resultIdx, note: resultNote || undefined }), 'Đã chốt kết quả & trả thưởng')} disabled={resultIdx === null} className="btn-primary inline-flex items-center gap-1 !py-1.5 text-sm disabled:opacity-50"><CheckCircle2 size={15} /> Chốt & trả thưởng</button>
            <p className="flex items-start gap-1 text-xs text-ink-400"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> Sau khi chốt sẽ tự động tính & trả thưởng cho người thắng. Không thể hoàn tác.</p>
          </div>
        </div>
      )}

      <Link href="/predictions" className="inline-flex items-center gap-1 text-sm text-brand-600"><TrendingUp size={15} /> Về danh sách kèo</Link>
    </div>
  );
}

export default function PredictionPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <PredView />
    </Suspense>
  );
}
