'use client';

import { useActionState, useState } from 'react';
import { Plus, Coins, X } from 'lucide-react';
import { createClub } from '@/app/(site)/clb/actions';
import { CLUB_JOIN_MODES, CLUB_PRIVACY, CLUB_NAME_MAX, CLUB_DESC_MAX, type ClubActionState } from '@/lib/club-const';
import { fmtCount } from '@/lib/utils';

/**
 * Ô lập câu lạc bộ, gấp lại cho tới khi bấm.
 *
 * Hằng số lấy từ `club-const` chứ không từ `club`: tệp kia đụng Prisma, kéo
 * xuống trình duyệt là hỏng gói tải.
 */
export function ClubCreateForm({ cost, myPoints, canCreate, ownedMax }: {
  cost: number;
  myPoints: number;
  canCreate: boolean;
  ownedMax: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ClubActionState, FormData>(createClub, {});

  if (!open) {
    return (
      // Không nhắc giá ở đây: mở biểu mẫu ra là thấy ngay dòng "Trừ N điểm"
      // kèm số điểm đang có, nói hai lần chỉ tổ chật chỗ.
      <div className="mb-6">
        <button type="button" onClick={() => setOpen(true)} className="btn-primary">
          <Plus size={16} /> Lập câu lạc bộ
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="card mb-6 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="zib-title">Lập câu lạc bộ</h2>
        <button type="button" onClick={() => setOpen(false)} title="Đóng"
          className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
          <X size={16} />
        </button>
      </div>

      {!canCreate && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          Bạn đã lập đủ {ownedMax} câu lạc bộ. Giải tán bớt một nhóm nếu muốn lập nhóm mới.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Tên câu lạc bộ</span>
          <input name="name" required maxLength={CLUB_NAME_MAX} className="input" placeholder="Hội mê game Java" />
        </label>
        <label className="block">
          <span className="label">Ảnh đại diện (địa chỉ ảnh)</span>
          <input name="avatar" className="input" placeholder="https://… (không bắt buộc)" />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="label">Giới thiệu</span>
        <textarea name="description" rows={3} maxLength={CLUB_DESC_MAX} className="input"
          placeholder="Nhóm này lập ra để làm gì, ai nên vào…" />
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Cách vào nhóm</span>
          <select name="joinMode" className="input" defaultValue="OPEN">
            {CLUB_JOIN_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Bảng tin</span>
          <select name="privacy" className="input" defaultValue="PUBLIC">
            {CLUB_PRIVACY.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
      </div>

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !canCreate} className="btn-primary disabled:opacity-60">
          {pending ? 'Đang lập…' : 'Lập câu lạc bộ'}
        </button>
        {cost > 0 && (
          <span className="retro-sub text-ink-500">
            Trừ <Coins size={13} className="inline text-amber-500" /> {fmtCount(cost)} điểm
            {myPoints < cost && <span className="text-red-500"> — bạn còn thiếu {fmtCount(cost - myPoints)}</span>}
          </span>
        )}
      </div>
    </form>
  );
}
