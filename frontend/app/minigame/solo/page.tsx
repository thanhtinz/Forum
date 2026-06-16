'use client';

import { useState } from 'react';
import { Dices, Coins, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

type Game = 'tai-xiu' | 'coin-flip' | 'lucky-wheel' | 'dua-thu';
const GAMES: [Game, string][] = [['tai-xiu', 'Tài Xỉu'], ['coin-flip', 'Tung Xu'], ['lucky-wheel', 'Vòng Quay'], ['dua-thu', 'Đua Thú']];

export default function SoloPlay() {
  const { user, loading } = useAuth();
  const [game, setGame] = useState<Game>('tai-xiu');
  const [bet, setBet] = useState(100);
  const [choice, setChoice] = useState<string>('tai');
  const [duaThu, setDuaThu] = useState(1);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để chơi.</div>;

  async function play() {
    setBusy(true); setMsg(''); setResult(null);
    try {
      let body: any = { betCoin: bet };
      if (game === 'tai-xiu') body.choice = choice;
      else if (game === 'coin-flip') body.choice = choice === 'tai' ? 'heads' : choice;
      else if (game === 'dua-thu') body.choice = duaThu;
      const r = await api.post<any>(`/minigame/${game}`, body);
      setResult(r);
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  const won = result && (result.won || (result.netCoin ?? 0) > 0 || result.caught);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-card">
        <Dices /> <h1 className="text-2xl font-bold">Minigame (chơi với máy)</h1>
      </header>
      <p className="flex items-center gap-1 text-xs text-ink-500">Chơi bằng <Coins size={13} className="text-amber-500" /> Vàng (coin). Kiếm coin qua forum/game.</p>

      <div className="flex flex-wrap gap-2">
        {GAMES.map(([g, l]) => (
          <button key={g} onClick={() => { setGame(g); setResult(null); }} className={`rounded-lg px-3 py-1.5 text-sm ${game === g ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{l}</button>
        ))}
      </div>

      <div className="card space-y-3 p-4">
        <label className="block text-sm">Tiền cược (coin)<input type="number" className="input mt-1 w-40" value={bet} onChange={(e) => setBet(Number(e.target.value))} /></label>
        {game === 'tai-xiu' && (
          <div className="flex gap-2">
            {['tai', 'xiu'].map((c) => <button key={c} onClick={() => setChoice(c)} className={`flex-1 rounded-lg py-2 text-sm font-medium ${choice === c ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{c === 'tai' ? 'TÀI (11-17)' : 'XỈU (4-10)'}</button>)}
          </div>
        )}
        {game === 'coin-flip' && (
          <div className="flex gap-2">
            {[['tai', 'Sấp (Heads)'], ['tails', 'Ngửa (Tails)']].map(([c, l]) => <button key={c} onClick={() => setChoice(c)} className={`flex-1 rounded-lg py-2 text-sm ${choice === c ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{l}</button>)}
          </div>
        )}
        {game === 'dua-thu' && (
          <select className="input w-48" value={duaThu} onChange={(e) => setDuaThu(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>Thú số {n}</option>)}
          </select>
        )}
        <button onClick={play} disabled={busy} className="btn-primary">{busy ? 'Đang quay…' : 'Chơi'}</button>
        {msg && <p className="text-sm text-red-500">{msg}</p>}
      </div>

      {result && (
        <div className={`card p-5 text-center ${won ? 'border-emerald-400' : 'border-rose-400'}`}>
          <div className={`flex items-center justify-center gap-1.5 text-xl font-bold ${won ? 'text-emerald-600' : 'text-rose-600'}`}>{won ? <><Trophy size={20} /> THẮNG!</> : 'Thua'}</div>
          <div className="mt-2 text-sm text-ink-500">
            {result.outcome && `Kết quả: ${result.outcome.toUpperCase()} `}{result.total != null && `(tổng ${result.total}) `}
            {result.result && `· ${result.result} `}{result.multiplier != null && `· x${result.multiplier} `}
            {result.winner != null && `· thú thắng: ${result.winner}`}
          </div>
          <div className="mt-1 font-medium">{(result.netCoin ?? 0) >= 0 ? '+' : ''}{result.netCoin ?? 0} coin</div>
          <button onClick={() => setResult(null)} className="btn-outline mt-3 text-xs">Chơi tiếp</button>
        </div>
      )}
    </div>
  );
}
