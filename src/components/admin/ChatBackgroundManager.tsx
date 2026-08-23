'use client';

import { useState, useEffect, useTransition, useActionState } from 'react';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Moon } from 'lucide-react';
import { saveChatBackground, deleteChatBackground, toggleChatBackground, type ChatAssetState } from '@/app/admin/actions';
import { ActionForm } from '@/components/ActionForm';
import { ImageField } from '@/components/ImageField';
import { cn } from '@/lib/utils';

export interface ChatBgRow {
  id: string; name: string; image: string; dark: boolean; active: boolean; order: number;
}

export function ChatBackgroundManager({ rows }: { rows: ChatBgRow[] }) {
  const [editing, setEditing] = useState<ChatBgRow | null>(null);
  const [creating, setCreating] = useState(false);
  const nextOrder = rows.length ? Math.max(...rows.map((r) => r.order)) + 1 : 0;

  return (
    <div className="space-y-4">
      {!creating && !editing && (
        <button type="button" onClick={() => setCreating(true)} className="btn-primary">
          <Plus size={16} /> Thêm ảnh nền
        </button>
      )}

      {(creating || editing) && (
        <BgForm key={editing?.id ?? 'new'} initial={editing} nextOrder={nextOrder}
          onDone={() => { setCreating(false); setEditing(null); }} />
      )}

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">
          Chưa có ảnh nền nào. Thành viên chỉ thấy các nền màu có sẵn.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((r) => <BgCard key={r.id} row={r} onEdit={() => { setEditing(r); setCreating(false); }} />)}
        </div>
      )}
    </div>
  );
}

function BgCard({ row, onEdit }: { row: ChatBgRow; onEdit: () => void }) {
  const [pending, start] = useTransition();

  return (
    <div className={cn('card overflow-hidden', !row.active && 'opacity-60')}>
      <div className="relative aspect-[4/3] bg-ink-100 dark:bg-ink-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={row.image} alt={row.name} className="size-full object-cover" />
        {row.dark && (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            <Moon size={10} /> Nền tối
          </span>
        )}
        {!row.active && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-ink-900/70 px-2 py-0.5 text-[10px] font-medium text-white">Đang ẩn</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 p-2.5">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900 dark:text-white">{row.name}</span>
        <button type="button" disabled={pending} title={row.active ? 'Ẩn' : 'Hiện'}
          onClick={() => start(() => toggleChatBackground(row.id))}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 disabled:opacity-50 dark:border-ink-700 dark:hover:bg-ink-800">
          {row.active ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button type="button" onClick={onEdit} title="Sửa"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800">
          <Pencil size={14} />
        </button>
        <button type="button" disabled={pending} title="Xoá"
          onClick={() => { if (confirm(`Xoá ảnh nền “${row.name}”? Đoạn chat đang dùng sẽ quay về nền mặc định.`)) start(() => deleteChatBackground(row.id)); }}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:hover:bg-rose-950">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function BgForm({ initial, nextOrder, onDone }: { initial: ChatBgRow | null; nextOrder: number; onDone: () => void }) {
  const [state, action, pending] = useActionState<ChatAssetState, FormData>(saveChatBackground, {});
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  return (
    <ActionForm action={action} className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink-900 dark:text-white">{initial ? 'Sửa ảnh nền' : 'Ảnh nền mới'}</h2>
        <button type="button" onClick={onDone} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
      </div>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tên hiển thị</span>
          <input name="name" defaultValue={initial?.name} className="input" placeholder="Ví dụ: Biển hoàng hôn" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Thứ tự</span>
          <input name="order" type="number" defaultValue={initial?.order ?? nextOrder} className="input" />
        </label>
        <ImageField name="image" label="Ảnh nền" className="sm:col-span-2" defaultValue={initial?.image}
          hint="Ảnh sẽ được phủ kín khung chat. Nên dùng ảnh ngang, tối thiểu 1200px." />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="dark" defaultChecked={initial?.dark} className="accent-brand-500" />
        Ảnh tối màu
      </label>
      <p className="text-xs text-ink-400">
        Đánh dấu ảnh tối để vạch chia ngày và chữ phụ trong khung chat sáng lên, không thì sẽ chìm vào nền.
      </p>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" onClick={onDone} className="btn-ghost">Huỷ</button>
      </div>
    </ActionForm>
  );
}
