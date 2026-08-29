'use client';

import { useState, useEffect, useTransition, useActionState } from 'react';
import { Plus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { saveChatBubbleStyle, deleteChatBubbleStyle, toggleChatBubbleStyle, type ChatAssetState } from '@/app/admin/actions';
import { ActionForm } from '@/components/ActionForm';
import { ImageField } from '@/components/ImageField';
import { cn } from '@/lib/utils';

export interface ChatBubbleRow {
  id: string; name: string; decor: string | null;
  colorMine: string; colorTheirs: string; darkText: boolean;
  active: boolean; order: number;
}

export function ChatBubbleManager({ rows }: { rows: ChatBubbleRow[] }) {
  const [editing, setEditing] = useState<ChatBubbleRow | null>(null);
  const [creating, setCreating] = useState(false);
  const nextOrder = rows.length ? Math.max(...rows.map((r) => r.order)) + 1 : 0;

  return (
    <div className="space-y-4">
      {!creating && !editing && (
        <button type="button" onClick={() => setCreating(true)} className="btn-primary">
          <Plus size={16} /> Thêm kiểu bong bóng
        </button>
      )}

      {(creating || editing) && (
        <BubbleForm key={editing?.id ?? 'new'} initial={editing} nextOrder={nextOrder}
          onDone={() => { setCreating(false); setEditing(null); }} />
      )}

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">
          Chưa có kiểu nào. Thành viên chỉ thấy các bong bóng màu có sẵn.
        </div>
      ) : (
        <div className="card divide-y divide-ink-100 dark:divide-ink-800">
          {rows.map((r) => <BubbleRowView key={r.id} row={r} onEdit={() => { setEditing(r); setCreating(false); }} />)}
        </div>
      )}
    </div>
  );
}

/** Xem trước đúng như khi chat: ảnh trang trí nằm trên bong bóng. */
function Preview({ row }: { row: ChatBubbleRow }) {
  return (
    <span className="relative block h-11 w-28 shrink-0">
      {row.decor && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.decor} alt="" className="absolute right-4 top-0 h-6 w-auto" />
      )}
      <span className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center gap-1 rounded-2xl text-[10px]"
        style={{ backgroundColor: row.colorMine, color: row.darkText ? '#0f172a' : '#fff' }}>
        Xin chào
      </span>
    </span>
  );
}

function BubbleRowView({ row, onEdit }: { row: ChatBubbleRow; onEdit: () => void }) {
  const [pending, start] = useTransition();

  return (
    <div className={cn('flex flex-wrap items-center gap-3 p-3', !row.active && 'opacity-60')}>
      <Preview row={row} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-ink-900 dark:text-white">{row.name}</span>
          {!row.active && <span className="chip bg-ink-200 !py-0 text-[11px] text-ink-600 dark:bg-ink-800">Đang ẩn</span>}
        </div>
        <p className="mt-0.5 text-xs text-ink-400">
          {row.decor ? 'Có ảnh trang trí' : 'Chỉ đổi màu'} · chữ {row.darkText ? 'đậm' : 'trắng'} · thứ tự {row.order}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button type="button" disabled={pending} title={row.active ? 'Ẩn' : 'Hiện'}
          onClick={() => start(() => toggleChatBubbleStyle(row.id))}
          className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 disabled:opacity-50 dark:border-ink-700 dark:hover:bg-ink-800">
          {row.active ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button type="button" onClick={onEdit} title="Sửa" aria-label={`Sửa kiểu bong bóng ${row.name}`}
          className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800">
          <Pencil size={14} />
        </button>
        <button type="button" disabled={pending} title="Xoá" aria-label={`Xoá kiểu bong bóng ${row.name}`}
          onClick={() => { if (confirm(`Xoá kiểu “${row.name}”? Đoạn chat đang dùng sẽ quay về bong bóng mặc định.`)) start(() => deleteChatBubbleStyle(row.id)); }}
          className="grid size-8 place-items-center rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:hover:bg-rose-950">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function BubbleForm({ initial, nextOrder, onDone }: { initial: ChatBubbleRow | null; nextOrder: number; onDone: () => void }) {
  const [state, action, pending] = useActionState<ChatAssetState, FormData>(saveChatBubbleStyle, {});
  const [mine, setMine] = useState(initial?.colorMine ?? '#f9a8d4');
  const [theirs, setTheirs] = useState(initial?.colorTheirs ?? '#fce7f3');
  const [decor, setDecor] = useState(initial?.decor ?? '');
  const [darkText, setDarkText] = useState(initial?.darkText ?? true);
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  return (
    <ActionForm action={action} className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink-900 dark:text-white">{initial ? 'Sửa kiểu bong bóng' : 'Kiểu bong bóng mới'}</h2>
        <button type="button" onClick={onDone} title="Đóng" aria-label="Đóng biểu mẫu"
            className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
      </div>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tên hiển thị</span>
          <input name="name" defaultValue={initial?.name} className="input" placeholder="Ví dụ: Mèo chibi" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Thứ tự</span>
          <input name="order" type="number" defaultValue={initial?.order ?? nextOrder} className="input" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Màu bong bóng của mình</span>
          <input name="colorMine" type="color" value={mine} onChange={(e) => setMine(e.target.value)} className="input !h-10 !p-1" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Màu bong bóng người kia</span>
          <input name="colorTheirs" type="color" value={theirs} onChange={(e) => setTheirs(e.target.value)} className="input !h-10 !p-1" />
        </label>

        <ImageField name="decor" label="Ảnh trang trí (tuỳ chọn)" className="sm:col-span-2"
          defaultValue={initial?.decor} shape="square" onChange={setDecor}
          hint="Ảnh nhỏ gắn phía trên bong bóng — tai chibi, nơ, sừng… Nên dùng PNG nền trong, cao khoảng 80–160px." />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="darkText" checked={darkText} onChange={(e) => setDarkText(e.target.checked)} className="accent-brand-500" />
        Chữ màu đậm (bỏ chọn nếu màu bong bóng tối)
      </label>

      {/* Xem trước ngay để chọn màu chữ cho khỏi bị chìm */}
      <div className="rounded-xl border border-dashed border-ink-300 p-4 dark:border-ink-700">
        <p className="mb-2 text-xs text-ink-400">Xem trước</p>
        <div className="flex items-end justify-between gap-3">
          <span className="relative inline-block">
            <span className="block rounded-2xl px-3.5 py-2 text-sm"
              style={{ backgroundColor: theirs, color: darkText ? '#0f172a' : '#fff' }}>
              Chào bạn nhé!
            </span>
          </span>
          <span className="relative inline-block">
            {decor && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={decor} alt="" className="absolute -top-5 right-3 h-7 w-auto" />
            )}
            <span className="block rounded-2xl px-3.5 py-2 text-sm"
              style={{ backgroundColor: mine, color: darkText ? '#0f172a' : '#fff' }}>
              Mình khoẻ, cảm ơn bạn
            </span>
          </span>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" onClick={onDone} className="btn-ghost">Huỷ</button>
      </div>
    </ActionForm>
  );
}
