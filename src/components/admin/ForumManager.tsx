'use client';

import { useState, useTransition, useEffect } from 'react';
import { useActionState } from 'react';
import { Plus, Pencil, Trash2, X, MessagesSquare, CornerDownRight, Lock, Crown } from 'lucide-react';
import { saveForum, deleteForum, type ForumState } from '@/app/admin/actions';
import { ActionForm } from '@/components/ActionForm';
import { IconField } from '@/components/admin/IconField';
import { IconGlyph } from '@/components/IconGlyph';

export interface ForumRow {
  id: string; name: string; slug: string; description: string | null; icon: string | null;
  order: number; parentId: string | null; threadCount: number; replyCount: number;
  postAccess: string; minLevel: number;
  requiredMedalId: string | null; requiredMedalName: string | null;
}

/*
 * Phải khớp ĐÚNG enum `ForumAccess` trong lược đồ.
 *
 * Trước đây ở đây còn mục "Chỉ VIP", mà enum không hề có giá trị ấy: chọn nó
 * thì `parseForumAccess` không nhận ra và lặng lẽ đổi về `ALL` — quản trị
 * tưởng vừa khoá khu vực lại, thực ra vừa mở toang nó, mà không có lấy một
 * lời báo nào.
 */
const ACCESS_LABEL: Record<string, string> = {
  ALL: 'Ai cũng đăng được',
  MEMBERS: 'Chỉ thành viên',
  MODERATORS: 'Chỉ điều hành viên',
};

export function ForumManager({ forums, medals }: { forums: ForumRow[]; medals: { id: string; name: string }[] }) {
  const [editing, setEditing] = useState<ForumRow | null>(null);
  const [creating, setCreating] = useState(false);

  const roots = forums.filter((f) => !f.parentId);
  const childrenOf = (id: string) => forums.filter((f) => f.parentId === id);

  return (
    <div className="space-y-4">
      {!creating && !editing && (
        <button type="button" onClick={() => setCreating(true)} className="btn-primary"><Plus size={16} /> Thêm diễn đàn</button>
      )}

      {(creating || editing) && (
        <ForumForm
          key={editing?.id ?? 'new'}
          initial={editing}
          forums={forums}
          medals={medals}
          onDone={() => { setCreating(false); setEditing(null); }}
        />
      )}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {roots.length === 0 && <div className="p-8 text-center text-sm text-ink-500">Chưa có diễn đàn nào.</div>}
        {roots.map((f) => (
          <div key={f.id}>
            <ForumRowView forum={f} onEdit={() => { setEditing(f); setCreating(false); }} />
            {childrenOf(f.id).map((c) => (
              <ForumRowView key={c.id} forum={c} child onEdit={() => { setEditing(c); setCreating(false); }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ForumRowView({ forum, child, onEdit }: { forum: ForumRow; child?: boolean; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const locked = forum.threadCount > 0;

  return (
    <div className={`flex items-center gap-3 p-3 ${child ? 'pl-9' : ''}`}>
      {child && <CornerDownRight size={14} className="shrink-0 text-ink-300" />}
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-brand-50 text-sm text-brand-600 dark:bg-brand-950/40">
        <IconGlyph icon={forum.icon} fallback={<MessagesSquare size={15} />} className="size-full" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-ink-900 dark:text-white">{forum.name}</span>
          {forum.postAccess !== 'ALL' && <Lock size={12} className="shrink-0 text-ink-400" />}
          {forum.requiredMedalId && (
            <span className="chip !py-0 text-[10px] text-amber-600" title="Cần huy hiệu mới xem được">
              <Crown size={10} className="mr-0.5 inline" />{forum.requiredMedalName ?? 'huy hiệu'}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-ink-400">
          /forum/{forum.slug} · {forum.threadCount} chủ đề · {forum.replyCount} trả lời · {ACCESS_LABEL[forum.postAccess] ?? forum.postAccess}
          {forum.minLevel > 1 ? ` · từ Lv${forum.minLevel}` : ''}
        </div>
      </div>
      <button type="button" onClick={onEdit} title="Sửa" aria-label={`Sửa chuyên mục ${forum.name}`}
        className="grid size-8 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"><Pencil size={14} /></button>
      <button type="button" disabled={pending || locked} title={locked ? 'Còn chủ đề nên không xoá được' : 'Xoá'}
        onClick={() => { if (confirm(`Xoá diễn đàn “${forum.name}”?`)) start(() => deleteForum(forum.id)); }}
        className="grid size-8 place-items-center rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:border-rose-800 dark:hover:bg-rose-950"><Trash2 size={14} /></button>
    </div>
  );
}

function ForumForm({ initial, forums, medals, onDone }: {
  initial: ForumRow | null; forums: ForumRow[]; medals: { id: string; name: string }[]; onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ForumState, FormData>(saveForum, {});
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  const parentOptions = forums.filter((f) => !f.parentId && f.id !== initial?.id);

  return (
    <ActionForm action={action} className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{initial ? 'Sửa diễn đàn' : 'Thêm diễn đàn'}</h3>
        <button type="button" onClick={onDone} title="Đóng" aria-label="Đóng biểu mẫu"
            className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
      </div>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-sm font-medium">Tên</span>
          <input name="name" required defaultValue={initial?.name} className="input" placeholder="Ví dụ: Hỏi đáp kỹ thuật" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Diễn đàn cha</span>
          <select name="parentId" defaultValue={initial?.parentId ?? ''} className="input">
            <option value="">— Không (cấp gốc) —</option>
            {parentOptions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select></label>
        <IconField className="sm:col-span-2" defaultValue={initial?.icon} fallback="💬"
          placeholder="💬 hoặc dán link ảnh" />
        <label className="block"><span className="mb-1 block text-sm font-medium">Thứ tự</span>
          <input name="order" type="number" defaultValue={initial?.order ?? 0} className="input" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Quyền đăng bài</span>
          <select name="postAccess" defaultValue={initial?.postAccess ?? 'ALL'} className="input">
            {Object.entries(ACCESS_LABEL).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Cấp độ tối thiểu</span>
          <input name="minLevel" type="number" min={1} defaultValue={initial?.minLevel ?? 1} className="input" /></label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Huy hiệu bắt buộc để XEM (khác quyền đăng ở trên)</span>
          <select name="requiredMedalId" defaultValue={initial?.requiredMedalId ?? ''} className="input">
            <option value="">— Không, khu vực công khai —</option>
            {medals.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <span className="mt-1 block text-xs text-ink-400">
            Đặt huy hiệu thì cả khu vực khoá lại — chỉ ai có huy hiệu này (hoặc điều hành
            viên của khu vực) mới xem được chủ đề bên trong. Khu vực vẫn hiện tên trong danh
            sách, chỉ nội dung là bị chắn.
          </span>
        </label>
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
