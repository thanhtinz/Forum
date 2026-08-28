'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { UserPlus, UserMinus, Clock, LogIn, Crown, MailOpen, X } from 'lucide-react';
import { joinClub, leaveClub, respondInvite } from '@/app/(site)/clb/actions';

/** Nút vào / rời câu lạc bộ; đổi mặt theo quan hệ hiện tại của người xem. */
export function ClubJoinButton({ clubId, status, isOwner, joinMode, loggedIn, callbackUrl }: {
  clubId: string;
  status: 'PENDING' | 'INVITED' | 'ACTIVE' | null;
  isOwner: boolean;
  joinMode: string;
  loggedIn: boolean;
  callbackUrl: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.error) { setError(r.error); return; }
      router.refresh();
    });
  };

  if (isOwner) {
    return (
      <span className="chip gap-1.5 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
        <Crown size={14} /> Bạn là chủ câu lạc bộ
      </span>
    );
  }

  if (!loggedIn) {
    return (
      <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn-primary !py-2">
        <LogIn size={15} /> Đăng nhập để vào nhóm
      </Link>
    );
  }

  return (
    <div className="text-right">
      {status === 'INVITED' ? (
        // Được mời thì không hỏi "tham gia" nữa — chỉ còn nhận lời hay thôi.
        <span className="inline-flex flex-wrap items-center justify-end gap-2">
          <span className="chip gap-1.5 bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
            <MailOpen size={14} /> Bạn được mời vào nhóm
          </span>
          <button type="button" disabled={pending} onClick={() => run(() => respondInvite(clubId, true))}
            className="btn-primary !py-2 disabled:opacity-60">
            <UserPlus size={15} /> {pending ? 'Đang vào…' : 'Nhận lời'}
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => respondInvite(clubId, false))}
            className="btn-ghost !py-2 disabled:opacity-60" title="Từ chối lời mời">
            <X size={15} />
          </button>
        </span>
      ) : status === 'ACTIVE' ? (
        <button type="button" disabled={pending} onClick={() => run(() => leaveClub(clubId))}
          className="btn-ghost !py-2 disabled:opacity-60">
          <UserMinus size={15} /> {pending ? 'Đang rời…' : 'Rời câu lạc bộ'}
        </button>
      ) : status === 'PENDING' ? (
        <button type="button" disabled={pending} onClick={() => run(() => leaveClub(clubId))}
          className="btn-ghost !py-2 disabled:opacity-60" title="Bấm để rút đơn">
          <Clock size={15} /> {pending ? 'Đang rút…' : 'Đang chờ duyệt — rút đơn'}
        </button>
      ) : joinMode === 'CLOSED' ? (
        <span className="chip bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">Không nhận thêm thành viên</span>
      ) : (
        <button type="button" disabled={pending} onClick={() => run(() => joinClub(clubId))}
          className="btn-primary !py-2 disabled:opacity-60">
          <UserPlus size={15} />
          {pending ? 'Đang gửi…' : joinMode === 'APPROVAL' ? 'Xin vào nhóm' : 'Tham gia'}
        </button>
      )}
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
