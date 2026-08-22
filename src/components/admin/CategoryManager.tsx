'use client';

import { useState, useTransition, useEffect } from 'react';
import { useActionState } from 'react';
import { Plus, Pencil, Trash2, X, FolderTree, CornerDownRight } from 'lucide-react';
import { saveCategory, deleteCategory, type CategoryState } from '@/app/admin/actions';
import { ActionForm } from '@/components/ActionForm';

export interface CatRow {
  id: string; name: string; slug: string; color: string | null; icon: string | null;
  description: string | null; order: number; parentId: string | null; postCount: number;
}

export function CategoryManager({ categories }: { categories: CatRow[] }) {
  const [editing, setEditing] = useState<CatRow | null>(null);
  const [creating, setCreating] = useState(false);

  const roots = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  return (
    <div className="space-y-4">
      {!creating && !editing && (
        <button type="button" onClick={() => setCreating(true)} className="btn-primary"><Plus size={16} /> Thêm chuyên mục</button>
      )}

      {(creating || editing) && (
        <CategoryForm
          key={editing?.id ?? 'new'}
          initial={editing}
          categories={categories}
          onDone={() => { setCreating(false); setEditing(null); }}
        />
      )}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {roots.length === 0 && <div className="p-8 text-center text-sm text-ink-500">Chưa có chuyên mục nào.</div>}
        {roots.map((c) => (
          <div key={c.id}>
            <CategoryRow cat={c} onEdit={() => { setEditing(c); setCreating(false); }} />
            {childrenOf(c.id).map((ch) => (
              <CategoryRow key={ch.id} cat={ch} child onEdit={() => { setEditing(ch); setCreating(false); }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryRow({ cat, child, onEdit }: { cat: CatRow; child?: boolean; onEdit: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div className={`flex items-center gap-3 p-3 ${child ? 'pl-9' : ''}`}>
      {child && <CornerDownRight size={14} className="shrink-0 text-ink-300" />}
      <span className="grid size-8 shrink-0 place-items-center rounded-lg text-sm" style={{ backgroundColor: (cat.color ?? '#e5e7eb') + '33', color: cat.color ?? '#6b7280' }}>
        {cat.icon || <FolderTree size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink-900 dark:text-white">{cat.name}</div>
        <div className="truncate text-xs text-ink-400">/{cat.slug} · {cat.postCount} bài</div>
      </div>
      <button type="button" onClick={onEdit} title="Sửa"
        className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"><Pencil size={14} /></button>
      <button type="button" disabled={pending} title="Xoá"
        onClick={() => { if (confirm(`Xoá chuyên mục “${cat.name}”? Bài viết sẽ không bị xoá.`)) start(() => deleteCategory(cat.id)); }}
        className="grid size-8 place-items-center rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:hover:bg-rose-950"><Trash2 size={14} /></button>
    </div>
  );
}

function CategoryForm({ initial, categories, onDone }: { initial: CatRow | null; categories: CatRow[]; onDone: () => void }) {
  const [state, action, pending] = useActionState<CategoryState, FormData>(saveCategory, {});
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  // Chỉ cho chọn cha là chuyên mục gốc khác (một cấp con)
  const parentOptions = categories.filter((c) => !c.parentId && c.id !== initial?.id);

  return (
    <ActionForm action={action} className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{initial ? 'Sửa chuyên mục' : 'Thêm chuyên mục'}</h3>
        <button type="button" onClick={onDone} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
      </div>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-sm font-medium">Tên</span>
          <input name="name" required defaultValue={initial?.name} className="input" placeholder="Ví dụ: Thủ thuật" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Chuyên mục cha</span>
          <select name="parentId" defaultValue={initial?.parentId ?? ''} className="input">
            <option value="">— Không (cấp gốc) —</option>
            {parentOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Màu (hex)</span>
          <input name="color" defaultValue={initial?.color ?? ''} className="input" placeholder="#22c55e" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Biểu tượng (emoji)</span>
          <input name="icon" defaultValue={initial?.icon ?? ''} className="input" placeholder="📁" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Thứ tự</span>
          <input name="order" type="number" defaultValue={initial?.order ?? 0} className="input" /></label>
      </div>
      <label className="block"><span className="mb-1 block text-sm font-medium">Mô tả</span>
        <input name="description" defaultValue={initial?.description ?? ''} className="input" placeholder="Mô tả ngắn (không bắt buộc)" /></label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending ? 'Đang lưu…' : 'Lưu'}</button>
        <button type="button" onClick={onDone} className="btn-ghost">Huỷ</button>
      </div>
    </ActionForm>
  );
}
