'use client';

import Link from 'next/link';
import { useActionState, useTransition } from 'react';
import { Save, Coins, Trash2, Lock } from 'lucide-react';
import { saveClubSettings, adminDeleteClub, type ClubSettingState } from '@/app/admin/actions';
import { ActionForm } from '@/components/ActionForm';
import { soDay } from '@/lib/utils';

export interface AdminClubRow {
  id: string;
  slug: string;
  name: string;
  memberCount: number;
  postCount: number;
  privacy: string;
  createdAt: Date;
  owner: { username: string | null; name: string | null } | null;
}

export function ClubAdmin({ createCost, clubs }: { createCost: number; clubs: AdminClubRow[] }) {
  const [state, action, pending] = useActionState<ClubSettingState, FormData>(saveClubSettings, {});
  const [busy, start] = useTransition();

  const remove = (c: AdminClubRow) => {
    if (!window.confirm(`Giải tán “${c.name}”? Bảng tin và danh sách thành viên mất theo.`)) return;
    start(() => adminDeleteClub(c.id));
  };

  return (
    <>
      <section className="card p-5">
        <p className="mb-4 flex items-start gap-2 text-sm text-ink-500">
          <Coins size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <span>Số điểm trừ mỗi lần một thành viên lập câu lạc bộ. Đặt 0 nếu muốn cho lập tự do.</span>
        </p>
        <ActionForm action={action} className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Giá lập (điểm)</span>
            <input type="number" name="createCost" min={0} defaultValue={createCost} className="input w-40" />
          </label>
          <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
            <Save size={16} /> {pending ? 'Đang lưu…' : 'Lưu'}
          </button>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state.ok && <p className="text-sm text-emerald-600">Đã lưu.</p>}
        </ActionForm>
      </section>

      <section className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
            <tr>
              <th className="px-4 py-2.5 font-bold">Câu lạc bộ</th>
              <th className="px-4 py-2.5 font-bold">Chủ</th>
              <th className="px-4 py-2.5 font-bold">Thành viên</th>
              <th className="px-4 py-2.5 font-bold">Bài</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {clubs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">Chưa có câu lạc bộ nào.</td></tr>
            ) : clubs.map((c) => (
              <tr key={c.id} className="border-b border-ink-50 last:border-0 dark:border-ink-800/60">
                <td className="px-4 py-2.5">
                  <Link href={`/clb/${c.slug}`} className="font-semibold text-brand-600 hover:underline">{c.name}</Link>
                  {c.privacy === 'MEMBERS' && <Lock size={12} className="ml-1.5 inline text-ink-400" />}
                </td>
                <td className="px-4 py-2.5 text-ink-500">
                  {c.owner ? <Link href={`/u/${c.owner.username}`} className="hover:underline">{c.owner.name ?? c.owner.username}</Link> : '—'}
                </td>
                <td className="px-4 py-2.5 text-ink-500">{soDay(c.memberCount)}</td>
                <td className="px-4 py-2.5 text-ink-500">{soDay(c.postCount)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button type="button" title="Giải tán" disabled={busy} onClick={() => remove(c)}
                    className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
