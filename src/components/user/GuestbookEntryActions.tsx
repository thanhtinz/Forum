'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { CornerDownRight, RotateCcw, Trash2 } from 'lucide-react';
import {
  removeGuestbookEntry, restoreGuestbookEntry, replyGuestbook, type GuestbookState,
} from '@/app/(site)/u/[username]/actions';
import { ActionForm } from '@/components/ActionForm';
import { GUESTBOOK_REPLY_MAX_LEN } from '@/lib/guestbook-const';

/** Nút gỡ một lời nhắn (chủ nhà, người viết, ban điều hành). */
export function RemoveEntryButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button type="button" disabled={pending} title="Gỡ lời nhắn"
        onClick={() => {
          if (!confirm('Gỡ lời nhắn này?')) return;
          setError(null);
          start(async () => {
            const r = await removeGuestbookEntry(id);
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

/** Nút phục hồi lời nhắn đã gỡ — chỉ ban điều hành thấy. */
export function RestoreEntryButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button type="button" disabled={pending} title="Phục hồi lời nhắn"
        onClick={() => {
          setError(null);
          start(async () => {
            const r = await restoreGuestbookEntry(id);
            if (r.error) setError(r.error);
          });
        }}
        className="grid size-7 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-brand-600 disabled:opacity-50 dark:hover:bg-ink-800">
        <RotateCcw size={14} />
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </>
  );
}

/**
 * Ô hồi âm của chủ nhà.
 *
 * Mặc định thu lại thành một dòng chữ nhỏ: sổ lưu bút mà mỗi lời nhắn kèm sẵn
 * một ô nhập thì trang dài loằng ngoằng, trong khi chủ nhà chỉ hồi âm vài lời.
 */
export function GuestbookReplyForm({ id, initial }: { id: string; initial: string | null }) {
  const [state, action, pending] = useActionState<GuestbookState, FormData>(replyGuestbook, {});
  const [open, setOpen] = useState(false);

  useEffect(() => { if (state.ok) setOpen(false); }, [state.ok]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-brand-600">
        <CornerDownRight size={13} /> {initial ? 'Sửa hồi âm' : 'Hồi âm'}
      </button>
    );
  }

  return (
    <ActionForm action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <textarea name="reply" rows={2} maxLength={GUESTBOOK_REPLY_MAX_LEN} defaultValue={initial ?? ''}
        autoFocus placeholder="Đáp lại đôi lời…" className="input resize-y text-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary !py-1 text-xs disabled:opacity-60">
          {pending ? 'Đang lưu…' : 'Lưu hồi âm'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost !py-1 text-xs">Huỷ</button>
        {/* Xoá trắng ô rồi lưu là bỏ hồi âm — nói rõ ra cho khỏi phải đoán. */}
        <span className="min-w-0 flex-1 truncate text-xs text-ink-400">
          {state.error ? <span className="text-red-600">{state.error}</span> : 'Để trống rồi lưu là bỏ hồi âm.'}
        </span>
      </div>
    </ActionForm>
  );
}
