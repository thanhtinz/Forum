'use client';

import { useState, useTransition } from 'react';
import { Crown, Save } from 'lucide-react';
import { updateVipPlan } from '@/app/admin/actions';
import { fmtVnd } from '@/lib/utils';

export interface VipPlanRow {
  id: string; tier: number; name: string; price: number; originalPrice: number | null;
  durationDays: number | null; discountPercent: number; freeContent: boolean; active: boolean;
}

export function VipPlanEditor({ plan }: { plan: VipPlanRow }) {
  const [price, setPrice] = useState(plan.price);
  const [originalPrice, setOriginalPrice] = useState(plan.originalPrice ?? 0);
  const [durationDays, setDurationDays] = useState(plan.durationDays ?? 0);
  const [discountPercent, setDiscountPercent] = useState(plan.discountPercent);
  const [freeContent, setFreeContent] = useState(plan.freeContent);
  const [active, setActive] = useState(plan.active);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const save = () => start(async () => {
    await updateVipPlan(plan.id, {
      price, originalPrice: originalPrice || null, durationDays: durationDays || null,
      discountPercent, freeContent, active,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  });

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40"><Crown size={16} /></span>
        <h3 className="font-bold">{plan.name} <span className="text-sm font-normal text-ink-400">(bậc {plan.tier})</span></h3>
        {!active && <span className="rounded-full bg-ink-200 px-2 py-0.5 text-xs text-ink-500 dark:bg-ink-800">Đang ẩn</span>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={`Giá (${fmtVnd(price)})`}>
          <input type="number" min={0} step={1000} value={price} onChange={(e) => setPrice(+e.target.value)} className="input" />
        </Field>
        <Field label="Giá gốc (gạch ngang)">
          <input type="number" min={0} step={1000} value={originalPrice} onChange={(e) => setOriginalPrice(+e.target.value)} className="input" />
        </Field>
        <Field label="Thời hạn (ngày, 0 = vĩnh viễn)">
          <input type="number" min={0} value={durationDays} onChange={(e) => setDurationDays(+e.target.value)} className="input" />
        </Field>
        <Field label="Giảm giá nội dung (%)">
          <input type="number" min={0} max={100} value={discountPercent} onChange={(e) => setDiscountPercent(+e.target.value)} className="input" />
        </Field>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input type="checkbox" checked={freeContent} onChange={(e) => setFreeContent(e.target.checked)} className="accent-brand-500" /> Miễn phí mọi nội dung
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-brand-500" /> Đang mở bán
        </label>
      </div>

      <button type="button" onClick={save} disabled={pending} className="btn-primary disabled:opacity-60">
        <Save size={16} /> {pending ? 'Đang lưu…' : saved ? 'Đã lưu ✓' : 'Lưu thay đổi'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium">{label}</span>{children}</label>;
}
