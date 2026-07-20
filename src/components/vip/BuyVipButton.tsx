'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Crown, Check } from 'lucide-react';
import { buyVip } from '@/app/(site)/vip/actions';

export function BuyVipButton({ planId, loggedIn, isCurrent }: { planId: string; loggedIn: boolean; isCurrent?: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  if (!loggedIn) {
    return <Link href="/login?callbackUrl=/vip" className="btn-primary w-full justify-center py-2.5">Đăng nhập để mua</Link>;
  }

  const onClick = () => start(async () => {
    setMsg(null);
    const r = await buyVip(planId);
    if (r.error) return setMsg(r.error);
    setOk(true);
    setMsg('Kích hoạt VIP thành công! 🎉');
  });

  return (
    <div>
      <button type="button" onClick={onClick} disabled={pending || ok}
        className="btn w-full justify-center bg-amber-500 py-2.5 text-white hover:bg-amber-600 disabled:opacity-60">
        {ok ? <><Check size={16} /> Đã kích hoạt</> : <><Crown size={16} /> {pending ? 'Đang xử lý…' : isCurrent ? 'Gia hạn' : 'Mua ngay'}</>}
      </button>
      {msg && <p className={`mt-2 text-center text-xs font-medium ${ok ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
    </div>
  );
}
