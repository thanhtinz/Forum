'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Lock, Coins, Gem, ShoppingBag, Crown, LogIn, Download, KeyRound, Hash } from 'lucide-react';
import type { AccessReason } from '@/lib/access';
import { fmtBytes, fmtVnd } from '@/lib/utils';
import { unlockPost, type UnlockState } from '@/app/(site)/posts/[slug]/actions';

export interface DownloadItemData {
  id: string;
  label: string;
  url: string;
  provider?: string | null;
  version?: string | null;
  password?: string | null;
  extractCode?: string | null;
  sizeBytes?: number | null;
}

export interface VipPlanRow {
  tier: number;
  name: string;
  discountPercent: number;
  freeContent: boolean;
}

export interface DownloadBoxProps {
  postId: string;
  slug: string;
  allowed: boolean;
  reason: AccessReason;
  access: string; // AccessLevel
  pricePoints?: number | null;
  priceAmount?: number | null;
  downloads: DownloadItemData[];
  plans: VipPlanRow[];
  updatedAt: string; // yyyy-MM-dd
  callbackUrl: string;
}

/** Giá gốc cho người dùng thường, dạng chuỗi hiển thị. */
function basePrice(pricePoints?: number | null, priceAmount?: number | null): { text: string; isPoints: boolean; value: number } {
  if (pricePoints != null) return { text: `${pricePoints}`, isPoints: true, value: pricePoints };
  return { text: fmtVnd(priceAmount), isPoints: false, value: priceAmount ?? 0 };
}

/** Giá cho một bậc VIP sau khi áp quyền lợi. */
function planPrice(plan: VipPlanRow, bp: ReturnType<typeof basePrice>): string {
  if (plan.freeContent) return 'Miễn phí';
  const discounted = Math.round(bp.value * (1 - plan.discountPercent / 100));
  return bp.isPoints ? `${discounted} điểm` : fmtVnd(discounted);
}

