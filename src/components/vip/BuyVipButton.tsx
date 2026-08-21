'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Crown, Check, TicketPercent, X } from 'lucide-react';
import { buyVip, previewVipCoupon, type CouponPreview } from '@/app/(site)/vip/actions';

export function BuyVipButton({ planId, loggedIn, isCurrent }: { planId: string; loggedIn: boolean; isCurrent?: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  // Mã giảm giá
  const [showCoupon, setShowCoupon] = useState(false);
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<CouponPreview | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();

  if (!loggedIn) {
    return <Link href="/login?callbackUrl=/vip" className="btn-primary w-full justify-center py-2.5">Đăng nhập để mua</Link>;
  }

  const onApply = () => startCheck(async () => {
    setCouponMsg(null);
    const r = await previewVipCoupon(planId, code);
    if (r.error) { setApplied(null); return setCouponMsg(r.error); }
    setApplied(r);
  });

  const onRemove = () => { setApplied(null); setCode(''); setCouponMsg(null); };

  const onClick = () => start(async () => {
    setMsg(null);
    const r = await buyVip(planId, applied?.code);
    if (r.error) return setMsg(r.error);
    setOk(true);
    setMsg('Kích hoạt VIP thành công! 🎉');
  });

  return (
    <div>
      {!ok && (
        applied ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs dark:bg-emerald-950/40">
            <TicketPercent size={14} className="shrink-0 text-emerald-600" />
            <span className="min-w-0 flex-1 truncate font-medium text-emerald-700 dark:text-emerald-300">{applied.label}</span>
            <button type="button" onClick={onRemove} aria-label="Bỏ mã" className="shrink-0 text-emerald-600 hover:text-emerald-800"><X size={14} /></button>
          </div>
        ) : showCoupon ? (
          <div className="mb-2 flex gap-1.5">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="NHẬP MÃ"
              className="input !py-1.5 text-xs uppercase" />
            <button type="button" onClick={onApply} disabled={checking || !code.trim()}
              className="btn-outline shrink-0 !px-3 !py-1.5 text-xs disabled:opacity-50">
              {checking ? '…' : 'Áp dụng'}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowCoupon(true)}
            className="mb-2 flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
            <TicketPercent size={13} /> Tôi có mã giảm giá
          </button>
        )
      )}

      {couponMsg && <p className="mb-2 text-center text-xs text-red-600">{couponMsg}</p>}

      <button type="button" onClick={onClick} disabled={pending || ok}
        className="btn w-full justify-center bg-amber-500 py-2.5 text-white hover:bg-amber-600 disabled:opacity-60">
        {ok ? <><Check size={16} /> Đã kích hoạt</> : <><Crown size={16} /> {pending ? 'Đang xử lý…' : isCurrent ? 'Gia hạn' : 'Mua ngay'}</>}
      </button>

      {applied && !ok && (
        <p className="mt-1.5 text-center text-xs text-ink-500">
          Thanh toán: <b className="text-ink-800 dark:text-ink-100">{(applied.finalAmount ?? 0).toLocaleString('vi-VN')}₫</b>
        </p>
      )}
      {msg && <p className={`mt-2 text-center text-xs font-medium ${ok ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
    </div>
  );
}
