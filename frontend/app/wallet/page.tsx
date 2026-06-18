'use client';

import { useEffect, useState } from 'react';
import { Gem, QrCode } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export default function WalletPage() {
  const { user, loading } = useAuth();
  const [packages, setPackages] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [topup, setTopup] = useState<any>(null);
  const [msg, setMsg] = useState('');

  function load() {
    api.get<any[]>('/gem/packages').then(setPackages).catch(() => {});
    api.get<{ data: any[] }>('/gem/transactions').then((r) => setTx(r.data || [])).catch(() => {});
  }
  useEffect(() => { if (!loading && user) load(); }, [user, loading]);

  async function sepay(pkgId: string) {
    setMsg('');
    try { setTopup(await api.post('/payments/sepay/topup', { packageId: pkgId })); } catch (e: any) { setMsg(e.message); }
  }
  async function paypal(pkgId: string) {
    setMsg('');
    try { const o = await api.post<any>('/payments/paypal/order', { packageId: pkgId }); if (o.approveUrl || o.links) { window.open(o.approveUrl || o.links?.find((l: any) => l.rel === 'approve')?.href, '_blank'); } else setMsg('Đã tạo đơn PayPal'); }
    catch (e: any) { setMsg(e.message); }
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để xem ví.</div>;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-600 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Gem /> Nạp Gem</h1>
      </header>

      {topup && (
        <div className="card p-5 text-center">
          <h2 className="mb-2 flex items-center justify-center gap-2 font-semibold"><QrCode size={18} /> Quét mã thanh toán</h2>
          {topup.qrCode && /* eslint-disable-next-line @next/next/no-img-element */ <img src={topup.qrCode} alt="QR" className="mx-auto h-56 w-56 rounded-lg border border-ink-200/70 dark:border-ink-800" />}
          <p className="mt-2 text-sm">Số tiền: <b>{topup.amountVnd?.toLocaleString()}đ</b></p>
          {topup.ref && <p className="text-xs text-ink-500">Nội dung CK: <code>{topup.ref}</code></p>}
          <p className="mt-1 text-xs text-ink-400">Gem sẽ cộng tự động sau khi chuyển khoản thành công.</p>
          <button onClick={() => { setTopup(null); load(); }} className="btn-outline mt-3">Đã chuyển / Đóng</button>
        </div>
      )}

      <section>
        <h2 className="mb-3 font-semibold">Gói nạp Gem</h2>
        {msg && <p className="mb-2 text-sm text-red-500">{msg}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <div key={p.id} className="card p-4 text-center">
              <div className="inline-flex items-center justify-center gap-1.5 text-2xl font-bold text-fuchsia-600">{(p.gemAmount ?? 0).toLocaleString()} <Gem size={22} /></div>
              {p.bonus ? <div className="text-xs text-emerald-600">+{p.bonus} thưởng</div> : null}
              <div className="text-sm font-medium">{p.name}</div>
              <div className="mt-1 text-sm text-ink-500">{(p.priceVnd ?? 0).toLocaleString()}đ</div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => sepay(p.id)} className="btn-primary flex-1 !py-1.5 text-xs">SePay QR</button>
                <button onClick={() => paypal(p.id)} className="btn-outline flex-1 !py-1.5 text-xs">PayPal</button>
              </div>
            </div>
          ))}
          {packages.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có gói nạp.</p>}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Lịch sử giao dịch Gem</h2>
        <div className="divide-y divide-ink-100 text-sm dark:divide-ink-800">
          {tx.map((t) => (
            <div key={t.id} className="flex justify-between py-2">
              <span>{t.note || t.type} · <span className="text-ink-400">{new Date(t.createdAt).toLocaleDateString('vi')}</span></span>
              <span className={t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}>{t.amount >= 0 ? '+' : ''}{t.amount}</span>
            </div>
          ))}
          {tx.length === 0 && <p className="py-3 text-ink-500">Chưa có giao dịch.</p>}
        </div>
      </section>
    </div>
  );
}
