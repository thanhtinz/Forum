'use client';

import { useActionState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { createGameRequest, type RequestState } from '@/app/(site)/games/yeu-cau/actions';
import { ActionForm } from '@/components/ActionForm';
import { REQUEST_TITLE_MAX, REQUEST_NOTE_MAX, REQUEST_PER_DAY } from '@/lib/game-request-const';

/** Ô gửi yêu cầu game. */
export function GameRequestForm({ loggedIn }: { loggedIn: boolean }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(createGameRequest, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ok]);

  if (!loggedIn) {
    return (
      <div className="card p-4 text-center text-sm text-ink-500">
        <Link href="/login?callbackUrl=%2Fgames%2Fyeu-cau" className="font-semibold text-brand-600 hover:underline">
          Đăng nhập
        </Link>{' '}để xin game.
      </div>
    );
  }

  return (
    <ActionForm ref={ref} action={action} className="card space-y-3 p-4 sm:p-5">
      <div>
        <label htmlFor="req-title" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">
          Tên game bạn đang tìm
        </label>
        <input id="req-title" name="title" required minLength={2} maxLength={REQUEST_TITLE_MAX}
          placeholder="Ví dụ: Chinh Phục Vũ Môn 128×160" className="input" />
      </div>

      <div>
        <label htmlFor="req-note" className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-400">
          Mô tả thêm <span className="font-normal normal-case text-ink-400">(không bắt buộc)</span>
        </label>
        <textarea id="req-note" name="note" rows={2} maxLength={REQUEST_NOTE_MAX}
          placeholder="Dòng máy, độ phân giải, bản Việt hoá hay bản gốc…" className="input resize-y" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary !py-2 disabled:opacity-60">
          <Send size={15} /> {pending ? 'Đang gửi…' : 'Gửi yêu cầu'}
        </button>
        <span className="min-w-0 flex-1 truncate text-xs">
          {state.error && <span className="text-amber-600 dark:text-amber-400">{state.error}</span>}
          {state.ok && <span className="text-green-600">Đã gửi, chờ người quản kho xem nhé.</span>}
          {!state.error && !state.ok && (
            <span className="text-ink-400">Mỗi ngày tối đa {REQUEST_PER_DAY} yêu cầu.</span>
          )}
        </span>
      </div>
    </ActionForm>
  );
}