export function DownloadBox(props: DownloadBoxProps) {
  const { postId, slug, allowed, reason, access, pricePoints, priceAmount, downloads, plans, updatedAt, callbackUrl } = props;
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlockPost, {});
  const bp = basePrice(pricePoints, priceAmount);

  return (
    <div className="relative mt-8 overflow-hidden rounded-2xl border-2 border-dashed border-brand-400 bg-white p-4 shadow-card dark:border-brand-700 dark:bg-ink-900 sm:p-6">
      {/* Ruy-băng góc phải */}
      <span className="pointer-events-none absolute -right-11 top-5 rotate-45 bg-green-500 px-12 py-1 text-center text-xs font-bold tracking-wide text-white shadow">
        Tải xuống
      </span>

      {/* Header */}
      <h3 className="flex items-center gap-2 pr-14 text-base font-extrabold text-green-600 dark:text-green-400 sm:text-lg">
        <Lock size={20} className="shrink-0" />
        {allowed ? 'Bạn có quyền tải xuống tài nguyên này' : 'Cần quyền để tải xuống tài nguyên này'}
      </h3>

      {allowed ? (
        /* ─── Đã mở khoá: danh sách file ─── */
        <div className="mt-4 space-y-3">
          {downloads.map((d) => (
            <div key={d.id} className="rounded-xl border border-ink-200 bg-ink-50 p-3.5 dark:border-ink-700 dark:bg-ink-800/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{d.label}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-500">
                    {d.version && <span>Phiên bản {d.version}</span>}
                    <span>{fmtBytes(d.sizeBytes)}</span>
                    {d.provider && <span className="uppercase">{d.provider}</span>}
                  </p>
                </div>
                <a href={d.url} target="_blank" rel="noopener noreferrer"
                  className="btn bg-green-500 text-white hover:bg-green-600">
                  <Download size={16} /> Tải xuống
                </a>
              </div>
              {(d.password || d.extractCode) && (
                <div className="mt-2.5 flex flex-wrap gap-2 border-t border-ink-200 pt-2.5 text-xs dark:border-ink-700">
                  {d.password && (
                    <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-mono dark:bg-ink-900">
                      <KeyRound size={12} className="text-ink-400" /> Mật khẩu: <b>{d.password}</b>
                    </span>
                  )}
                  {d.extractCode && (
                    <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-mono dark:bg-ink-900">
                      <Hash size={12} className="text-ink-400" /> Mã trích xuất: <b>{d.extractCode}</b>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* ─── Bị khoá: bong bóng giá + bảng VIP + nút mua ─── */
        <>
          {/* Bong bóng giá */}
          <div className="relative mt-4 rounded-xl bg-amber-50 px-5 py-4 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 text-2xl font-black text-ink-800 dark:text-ink-100">
              <Coins className="text-red-500" size={26} />
              {bp.isPoints
                ? <><span>{bp.text}</span><span className="text-base font-semibold text-ink-500">điểm</span></>
                : <span>{bp.text}</span>}
            </div>
            {/* mũi nhọn chỉ xuống */}
            <span className="absolute -bottom-2 left-8 h-4 w-4 rotate-45 bg-amber-50 dark:bg-amber-950/30" />
          </div>

          {/* Bảng giá VIP */}
          <div className="mt-4 rounded-xl border border-dashed border-amber-400 p-4">
            <p className="mb-3 flex items-center justify-center gap-1.5 font-bold text-red-500">
              <Gem size={16} /> Giảm giá VIP
            </p>
            <ul className="space-y-3">
              <TierRow color="#64748b" label="Người Dùng Thông Thường"
                value={access === 'VIP_ONLY' ? 'Không thể mua' : (bp.isPoints ? `${bp.text} điểm` : bp.text)}
                muted={access === 'VIP_ONLY'} last={plans.length === 0} />
              {plans.map((p, i) => (
                <TierRow key={p.tier}
                  color={p.freeContent ? '#f59e0b' : '#22c55e'}
                  label={`Thành Viên ${p.name}`}
                  value={planPrice(p, bp)}
                  highlight
                  last={i === plans.length - 1} />
              ))}
            </ul>
          </div>

          {/* Nút hành động theo lý do khoá */}
          <div className="mt-4">
            {reason === 'NEED_LOGIN' && (
              <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="btn w-full bg-red-600 py-3 text-base text-white hover:bg-red-700">
                <LogIn size={18} /> Đăng nhập để mua
              </Link>
            )}
            {reason === 'NEED_VIP' && (
              <Link href="/vip" className="btn w-full bg-amber-500 py-3 text-base text-white hover:bg-amber-600">
                <Crown size={18} /> Nâng cấp VIP để tải
              </Link>
            )}
            {(reason === 'NEED_POINTS' || reason === 'NEED_PAYMENT') && (
              <form action={action}>
                <input type="hidden" name="postId" value={postId} />
                <input type="hidden" name="slug" value={slug} />
                <button type="submit" disabled={pending}
                  className="btn w-full bg-red-600 py-3 text-base text-white hover:bg-red-700 disabled:opacity-60">
                  <ShoppingBag size={18} /> {pending ? 'Đang xử lý…' : 'Mua quyền tải xuống'}
                </button>
              </form>
            )}
            {state.error && <p className="mt-2 text-center text-sm font-medium text-red-600">{state.error}</p>}
            {state.ok && <p className="mt-2 text-center text-sm font-medium text-green-600">Đã mở khoá! Đang tải lại…</p>}
          </div>
        </>
      )}

      {/* Chân khối */}
      <p className="mt-5 text-sm text-ink-500">Bao gồm tài nguyên: ({downloads.length} mục)</p>
      <hr className="my-3 border-ink-200 dark:border-ink-800" />
      <p className="text-sm text-ink-500">Cập nhật gần đây: {updatedAt}</p>
      <p className="mt-3 text-sm text-ink-400">
        Gặp vấn đề khi tải về? Liên hệ dịch vụ khách hàng hoặc phản hồi
      </p>
    </div>
  );
}

function TierRow({ color, label, value, highlight, muted, last }: {
  color: string; label: string; value: string; highlight?: boolean; muted?: boolean; last?: boolean;
}) {
  return (
    <li className="relative flex items-start justify-between gap-3 pl-6">
      {/* dấu chấm + đường nối timeline */}
      <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      {!last && <span className="absolute left-[5px] top-2 h-full w-px bg-ink-200 dark:bg-ink-700" />}
      <span className="text-sm font-semibold sm:text-base" style={highlight ? { color } : undefined}>{label}:</span>
      <span className={`shrink-0 whitespace-nowrap text-sm sm:text-base ${muted ? 'font-semibold text-ink-500' : 'font-bold'}`} style={highlight ? { color } : undefined}>{value}</span>
    </li>
  );
}
