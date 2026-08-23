'use client';

import { useState, useTransition } from 'react';
import { Heart, Reply as ReplyIcon, CheckCircle2 } from 'lucide-react';
import { cn, fmtCount } from '@/lib/utils';
import { toggleReplyLike, markSolution } from '@/app/(site)/forum/actions';
import { ReplyForm } from './ReplyForm';
import { ReportButton } from '@/components/ReportButton';

export function ReplyActions({ threadId, replyId, initialLiked, initialLikeCount, loggedIn, callbackUrl, canReply, canMarkSolution, canReport }: {
  threadId: string; replyId: string; initialLiked: boolean; initialLikeCount: number;
  loggedIn: boolean; callbackUrl: string; canReply?: boolean; canMarkSolution?: boolean;
  /** Không hiện với bài của chính mình — tự báo cáo mình thì vô nghĩa. */
  canReport?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialLikeCount);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onLike = () => start(async () => {
    const r = await toggleReplyLike(replyId);
    if (r.error) { setMsg(r.error); return; }
    setLiked(r.active); setCount(r.count);
  });

  const onSolve = () => start(async () => {
    const r = await markSolution(threadId, replyId);
    if (r.error) setMsg(r.error);
  });

  return (
    <div>
      <div className="mt-1.5 flex items-center gap-4 text-xs text-ink-400">
        <button type="button" onClick={onLike} disabled={pending}
          className={cn('flex items-center gap-1 transition-colors hover:text-accent-500 disabled:opacity-60', liked && 'text-accent-500')}>
          <Heart size={13} className={liked ? 'fill-current' : ''} />{fmtCount(count)}
        </button>
        {canReply && (
          <button type="button" onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1 transition-colors hover:text-brand-600">
            <ReplyIcon size={13} /> Trả lời
          </button>
        )}
        {canReport && (
          <ReportButton target="reply" targetId={replyId}
            className="flex items-center gap-1 transition-colors hover:text-red-500" />
        )}
        {canMarkSolution && (
          <button type="button" onClick={onSolve} disabled={pending}
            className="flex items-center gap-1 font-medium text-emerald-600 transition-colors hover:text-emerald-700 disabled:opacity-60">
            <CheckCircle2 size={13} /> Chọn làm lời giải
          </button>
        )}
      </div>
      {msg && <p className="mt-1 text-xs text-red-600">{msg}</p>}
      {showForm && (
        <div className="mt-3">
          <ReplyForm threadId={threadId} parentId={replyId} loggedIn={loggedIn} callbackUrl={callbackUrl} compact autoFocus onDone={() => setShowForm(false)} />
        </div>
      )}
    </div>
  );
}
