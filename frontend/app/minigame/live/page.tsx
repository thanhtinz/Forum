'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { mutate } from 'swr';
import { Dices, Coins, ChevronLeft, Users, Trophy, History } from 'lucide-react';
import { getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatCoin } from '@/lib/format';

type Game = 'tai-xiu' | 'bau-cua' | 'dua-thu';
const DICE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const BAUCUA: [string, string][] = [['bau', 'Bầu'], ['cua', 'Cua'], ['tom', 'Tôm'], ['ca', 'Cá'], ['ga', 'Gà'], ['nai', 'Nai']];
const TAIXIU: [string, string][] = [['tai', 'TÀI (11-17)'], ['xiu', 'XỈU (4-10)']];
const RACE_NAMES = ['', 'Thánh nhím', 'Rồng huyền thoại', 'Rắn thợ săn', 'Mini Totoro', 'Con bướm xinh', 'Người ngoài hành tinh', 'Khủng long phun nửa'];
const DUATHU: [string, string][] = [1, 2, 3, 4, 5, 6, 7].map((n) => [String(n), `${n}. ${RACE_NAMES[n]}`]) as [string, string][];

const GAMES: Record<Game, { label: string; opts: [string, string][]; defOpt: string }> = {
  'tai-xiu': { label: 'Tài Xỉu', opts: TAIXIU, defOpt: 'tai' },
  'bau-cua': { label: 'Bầu Cua', opts: BAUCUA, defOpt: 'bau' },
  'dua-thu': { label: 'Đua Thú', opts: DUATHU, defOpt: '1' },
};

interface LiveState {
  game: Game; roundId: number; phase: 'betting' | 'rolling' | 'result'; timeLeft: number;
  result: any | null; pot: Record<string, number>; totalPot: number;
  players: { name: string; avatar?: string | null; total: number; net?: number; me?: boolean }[]; playerCount: number;
  mine: { option: string; amount: number }[]; myNet?: number;
  history?: { roundId: number; result: any }[];
}

