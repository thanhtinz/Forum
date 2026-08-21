'use client';

import { useTransition } from 'react';
import { Ban, ShieldCheck } from 'lucide-react';
import { setUserRole, toggleBan } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

type Role = 'USER' | 'AUTHOR' | 'MODERATOR' | 'ADMIN';
type Props = { id: string; role: Role; banned: boolean; canManageRole: boolean; isAdmin: boolean };

const ROLES: Role[] = ['USER', 'AUTHOR', 'MODERATOR', 'ADMIN'];

export function UserRowActions({ id, role, banned, canManageRole, isAdmin }: Props) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-1.5">
      {canManageRole ? (
        <select value={role} disabled={pending}
          onChange={(e) => start(() => setUserRole(id, e.target.value as Role))}
          className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-xs font-medium text-ink-600 disabled:opacity-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300">
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      ) : (
        <span className="rounded-lg border border-ink-200 px-2 py-1 text-xs font-medium text-ink-400 dark:border-ink-700">{role}</span>
      )}

      {!isAdmin && (
        <button type="button" title={banned ? 'Mở khoá' : 'Khoá tài khoản'} disabled={pending}
          onClick={() => start(() => toggleBan(id))}
          className={cn('grid size-8 place-items-center rounded-lg border transition-colors disabled:opacity-50',
            banned
              ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950'
              : 'border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950')}>
          {banned ? <ShieldCheck size={15} /> : <Ban size={15} />}
        </button>
      )}
    </div>
  );
}
