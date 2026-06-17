'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { io, type Socket } from 'socket.io-client';
import {
  TrendingUp, Coins, Lock, CheckCircle2, ShieldCheck, Users2, Clock, Tag,
  Gavel, XCircle, AlertTriangle, Wallet, MessageCircle, Send, Trash2, BarChart3, Radio,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import {
  catLabel, typeLabel, statusLabel, ODDS_MODES, VISIBILITIES, REACTION_EMOJIS, type Prediction,
} from '@/lib/predictions';

function ReactionBar({ targetType, targetId, counts, mine, compact }: {
  targetType: 'PREDICTION' | 'COMMENT'; targetId: string;
  counts: Record<string, number>; mine: string[]; compact?: boolean;
}) {
  const { user } = useAuth();
  const [c, setC] = useState<Record<string, number>>(counts || {});
  const [m, setM] = useState<string[]>(mine || []);
  const [open, setOpen] = useState(false);

  async function toggle(emoji: string) {
    if (!user) return;
    try {
      const r = await api.post<{ counts: Record<string, number>; mine: string[] }>('/quiz/predictions/react', { targetType, targetId, emoji });
      setC(r.counts || {}); setM(r.mine || []); setOpen(false);
    } catch { /* noop */ }
  }
  const active = REACTION_EMOJIS.filter((e) => (c[e] || 0) > 0);
  return (
    <div className={`flex flex-wrap items-center gap-1 ${compact ? '' : 'mt-1'}`}>
      {active.map((e) => (
        <button key={e} onClick={() => toggle(e)} disabled={!user}
          className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs ${m.includes(e) ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/30' : 'border-ink-200 dark:border-ink-700'}`}>
          <span>{e}</span><span className="text-ink-500">{c[e]}</span>
        </button>
      ))}
      {user && (
        <div className="relative">
          <button onClick={() => setOpen((v) => !v)} className="rounded-full border border-ink-200 px-2 py-0.5 text-xs text-ink-400 hover:text-brand-600 dark:border-ink-700">＋</button>
          {open && (
            <div className="absolute left-0 z-10 mt-1 flex gap-1 rounded-lg border border-ink-200 bg-white p-1.5 shadow-card dark:border-ink-700 dark:bg-ink-900">
              {REACTION_EMOJIS.map((e) => (
                <button key={e} onClick={() => toggle(e)} className={`rounded p-1 text-lg hover:bg-ink-100 dark:hover:bg-ink-800 ${m.includes(e) ? 'bg-brand-50 dark:bg-brand-900/30' : ''}`}>{e}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [analytics, setAnalytics] = useState<any>(null);
  const [feed, setFeed] = useState<{ id: string; text: string; kind: string }[]>([]);
  const [liveOn, setLiveOn] = useState(false);
  const [liveComment, setLiveComment] = useState<any>(null);
  const feedSeq = useRef(0);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try { setP(await api.get<Prediction>(`/quiz/predictions/${id}`)); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }, [id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [id, user?.id]);

  useEffect(() => {
    if (!id || !p) return;
    if (p.isOwner || (user && (user.role === 'ADMIN' || user.role === 'MODERATOR'))) {
      api.get(`/quiz/predictions/${id}/analytics`).then(setAnalytics).catch(() => setAnalytics(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, p?.isOwner, p?.status]);

  // Livestream realtime
  useEffect(() => {
    if (!id) return;
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const socket: Socket = io(`${base}/predictions`, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => { setLiveOn(true); socket.emit('join', id); });
    socket.on('disconnect', () => setLiveOn(false));
    socket.on('live', (ev: any) => {
      if (ev.snapshot) {
        setP((prev) => (prev ? { ...prev, ...ev.snapshot } : prev));
        if (ev.snapshot.status === 'SETTLED' || ev.snapshot.status === 'CANCELLED') load();
      }
      const name = ev.actor?.displayName || ev.actor?.username || 'Ai đó';
      const push = (text: string, kind: string) => { feedSeq.current += 1; setFeed((f) => [{ id: `${Date.now()}-${feedSeq.current}`, text, kind }, ...f].slice(0, 30)); };
      if (ev.type === 'bet') push(`${name} đặt ${Number(ev.amount).toLocaleString()} coin vào «${ev.optionLabel}»`, 'bet');
      else if (ev.type === 'cashout') push('Một người chơi đã bán vé sớm', 'cashout');
      else if (ev.type === 'lock') push('🔒 Kèo đã khoá cược', 'lock');
      else if (ev.type === 'settle') push('🏁 Kèo đã có kết quả', 'settle');
      else if (ev.type === 'cancel') push('Kèo đã bị huỷ', 'cancel');
      else if (ev.type === 'comment') { push(`💬 ${ev.comment?.user?.displayName || ev.comment?.user?.username || 'Ai đó'} vừa bình luận`, 'comment'); setLiveComment(ev.comment); }
    });
    return () => { socket.emit('leave', id); socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
          {p.resultAt && p.status !== 'SETTLED' && p.status !== 'CANCELLED' && <span className="flex items-center gap-1"><Clock size={14} /> Dự kiến KQ: {new Date(p.resultAt).toLocaleString('vi-VN')}</span>}
        </div>
        {p.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">{p.tags.map((t) => <span key={t} className="flex items-center gap-0.5 text-xs text-ink-400"><Tag size={11} />{t}</span>)}</div>
        )}
        <div className="mt-2 text-xs text-ink-400">Cược {p.minBet}{p.maxBet ? `–${p.maxBet}` : '+'} coin · hoa hồng {(p.commissionBps / 100).toFixed(1)}%{p.oddsMode === 'FIXED' && !p.isAdminMarket ? ` · ký quỹ nhà cái: ${p.creatorStake.toLocaleString()} (còn ${p.creatorEscrow.toLocaleString()})` : ''}</div>
        <ReactionBar targetType="PREDICTION" targetId={p.id} counts={p.reactions || {}} mine={p.myReactions || []} />
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

      {/* Diễn biến trực tiếp */}
      <div className="card p-5">
        <h2 className="mb-2 flex items-center gap-2 font-semibold">
          <Radio size={18} className={liveOn ? 'text-red-500' : 'text-ink-400'} /> Diễn biến trực tiếp
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${liveOn ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-ink-100 text-ink-400 dark:bg-ink-800'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${liveOn ? 'animate-pulse bg-red-500' : 'bg-ink-400'}`} /> {liveOn ? 'LIVE' : 'offline'}
          </span>
        </h2>
        {feed.length === 0 ? (
          <p className="text-sm text-ink-500">Đang chờ hoạt động… mọi lượt cược sẽ hiện ở đây ngay lập tức.</p>
        ) : (
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {feed.map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-1.5 text-sm dark:bg-ink-800/60">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${f.kind === 'bet' ? 'bg-emerald-500' : f.kind === 'settle' ? 'bg-amber-500' : f.kind === 'cancel' ? 'bg-red-500' : 'bg-brand-500'}`} />
                <span className="truncate">{f.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vé cược của tôi */}
      {p.myBets && p.myBets.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-2 font-semibold">Vé cược của tôi</h2>
          <div className="space-y-2">
            {p.myBets.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-800">
                <span>{p.options[b.optionIndex] || `Cửa ${b.optionIndex + 1}`} · {b.amount.toLocaleString()} coin{b.odds > 0 ? ` · x${b.odds.toFixed(2)}` : ''}</span>
                <div className="flex items-center gap-2">
                  {p.status === 'OPEN' && b.status === 'ACTIVE' && (
                    <button onClick={() => act(() => api.post(`/quiz/predictions/bets/${b.id}/cashout`, {}), 'Đã bán vé sớm')}
                      title="Bán sớm: hoàn 95% (phí 5%)"
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20">
                      <Wallet size={12} /> Bán ~{Math.floor(b.amount * 0.95).toLocaleString()}
                    </button>
                  )}
                  <span className={`font-medium ${b.status === 'WON' ? 'text-emerald-600' : b.status === 'LOST' ? 'text-red-500' : b.status === 'REFUNDED' ? 'text-amber-600' : b.status === 'CASHED_OUT' ? 'text-sky-600' : 'text-ink-500'}`}>
                    {b.status === 'ACTIVE' ? 'Đang chờ' : b.status === 'WON' ? `Thắng +${b.payout.toLocaleString()}` : b.status === 'LOST' ? 'Thua' : b.status === 'CASHED_OUT' ? `Đã bán ${b.payout.toLocaleString()}` : `Hoàn ${b.payout.toLocaleString()}`}
                  </span>
                </div>
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

      {analytics && (
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><BarChart3 size={18} className="text-violet-500" /> Phân tích kèo</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><div className="text-xs text-ink-500">Tổng cược</div><div className="text-lg font-bold">{analytics.totalStaked.toLocaleString()}</div></div>
            <div><div className="text-xs text-ink-500">Người tham gia</div><div className="text-lg font-bold">{analytics.uniqueBettors}</div></div>
            <div><div className="text-xs text-ink-500">Lượt cược</div><div className="text-lg font-bold">{analytics.betCount}{analytics.cashedOut > 0 ? ` (${analytics.cashedOut} bán)` : ''}</div></div>
          </div>
          <div className="mt-3 space-y-1.5">
            {analytics.options.map((opt: string, idx: number) => {
              const t = analytics.optionTotals[idx] ?? 0;
              const pct = analytics.totalStaked > 0 ? Math.round((t / analytics.totalStaked) * 100) : 0;
              return (
                <div key={idx} className="relative overflow-hidden rounded-lg border border-ink-200 dark:border-ink-700">
                  <div className="absolute inset-y-0 left-0 bg-violet-100 dark:bg-violet-900/30" style={{ width: `${pct}%` }} />
                  <div className="relative flex items-center justify-between px-3 py-1.5 text-sm">
                    <span>{opt || `Cửa ${idx + 1}`}</span>
                    <span className="text-xs text-ink-500">{pct}% · {t.toLocaleString()} · {analytics.optionCounts[idx] ?? 0} lượt</span>
                  </div>
                </div>
              );
            })}
          </div>
          {analytics.result && (
            <div className="mt-3 rounded-lg bg-ink-50 p-3 text-sm dark:bg-ink-800/60">
              <div>Người thắng: <b>{analytics.result.winners}</b> · Đã trả thưởng: <b>{analytics.result.paidOut.toLocaleString()}</b></div>
              {analytics.result.commissionEarned != null && <div>Hoa hồng nhận: <b className="text-emerald-600">{analytics.result.commissionEarned.toLocaleString()}</b></div>}
              {analytics.result.bookProfit != null && <div>P/L nhà cái: <b className={analytics.result.bookProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}>{analytics.result.bookProfit >= 0 ? '+' : ''}{analytics.result.bookProfit.toLocaleString()}</b>{analytics.result.isHouse ? ' (hệ thống)' : ''}</div>}
            </div>
          )}
        </div>
      )}

      <CommentsSection predictionId={p.id} liveComment={liveComment} />

      <Link href="/predictions" className="inline-flex items-center gap-1 text-sm text-brand-600"><TrendingUp size={15} /> Về danh sách kèo</Link>
    </div>
  );
}

interface CUser { id: string; username: string; displayName?: string | null; avatar?: string | null }
interface Comment {
  id: string; parentId: string | null; content: string | null; isDeleted: boolean;
  createdAt: string; user: CUser | null; replies?: Comment[];
  reactions?: Record<string, number>; myReactions?: string[];
}

function CommentsSection({ predictionId, liveComment }: { predictionId: string; liveComment?: Comment | null }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get<Comment[]>(`/quiz/predictions/${predictionId}/comments`).then(setItems).catch(() => setItems([]));
  }, [predictionId]);
  useEffect(() => { load(); }, [load]);

  // Bình luận realtime: chèn vào đúng vị trí (gốc / trả lời), tránh trùng
  useEffect(() => {
    if (!liveComment) return;
    setItems((prev) => {
      const exists = prev.some((c) => c.id === liveComment.id || c.replies?.some((r) => r.id === liveComment.id));
      if (exists) return prev;
      if (liveComment.parentId) {
        return prev.map((c) => (c.id === liveComment.parentId ? { ...c, replies: [...(c.replies || []), liveComment] } : c));
      }
      return [...prev, { ...liveComment, replies: [] }];
    });
  }, [liveComment]);

  async function send(content: string, parentId?: string) {
    if (!content.trim()) return;
    setBusy(true);
    try {
      await api.post(`/quiz/predictions/${predictionId}/comments`, { content, parentId });
      setText(''); setReplyText(''); setReplyTo(null); load();
    } catch { /* noop */ } finally { setBusy(false); }
  }
  async function del(id: string) {
    if (!confirm('Xoá bình luận này?')) return;
    await api.del(`/quiz/predictions/comments/${id}`).catch(() => {});
    load();
  }

  const total = items.reduce((s, c) => s + 1 + (c.replies?.length || 0), 0);
  const canDel = (c: Comment) => user && (user.id === c.user?.id || user.role === 'ADMIN' || user.role === 'MODERATOR');

  function Item({ c, isReply }: { c: Comment; isReply?: boolean }) {
    return (
      <div className={`flex gap-2.5 ${isReply ? 'ml-8 mt-2' : ''}`}>
        {c.user ? <Avatar user={c.user} size={32} /> : <div className="h-8 w-8 rounded-full bg-ink-100 dark:bg-ink-800" />}
        <div className="min-w-0 flex-1">
          <div className="rounded-xl bg-ink-50 px-3 py-2 dark:bg-ink-800/60">
            <div className="flex items-center justify-between gap-2">
              <Link href={c.user ? `/profile?username=${c.user.username}` : '#'} className="text-sm font-semibold hover:text-brand-600">{c.user?.displayName || c.user?.username || 'Ẩn danh'}</Link>
              {canDel(c) && !c.isDeleted && <button onClick={() => del(c.id)} className="text-ink-400 hover:text-red-500"><Trash2 size={13} /></button>}
            </div>
            <p className={`whitespace-pre-wrap break-words text-sm ${c.isDeleted ? 'italic text-ink-400' : ''}`}>{c.isDeleted ? 'Bình luận đã bị xoá' : c.content}</p>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-3 px-1 text-xs text-ink-400">
            <span>{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
            {user && !isReply && <button onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(''); }} className="hover:text-brand-600">Trả lời</button>}
            {!c.isDeleted && <ReactionBar targetType="COMMENT" targetId={c.id} counts={c.reactions || {}} mine={c.myReactions || []} compact />}
          </div>
          {replyTo === c.id && (
            <div className="mt-1.5 flex gap-2">
              <input className="input flex-1 !py-1.5 text-sm" placeholder="Viết trả lời…" value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(replyText, c.id)} />
              <button onClick={() => send(replyText, c.id)} disabled={busy} className="btn-primary !px-3 !py-1.5"><Send size={14} /></button>
            </div>
          )}
          {c.replies?.map((r) => <Item key={r.id} c={r} isReply />)}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><MessageCircle size={18} /> Thảo luận <span className="text-sm font-normal text-ink-400">({total})</span></h2>
      {user ? (
        <div className="mb-4 flex gap-2">
          <input className="input flex-1" placeholder="Chia sẻ nhận định của bạn…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(text)} />
          <button onClick={() => send(text)} disabled={busy || !text.trim()} className="btn-primary inline-flex items-center gap-1 disabled:opacity-50"><Send size={15} /> Gửi</button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-ink-500"><a href="/login" className="text-brand-600 font-medium">Đăng nhập</a> để tham gia thảo luận.</p>
      )}
      {items.length === 0 && <p className="text-sm text-ink-500">Chưa có bình luận. Hãy là người đầu tiên!</p>}
      <div className="space-y-3">
        {items.map((c) => <Item key={c.id} c={c} />)}
      </div>
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
