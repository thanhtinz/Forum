'use client';

import { useEffect, useState } from 'react';
import { Gem, QrCode, Wallet, Coins, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

type HistTab = 'gem' | 'coin';

export default function WalletPage() {
  const { user, loading } = useAuth();
  const [packages, setPackages] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [gemTx, setGemTx] = useState<any[]>([]);
  const [coinTx, setCoinTx] = useState<any[]>([]);
  const [gemBal, setGemBal] = useState(0);
  const [coinBal, setCoinBal] = useState(0);
  const [topup, setTopup] = useState<any>(null);
  const [tab, setTab] = useState<HistTab>('gem');
  const [msg, setMsg] = useState('');

  function load() {
    api.get<any[]>('/gem/packages').then((p) => { setPackages(p); if (p[0]) setSelected((s) => s || p[0].id); }).catch(() => {});
    api.get<{ data: any[] }>('/gem/transactions').then((r) => setGemTx(r.data || [])).catch(() => {});
    api.get<{ data: any[] }>('/game/coin/transactions').then((r) => setCoinTx(r.data || [])).catch(() => {});
    api.get<{ balance: number }>('/gem/balance').then((r) => setGemBal(r.balance ?? 0)).catch(() => {});
    api.get<{ coinBalance?: number }>('/game/character').then((r) => setCoinBal(r.coinBalance ?? 0)).catch(() => {});
  }
  useEffect(() => { if (!loading && user) load(); /* eslint-disable-next-line */ }, [user, loading]);

  async function sepay() {
    if (!selected) return; setMsg('');
    try { setTopup(await api.post('/payments/sepay/topup', { packageId: selected })); } catch (e: any) { setMsg(e.message); }
  }
  async function paypal() {
    if (!selected) return; setMsg('');
    try { const o = await api.post<any>('/payments/paypal/order', { packageId: selected }); if (o.approveUrl || o.links) { window.open(o.approveUrl || o.links?.find((l: any) => l.rel === 'approve')?.href, '_blank'); } else setMsg('Đã tạo đơn PayPal'); }
    catch (e: any) { setMsg(e.message); }
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để xem ví.</div>;

  const sel = packages.find((p) => p.id === selected);
  const tx = tab === 'gem' ? gemTx : coinTx;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-5 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Wallet /> Ví của tôi</h1>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/15 p-3">
            <div className="flex items-center gap-1.5 text-xs text-white/80"><Coins size={14} /> Xu (coin)</div>
            <div className="mt-0.5 text-2xl font-bold tabular-nums">{coinBal.toLocaleString()}</div>
          </div>
          <div className="rounded-xl bg-white/15 p-3">
            <div className="flex items-center gap-1.5 text-xs text-white/80"><Gem size={14} /> Gem</div>
            <div className="mt-0.5 text-2xl font-bold tabular-nums">{gemBal.toLocaleString()}</div>
          </div>
        </div>
      </header>

      {/* Nạp Gem */}
      <section className="card p-4">
        <h2 className="mb-3 flex items-center gap-1.5 font-semibold"><Gem size={18} className="text-brand-600" /> Nạp Gem</h2>
        {msg && <p className="mb-2 text-sm text-rose-500">{msg}</p>}

        {/* Lưới gói nạp — chọn 1 gói */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {packages.map((p) => {
            const on = p.id === selected;
            return (
              <button key={p.id} onClick={() => { setSelected(p.id); setTopup(null); }}
                className={`relative rounded-xl border p-3 text-center transition ${on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-400 dark:bg-brand-950/30' : 'border-ink-200/70 hover:border-brand-300 dark:border-ink-700'}`}>
                {on && <Check size={14} className="absolute right-1.5 top-1.5 text-brand-600" />}
                <div className="flex items-center justify-center gap-1 text-lg font-bold text-brand-600">{(p.gemAmount ?? 0).toLocaleString()} <Gem size={15} /></div>
                {p.bonus ? <div className="text-[11px] text-emerald-600">+{p.bonus} thưởng</div> : null}
                <div className="mt-0.5 truncate text-[11px] text-ink-500">{p.name}</div>
                <div className="text-sm font-semibold">{(p.priceVnd ?? 0).toLocaleString()}đ</div>
              </button>
            );
          })}
          {packages.length === 0 && <p className="col-span-full py-3 text-center text-sm text-ink-400">Chưa có gói nạp.</p>}
        </div>

        {/* Chọn phương thức nạp cho gói đã chọn */}
        {sel && (
          <div className="mt-4 rounded-xl border border-ink-200/70 p-3 dark:border-ink-700">
            <p className="mb-2 text-sm">Gói đã chọn: <b>{(sel.gemAmount ?? 0).toLocaleString()} Gem</b>{sel.bonus ? ` +${sel.bonus}` : ''} · <b>{(sel.priceVnd ?? 0).toLocaleString()}đ</b></p>
            <p className="mb-2 text-xs font-medium text-ink-500">Chọn phương thức nạp:</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={sepay} className="btn-primary flex items-center gap-1.5"><QrCode size={15} /> SePay (QR ngân hàng)</button>
              <button onClick={paypal} className="btn-outline">PayPal</button>
            </div>
          </div>
        )}

        {/* QR thanh toán */}
        {topup && (
          <div className="mt-4 rounded-xl border border-ink-200/70 p-4 text-center dark:border-ink-700">
            <h3 className="mb-2 flex items-center justify-center gap-2 font-semibold"><QrCode size={18} /> Quét mã thanh toán</h3>
            {topup.qrCode && /* eslint-disable-next-line @next/next/no-img-element */ <img src={topup.qrCode} alt="QR" className="mx-auto h-56 w-56 rounded-lg border border-ink-200/70 dark:border-ink-800" />}
            <p className="mt-2 text-sm">Số tiền: <b>{topup.amountVnd?.toLocaleString()}đ</b></p>
            {topup.ref && <p className="text-xs text-ink-500">Nội dung CK: <code>{topup.ref}</code></p>}
            <p className="mt-1 text-xs text-ink-400">Gem sẽ cộng tự động sau khi chuyển khoản thành công.</p>
            <button onClick={() => { setTopup(null); load(); }} className="btn-outline mt-3">Đã chuyển / Đóng</button>
          </div>
        )}
      </section>

      {/* Lịch sử giao dịch — tab Gem / Xu */}
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Lịch sử giao dịch</h2>
          <div className="flex gap-1 rounded-lg bg-ink-100 p-0.5 text-sm dark:bg-ink-800">
            <button onClick={() => setTab('gem')} className={`rounded-md px-3 py-1 font-medium ${tab === 'gem' ? 'bg-white shadow-sm dark:bg-ink-700' : 'text-ink-500'}`}>Gem</button>
            <button onClick={() => setTab('coin')} className={`rounded-md px-3 py-1 font-medium ${tab === 'coin' ? 'bg-white shadow-sm dark:bg-ink-700' : 'text-ink-500'}`}>Xu</button>
          </div>
        </div>
        <div className="divide-y divide-ink-100 text-sm dark:divide-ink-800">
          {tx.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 truncate">{t.note || t.type} <span className="text-ink-400">· {new Date(t.createdAt).toLocaleString('vi')}</span></span>
              <span className={`shrink-0 font-semibold ${t.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()} {tab === 'gem' ? 'Gem' : 'Xu'}</span>
            </div>
          ))}
          {tx.length === 0 && <p className="py-3 text-ink-500">Chưa có giao dịch {tab === 'gem' ? 'Gem' : 'Xu'}.</p>}
        </div>
      </section>
    </div>
  );
}
