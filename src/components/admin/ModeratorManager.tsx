'use client';

import { useState, useEffect, useTransition, useActionState } from 'react';
import { UserPlus, X, ShieldCheck, MessagesSquare } from 'lucide-react';
import { addForumModerator, removeForumModerator, type ModState } from '@/app/admin/actions';
import { ActionForm } from '@/components/ActionForm';
import { IconGlyph } from '@/components/IconGlyph';

export interface ModRow { id: string; userId: string; name: string; username: string; image: string | null }
export interface ForumWithMods {
  id: string; name: string; slug: string; icon: string | null; mods: ModRow[];
}

export function ModeratorManager({ forums }: { forums: ForumWithMods[] }) {
  const [adding, setAdding] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {forums.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink-500">Chưa có khu vực diễn đàn nào.</div>
      )}

      {forums.map((f) => (
        <div key={f.id} className="card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-100 text-sm dark:bg-ink-800">
              <IconGlyph icon={f.icon} fallback={<MessagesSquare size={14} className="text-ink-400" />} className="size-full" />
            </span>
            <span className="font-semibold text-ink-900 dark:text-white">{f.name}</span>
            <span className="text-xs text-ink-400">{f.mods.length} điều hành viên</span>
            {adding !== f.id && (
              <button type="button" onClick={() => setAdding(f.id)} className="btn-ghost ml-auto !px-3 !py-1.5 text-sm">
                <UserPlus size={15} /> Thêm
              </button>
            )}
          </div>

          {adding === f.id && (
            <AddModForm forumId={f.id} onDone={() => setAdding(null)} />
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {f.mods.length === 0 && (
              <p className="text-sm text-ink-400">Chưa gán ai. Quản trị viên toàn site vẫn kiểm duyệt được khu vực này.</p>
            )}
            {f.mods.map((m) => <ModChip key={m.id} mod={m} forumName={f.name} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModChip({ mod, forumName }: { mod: ModRow; forumName: string }) {
  const [pending, start] = useTransition();

  return (
    <span className="flex items-center gap-2 rounded-full border border-ink-200 py-1 pl-1 pr-2 dark:border-ink-700">
      {mod.image
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={mod.image} alt="" className="size-7 rounded-full object-cover" />
        : <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {(mod.name || mod.username).charAt(0).toUpperCase()}
          </span>}
      <span className="text-sm font-medium text-ink-800 dark:text-ink-100">{mod.name || mod.username}</span>
      <span className="text-xs text-ink-400">@{mod.username}</span>
      <button type="button" disabled={pending} title="Gỡ quyền điều hành"
        onClick={() => { if (confirm(`Gỡ quyền điều hành “${forumName}” của @${mod.username}?`)) start(() => removeForumModerator(mod.id)); }}
        className="grid size-5 place-items-center rounded-full text-ink-400 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950">
        <X size={13} />
      </button>
    </span>
  );
}

function AddModForm({ forumId, onDone }: { forumId: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<ModState, FormData>(addForumModerator, {});
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  return (
    <ActionForm action={action} className="mt-3 rounded-xl border border-ink-200 p-3 dark:border-ink-700">
      <input type="hidden" name="forumId" value={forumId} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-52 flex-1">
          <span className="mb-1 block text-sm font-medium">Tên đăng nhập</span>
          <input name="username" className="input" placeholder="vd: minhdev" autoComplete="off" autoFocus />
        </label>
        <button type="submit" disabled={pending} className="btn-primary !py-2 disabled:opacity-60">
          <ShieldCheck size={16} /> {pending ? 'Đang gán…' : 'Gán quyền'}
        </button>
        <button type="button" onClick={onDone} className="btn-ghost !py-2">Huỷ</button>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </ActionForm>
  );
}
