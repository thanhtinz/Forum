'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Dices, Coins, Trophy, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

type Game = 'tai-xiu' | 'coin-flip' | 'lucky-wheel' | 'dua-thu' | 'jackpot' | 'bau-cua';
const GAMES: [Game, string][] = [
  ['tai-xiu', 'Tài Xỉu'], ['bau-cua', 'Bầu Cua'], ['coin-flip', 'Tung Xu'],
  ['lucky-wheel', 'Vòng Quay'], ['dua-thu', 'Đua Thú'], ['jackpot', 'Jackpot 777'],
];
const BAUCUA: [string, string][] = [['bau', 'Bầu'], ['cua', 'Cua'], ['tom', 'Tôm'], ['ca', 'Cá'], ['ga', 'Gà'], ['nai', 'Nai']];
const BOARD = '/game-assets/avatar/gameroom/imgTable.png';
const COIN = '/game-assets/jackpot/coin.png';
const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function SoloPlay() {
  const { user, loading } = useAuth();
  const initial = (useSearchParams().get('game') as Game) || 'tai-xiu';
  const game: Game = GAMES.some(([g]) => g === initial) ? initial : 'tai-xiu';
  const gameLabel = GAMES.find(([g]) => g === game)?.[1] || 'Minigame';
  const [bet, setBet] = useState(100);
  const [choice, setChoice] = useState<string>('tai');
  const [duaThu, setDuaThu] = useState(1);
  const [symbol, setSymbol] = useState('bau');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để chơi.</div>;

  async function play() {
    setBusy(true); setMsg(''); setResult(null);
    try {
      let body: any = { betCoin: bet };
      if (game === 'tai-xiu') body.choice = choice === 'xiu' ? 'xiu' : 'tai';
      else if (game === 'coin-flip') body.choice = choice === 'tails' ? 'tails' : 'heads';
      else if (game === 'dua-thu') body.choice = duaThu;
      else if (game === 'bau-cua') body = { bets: [{ symbol, amount: bet }] };
      const r = await api.post<any>(`/minigame/${game}`, body);
      setResult(r);
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  const won = result && ((result.netCoin ?? 0) > 0 || result.won || result.isJackpot);

  return (
    <div className="space-y-4">
      <Link href="/cong-game" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Trò chơi khác</Link>
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-card">
        <Dices /> <h1 className="text-2xl font-bold">{gameLabel}</h1>
      </header>
      <p className="flex items-center gap-1 text-xs text-ink-500">Chơi bằng <Coins size={13} className="text-amber-500" /> Vàng (coin). Kiếm coin qua forum/game.</p>

      <div className="card space-y-3 bg-cover bg-center p-4" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.86),rgba(255,255,255,.86)), url(${BOARD})` }}>
        <label className="block text-sm">Tiền cược (coin)<input type="number" className="input mt-1 w-40" value={bet} onChange={(e) => setBet(Number(e.target.value))} /></label>

        {game === 'tai-xiu' && (
          <div className="flex gap-2">
            {['tai', 'xiu'].map((c) => <button key={c} onClick={() => setChoice(c)} className={`flex-1 rounded-lg py-2 text-sm font-medium ${choice === c ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{c === 'tai' ? 'TÀI (11-17)' : 'XỈU (4-10)'}</button>)}
          </div>
        )}
        {game === 'coin-flip' && (
          <div className="flex gap-2">
            {[['heads', 'Sấp (Heads)'], ['tails', 'Ngửa (Tails)']].map(([c, l]) => <button key={c} onClick={() => setChoice(c)} className={`flex-1 rounded-lg py-2 text-sm ${choice === c ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{l}</button>)}
          </div>
        )}
        {game === 'dua-thu' && (
          <div>
            <p className="mb-1 text-xs text-ink-500">Chọn thú để đặt cược (1 ăn 5):</p>
            {/* Sàn chạy đua thú */}
            <div className="space-y-1 rounded-xl border-4 border-amber-700/70 bg-gradient-to-b from-lime-600/30 to-green-700/30 p-2">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                const winner = result?.winner === n;
                return (
                  <button key={n} onClick={() => setDuaThu(n)}
                    className={`flex w-full items-center gap-2 rounded-md border-y border-dashed border-white/40 px-2 py-1 text-left ${duaThu === n ? 'bg-amber-300/40 ring-2 ring-amber-500' : 'bg-black/5 hover:bg-black/10'}`}>
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-ink-600">{n}</span>
                    <img src={`/game-assets/duathu/${n}.gif`} alt={`Thú ${n}`} className={`h-8 object-contain transition-all ${winner ? 'translate-x-2 scale-125' : ''}`} />
                    <span className="flex-1 border-b-2 border-dotted border-white/50" />
                    <span className="shrink-0 text-lg">{winner ? '🏁🥇' : '🏁'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {game === 'bau-cua' && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {BAUCUA.map(([s, l]) => (
              <button key={s} onClick={() => setSymbol(s)} className={`flex flex-col items-center rounded-lg border-2 p-1.5 ${symbol === s ? 'border-brand-600 bg-brand-50 dark:bg-ink-800' : 'border-transparent bg-ink-100 dark:bg-ink-800'}`}>
                <img src={`/game-assets/baucua/${s}.png`} alt={l} className="h-10 w-10 object-contain" />
                <span className="text-[11px] font-medium">{l}</span>
              </button>
            ))}
          </div>
        )}
        {game === 'jackpot' && (
          <div className="mx-auto w-fit rounded-2xl border-4 border-amber-500 bg-gradient-to-b from-red-700 to-red-900 p-3 shadow-lg">
            <div className="mb-2 text-center text-lg font-extrabold tracking-widest text-amber-300">🎰 777</div>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-ink-950/70 p-2">
              {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => {
                const sym = result?.grid?.[c]?.[r] || ['seven', 'bar', 'bell', 'cherry', 'lemon', 'coin'][(r * 3 + c) % 6];
                return <img key={`${c}-${r}`} src={`/game-assets/jackpot/${sym}.png`} alt="" className="h-12 w-12 rounded bg-white/90 object-contain p-0.5" />;
              }))}
            </div>
            <p className="mt-2 text-center text-[11px] text-amber-100/80">Quay 3×3 · 5 dòng thắng · cược mỗi dòng</p>
          </div>
        )}

        <button onClick={play} disabled={busy} className="btn-primary">{busy ? 'Đang chơi…' : 'Chơi'}</button>
        {msg && <p className="text-sm text-red-500">{msg}</p>}
      </div>

      {result && (
        <div className={`card border p-5 text-center ${won ? 'border-emerald-400' : 'border-rose-400'}`}>
          <div className={`flex items-center justify-center gap-1.5 text-xl font-bold ${won ? 'text-emerald-600' : 'text-rose-600'}`}>{won ? <><Trophy size={20} /> THẮNG!</> : 'Thua'}</div>

          {/* Hình ảnh kết quả theo game */}
          {game === 'bau-cua' && Array.isArray(result.dice) && (
            <div className="mt-3 flex justify-center gap-3">
              {result.dice.map((d: string, i: number) => <img key={i} src={`/game-assets/baucua/${d}.png`} alt={d} className="h-14 w-14 object-contain" />)}
            </div>
          )}
          {game === 'dua-thu' && result.winner != null && (
            <div className="mt-3 flex flex-col items-center">
              <img src={`/game-assets/duathu/${result.winner}.gif`} alt="winner" className="h-16 object-contain" />
              <span className="text-xs text-ink-500">Thú thắng: {result.winner}</span>
            </div>
          )}
          {game === 'tai-xiu' && Array.isArray(result.dice) && (
            <div className="mt-3 flex justify-center gap-3 text-5xl leading-none">
              {result.dice.map((d: number, i: number) => <span key={i}>{DICE_FACE[d] || '🎲'}</span>)}
            </div>
          )}
          {game === 'coin-flip' && result.result && (
            <div className="mt-3 flex flex-col items-center">
              <img src={COIN} alt="coin" className="h-16 w-16 object-contain" />
              <span className="text-sm text-ink-500">{result.result === 'heads' ? 'Sấp (Heads)' : 'Ngửa (Tails)'}</span>
            </div>
          )}
          {game === 'lucky-wheel' && result.multiplier != null && (
            <div className="mt-3 flex flex-col items-center">
              <span className="text-5xl">🎡</span>
              <span className="text-lg font-bold text-brand-600">x{result.multiplier}</span>
            </div>
          )}

          <div className="mt-2 text-sm text-ink-500">
            {result.outcome && `Kết quả: ${String(result.outcome).toUpperCase()} `}{result.total != null && `(tổng ${result.total}) `}
            {Array.isArray(result.dice) && `· [${result.dice.join(', ')}] `}
            {result.multiplier != null && `· x${result.multiplier} `}{result.winner != null && `· thú thắng: ${result.winner}`}
            {result.isJackpot && ' · 🎰 JACKPOT!'}
          </div>
          <div className="mt-1 font-medium">{(result.netCoin ?? 0) >= 0 ? '+' : ''}{result.netCoin ?? 0} coin</div>
          <button onClick={() => setResult(null)} className="btn-outline mt-3 text-xs">Chơi tiếp</button>
        </div>
      )}
    </div>
  );
}

export default function SoloPage() {
  return (
    <Suspense fallback={<div className="card p-8 text-center text-ink-500">Đang tải…</div>}>
      <SoloPlay />
    </Suspense>
  );
}
