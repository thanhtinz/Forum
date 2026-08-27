'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { Check, ThumbsUp, Trash2, Wrench } from 'lucide-react';
import {
  voteGameRequest, removeGameRequest, setGameRequestStatus, type RequestState,
} from '@/app/(site)/games/yeu-cau/actions';
import { ActionForm } from '@/components/ActionForm';
import {
  REQUEST_ADMIN_NOTE_MAX, REQUEST_LABELS, REQUEST_STATUSES, type RequestStatus,
} from '@/lib/game-request-const';
import { fmtCount } from '@/lib/utils';

/** Nút "tôi cũng muốn" — bấm lần nữa là bỏ. */
export function VoteButton({ id, initialVoted, initialCount, disabled }: {
  id: string; initialVoted: boolean; initialCount: number; disabled?: boolean;
}) {
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Máy chủ làm mới trang sau mỗi lượt bấm; đồng bộ lại để con số của người
  // khác vừa bấm cũng hiện đúng.
  useEffect(() => { setVoted(initialVoted); setCount(initialCount); }, [initialVoted, initialCount]);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button type="button" disabled={pending || disabled}
        title={disabled ? 'Yêu cầu đã xử lý xong' : voted ? 'Bỏ lượt muốn' : 'Tôi cũng muốn game này'}
        onClick={() => {
          setError(null);
          start(async () => {
            const r = await voteGameRequest(id);
            if (r.error) { setError(r.error); return; }
            setVoted(!!r.voted);
            if (typeof r.count === 'number') setCount(r.count);
          });
        }}
        className={`grid w-14 place-items-center gap-0.5 rounded-xl border px-2 py-1.5 transition-colors disabled:opacity-50 ${
          voted
            ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/40'
            : 'border-ink-200 text-ink-400 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700'
        }`}>
        <ThumbsUp size={15} />
        <span className="text-xs font-bold tabular-nums">{fmtCount(count)}</span>
      </button>
      {error && <span className="max-w-24 text-center text-[11px] text-red-600">{error}</span>}
    </div>
  );
}

/** Nút rút yêu cầu. */
export function RemoveRequestButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button type="button" disabled={pending} title="Rút yêu cầu"
        onClick={() => {
          if (!confirm('Rút yêu cầu này?')) return;
          setError(null);
          start(async () => {
            const r = await removeGameRequest(id);
            if (r.error) setError(r.error);
          });
        }}
        className="grid size-7 place-items-center rounded-lg text-ink-400 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40">
        <Trash2 size={14} />
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </>
  );
}

/**
 * Bảng xử lý của quản trị viên.
 *
 * Thu lại sau một nút: mỗi dòng mà kèm sẵn một biểu mẫu thì bảng yêu cầu dài
 * gấp mấy lần, trong khi phần lớn lượt vào chỉ để đọc.
 */
export function RequestAdminPanel({ id, status, adminNote, gameSlug }: {
  id: string; status: RequestStatus; adminNote: string | null; gameSlug: string | null;
}) {
  const [state, action, pending] = useActionState<RequestState, FormData>(setGameRequestStatus, {});
  const [open, setOpen] = useState(false);

  useEffect(() => { if (state.ok) setOpen(false); }, [state.ok]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-brand-600">
        <Wrench size={13} /> Xử lý
      </button>
    );
  }

  return (
    <ActionForm action={action} className="mt-2 space-y-2 rounded-xl border border-ink-200 p-3 dark:border-ink-700">
      <input type="hidden" name="id" value={id} />

      <div className="flex flex-wrap gap-1.5">
        {REQUEST_STATUSES.map((s) => (
          <label key={s} className="cursor-pointer">
            <input type="radio" name="status" value={s} defaultChecked={s === status} className="peer sr-only" />
            <span className={`chip ${REQUEST_LABELS[s].chip} peer-checked:ring-2 peer-checked:ring-brand-500`}>
              {REQUEST_LABELS[s].label}
            </span>
          </label>
        ))}
      </div>

      <input name="gameSlug" defaultValue={gameSlug ?? ''} className="input text-sm"
        placeholder="Slug game đã lên kho (không bắt buộc), ví dụ snake-xenzia" />
      <input name="adminNote" defaultValue={adminNote ?? ''} maxLength={REQUEST_ADMIN_NOTE_MAX}
        className="input text-sm" placeholder="Lời nhắn gửi người xin…" />

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary !py-1 text-xs disabled:opacity-60">
          <Check size={14} /> {pending ? 'Đang lưu…' : 'Lưu'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost !py-1 text-xs">Đóng</button>
        <span className="min-w-0 flex-1 truncate text-xs text-ink-400">
          {state.error ? <span className="text-red-600">{state.error}</span> : 'Người xin sẽ nhận được thông báo.'}
        </span>
      </div>
    </ActionForm>
  );
}
