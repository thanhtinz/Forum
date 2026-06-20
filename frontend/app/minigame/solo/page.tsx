'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Dices, Coins, Trophy, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatCoin } from '@/lib/format';

type Game = 'tai-xiu' | 'coin-flip' | 'lucky-wheel' | 'dua-thu' | 'jackpot' | 'bau-cua';
const GAMES: [Game, string][] = [
  ['tai-xiu', 'Tài Xỉu'], ['bau-cua', 'Bầu Cua'],
  ['dua-thu', 'Đua Thú'], ['jackpot', 'Jackpot 777'],
];
const BAUCUA: [string, string][] = [['bau', 'Bầu'], ['cua', 'Cua'], ['tom', 'Tôm'], ['ca', 'Cá'], ['ga', 'Gà'], ['nai', 'Nai']];
const BOARD = '/game-assets/avatar/gameroom/imgTable.png';
const COIN = '/game-assets/jackpot/coin.png';
const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
// Tên 7 con thú (khớp engine RaceGame), index theo lane 1..7
const RACE_NAMES = ['', 'Thánh nhím', 'Rồng huyền thoại', 'Rắn thợ săn', 'Mini Totoro', 'Con bướm xinh', 'Người ngoài hành tinh', 'Khủng long phun nửa'];

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
  const [animating, setAnimating] = useState(false);
  const [frame, setFrame] = useState(0);

  // tick để cuộn reel/đua thú khi đang chạy
  useEffect(() => {
    if (!animating) return;
    const id = setInterval(() => setFrame((f) => f + 1), 90);
    return () => clearInterval(id);
  }, [animating]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để chơi.</div>;

  async function play() {
    setBusy(true); setMsg(''); setResult(null);
    try {
      let body: any = { betCoin: bet };
      if (game === 'tai-xiu') body.choice = choice === 'xiu' ? 'xiu' : 'tai';
      else if (game === 'dua-thu') body.choice = duaThu;
      else if (game === 'bau-cua') body = { bets: [{ symbol, amount: bet }] };
      const r = await api.post<any>(`/minigame/${game}`, body);
      // Hiệu ứng chạy trước khi hiện kết quả
      if (game === 'jackpot' || game === 'dua-thu' || game === 'tai-xiu' || game === 'bau-cua') {
        setAnimating(true);
        const dur = game === 'jackpot' ? 1500 : game === 'dua-thu' ? 2400 : 1300;
        await new Promise((res) => setTimeout(res, dur));
        setAnimating(false);
      }
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

      <div
        className={`card space-y-3 p-4 ${game !== 'jackpot' && game !== 'dua-thu' ? 'bg-cover bg-center' : ''}`}
        style={game !== 'jackpot' && game !== 'dua-thu' ? { backgroundImage: `linear-gradient(rgba(255,255,255,.72),rgba(255,255,255,.72)), url(${BOARD})` } : undefined}
      >
        <label className="block text-sm">Tiền cược (coin)<input type="number" className="input mt-1 w-40" value={bet} onChange={(e) => setBet(Number(e.target.value))} /></label>

        {game === 'tai-xiu' && (
          <>
            <div className="flex gap-2">
              {['tai', 'xiu'].map((c) => <button key={c} disabled={animating} onClick={() => setChoice(c)} className={`flex-1 rounded-lg py-2 text-sm font-medium ${choice === c ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{c === 'tai' ? 'TÀI (11-17)' : 'XỈU (4-10)'}</button>)}
            </div>
            {/* Bát xúc xắc đang lắc */}
            {animating && (
              <div className="flex justify-center gap-3 text-5xl leading-none">
                {[0, 1, 2].map((i) => <span key={i} className="inline-block animate-bounce" style={{ animationDelay: `${i * 0.12}s` }}>{DICE_FACE[1 + ((frame + i * 2) % 6)]}</span>)}
              </div>
            )}
          </>
        )}
        {game === 'dua-thu' && (
          <div>
            <p className="mb-1 text-xs text-ink-500">Chọn thú để đặt cược (1 ăn 5){animating ? ' — đang đua…' : ''}:</p>
            {/* Sàn chạy đua thú */}
            <div className="space-y-1 rounded-xl border-4 border-amber-700/70 bg-gradient-to-b from-lime-600/30 to-green-700/30 p-2">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                const winner = result?.winner === n;
                const pos = animating ? Math.min(92, (frame * (3 + ((n * 7) % 4))) % 112) : winner ? 92 : 0;
                return (
                  <div key={n} onClick={() => !animating && setDuaThu(n)}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 ${duaThu === n ? 'bg-amber-300/50 ring-2 ring-amber-500' : 'bg-black/5 hover:bg-black/10'}`}>
                    <span className="w-24 shrink-0 truncate text-[11px] font-bold text-ink-800">{n}. {RACE_NAMES[n]}</span>
                    <div className="relative h-8 flex-1 overflow-hidden rounded border-y border-dashed border-white/50">
                      <span className="absolute right-1 top-1/2 z-10 -translate-y-1/2 text-base">{winner && !animating ? '🏁🥇' : '🏁'}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/game-assets/duathu/${n}.gif`} alt={`Thú ${n}`} className="absolute top-1/2 h-7 -translate-y-1/2 object-contain transition-all duration-100" style={{ left: `${pos}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {game === 'bau-cua' && (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {BAUCUA.map(([s, l]) => (
                <button key={s} disabled={animating} onClick={() => setSymbol(s)} className={`flex flex-col items-center rounded-lg border-2 p-1.5 ${symbol === s ? 'border-brand-600 bg-brand-50 dark:bg-ink-800' : 'border-transparent bg-ink-100 dark:bg-ink-800'}`}>
                  <img src={`/game-assets/baucua/${s}.png`} alt={l} className="h-10 w-10 object-contain" />
                  <span className="text-[11px] font-medium">{l}</span>
                </button>
              ))}
            </div>
            {/* Đĩa bầu cua đang xóc */}
            {animating && (
              <div className="flex justify-center gap-3">
                {[0, 1, 2].map((i) => {
                  const s = BAUCUA[(frame + i * 2) % BAUCUA.length][0];
                  // eslint-disable-next-line @next/next/no-img-element
                  return <img key={i} src={`/game-assets/baucua/${s}.png`} alt="" className="h-14 w-14 animate-bounce object-contain" style={{ animationDelay: `${i * 0.12}s` }} />;
                })}
              </div>
            )}
          </>
        )}
        {game === 'jackpot' && (
          <div className="mx-auto w-fit rounded-2xl border-4 border-amber-500 bg-gradient-to-b from-red-700 to-red-900 p-3 shadow-lg">
            <div className="mb-2 text-center text-lg font-extrabold tracking-widest text-amber-300">🎰 777</div>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-ink-950/70 p-2">
              {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => {
                const SYMS = ['seven', 'bar', 'bell', 'cherry', 'lemon', 'coin'];
                // đang quay: đổi symbol liên tục theo frame (cột phải dừng trễ hơn -> cảm giác quay)
                const sym = animating
                  ? SYMS[(frame + c * 2 + r) % SYMS.length]
                  : (result?.grid?.[c]?.[r] || SYMS[(r * 3 + c) % 6]);
                return <img key={`${c}-${r}`} src={`/game-assets/jackpot/${sym}.png`} alt="" className={`h-12 w-12 rounded bg-white/90 object-contain p-0.5 ${animating ? 'blur-[1px]' : ''}`} />;
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
              <span className="text-sm font-medium text-ink-600">Về nhất: {RACE_NAMES[result.winner] || `Thú ${result.winner}`}</span>
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
            {result.multiplier != null && `· x${result.multiplier} `}
            {result.isJackpot && ' · 🎰 JACKPOT!'}
          </div>
          <div className="mt-1 font-medium">{(result.netCoin ?? 0) >= 0 ? '+' : ''}{formatCoin(result.netCoin ?? 0)} coin</div>
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
