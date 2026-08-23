'use client';

import { useActionState, useState, useTransition } from 'react';
import { Flag, Heart, Loader2, Share2, Star } from 'lucide-react';
import { cn, fmtCount } from '@/lib/utils';
import { rateGame, recordShare, reportGame, toggleGameFavorite, type ReportState } from '@/app/(site)/games/actions';

export interface GameActionsProps {
  gameId: string;
  initialFavorite: boolean;
  favoriteCount: number;
  initialRating: number;
  initialRatingCount: number;
  myRating: number;
}

const REPORT_REASONS = [
  'Link tải hỏng',
  'File sai / không đúng game',
  'File hỏng / không cài được',
  'Nội dung vi phạm bản quyền',
  'Thông tin sai (version, dung lượng…)',
  'Khác',
];

/** Cụm nút Favorite / Share / Report + chấm sao trên trang chi tiết game. */
export function GameActions({ gameId, initialFavorite, favoriteCount, initialRating, initialRatingCount, myRating }: GameActionsProps) {
  const [fav, setFav] = useState(initialFavorite);
  const [favCount, setFavCount] = useState(favoriteCount);
  const [rating, setRating] = useState(initialRating);
  const [ratingCount, setRatingCount] = useState(initialRatingCount);
  const [mine, setMine] = useState(myRating);
  const [hover, setHover] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [pending, start] = useTransition();

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  const onFav = () => start(async () => {
    const r = await toggleGameFavorite(gameId);
    if (r.error) return flash(r.error);
    setFav(r.active);
    setFavCount((c) => Math.max(0, c + (r.active ? 1 : -1)));
    flash(r.active ? 'Đã thêm vào yêu thích' : 'Đã bỏ yêu thích');
  });

  const onRate = (score: number) => start(async () => {
    const r = await rateGame(gameId, score);
    if (r.error) return flash(r.error);
    setRating(r.rating); setRatingCount(r.ratingCount); setMine(r.mine);
    flash(`Đã chấm ${score} sao`);
  });

  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) await navigator.share({ url });
      else { await navigator.clipboard.writeText(url); flash('Đã sao chép liên kết'); }
      void recordShare(gameId);
    } catch {
      // người dùng huỷ hộp chia sẻ
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button" onClick={onFav} disabled={pending}
          className={cn('btn flex-1 border', fav
            ? 'border-accent-500 bg-accent-500 text-white'
            : 'border-ink-200 text-ink-600 hover:border-accent-400 hover:text-accent-500 dark:border-ink-700 dark:text-ink-300')}
        >
          <Heart size={16} fill={fav ? 'currentColor' : 'none'} /> {fmtCount(favCount)}
        </button>
        <button type="button" onClick={onShare} className="btn-outline flex-1"><Share2 size={16} /> Chia sẻ</button>
        <button type="button" onClick={() => setShowReport((v) => !v)} className="btn-outline flex-1">
          <Flag size={16} /> Báo lỗi
        </button>
      </div>

      <div className="mt-4 border-t border-ink-100 pt-3 dark:border-ink-800">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">Đánh giá của bạn</p>
        <div className="flex items-center gap-2">
          <span className="flex" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i} type="button" disabled={pending}
                onMouseEnter={() => setHover(i)} onClick={() => onRate(i)}
                aria-label={`Chấm ${i} sao`} className="p-0.5"
              >
                <Star
                  size={20}
                  className={i <= (hover || mine) ? 'text-amber-400' : 'text-ink-300 dark:text-ink-600'}
                  fill={i <= (hover || mine) ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </span>
          <span className="text-sm text-ink-400">
            {ratingCount > 0 ? `${rating.toFixed(1)}/5 · ${fmtCount(ratingCount)} lượt` : 'Chưa có đánh giá'}
          </span>
          {pending && <Loader2 size={14} className="animate-spin text-ink-400" />}
        </div>
      </div>

      {showReport && <ReportForm gameId={gameId} onDone={() => { setShowReport(false); flash('Đã gửi báo lỗi, cảm ơn bạn!'); }} />}

      {toast && <p className="mt-3 rounded-lg bg-brand-50 p-2 text-center text-xs text-brand-600 dark:bg-brand-950/40">{toast}</p>}
    </div>
  );
}

function ReportForm({ gameId, onDone }: { gameId: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(
    async (prev, fd) => {
      const r = await reportGame(prev, fd);
      if (r.ok) onDone();
      return r;
    },
    {},
  );

  return (
    <form action={action} className="mt-4 space-y-2 border-t border-ink-100 pt-3 dark:border-ink-800">
      <input type="hidden" name="gameId" value={gameId} />
      <select name="reason" required className="input !py-2 text-sm" defaultValue="">
        <option value="" disabled>Chọn lý do…</option>
        {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <textarea name="detail" rows={2} placeholder="Mô tả thêm (tuỳ chọn)" className="input text-sm" />
      {state.error && <p className="text-xs text-red-500">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full !py-2 text-sm">
        {pending && <Loader2 size={14} className="animate-spin" />} Gửi báo lỗi
      </button>
    </form>
  );
}
