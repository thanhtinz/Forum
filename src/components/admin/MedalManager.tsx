'use client';

import { useState, useEffect, useTransition, useActionState } from 'react';
import { Plus, Pencil, Trash2, X, Users } from 'lucide-react';
import { saveMedal, deleteMedal, type MedalState } from '@/app/admin/actions';
import { MEDAL_CONDITIONS } from '@/lib/medals';
import { cn } from '@/lib/utils';
import { ActionForm } from '@/components/ActionForm';
import { IconField } from '@/components/admin/IconField';
import { IconGlyph } from '@/components/IconGlyph';

export interface MedalRow {
  id: string; slug: string; name: string; description: string | null;
  icon: string; color: string | null; rarity: number;
  autoGrant: boolean; conditionType: string | null; conditionValue: number | null;
  ownerCount: number;
}

const RARITY_LABEL = ['', 'Thường', 'Hiếm', 'Quý', 'Sử thi', 'Huyền thoại'];

export function MedalManager({ medals }: { medals: MedalRow[] }) {
  const [editing, setEditing] = useState<MedalRow | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      {!creating && !editing && (
        <button type="button" onClick={() => setCreating(true)} className="btn-primary"><Plus size={16} /> Thêm huy chương</button>
      )}

      {(creating || editing) && (
        <MedalForm key={editing?.id ?? 'new'} initial={editing} onDone={() => { setCreating(false); setEditing(null); }} />
      )}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {medals.length === 0 && <div className="p-8 text-center text-sm text-ink-500">Chưa có huy chương nào.</div>}
        {medals.map((m) => (
          <MedalRowView key={m.id} medal={m} onEdit={() => { setEditing(m); setCreating(false); }} />
        ))}
      </div>
    </div>
  );
}

function MedalRowView({ medal, onEdit }: { medal: MedalRow; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const cond = MEDAL_CONDITIONS.find((c) => c.value === (medal.conditionType ?? ''));

  return (
    <div className="p-3 sm:flex sm:items-center sm:gap-3">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl text-lg"
        style={{ backgroundColor: (medal.color ?? '#e5e7eb') + '33', color: medal.color ?? '#6b7280' }}>
        <IconGlyph icon={medal.icon} className="size-full" />
      </span>
      <div className="mt-2 min-w-0 sm:mt-0 sm:flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-ink-900 dark:text-white">{medal.name}</span>
          <span className="chip bg-ink-100 !py-0 text-[11px] text-ink-500 dark:bg-ink-800 dark:text-ink-300">
            {RARITY_LABEL[medal.rarity] ?? `Bậc ${medal.rarity}`}
          </span>
          {medal.autoGrant
            ? <span className="chip bg-emerald-100 !py-0 text-[11px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Tự động</span>
            : <span className="chip bg-ink-100 !py-0 text-[11px] text-ink-500 dark:bg-ink-800 dark:text-ink-300">Trao tay</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
          {medal.autoGrant && cond && <span>{cond.label} ≥ {medal.conditionValue}</span>}
          {medal.autoGrant && cond && <span>·</span>}
          <span className="inline-flex items-center gap-1"><Users size={12} /> {medal.ownerCount} người có</span>
        </div>
        {medal.description && <p className="mt-0.5 line-clamp-1 text-xs text-ink-400">{medal.description}</p>}
      </div>

      <div className="mt-2 flex items-center gap-1.5 sm:mt-0 sm:shrink-0">
        <button type="button" onClick={onEdit} title="Sửa"
          className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"><Pencil size={14} /></button>
        <button type="button" disabled={pending || medal.ownerCount > 0}
          title={medal.ownerCount > 0 ? 'Đã có người nhận nên không xoá được' : 'Xoá'}
          onClick={() => { if (confirm(`Xoá huy chương “${medal.name}”?`)) start(() => deleteMedal(medal.id)); }}
          className="grid size-8 place-items-center rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-800 dark:hover:bg-rose-950"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function MedalForm({ initial, onDone }: { initial: MedalRow | null; onDone: () => void }) {
  const [state, action, pending] = useActionState<MedalState, FormData>(saveMedal, {});
  const [cond, setCond] = useState(initial?.conditionType ?? '');
  const [color, setColor] = useState(initial?.color ?? '#f59e0b');
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  return (
    <ActionForm action={action} className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink-900 dark:text-white">{initial ? 'Sửa huy chương' : 'Huy chương mới'}</h2>
        <button type="button" onClick={onDone} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
      </div>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Tên huy chương</span>
          <input name="name" defaultValue={initial?.name} className="input" placeholder="Ví dụ: Chăm chỉ" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Màu</span>
          <input name="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="input !h-10 !p-1" />
        </label>
        <IconField className="sm:col-span-2" defaultValue={initial?.icon} color={color}
          fallback="🏅" placeholder="🏅 hoặc dán link ảnh" />
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Độ hiếm</span>
          <select name="rarity" defaultValue={String(initial?.rarity ?? 1)} className="input">
            {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Cách trao</span>
          <select name="conditionType" value={cond} onChange={(e) => setCond(e.target.value)} className="input">
            {MEDAL_CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        {/* Chỉ hỏi mốc khi có điều kiện — trao tay thì không cần */}
        <label className={cn('block sm:col-span-2', !cond && 'hidden')}>
          <span className="mb-1 block text-sm font-medium">Mốc đạt được</span>
          <input name="conditionValue" type="number" min={1} defaultValue={initial?.conditionValue ?? ''} className="input" placeholder="Ví dụ: 10" />
          <span className="mt-1 block text-xs text-ink-400">Đạt tới mốc này là hệ thống tự trao huy chương.</span>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Mô tả</span>
          <textarea name="description" defaultValue={initial?.description ?? ''} rows={2} className="input" placeholder="Hiện khi người dùng xem huy chương." />
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" onClick={onDone} className="btn-ghost">Huỷ</button>
      </div>
    </ActionForm>
  );
}
