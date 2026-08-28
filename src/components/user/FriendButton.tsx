'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Clock, UserRound, UserRoundCheck, UserRoundPlus, UserRoundX, Users } from 'lucide-react';
import {
  sendFriendRequest, acceptFriendRequest, removeFriendship, removeFriendshipWith,
} from '@/app/(site)/user/friends/actions';
import type { FriendState } from '@/lib/friend';

/**
 * Nút kết bạn trên trang cá nhân.
 *
 * Bốn cảnh khác nhau nên chữ trên nút cũng phải khác: mời, đang chờ họ, họ
 * đang chờ mình, và đã là bạn. Cùng một chữ "Kết bạn" cho cả bốn thì người
 * dùng bấm mà không biết chuyện gì vừa xảy ra.
 */
export function FriendButton({ targetId, targetName, initial, loggedIn, callbackUrl }: {
  targetId: string;
  targetName: string;
  initial: FriendState;
  loggedIn: boolean;
  callbackUrl: string;
}) {
  const [state, setState] = useState<FriendState>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (state === 'self') return null;

  if (!loggedIn) {
    return (
      <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        className="btn-outline !rounded-full gap-1.5 !px-3.5 !py-2 text-sm">
        <UserRoundPlus size={15} /> Kết bạn
      </Link>
    );
  }

  const run = (fn: () => Promise<{ error?: string }>, next: FriendState) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.error) { setError(r.error); return; }
      setState(next);
    });
  };

  const cls = 'btn-outline !rounded-full gap-1.5 !px-3.5 !py-2 text-sm disabled:opacity-60';

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="flex flex-wrap gap-1.5">
        {state === 'none' && (
          <button type="button" disabled={pending} className={cls}
            onClick={() => run(() => sendFriendRequest(targetId), 'outgoing')}>
            <UserRoundPlus size={15} /> {pending ? 'Đang gửi…' : 'Kết bạn'}
          </button>
        )}

        {state === 'outgoing' && (
          <button type="button" disabled={pending} title="Rút lời mời" className={cls}
            onClick={() => run(() => removeFriendshipWith(targetId), 'none')}>
            <NguoiChoDuyet /> {pending ? 'Đang rút…' : 'Đã gửi lời mời'}
          </button>
        )}

        {state === 'incoming' && (
          <>
            <button type="button" disabled={pending} className="btn-primary !rounded-full gap-1.5 !px-3.5 !py-2 text-sm disabled:opacity-60"
              onClick={() => run(async () => {
                // Từ trang cá nhân mình không cầm id lời mời; gửi lời mời
                // ngược lại chính là đồng ý, hàm bên máy chủ tự nhận ra.
                const r = await sendFriendRequest(targetId);
                return r;
              }, 'friends')}>
              <UserRoundCheck size={15} /> {pending ? 'Đang lưu…' : 'Đồng ý kết bạn'}
            </button>
            <button type="button" disabled={pending} title="Từ chối" className={cls}
              onClick={() => run(() => removeFriendshipWith(targetId), 'none')}>
              <UserRoundX size={15} />
            </button>
          </>
        )}

        {state === 'friends' && (
          <button type="button" disabled={pending} title={`Huỷ kết bạn với ${targetName}`}
            className="btn-outline !rounded-full gap-1.5 !px-3.5 !py-2 text-sm text-emerald-600 disabled:opacity-60 dark:text-emerald-400"
            onClick={() => {
              if (!confirm(`Huỷ kết bạn với ${targetName}?`)) return;
              run(() => removeFriendshipWith(targetId), 'none');
            }}>
            <Users size={15} /> Bạn bè
          </button>
        )}
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}

/**
 * 👤🕐 — "đã gửi lời mời, đang chờ".
 *
 * lucide bản đang dùng chưa có `UserRoundClock`, mà nâng cả thư viện lên bản
 * mới chỉ vì một icon thì không đáng, nên ghép người với đồng hồ. Đồng hồ có
 * nền cùng màu mặt thẻ để nó nổi khỏi hình người bên dưới.
 */
function NguoiChoDuyet({ size = 15 }: { size?: number }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <UserRound size={size} />
      <Clock size={Math.round(size * 0.66)} strokeWidth={2.75}
        className="absolute -bottom-1 -right-1 rounded-full bg-[color:var(--nova-surface)]" />
    </span>
  );
}

/** Nút đồng ý / bỏ một lời mời trên trang bạn bè (ở đó có sẵn id lời mời). */
export function FriendRowActions({ id, kind, name }: {
  id: string;
  kind: 'incoming' | 'outgoing' | 'friend';
  name: string;
}) {
  const [gone, setGone] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (gone) return <span className="retro-sub text-ink-400">Đã bỏ</span>;
  if (accepted) return <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50">Đã là bạn</span>;

  const act = (fn: () => Promise<{ error?: string }>, after: () => void) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.error) { setError(r.error); return; }
      after();
    });
  };

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {kind === 'incoming' && (
        <button type="button" disabled={pending} className="btn-primary !py-1 text-xs disabled:opacity-60"
          onClick={() => act(() => acceptFriendRequest(id), () => setAccepted(true))}>
          <UserRoundCheck size={14} /> Đồng ý
        </button>
      )}
      <button type="button" disabled={pending}
        title={kind === 'incoming' ? 'Từ chối' : kind === 'outgoing' ? 'Rút lời mời' : `Huỷ kết bạn với ${name}`}
        className="btn-ghost !py-1 text-xs disabled:opacity-60"
        onClick={() => {
          if (kind === 'friend' && !confirm(`Huỷ kết bạn với ${name}?`)) return;
          // Ở đây `id` là id của hàng quan hệ, không phải id người dùng, nên
          // dùng removeFriendship chứ không phải bản …With.
          act(() => removeFriendship(id), () => setGone(true));
        }}>
        <UserRoundX size={14} /> {kind === 'incoming' ? 'Từ chối' : kind === 'outgoing' ? 'Rút lại' : 'Huỷ kết bạn'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
