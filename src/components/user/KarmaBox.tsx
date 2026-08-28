'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Scale, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { giveKarma } from '@/app/(site)/u/[username]/actions';
// Lấy từ bản "-const": phần còn lại của lib/karma đụng tới Prisma, kéo vào
// đây là kéo cả cơ sở dữ liệu vào gói tải về trình duyệt.
import { KARMA_REASON_MAX, KARMA_REASON_MIN, karmaLabel, karmaSigned, karmaTone } from '@/lib/karma-const';
import { cn } from '@/lib/utils';

/**
 * Ô uy tín trên trang cá nhân: con số, danh hiệu, và hai nút chấm.
 *
 * Bấm "+" hay "−" đều mở CÙNG một ô lý do chứ không chấm ngay. Chấm ngay thì
 * chỉ một cú chạm nhầm là uy tín người ta tụt, mà lý do lại là thứ bắt buộc —
 * để người bị chấm còn biết mình bị chê vì việc gì.
 */
export function KarmaBox({ targetId, username, karma, canGive, blockedReason, loggedIn, callbackUrl }: {
  targetId: string;
  username: string;
  karma: number;
  /** Người xem đủ điều kiện chấm không (đã tính cả nguội tay, hạn ngày…). */
  canGive: boolean;
  /** Vì sao không chấm được — hiện thành dòng nhỏ thay cho hai cái nút. */
  blockedReason?: string;
  loggedIn: boolean;
  callbackUrl: string;
}) {
  const [total, setTotal] = useState(karma);
  const [open, setOpen] = useState<1 | -1 | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const submit = () => {
    if (open === null) return;
    setError(null);
    const nac = open;
    start(async () => {
      const r = await giveKarma(targetId, nac, reason);
      if (r.error) { setError(r.error); return; }
      setTotal((t) => t + nac);
      setOpen(null);
      setReason('');
      setDone(true);
    });
  };

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-500">
          <Scale size={15} /> Uy tín
        </span>
        <b className={cn('text-lg tabular-nums', karmaTone(total))}>{karmaSigned(total)}</b>
        <span className="retro-sub text-ink-400">{karmaLabel(total)}</span>
        <Link href={`/u/${username}/uy-tin`} className="retro-sub ml-auto text-brand-600 hover:underline">
          Xem sổ uy tín
        </Link>
      </div>

      {done && <p className="mt-2 text-xs text-emerald-600">Đã ghi vào sổ uy tín.</p>}

      {!loggedIn ? (
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="retro-sub mt-2 inline-block text-brand-600 hover:underline">
          Đăng nhập để chấm uy tín
        </Link>
      ) : !canGive ? (
        blockedReason ? <p className="retro-sub mt-2 text-ink-400">{blockedReason}</p> : null
      ) : open === null ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setOpen(1); setDone(false); }}
            className="btn-outline gap-1.5 !py-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <ThumbsUp size={15} /> Tăng uy tín
          </button>
          <button type="button" onClick={() => { setOpen(-1); setDone(false); }}
            className="btn-outline gap-1.5 !py-1.5 text-sm text-rose-600 dark:text-rose-400">
            <ThumbsDown size={15} /> Giảm uy tín
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium">
            {open > 0 ? 'Tăng uy tín — vì sao?' : 'Giảm uy tín — vì sao?'}
          </p>
          {/* Có `name` để chỉ đích danh được: trang cá nhân còn ô soạn sổ lưu
              bút, chọn kiểu "ô cuối trang" là nhè nhầm ô kia. */}
          <textarea name="karmaReason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} autoFocus
            minLength={KARMA_REASON_MIN} maxLength={KARMA_REASON_MAX}
            placeholder="Ví dụ: trả lời giúp mình bài hỏi về nhạc chuông"
            className="input resize-y text-sm" />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={pending || reason.trim().length < KARMA_REASON_MIN}
              onClick={submit} className="btn-primary !py-1.5 text-sm disabled:opacity-60">
              {pending ? 'Đang ghi…' : 'Chấm'}
            </button>
            <button type="button" onClick={() => { setOpen(null); setError(null); }}
              className="btn-ghost !py-1.5 text-sm">
              <X size={15} /> Huỷ
            </button>
            <span className="retro-sub ml-auto text-ink-400">{reason.length}/{KARMA_REASON_MAX}</span>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
