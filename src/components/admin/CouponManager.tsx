'use client';

import { useState, useTransition, useEffect } from 'react';
import { useActionState } from 'react';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, TicketPercent } from 'lucide-react';
import { saveCoupon, toggleCoupon, deleteCoupon, type CouponState } from '@/app/admin/actions';
import { ActionForm } from '@/components/ActionForm';

export interface CouponRow {
  id: string; code: string; name: string;
  type: 'FIXED' | 'PERCENT'; value: number;
  minAmount: number | null; maxDiscount: number | null;
  totalQuantity: number | null; usedCount: number; perUserLimit: number;
  startsAt: string | null; endsAt: string | null; active: boolean;
  claimCount: number;
}

export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const [creating, setCreating] = useState(false);
  const close = () => { setCreating(false); setEditing(null); };

  return (
    <div className="space-y-4">
      {!creating && !editing && (
        <button type="button" onClick={() => setCreating(true)} className="btn-primary"><Plus size={16} /> Tạo mã giảm giá</button>
      )}

      {(creating || editing) && <CouponForm key={editing?.id ?? 'new'} initial={editing} onDone={close} />}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {coupons.length === 0 && <div className="p-8 text-center text-sm text-ink-500">Chưa có mã giảm giá nào.</div>}
        {coupons.map((c) => <CouponRowView key={c.id} coupon={c} onEdit={() => { setEditing(c); setCreating(false); }} />)}
      </div>
    </div>
  );
}

function CouponRowView({ coupon: c, onEdit }: { coupon: CouponRow; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const used = c.claimCount > 0;
  const value = c.type === 'PERCENT' ? `-${c.value}%` : `-${c.value} điểm`;
  const quota = c.totalQuantity != null ? `${c.usedCount}/${c.totalQuantity} lượt` : `${c.usedCount} lượt`;
  const period = [
    c.startsAt ? `từ ${fmtShort(c.startsAt)}` : null,
    c.endsAt ? `đến ${fmtShort(c.endsAt)}` : null,
  ].filter(Boolean).join(' ');

  return (
    <div className={`flex items-center gap-3 p-3 ${c.active ? '' : 'opacity-60'}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
        <TicketPercent size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-ink-100 px-1.5 py-0.5 text-sm font-bold tracking-wide dark:bg-ink-800">{c.code}</code>
          <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50">{value}</span>
          <span className="truncate text-sm text-ink-600 dark:text-ink-300">{c.name}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-400">
          {quota} · tối đa {c.perUserLimit}/người
          {c.minAmount ? ` · từ ${c.minAmount} điểm` : ''}
          {c.maxDiscount ? ` · giảm tối đa ${c.maxDiscount} điểm` : ''}
          {period ? ` · ${period}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <button type="button" disabled={pending} onClick={() => start(() => toggleCoupon(c.id))} title={c.active ? 'Ngừng áp dụng' : 'Bật lại'}
          className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 disabled:opacity-50 dark:border-ink-700 dark:hover:bg-ink-800">
          {c.active ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button type="button" onClick={onEdit} title="Sửa"
          className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"><Pencil size={14} /></button>
        <button type="button" disabled={pending || used} title={used ? 'Đã có người dùng — chỉ có thể ngừng áp dụng' : 'Xoá'}
          onClick={() => { if (confirm(`Xoá mã ${c.code}?`)) start(() => deleteCoupon(c.id)); }}
          className="grid size-8 place-items-center rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:border-rose-800 dark:hover:bg-rose-950"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function CouponForm({ initial, onDone }: { initial: CouponRow | null; onDone: () => void }) {
  const [state, action, pending] = useActionState<CouponState, FormData>(saveCoupon, {});
  const [type, setType] = useState<'FIXED' | 'PERCENT'>(initial?.type ?? 'FIXED');
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  return (
    <ActionForm action={action} className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{initial ? `Sửa mã ${initial.code}` : 'Tạo mã giảm giá'}</h3>
        <button type="button" onClick={onDone} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
      </div>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block"><span className="mb-1 block text-sm font-medium">Mã</span>
          <input name="code" required defaultValue={initial?.code} className="input uppercase" placeholder="TET2026" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Tên chương trình</span>
          <input name="name" required defaultValue={initial?.name} className="input" placeholder="Khuyến mãi Tết" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Kiểu giảm</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as 'FIXED' | 'PERCENT')} className="input">
            <option value="FIXED">Số điểm cố định</option>
            <option value="PERCENT">Phần trăm (%)</option>
          </select></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">{type === 'PERCENT' ? 'Giảm (%)' : 'Giảm (điểm)'}</span>
          <input name="value" type="number" min={1} required defaultValue={initial?.value} className="input" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Giảm tối đa (điểm)</span>
          <input name="maxDiscount" type="number" min={0} defaultValue={initial?.maxDiscount ?? ''} className="input" placeholder="Không giới hạn" /></label>

        <label className="block"><span className="mb-1 block text-sm font-medium">Giá tối thiểu (điểm)</span>
          <input name="minAmount" type="number" min={0} defaultValue={initial?.minAmount ?? ''} className="input" placeholder="Không yêu cầu" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Tổng lượt phát hành</span>
          <input name="totalQuantity" type="number" min={1} defaultValue={initial?.totalQuantity ?? ''} className="input" placeholder="Không giới hạn" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Lượt tối đa / người</span>
          <input name="perUserLimit" type="number" min={1} defaultValue={initial?.perUserLimit ?? 1} className="input" /></label>

        <label className="block"><span className="mb-1 block text-sm font-medium">Bắt đầu</span>
          <input name="startsAt" type="datetime-local" defaultValue={toLocalInput(initial?.startsAt)} className="input" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Kết thúc</span>
          <input name="endsAt" type="datetime-local" defaultValue={toLocalInput(initial?.endsAt)} className="input" /></label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={initial ? initial.active : true} className="size-4 rounded" /> Đang áp dụng
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" onClick={onDone} className="btn-ghost">Huỷ</button>
      </div>
    </ActionForm>
  );
}

/** ISO → giá trị cho input datetime-local (yyyy-MM-ddTHH:mm). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtShort(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
