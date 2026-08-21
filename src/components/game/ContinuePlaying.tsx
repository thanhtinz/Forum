'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, Play } from 'lucide-react';
import type { GameCardData } from '@/lib/game';
import { GameCard } from './GameCard';

interface ContinueEntry { slug: string; title: string; versionId: string; at: number }

const CONTINUE_KEY = 'nova:games:continue';

export interface ContinuePlayingProps {
  /** Game người dùng đã chơi gần đây, lấy từ phiên emulator trên máy chủ. */
  serverGames: GameCardData[];
  /** Chỉ điện thoại mới chơi tiếp được — máy tính không hiện mục này. */
  mobile?: boolean;
}

/**
 * "Continue Playing".
 *
 * Thành viên lấy từ phiên emulator đã lưu; khách chưa đăng nhập thì dựng lại
 * từ localStorage do `EmulatorStage` ghi sau mỗi lần mở phiên.
 */
export function ContinuePlaying({ serverGames, mobile = false }: ContinuePlayingProps) {
  const [local, setLocal] = useState<ContinueEntry[]>([]);

  useEffect(() => {
    if (!mobile || serverGames.length > 0) return;
    try {
      const raw = localStorage.getItem(CONTINUE_KEY);
      if (raw) setLocal((JSON.parse(raw) as ContinueEntry[]).slice(0, 8));
    } catch {
      // localStorage bị chặn — coi như chưa chơi game nào
    }
  }, [mobile, serverGames.length]);

  // Mục "tiếp tục chơi" chỉ có nghĩa khi chơi được — tức là trên điện thoại.
  if (!mobile) return null;
  if (serverGames.length === 0 && local.length === 0) return null;

  return (
    <section>
      <h2 className="zib-title mb-3 flex items-center gap-2"><History size={18} /> Tiếp tục chơi</h2>
      {serverGames.length > 0 ? (
        <div className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          {serverGames.map((g) => <GameCard key={g.id} game={g} variant="compact" mobile />)}
        </div>
      ) : (
        <div className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          {local.map((e) => (
            <Link key={e.slug} href={`/games/${e.slug}/play`} className="post-card w-36 shrink-0 p-3 sm:w-40">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-950">
                <Play size={26} />
              </span>
              <p className="mt-2 line-clamp-2 text-center text-sm font-semibold leading-snug">{e.title}</p>
              <p className="mt-0.5 text-center text-[11px] text-ink-400">Chơi tiếp</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
