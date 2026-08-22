'use client';

import { useState, useEffect, useTransition, useActionState } from 'react';
import { Ban, ShieldCheck, X, Clock } from 'lucide-react';
import { setUserRole, banUser, unbanUser, type BanState } from '@/app/admin/actions';
import { BAN_SCOPES, BAN_DURATIONS, type BanScopeValue } from '@/lib/ban';
import { ActionForm } from '@/components/ActionForm';
import { cn } from '@/lib/utils';

type Role = 'USER' | 'AUTHOR' | 'MODERATOR' | 'ADMIN';

export interface ActiveBan { scope: string; reason: string; expiresAt: string | null }

type Props = {
  id: string; username: string; role: Role; banned: boolean;
  canManageRole: boolean; isAdmin: boolean;
  /** Các lệnh cấm còn hiệu lực, để hiện nhãn và nút gỡ đúng phạm vi. */
  bans?: ActiveBan[];
};

const ROLES: Role[] = ['USER', 'AUTHOR', 'MODERATOR', 'ADMIN'];

export function UserRowActions({ id, username, role, banned, canManageRole, isAdmin, bans = [] }: Props) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {canManageRole ? (
        <select value={role} disabled={pending}
          onChange={(e) => start(() => setUserRole(id, e.target.value as Role))}
          className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-xs font-medium text-ink-600 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300">
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      ) : (
        <span className="rounded-lg border border-ink-200 px-2 py-1 text-xs font-medium text-ink-400 dark:border-ink-700">{role}</span>
      )}

      {/* Nhãn từng lệnh cấm đang chạy, bấm x để gỡ riêng phạm vi đó */}
      {bans.map((b) => {
        const meta = BAN_SCOPES.find((s) => s.value === b.scope);
        return (
          <span key={b.scope} title={`${b.reason}${b.expiresAt ? ` — tới ${new Date(b.expiresAt).toLocaleString('vi-VN')}` : ' — vĩnh viễn'}`}
            className="flex items-center gap-1 rounded-full bg-rose-100 py-0.5 pl-2 pr-1 text-[11px] font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            {meta?.label ?? b.scope}
            {b.expiresAt && <Clock size={10} />}
            <button type="button" disabled={pending} title="Gỡ khoá này"
              onClick={() => start(() => unbanUser(id, b.scope))}
              className="grid size-4 place-items-center rounded-full hover:bg-rose-200 disabled:opacity-50 dark:hover:bg-rose-900">
              <X size={10} />
            </button>
          </span>
        );
      })}

      {!isAdmin && (
        <button type="button" title="Khoá tài khoản" disabled={pending} onClick={() => setOpen((v) => !v)}
          className={cn('grid size-8 place-items-center rounded-lg border transition-colors disabled:opacity-50',
            banned || bans.length > 0
              ? 'border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-700 dark:bg-rose-950'
              : 'border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950')}>
          {open ? <ShieldCheck size={15} /> : <Ban size={15} />}
        </button>
      )}

      {open && <BanDialog id={id} username={username} onDone={() => setOpen(false)} />}
    </div>
  );
}

function BanDialog({ id, username, onDone }: { id: string; username: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<BanState, FormData>(banUser, {});
  const [scope, setScope] = useState<BanScopeValue>('FULL');
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);

  const hint = BAN_SCOPES.find((s) => s.value === scope)?.hint;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onDone}>
      <ActionForm action={action} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-ink-900">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink-900 dark:text-white">Khoá @{username}</h2>
          <button type="button" onClick={onDone} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
        </div>
        <input type="hidden" name="userId" value={id} />

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Phạm vi</span>
          <select name="scope" value={scope} onChange={(e) => setScope(e.target.value as BanScopeValue)} className="input">
            {BAN_SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Thời hạn</span>
          <select name="days" defaultValue="0" className="input">
            {BAN_DURATIONS.map((d) => <option key={d.days} value={d.days}>{d.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Lý do</span>
          <textarea name="reason" rows={2} className="input" placeholder="Ví dụ: spam quảng cáo nhiều lần" />
          <span className="mt-1 block text-xs text-ink-400">Lý do được lưu lại và gửi cho thành viên.</span>
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
            <Ban size={16} /> {pending ? 'Đang khoá…' : 'Khoá'}
          </button>
          <button type="button" onClick={onDone} className="btn-ghost">Huỷ</button>
        </div>
      </ActionForm>
    </div>
  );
}