// 1 ô kết quả lịch sử — có nhãn, số phiên, đánh dấu mới nhất
function HistoryCell({ game, result, roundId, latest }: { game: Game; result: any; roundId: number; latest?: boolean }) {
  let badge: React.ReactNode, label = '';
  if (game === 'tai-xiu') {
    const o = result?.outcome;
    const cls = o === 'tai' ? 'bg-rose-500' : o === 'xiu' ? 'bg-sky-500' : 'bg-ink-500';
    badge = <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white ${cls}`}>{result?.total ?? '?'}</span>;
    label = o === 'tai' ? 'TÀI' : o === 'xiu' ? 'XỈU' : 'Bộ ba';
  } else if (game === 'bau-cua') {
    badge = (
      <span className="flex gap-0.5 rounded-lg border border-ink-200 bg-white p-1 dark:border-ink-700 dark:bg-ink-800">
        {(result?.dice || []).map((d: string, i: number) => <img key={i} src={`/game-assets/baucua/${d}.png`} alt={d} className="h-6 w-6 object-contain" />)}
      </span>
    );
    label = (result?.dice || []).map((d: string) => BAUCUA.find(([s]) => s === d)?.[1] || d).join(' ');
  } else {
    badge = <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-500 text-sm font-bold text-white">{result?.winner}</span>;
    label = RACE_NAMES[result?.winner] || '';
  }
  return (
    <div className={`relative flex flex-col items-center gap-0.5 rounded-xl px-2 pb-1 pt-2 ${latest ? 'bg-brand-50 ring-2 ring-brand-400 dark:bg-ink-800' : ''}`}>
      {latest && <span className="absolute -top-2 rounded-full bg-brand-600 px-1.5 py-px text-[9px] font-bold text-white shadow">MỚI</span>}
      {badge}
      <span className="max-w-[68px] truncate text-[10px] font-medium text-ink-600 dark:text-ink-300">{label}</span>
      <span className="text-[9px] text-ink-400">#{roundId}</span>
    </div>
  );
}

// Tóm tắt thống kê lịch sử
function HistorySummary({ game, history }: { game: Game; history: { result: any }[] }) {
  if (game === 'tai-xiu') {
    const tai = history.filter((h) => h.result?.outcome === 'tai').length;
    const xiu = history.filter((h) => h.result?.outcome === 'xiu').length;
    return <span className="text-xs text-ink-500"><b className="text-rose-500">{tai}</b> Tài · <b className="text-sky-500">{xiu}</b> Xỉu</span>;
  }
  if (game === 'dua-thu') {
    const counts: Record<number, number> = {};
    history.forEach((h) => { const w = h.result?.winner; if (w) counts[w] = (counts[w] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? <span className="text-xs text-ink-500">Nhiều nhất: <b>{RACE_NAMES[Number(top[0])]}</b> ({top[1]})</span> : null;
  }
  return null;
}

function LiveRoom() {
  const { user, loading } = useAuth();
  const raw = (useSearchParams().get('game') as Game) || 'tai-xiu';
  const game: Game = (['tai-xiu', 'bau-cua', 'dua-thu'] as Game[]).includes(raw) ? raw : 'tai-xiu';
  const { label, opts } = GAMES[game];

  const sock = useRef<Socket | null>(null);
  const [st, setSt] = useState<LiveState | null>(null);
  const [bet, setBet] = useState(100);
  const [choice, setChoice] = useState(GAMES[game].defOpt);
  const [msg, setMsg] = useState('');
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const s = io(`${base}/live-table`, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
    sock.current = s;
    s.on('connect', () => s.emit('joinLive', { game }));
    s.on('live', (state: LiveState) => setSt((prev) => { if (prev && prev.phase !== 'result' && state.phase === 'result') mutate('/game/character'); return state; }));
    s.on('error', (e: any) => setMsg(e?.message || 'Lỗi'));
    return () => { s.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, game]);

  useEffect(() => {
    if (st?.phase !== 'rolling') return;
    const id = setInterval(() => setFrame((f) => f + 1), 100);
    return () => clearInterval(id);
  }, [st?.phase]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để chơi.</div>;

  function placeBet() {
    setMsg('');
    sock.current?.emit('bet', { game, option: choice, amount: bet });
  }

  const phase = st?.phase;
  const betting = phase === 'betting';

  return (
    <div className="space-y-4">
      <Link href="/cong-game" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Trò chơi khác</Link>
      <header className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 p-5 text-white shadow-card">
        <div className="flex items-center gap-2"><Dices /> <h1 className="text-2xl font-bold">{label} <span className="text-sm font-normal opacity-80">· phòng chung</span></h1></div>
        <span className="inline-flex items-center gap-1 text-sm"><Users size={15} /> {st?.playerCount ?? 0}</span>
      </header>

      {/* Trạng thái vòng */}
      <div className="card p-4 text-center">
        <div className="text-sm text-ink-500">Phiên hiện tại</div>
        <div className="mt-0.5 text-lg font-bold">
          {betting && <span className="text-emerald-600">Đặt cược: {st?.timeLeft}s</span>}
          {phase === 'rolling' && <span className="text-amber-600">{game === 'dua-thu' ? 'Đang đua…' : 'Đang xóc…'}</span>}
          {phase === 'result' && <span className="text-brand-600">Kết quả!</span>}
        </div>

        {/* Khu kết quả / animation */}
        {game === 'dua-thu' ? (
          <div className="mx-auto mt-3 max-w-md space-y-1 rounded-xl border-4 border-amber-700/60 bg-gradient-to-b from-lime-600/20 to-green-700/20 p-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => {
              const winner = phase === 'result' && st?.result?.winner === n;
              const pos = phase === 'rolling' ? Math.min(92, (frame * (3 + ((n * 7) % 4))) % 112) : winner ? 92 : (phase === 'result' ? 0 : 0);
              return (
                <div key={n} className={`flex items-center gap-2 rounded-md px-1.5 py-0.5 ${winner ? 'bg-amber-300/60' : ''}`}>
                  <span className="w-24 shrink-0 truncate text-left text-[11px] font-bold text-ink-800 dark:text-ink-200">{n}. {RACE_NAMES[n]}</span>
                  <div className="relative h-7 flex-1 overflow-hidden rounded border-y border-dashed border-white/50">
                    <span className="absolute right-1 top-1/2 z-10 -translate-y-1/2 text-base">{winner ? '🏁🥇' : '🏁'}</span>
                    <img src={`/game-assets/duathu/${n}.gif`} alt="" className="absolute top-1/2 h-6 -translate-y-1/2 object-contain transition-all duration-100" style={{ left: `${pos}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 flex min-h-[64px] items-center justify-center gap-3">
            {game === 'tai-xiu'
              ? (phase === 'rolling'
                  ? [0, 1, 2].map((i) => <span key={i} className="animate-bounce text-5xl" style={{ animationDelay: `${i * 0.1}s` }}>{DICE_FACE[1 + ((frame + i * 2) % 6)]}</span>)
                  : (st?.result?.dice || []).map((d: number, i: number) => <span key={i} className="text-5xl">{DICE_FACE[d] || '🎲'}</span>))
              : (phase === 'rolling'
                  ? [0, 1, 2].map((i) => { const s = BAUCUA[(frame + i * 2) % 6][0]; return <img key={i} src={`/game-assets/baucua/${s}.png`} alt="" className="h-14 w-14 animate-bounce object-contain" style={{ animationDelay: `${i * 0.1}s` }} />; })
                  : (st?.result?.dice || []).map((d: string, i: number) => <img key={i} src={`/game-assets/baucua/${d}.png`} alt={d} className="h-14 w-14 object-contain" />))}
          </div>
        )}

        {phase === 'result' && game === 'tai-xiu' && st?.result && (
          <div className="text-sm text-ink-500">Tổng {st.result.total} · {st.result.outcome === 'house' ? 'Nhà cái (bộ ba)' : st.result.outcome === 'tai' ? 'TÀI' : 'XỈU'}</div>
        )}
        {phase === 'result' && game === 'dua-thu' && st?.result && (
          <div className="mt-1 text-sm text-ink-500">Về nhất: <b>{RACE_NAMES[st.result.winner]}</b></div>
        )}
        {phase === 'result' && st?.myNet != null && (
          <div className={`mt-1 font-bold ${st.myNet > 0 ? 'text-emerald-600' : st.myNet < 0 ? 'text-rose-600' : 'text-ink-500'}`}>
            {st.myNet > 0 ? <span className="inline-flex items-center gap-1"><Trophy size={16} /> +{formatCoin(st.myNet)}</span> : `${formatCoin(st.myNet)} coin`}
          </div>
        )}
      </div>

      {/* Lịch sử phiên trước */}
      {st?.history && st.history.length > 0 && (
        <div className="card p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1 text-sm font-semibold text-ink-600 dark:text-ink-300"><History size={14} /> Lịch sử phiên</h2>
            <HistorySummary game={game} history={st.history} />
          </div>
          <div className="flex items-stretch gap-1.5 rounded-xl bg-ink-50 p-2 dark:bg-ink-800/40">
            <span className="flex shrink-0 items-center text-[10px] font-semibold text-brand-500">◄ Mới</span>
            <div className="flex flex-1 gap-2 overflow-x-auto">
              {st.history.map((h, i) => (
                <div key={h.roundId} className="shrink-0"><HistoryCell game={game} result={h.result} roundId={h.roundId} latest={i === 0} /></div>
              ))}
            </div>
            <span className="flex shrink-0 items-center text-[10px] text-ink-400">Cũ ►</span>
          </div>
        </div>
      )}

      {/* Đặt cược */}
      <div className="card space-y-3 p-4">
        <label className="block text-sm">Tiền cược<input type="number" min={100} className="input mt-1 w-40" value={bet} onChange={(e) => setBet(Number(e.target.value))} /></label>
        <div className={`grid gap-2 ${game === 'tai-xiu' ? 'grid-cols-2' : game === 'bau-cua' ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {opts.map(([s, l]) => (
            <button key={s} onClick={() => setChoice(s)}
              className={`flex flex-col items-center gap-1 rounded-lg border-2 py-2 text-sm font-medium ${choice === s ? 'border-brand-600 bg-brand-50 dark:bg-ink-800' : 'border-transparent bg-ink-100 dark:bg-ink-800'}`}>
              {game === 'bau-cua' && <img src={`/game-assets/baucua/${s}.png`} alt={l} className="h-9 w-9 object-contain" />}
              {game === 'dua-thu' && <img src={`/game-assets/duathu/${s}.gif`} alt={l} className="h-8 object-contain" />}
              <span className="text-center text-xs leading-tight">{l}</span>
              <span className="text-[11px] text-ink-400">cược: {formatCoin(st?.pot?.[s] ?? 0)}</span>
            </button>
          ))}
        </div>
        <button onClick={placeBet} disabled={!betting} className="btn-primary w-full disabled:opacity-50">
          {betting ? <span className="inline-flex items-center gap-1"><Coins size={15} /> Đặt {formatCoin(bet)} vào {opts.find(([s]) => s === choice)?.[1]}</span> : 'Chờ vòng sau…'}
        </button>
        {st && st.mine.length > 0 && (
          <p className="text-xs text-ink-500">Cược của bạn: {st.mine.map((b) => `${opts.find(([s]) => s === b.option)?.[1] || b.option} ${formatCoin(b.amount)}`).join(' · ')}</p>
        )}
        {msg && <p className="text-sm text-rose-500">{msg}</p>}
      </div>

      {/* Người chơi */}
      <div className="card p-4">
        <h2 className="mb-2 text-sm font-semibold">Người chơi trong ván ({st?.playerCount ?? 0})</h2>
        {(!st || st.players.length === 0) ? <p className="text-sm text-ink-500">Chưa có ai đặt cược.</p> : (
          <div className="space-y-1">
            {st.players.map((p, i) => (
              <div key={i} className={`flex items-center justify-between rounded-lg px-2 py-1 text-sm ${p.me ? 'bg-brand-50 dark:bg-ink-800' : ''}`}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-ink-200 text-xs font-semibold text-ink-600 dark:bg-ink-700">
                    {p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover" /> : (p.name?.[0] || '?').toUpperCase()}
                  </span>
                  <span className={`truncate ${p.me ? 'font-semibold text-brand-600' : ''}`}>{p.name}{p.me ? ' (bạn)' : ''}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-ink-500">{formatCoin(p.total)}</span>
                  {p.net != null && <span className={p.net > 0 ? 'text-emerald-600' : p.net < 0 ? 'text-rose-600' : 'text-ink-400'}>{p.net > 0 ? '+' : ''}{formatCoin(p.net)}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={<div className="card p-8 text-center text-ink-500">Đang tải…</div>}>
      <LiveRoom />
    </Suspense>
  );
}
