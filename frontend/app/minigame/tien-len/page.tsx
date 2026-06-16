'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Coins, Users, RefreshCw } from 'lucide-react';
import { getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Card { suit: string; rank: string; value: number; }
interface Room { id: string; betAmount: number; players: number; maxPlayers: number; potCoin: number; }
interface View {
  status: string; mySeat: number; myHand: Card[]; turn: number; pile: Card[];
  counts: number[]; finished: boolean; winnerSeat?: number; potCoin: number;
}

const cardImg = (c: Card) => `/game-assets/cards/${c.rank}_${c.suit}.png`;
const cardKey = (c: Card) => `${c.rank}-${c.suit}`;

export default function TienLenPvP() {
  const { user, loading } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [view, setView] = useState<View | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bet, setBet] = useState(1000);
  const [msg, setMsg] = useState('');
  const sock = useRef<Socket | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const s = io(`${base}/minigame`, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
    sock.current = s;
    s.on('connect', () => listRooms());
    s.on('error', (e: any) => setMsg(e?.message || 'Lỗi'));
    s.on('lobby', () => { if (roomId) refresh(); });
    s.on('update', () => refresh());
    s.on('finished', (d: any) => { setMsg(d.winnerSeat != null ? `Ván kết thúc — ghế ${d.winnerSeat} thắng!` : 'Ván kết thúc'); refresh(); });
    return () => { s.disconnect(); };
    // eslint-disable-next-line
  }, [user, loading]);

  function listRooms() { sock.current?.emit('rooms', { type: 'TIEN_LEN' }, (r: Room[]) => setRooms(r || [])); }
  function refresh() { if (roomId) sock.current?.emit('view', { roomId }, (v: View) => { if (v) setView(v); }); }

  function create() { sock.current?.emit('create', { type: 'TIEN_LEN', betCoin: bet }, (r: any) => { if (r?.roomId) { setRoomId(r.roomId); setMsg('Đã tạo phòng, chờ người vào rồi bấm Sẵn sàng'); } else setMsg('Tạo phòng lỗi'); }); }
  function join(id: string) { sock.current?.emit('join', { roomId: id }, (r: any) => { if (r?.roomId) { setRoomId(id); setMsg('Đã vào phòng'); refresh(); } }); }
  function ready() { sock.current?.emit('ready', { roomId }, () => refresh()); }
  function leave() { sock.current?.emit('leave', { roomId }, () => { setRoomId(''); setView(null); listRooms(); }); }

  function toggle(c: Card) { const k = cardKey(c); const n = new Set(sel); n.has(k) ? n.delete(k) : n.add(k); setSel(n); }
  function play() {
    if (!view) return;
    const cards = view.myHand.filter((c) => sel.has(cardKey(c)));
    if (cards.length === 0) { setMsg('Chọn bài để đánh'); return; }
    sock.current?.emit('play', { roomId, cards });
    setSel(new Set());
  }
  function pass() { sock.current?.emit('pass', { roomId }); }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để chơi Tiến Lên PvP.</div>;

  // ── Lobby ──
  if (!roomId || !view) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Tiến Lên — Bàn PvP</h1>
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <label className="text-xs">Mức cược (coin)<input type="number" className="input mt-1 w-32" value={bet} onChange={(e) => setBet(Number(e.target.value))} /></label>
          <button onClick={create} className="btn-primary">Tạo bàn</button>
          <button onClick={listRooms} className="btn-ghost"><RefreshCw size={16} /> Làm mới</button>
        </div>
        {msg && <p className="text-sm text-brand-600">{msg}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <div key={r.id} className="card flex items-center justify-between p-4">
              <div className="text-sm">
                <div className="flex items-center gap-1 font-semibold"><Coins size={14} /> {r.betAmount.toLocaleString()}</div>
                <div className="flex items-center gap-1 text-ink-500"><Users size={13} /> {r.players}/{r.maxPlayers} · pot {r.potCoin}</div>
              </div>
              <button onClick={() => join(r.id)} disabled={r.players >= r.maxPlayers} className="btn-primary !py-1.5 text-xs disabled:opacity-50">Vào</button>
            </div>
          ))}
          {rooms.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có bàn nào. Tạo bàn mới!</p>}
        </div>
      </div>
    );
  }

  // ── In room ──
  const myTurn = view.turn === view.mySeat && !view.finished;
  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between p-4">
        <div>
          <h1 className="font-bold">Bàn Tiến Lên</h1>
          <p className="text-sm text-ink-500">Pot {view.potCoin} coin · ghế của bạn: {view.mySeat}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={ready} className="btn-outline text-xs">Sẵn sàng</button>
          <button onClick={leave} className="btn-ghost text-xs text-red-600">Rời bàn</button>
        </div>
      </div>
      {msg && <p className="text-center text-sm text-brand-600">{msg}</p>}

      <div className="card p-4">
        <div className="mb-2 flex justify-center gap-3 text-xs text-ink-500">
          {view.counts.map((c, i) => (
            <span key={i} className={`rounded-full px-2 py-1 ${i === view.turn ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
              Ghế {i}{i === view.mySeat ? ' (bạn)' : ''}: {c} lá
            </span>
          ))}
        </div>
        <div className="flex min-h-[90px] items-center justify-center gap-1 rounded-xl bg-emerald-900/10 p-3">
          {view.pile.length === 0 ? <span className="text-sm text-ink-400">Bàn trống — được đánh tự do</span>
            : view.pile.map((c) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={cardKey(c)} src={cardImg(c)} alt={cardKey(c)} className="h-20 rounded shadow" />
            ))}
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-2 text-sm font-medium">{myTurn ? '➡️ Tới lượt bạn' : 'Chờ lượt…'}</div>
        <div className="flex flex-wrap gap-1">
          {view.myHand.map((c) => {
            const k = cardKey(c);
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={k} src={cardImg(c)} alt={k} onClick={() => toggle(c)}
                className={`h-24 cursor-pointer rounded shadow transition-transform ${sel.has(k) ? '-translate-y-3 ring-2 ring-brand-500' : 'hover:-translate-y-1'}`} />
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={play} disabled={!myTurn} className="btn-primary disabled:opacity-50">Đánh ({sel.size})</button>
          <button onClick={pass} disabled={!myTurn} className="btn-outline disabled:opacity-50">Bỏ lượt</button>
        </div>
      </div>
    </div>
  );
}
