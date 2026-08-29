'use client';

import { useState, useEffect, useTransition, useActionState } from 'react';
import { Plus, Pencil, Trash2, X, CornerDownRight, Link2, RotateCcw, AlertTriangle } from 'lucide-react';
import { saveNavLink, deleteNavLink, restoreDefaultNav, type NavState } from '@/app/admin/actions';
import { NAV_GROUPS, NAV_DEFAULTS } from '@/lib/nav';
import { ActionForm } from '@/components/ActionForm';
import { IconGlyph } from '@/components/IconGlyph';
import { IconField } from '@/components/admin/IconField';

export interface NavRow {
  id: string; label: string; url: string; icon: string | null;
  group: string; parentId: string | null; order: number;
}

export function NavManager({ links, group }: { links: NavRow[]; group: string }) {
  const [editing, setEditing] = useState<NavRow | null>(null);
  const [creating, setCreating] = useState(false);

  const [restoring, startRestore] = useTransition();

  const roots = links.filter((l) => !l.parentId);
  const childrenOf = (id: string) => links.filter((l) => l.parentId === id);
  const nextOrder = links.length ? Math.max(...links.map((l) => l.order)) + 1 : 0;

  // Mục mặc định chưa có trong danh sách — so theo đường dẫn.
  const have = new Set(links.map((l) => l.url));
  const missingDefaults = (NAV_DEFAULTS[group as 'header' | 'footer'] ?? [])
    .filter((d) => !have.has(d.url)).map((d) => d.label);

  return (
    <div className="space-y-4">
      {!creating && !editing && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setCreating(true)} className="btn-primary"><Plus size={16} /> Thêm mục menu</button>
          {missingDefaults.length > 0 && links.length > 0 && (
            <button type="button" disabled={restoring} onClick={() => startRestore(() => restoreDefaultNav(group))}
              className="btn-ghost disabled:opacity-60">
              <RotateCcw size={16} /> Thêm lại mục mặc định ({missingDefaults.join(', ')})
            </button>
          )}
        </div>
      )}

      {/* Chỉ cần một mục là menu mặc định ngừng được dùng — nói rõ để khỏi tưởng bị mất */}
      {links.length > 0 && missingDefaults.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Menu đang chạy theo danh sách dưới đây, không còn dùng menu mặc định nữa. Các mục{' '}
            <b>{missingDefaults.join(', ')}</b> hiện không hiển thị trên trang.
          </span>
        </p>
      )}

      {(creating || editing) && (
        <NavForm key={editing?.id ?? 'new'} initial={editing} group={group} roots={roots} nextOrder={nextOrder}
          onDone={() => { setCreating(false); setEditing(null); }} />
      )}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {roots.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-500">
            Chưa cấu hình mục nào — trang đang dùng menu mặc định. Thêm mục đầu tiên là menu mặc định sẽ được thay thế.
          </div>
        )}
        {roots.map((l) => (
          <div key={l.id}>
            <NavRowView row={l} onEdit={() => { setEditing(l); setCreating(false); }} />
            {childrenOf(l.id).map((c) => (
              <NavRowView key={c.id} row={c} child onEdit={() => { setEditing(c); setCreating(false); }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function NavRowView({ row, child, onEdit }: { row: NavRow; child?: boolean; onEdit: () => void }) {
  const [pending, start] = useTransition();

  return (
    <div className={`flex items-center gap-3 p-3 ${child ? 'pl-9' : ''}`}>
      {child && <CornerDownRight size={14} className="shrink-0 text-ink-300" />}
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-100 text-sm dark:bg-ink-800">
        <IconGlyph icon={row.icon} fallback={<Link2 size={14} className="text-ink-400" />} className="size-full" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink-900 dark:text-white">{row.label}</div>
        <div className="truncate text-xs text-ink-400">{row.url} · thứ tự {row.order}</div>
      </div>
      <button type="button" onClick={onEdit} title="Sửa" aria-label={`Sửa mục menu ${row.label}`}
        className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"><Pencil size={14} /></button>
      <button type="button" disabled={pending} title="Xoá" aria-label={`Xoá mục menu ${row.label}`}
        onClick={() => { if (confirm(`Xoá mục “${row.label}”? Mục con (nếu có) sẽ được đưa lên thành mục gốc.`)) start(() => deleteNavLink(row.id)); }}
        className="grid size-8 place-items-center rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:hover:bg-rose-950"><Trash2 size={14} /></button>
    </div>
  );
}

function NavForm({ initial, group, roots, nextOrder, onDone }: {
  initial: NavRow | null; group: string; roots: NavRow[]; nextOrder: number; onDone: () => void;
}) {
  const [state, action, pending] = useActionState<NavState, FormData>(saveNavLink, {});
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  // Mục đang có con thì không cho chọn cha (chỉ hỗ trợ một cấp).
  const parentOptions = roots.filter((r) => r.id !== initial?.id);

  return (
    <ActionForm action={action} className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink-900 dark:text-white">{initial ? 'Sửa mục menu' : 'Mục menu mới'}</h2>
        <button type="button" onClick={onDone} title="Đóng" aria-label="Đóng biểu mẫu"
            className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
      </div>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="group" value={group} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tên hiển thị</span>
          <input name="label" defaultValue={initial?.label} className="input" placeholder="Ví dụ: Diễn đàn" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Đường dẫn</span>
          <input name="url" defaultValue={initial?.url} className="input" placeholder="/shop hoặc https://…" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Nằm trong mục</span>
          <select name="parentId" defaultValue={initial?.parentId ?? ''} className="input">
            <option value="">— Mục gốc —</option>
            {parentOptions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Thứ tự</span>
          <input name="order" type="number" defaultValue={initial?.order ?? nextOrder} className="input" />
          <span className="mt-1 block text-xs text-ink-400">Số nhỏ đứng trước.</span>
        </label>
        <IconField className="sm:col-span-2" defaultValue={initial?.icon}
          fallback={<Link2 size={16} className="text-ink-400" />}
          placeholder="🔥 hoặc dán link ảnh (để trống cũng được)" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" onClick={onDone} className="btn-ghost">Huỷ</button>
      </div>
    </ActionForm>
  );
}

export { NAV_GROUPS };
