'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layers, X, Wallet, ShieldCheck, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { catLabel, type Prediction } from '@/lib/predictions';

interface Leg { predictionId: string; title: string; optionIndex: number; optionLabel: string; odds: number }

export default function ParlayPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [markets, setMarkets] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get<Prediction[]>('/quiz/predictions?status=OPEN&sort=hot')
      .then((list) => setMarkets(list.filter((p) => p.oddsMode === 'FIXED' && p.isAdminMarket)))
      .catch(() => setMarkets([]))
      .finally(() => setLoading(false));
  }, []);

  const combinedOdds = useMemo(() => legs.reduce((s, l) => s * l.odds, 1), [legs]);
  const potential = amount ? Math.floor(Number(amount) * combinedOdds) : 0;

  function pick(p: Prediction, idx: number) {
    setLegs((prev) => {
      const without = prev.filter((l) => l.predictionId !== p.id);
      const existing = prev.find((l) => l.predictionId === p.id && l.optionIndex === idx);
      if (existing) return without; // bấm lại để bỏ chọn
      return [...without, { predictionId: p.id, title: p.title, optionIndex: idx, optionLabel: p.options[idx] || `Cửa ${idx + 1}`, odds: p.odds[idx] || 0 }];
    });
  }
  const isPicked = (pid: string, idx: number) => legs.some((l) => l.predictionId === pid && l.optionIndex === idx);

  async function submit() {
    if (legs.length < 2) { setErr('Cần chọn ít nhất 2 kèo'); return; }
    if (!(Number(amount) > 0)) { setErr('Nhập số coin'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      await api.post('/quiz/parlays', { legs: legs.map((l) => ({ predictionId: l.predictionId, optionIndex: l.optionIndex })), amount: Number(amount) });
      setMsg('Đặt cược xiên thành công!'); setLegs([]); setAmount('');
      setTimeout(() => router.push('/predictions/mine'), 800);
    } catch (e: any) { setErr(e.message || 'Đặt cược thất bại'); }
    finally { setBusy(false); }
  }

  if (authLoading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user) return <div className="card p-10 text-center text-ink-500">Vui lòng <a href="/login" className="text-brand-600 font-medium">đăng nhập</a>.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Layers size={22} /> Cược xiên (Parlay)</h1>
        <Link href="/predictions" className="btn-outline inline-flex items-center gap-1 text-sm"><TrendingUp size={15} /> Danh sách kèo</Link>
      </div>
      <p className="text-sm text-ink-500">Gộp nhiều kèo nhà cái (odds cố định) vào một vé — odds nhân lên, thắng tất cả mới ăn. Mỗi kèo chọn 1 cửa.</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Danh sách kèo */}
        <div className="space-y-3 lg:col-span-2">
          {loading && <p className="text-sm text-ink-500">Đang tải…</p>}
          {!loading && markets.length === 0 && <div className="card p-6 text-center text-ink-500">Hiện chưa có kèo nhà cái nào đang mở.</div>}
          {markets.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="chip bg-brand-100 text-brand-700">{catLabel(p.category)}</span>
                <span className="chip inline-flex items-center gap-0.5 bg-amber-100 text-amber-700"><ShieldCheck size={11} /> Nhà cái</span>
              </div>
              <h3 className="mb-2 font-semibold">{p.title}</h3>
              <div className="flex flex-wrap gap-2">
                {p.options.map((opt, idx) => (
                  <button key={idx} onClick={() => pick(p, idx)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${isPicked(p.id, idx) ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-900/30' : 'border-ink-200 dark:border-ink-700'}`}>
                    {opt || `Cửa ${idx + 1}`} <b className="text-brand-600">x{(p.odds[idx] || 0).toFixed(2)}</b>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Phiếu cược */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="card p-4">
            <h2 className="mb-2 font-semibold">Phiếu xiên ({legs.length})</h2>
            {legs.length === 0 && <p className="text-sm text-ink-500">Chọn cửa từ các kèo bên cạnh để thêm vào phiếu.</p>}
            <div className="space-y-2">
              {legs.map((l) => (
                <div key={l.predictionId} className="flex items-start justify-between gap-2 rounded-lg border border-ink-200 p-2 text-sm dark:border-ink-700">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{l.title}</div>
                    <div className="text-xs text-ink-500">{l.optionLabel} · <b className="text-brand-600">x{l.odds.toFixed(2)}</b></div>
                  </div>
                  <button onClick={() => setLegs((prev) => prev.filter((x) => x.predictionId !== l.predictionId))} className="text-ink-400 hover:text-red-500"><X size={15} /></button>
                </div>
              ))}
            </div>
            {legs.length >= 2 && (
              <>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-ink-500">Tổng odds</span>
                  <b className="text-brand-600">x{combinedOdds.toFixed(2)}</b>
                </div>
                <input className="input mt-2 w-full" type="number" min={1} placeholder="Số coin cược" value={amount} onChange={(e) => setAmount(e.target.value)} />
                {potential > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-ink-500">Tiền thắng dự kiến</span>
                    <b className="text-emerald-600">{potential.toLocaleString()}</b>
                  </div>
                )}
                <button onClick={submit} disabled={busy} className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-1 disabled:opacity-50"><Wallet size={15} /> {busy ? 'Đang đặt…' : 'Đặt cược xiên'}</button>
              </>
            )}
            {msg && <p className="mt-2 text-sm text-emerald-600">{msg}</p>}
            {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
