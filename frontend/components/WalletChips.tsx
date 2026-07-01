'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Gem, Coins } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { formatCoin } from '@/lib/format';
import { useAuth } from './AuthProvider';

// Hiển thị số dư Gem + Coin trên header (luôn hiện khi đã đăng nhập)
export function WalletChips() {
  const { user } = useAuth();
  const { data: gem } = useSWR<{ balance: number }>(user ? '/gem/balance' : null, fetcher, { revalidateOnFocus: false, dedupingInterval: 15_000 });
  const { data: char } = useSWR<{ coinBalance?: number }>(user ? '/game/character' : null, fetcher, { revalidateOnFocus: false, dedupingInterval: 15_000 });

  if (!user) return null;
  const coin = char?.coinBalance ?? 0;
  const gemBal = gem?.balance ?? 0;

  return (
    <div className="flex items-center gap-1.5">
      <Link href="/wallet" title="Ví Gem" className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs font-semibold text-white hover:bg-white/25">
        <Gem size={13} className="text-fuchsia-200" /> {formatCoin(gemBal)}
      </Link>
      <Link href="/cong-game" title="Coin trong game" className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs font-semibold text-white hover:bg-white/25">
        <Coins size={13} className="text-amber-200" /> {formatCoin(coin)}
      </Link>
    </div>
  );
}
