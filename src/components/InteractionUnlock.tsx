'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ThumbsUp, MessageSquare, Check, LogIn, Target } from 'lucide-react';
import { toggleLike } from '@/app/(site)/posts/[slug]/actions';
import { fmtCount } from '@/lib/utils';

export type UnlockKind = 'LIKE' | 'COMMENT' | 'LIKE_COMMENT' | 'LIKE_GOAL' | 'COMMENT_GOAL';

export interface InteractionUnlockProps {
  postId: string;
  slug: string;
  kind: UnlockKind;
  loggedIn: boolean;
  /** Người xem đã thích / đã bình luận chưa (mức theo từng người). */
  did?: { liked: boolean; commented: boolean };
  /** Tiến độ với mức theo mốc chung. */
  goal?: { current: number; target: number };
  callbackUrl: string;
}

export function InteractionUnlock(props: InteractionUnlockProps) {
  const { postId, slug, kind, loggedIn, did, goal, callbackUrl } = props;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [liked, setLiked] = useState(!!did?.liked);

  const isGoal = kind === 'LIKE_GOAL' || kind === 'COMMENT_GOAL';

  const like = () =>
    start(async () => {
      const r = await toggleLike(postId);
      if (!r.error) {
        setLiked(r.active);
        router.refresh(); // để server tính lại quyền xem
      }
    });

  if (!loggedIn) {
    return (
      <Wrapper title={isGoal ? goalTitle(kind) : perUserTitle(kind)} desc={isGoal ? goalDesc(kind, goal) : 'Đăng nhập để mở khoá nội dung này.'}>
        {isGoal && goal && <Progress current={goal.current} target={goal.target} kind={kind} />}
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn-primary mt-4">
          <LogIn size={16} /> Đăng nhập
        </Link>
      </Wrapper>
    );
  }

  // ── Mốc chung: hiển thị tiến độ, ai cũng góp được ──
  if (isGoal && goal) {
    return (
      <Wrapper title={goalTitle(kind)} desc={goalDesc(kind, goal)}>
        <Progress current={goal.current} target={goal.target} kind={kind} />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {kind === 'LIKE_GOAL' ? (
            <button type="button" onClick={like} disabled={pending}
              className={`btn ${liked ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300' : 'btn-primary'} disabled:opacity-60`}>
              <ThumbsUp size={16} className={liked ? 'fill-current' : ''} /> {liked ? 'Đã thích — cảm ơn bạn!' : 'Thích để góp một lượt'}
            </button>
          ) : (
            <Link href={`/posts/${slug}/binh-luan`} className="btn-primary">
              <MessageSquare size={16} /> Viết bình luận
            </Link>
          )}
        </div>
      </Wrapper>
    );
  }

  // ── Theo từng người ──
  const needLike = kind === 'LIKE' || kind === 'LIKE_COMMENT';
  const needComment = kind === 'COMMENT' || kind === 'LIKE_COMMENT';
  const commented = !!did?.commented;

  return (
    <Wrapper title={perUserTitle(kind)} desc="Hoàn thành yêu cầu bên dưới là nội dung mở ra ngay.">
      <ul className="mx-auto mt-3 max-w-xs space-y-2 text-left">
        {needLike && (
          <li className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-3 py-2 dark:border-ink-700">
            <span className="flex items-center gap-2 text-sm"><ThumbsUp size={15} className="text-brand-500" /> Thích bài viết</span>
            {liked
              ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={14} /> Xong</span>
              : <button type="button" onClick={like} disabled={pending}
                  className="rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                  {pending ? '…' : 'Thích'}
                </button>}
          </li>
        )}
        {needComment && (
          <li className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-3 py-2 dark:border-ink-700">
            <span className="flex items-center gap-2 text-sm"><MessageSquare size={15} className="text-brand-500" /> Viết một bình luận</span>
            {commented
              ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={14} /> Xong</span>
              : <Link href={`/posts/${slug}/binh-luan`}
                  className="rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600">
                  Bình luận
                </Link>}
          </li>
        )}
      </ul>
    </Wrapper>
  );
}

function Wrapper({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="card relative mt-6 overflow-hidden p-6 text-center sm:p-8">
      <div className="pointer-events-none absolute -top-16 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-white dark:to-ink-900" />
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
        <Target size={22} />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">{desc}</p>
      {children}
    </div>
  );
}

function Progress({ current, target, kind }: { current: number; target: number; kind: UnlockKind }) {
  const pct = Math.min(100, Math.round((current / Math.max(1, target)) * 100));
  const unit = kind === 'LIKE_GOAL' ? 'lượt thích' : 'bình luận';
  return (
    <div className="mx-auto mt-4 max-w-sm">
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-bold text-brand-600">{fmtCount(current)} / {fmtCount(target)}</span>
        <span className="text-xs text-ink-400">còn {fmtCount(Math.max(0, target - current))} {unit}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function perUserTitle(kind: UnlockKind): string {
  if (kind === 'LIKE') return 'Thích bài để mở khoá';
  if (kind === 'COMMENT') return 'Bình luận để mở khoá';
  return 'Thích và bình luận để mở khoá';
}

function goalTitle(kind: UnlockKind): string {
  return kind === 'LIKE_GOAL' ? 'Đủ lượt thích sẽ mở khoá' : 'Đủ bình luận sẽ mở khoá';
}

function goalDesc(kind: UnlockKind, goal?: { current: number; target: number }): string {
  const unit = kind === 'LIKE_GOAL' ? 'lượt thích' : 'bình luận';
  if (!goal) return `Nội dung mở cho tất cả khi đạt đủ ${unit}.`;
  return `Khi bài đạt ${fmtCount(goal.target)} ${unit}, nội dung sẽ mở cho tất cả mọi người.`;
}
