'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Lock, Coins, Crown, LogIn, Wallet } from 'lucide-react';
import type { AccessReason } from '@/lib/access';
import { fmtCount, fmtVnd } from '@/lib/utils';
import { unlockPost, type UnlockState } from '@/app/(site)/posts/[slug]/actions';

export interface PaywallProps {
  postId: string;
  slug: string;
  reason: AccessReason;
  pricePoints?: number | null;
  priceAmount?: number | null;
  vipTierFree?: number | null;
  callbackUrl: string;
}

export function Paywall(props: PaywallProps) {
  const { postId, slug, reason, pricePoints, priceAmount, vipTierFree, callbackUrl } = props;
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlockPost, {});

  return (
    <div className="card relative mt-6 overflow-hidden p-6 text-center sm:p-8">
      {/* Vệt mờ gợi ý còn nội dung phía dưới */}
      <div className="pointer-events-none absolute -top-16 left-0 right-0 h-16 bg-gradient-to-b from-transparent to-white dark:to-ink-900" />

      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
        <Lock size={22} />
      </div>
      <h3 className="text-lg font-bold">Nội dung bị khoá</h3>

      {reason === 'NEED_LOGIN' && (
        <>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
            Đăng nhập để xem toàn bộ nội dung bài viết này.
          </p>
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn-primary mt-4">
            <LogIn size={16} /> Đăng nhập
          </Link>
        </>
      )}

      {reason === 'NEED_VIP' && (
        <>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
            Nội dung độc quyền cho thành viên VIP{vipTierFree ? ` bậc ${vipTierFree} trở lên` : ''}.
          </p>
          <Link href="/vip" className="btn mt-4 bg-amber-500 text-white hover:bg-amber-600">
            <Crown size={16} /> Nâng cấp VIP
          </Link>
        </>
      )}

      {reason === 'NEED_POINTS' && (
        <>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
            Mở khoá vĩnh viễn bằng <strong>{fmtCount(pricePoints)} điểm</strong>.
          </p>
          <form action={action} className="mt-4">
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="slug" value={slug} />
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
              <Coins size={16} /> {pending ? 'Đang mở khoá…' : `Mở khoá bằng ${fmtCount(pricePoints)} điểm`}
            </button>
          </form>
        </>
      )}

      {reason === 'NEED_PAYMENT' && (
        <>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
            Mua một lần, xem mãi mãi — <strong>{fmtVnd(priceAmount)}</strong> (trừ vào số dư).
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <form action={action}>
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="slug" value={slug} />
              <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
                <Wallet size={16} /> {pending ? 'Đang xử lý…' : `Mua với ${fmtVnd(priceAmount)}`}
              </button>
            </form>
            <Link href={`/user/balance?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="btn-outline">
              Nạp thêm
            </Link>
          </div>
        </>
      )}

      {state.error && <p className="mt-3 text-sm font-medium text-red-600">{state.error}</p>}
      {state.ok && <p className="mt-3 text-sm font-medium text-green-600">Đã mở khoá! Đang tải nội dung…</p>}
    </div>
  );
}
