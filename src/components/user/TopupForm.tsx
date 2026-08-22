'use client';

import { useActionState } from 'react';
import { Plus, QrCode, Copy } from 'lucide-react';
import { createTopup, type TopupState } from '@/app/(site)/user/balance/actions';
import { fmtVnd } from '@/lib/utils';
import { ActionForm } from '@/components/ActionForm';

const PRESETS = [20000, 50000, 100000, 200000, 500000];

export function TopupForm() {
  const [state, action, pending] = useActionState<TopupState, FormData>(createTopup, {});

  if (state.ok && state.code) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-3 flex items-center justify-center gap-1.5 font-bold text-brand-600"><QrCode size={18} /> Quét mã để chuyển khoản</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={state.qrUrl} alt="QR nạp tiền" className="mx-auto h-56 w-56 rounded-xl border border-ink-200 object-contain dark:border-ink-700" />
        <div className="mx-auto mt-3 max-w-xs space-y-1 text-sm">
          <Row label="Ngân hàng" value={state.bank?.bank ?? ''} />
          <Row label="Số tài khoản" value={state.bank?.account ?? ''} copy />
          <Row label="Chủ tài khoản" value={state.bank?.holder ?? ''} />
          <Row label="Số tiền" value={fmtVnd(state.amount)} />
          <Row label="Nội dung CK" value={state.code} copy highlight />
        </div>
        <p className="mx-auto mt-3 max-w-sm rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          Chuyển đúng <b>số tiền</b> và <b>nội dung</b> trên. Số dư sẽ tự động cộng sau khi hệ thống nhận được (thường trong 1–2 phút).
        </p>
      </div>
    );
  }

  return (
    <ActionForm action={action} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((v) => (
          <label key={v} className="cursor-pointer">
            <input type="radio" name="amount" value={v} className="peer sr-only" />
            <span className="chip border border-ink-200 bg-white px-3 py-1.5 text-ink-600 peer-checked:border-transparent peer-checked:bg-brand-500 peer-checked:text-white dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300">
              {fmtVnd(v)}
            </span>
          </label>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Hoặc nhập số tiền khác (₫)</span>
        <input name="amount" type="number" min={10000} step={1000} className="input max-w-xs" placeholder="Tối thiểu 10.000" />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60"><Plus size={16} /> {pending ? 'Đang tạo…' : 'Tạo mã nạp tiền'}</button>
    </ActionForm>
  );
}

function Row({ label, value, copy, highlight }: { label: string; value: string; copy?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-ink-400">{label}</span>
      <span className={`flex items-center gap-1 font-semibold ${highlight ? 'text-brand-600' : ''}`}>
        {value}
        {copy && <button type="button" onClick={() => navigator.clipboard?.writeText(value)} className="text-ink-400 hover:text-brand-600"><Copy size={13} /></button>}
      </span>
    </div>
  );
}
