'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Lock, Coins, Crown, LogIn, Wallet } from 'lucide-react';
import type { AccessReason } from '@/lib/access';
import { fmtCount, fmtVnd } from '@/lib/utils';
import { unlockPost, type UnlockState } from '@/app/(site)/posts/[slug]/actions';
import { CouponField } from './CouponField';
import { ActionForm } from '@/components/ActionForm';

export interface PaywallProps {
  postId: string;
  slug: string;
  reason: AccessReason;
  pricePoints?: number | null;
  callbackUrl: string;
}

export function Paywall(props: PaywallProps) {
  const { postId, slug, reason, pricePoints, callbackUrl } = props;
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

      {reason === 'NEED_POINTS' && (
        <>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
            Mở khoá vĩnh viễn bằng <strong>{fmtCount(pricePoints)} điểm</strong>.
          </p>
          <ActionForm action={action} className="mt-4">
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="slug" value={slug} />
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
              <Coins size={16} /> {pending ? 'Đang mở khoá…' : `Mở khoá bằng ${fmtCount(pricePoints)} điểm`}
            </button>
            <CouponField />
          </ActionForm>
        </>
      )}

      {state.error && <p className="mt-3 text-sm font-medium text-red-600">{state.error}</p>}
      {state.ok && <p className="mt-3 text-sm font-medium text-green-600">Đã mở khoá! Đang tải nội dung…</p>}
    </div>
  );
}
