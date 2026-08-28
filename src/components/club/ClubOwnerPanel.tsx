'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Check, X, UserCheck, Trash2 } from 'lucide-react';
import { updateClub, approveMember, removeMember, deleteClub } from '@/app/(site)/clb/actions';
import { UserName, Avatar } from '@/components/user/Cosmetic';
import {
  CLUB_JOIN_MODES, CLUB_PRIVACY, CLUB_NAME_MAX, CLUB_DESC_MAX, type ClubActionState,
} from '@/lib/club-const';
import { fmtAgo } from '@/lib/utils';
import type { AuthorChip } from '@/lib/shop';

export interface PendingRow {
  id: string;
  createdAt: Date;
  user: AuthorChip | null;
}

/** Bảng của chủ câu lạc bộ: duyệt đơn xin vào và sửa cấu hình nhóm. */
export function ClubOwnerPanel({ clubId, name, description, avatar, joinMode, privacy, pending }: {
  clubId: string;
  name: string;
  description: string;
  avatar: string;
  joinMode: string;
  privacy: string;
  pending: PendingRow[];
}) {
  const router = useRouter();
  const [openSettings, setOpenSettings] = useState(false);
  const [state, action, saving] = useActionState<ClubActionState, FormData>(updateClub, {});
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.error) { setError(r.error); return; }
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!window.confirm('Giải tán câu lạc bộ? Bảng tin và danh sách thành viên mất theo, không lấy lại được.')) return;
    run(() => deleteClub(clubId));
  };

  return (
    <div className="mb-4">
      {pending.length > 0 && (
        <div className="card mb-3 p-4">
          <h2 className="zib-title mb-3 flex items-center gap-2">
            <UserCheck size={16} /> Đơn xin vào ({pending.length})
          </h2>
          <ul className="space-y-2.5">
            {pending.map((p) => p.user && (
              <li key={p.id} className="flex items-center gap-2.5">
                <Avatar image={p.user.image} name={p.user.name ?? p.user.username ?? '?'}
                  cosmetics={p.user.cosmetics} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm">
                  <UserName username={p.user.username} name={p.user.name} role={p.user.role}
                    level={p.user.level} cosmetics={p.user.cosmetics} />
                  <span className="retro-sub ml-2 text-ink-400">· {fmtAgo(p.createdAt)}</span>
                </span>
                <button type="button" title="Duyệt" disabled={busy} onClick={() => run(() => approveMember(p.id))}
                  className="grid size-8 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-950/40">
                  <Check size={16} />
                </button>
                <button type="button" title="Từ chối" disabled={busy} onClick={() => run(() => removeMember(p.id))}
                  className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40">
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}

      <button type="button" onClick={() => setOpenSettings((v) => !v)} className="btn-ghost !py-1.5 text-sm">
        <Settings size={15} /> Cài đặt câu lạc bộ
      </button>

      {openSettings && (
        <form action={action} className="card mt-3 p-4">
          <input type="hidden" name="clubId" value={clubId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Tên câu lạc bộ</span>
              <input name="name" required maxLength={CLUB_NAME_MAX} defaultValue={name} className="input" />
            </label>
            <label className="block">
              <span className="label">Ảnh đại diện</span>
              <input name="avatar" defaultValue={avatar} className="input" placeholder="https://…" />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="label">Giới thiệu</span>
            <textarea name="description" rows={3} maxLength={CLUB_DESC_MAX} defaultValue={description} className="input" />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Cách vào nhóm</span>
              <select name="joinMode" defaultValue={joinMode} className="input">
                {CLUB_JOIN_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Bảng tin</span>
              <select name="privacy" defaultValue={privacy} className="input">
                {CLUB_PRIVACY.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
          </div>

          {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
          {state.ok && <p className="mt-3 text-sm text-emerald-600">Đã lưu.</p>}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button type="submit" disabled={saving} className="btn-primary !py-2 disabled:opacity-60">
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
            <button type="button" onClick={onDelete} disabled={busy}
              className="btn-ghost !py-2 text-red-600 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950/40">
              <Trash2 size={15} /> Giải tán câu lạc bộ
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
