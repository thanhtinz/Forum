'use client';

import { useActionState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PenLine } from 'lucide-react';
import { signGuestbook, type GuestbookState } from '@/app/(site)/u/[username]/actions';
import { ActionForm } from '@/components/ActionForm';
import { ComposerTools } from '@/components/ComposerTools';
import { MentionTextarea } from '@/components/MentionTextarea';
import { GUESTBOOK_MAX_LEN } from '@/lib/guestbook-const';

/** Ô ghi lời nhắn vào sổ lưu bút của một người. */
export function GuestbookForm({ username, loggedIn, self, callbackUrl }: {
  username: string;
  loggedIn: boolean;
  /** Đang xem sổ của chính mình — lời nhắn kín cho bản thân thì vô nghĩa. */
  self: boolean;
  callbackUrl: string;
}) {
  const [state, action, pending] = useActionState<GuestbookState, FormData>(signGuestbook, {});
  const ref = useRef<HTMLFormElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ok]);

  if (!loggedIn) {
    return (
      <div className="card p-4 text-center text-sm text-ink-500">
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link>
        {' '}để ghi vào sổ lưu bút.
      </div>
    );
  }

  return (
    <ActionForm ref={ref} action={action} className="card space-y-2 p-4">
      <input type="hidden" name="username" value={username} />
      <MentionTextarea ref={taRef} name="content" required minLength={2} maxLength={GUESTBOOK_MAX_LEN}
        rows={3} className="input resize-y"
        placeholder={self ? 'Ghi một dòng cho chính mình…' : 'Để lại đôi lời… gõ @ để nhắc tên'} />

      <ComposerTools textareaRef={taRef}>
        {!self && (
          <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-500"
            title="Chỉ chủ nhà và bạn đọc được lời nhắn này.">
            <input type="checkbox" name="private" className="size-3.5 rounded" /> Lời kín
          </label>
        )}
        <span className="min-w-0 flex-1 truncate text-xs">
          {state.error && <span className="text-red-600">{state.error}</span>}
          {state.ok && <span className="text-green-600">Đã ghi vào sổ lưu bút.</span>}
        </span>
        <button type="submit" disabled={pending} className="btn-primary !py-1.5 disabled:opacity-60">
          <PenLine size={15} /> {pending ? 'Đang ghi…' : 'Ghi sổ'}
        </button>
      </ComposerTools>
    </ActionForm>
  );
}
