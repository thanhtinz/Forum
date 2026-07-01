'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { Coins, Users, RefreshCw, ArrowRight, ChevronLeft } from 'lucide-react';
import { getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Room { id: string; betAmount: number; players: number; maxPlayers: number; potCoin: number; }
interface View { game?: string; mySeat: number; board?: number[][]; currentTurn?: number; winner?: number | null; potCoin?: number; status?: string; lastMove?: { x: number; y: number } | null; }

export default function CaroPvP() {
  const { user, loading } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState('');
  const [view, setView] = useState<View | null>(null);
  const [bet, setBet] = useState(1000);
  const [msg, setMsg] = useState('');
  const sock = useRef<Socket | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const s = io(`${base}/minigame`, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
    sock.current = s;
    s.on('connect', () => list());
    s.on('error', (e: any) => setMsg(e?.message || 'Lỗi'));
    s.on('lobby', () => { if (roomId) refresh(); });
    s.on('update', () => refresh());
    s.on('finished', (d: any) => { setMsg(d.winnerSeat != null ? `Ghế ${d.winnerSeat} thắng!` : 'Hòa!'); refresh(); });
    return () => { s.disconnect(); };
    // eslint-disable-next-line
  }, [user, loading]);

  function list() { sock.current?.emit('rooms', { type: 'CARO' }, (r: Room[]) => setRooms(r || [])); }
  function refresh() { if (roomId) sock.current?.emit('view', { roomId }, (v: View) => { if (v) setView(v); }); }
  function create() { sock.current?.emit('create', { type: 'CARO', betCoin: bet }, (r: any) => { if (r?.roomId) { setRoomId(r.roomId); setMsg('Chờ đối thủ vào rồi bấm Sẵn sàng'); } }); }
  function join(id: string) { sock.current?.emit('join', { roomId: id }, (r: any) => { if (r?.roomId) { setRoomId(id); refresh(); } }); }
  function ready() { sock.current?.emit('ready', { roomId }, () => refresh()); }
  function leave() { sock.current?.emit('leave', { roomId }, () => { setRoomId(''); setView(null); list(); }); }
  function move(x: number, y: number) { sock.current?.emit('caroMove', { roomId, x, y }); }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để chơi Caro PvP.</div>;

  if (!roomId || !view?.board) {
    return (
      <div className="space-y-4">
        <Link href="/cong-game" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Trò chơi khác</Link>
        <h1 className="text-2xl font-bold">Cờ Caro — Bàn PvP</h1>
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <label className="text-xs">Mức cược<input type="number" className="input mt-1 w-32" value={bet} onChange={(e) => setBet(Number(e.target.value))} /></label>
          <button onClick={create} className="btn-primary">Tạo bàn</button>
          <button onClick={list} className="btn-ghost"><RefreshCw size={16} /> Làm mới</button>
          {roomId && <button onClick={ready} className="btn-outline">Sẵn sàng</button>}
          {roomId && <button onClick={leave} className="btn-ghost text-red-600">Rời</button>}
        </div>
        {msg && <p className="text-sm text-brand-600">{msg}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <div key={r.id} className="card flex items-center justify-between p-4 text-sm">
              <span className="flex items-center gap-1"><Coins size={14} /> {r.betAmount} · <Users size={13} /> {r.players}/{r.maxPlayers}</span>
              <button onClick={() => join(r.id)} disabled={r.players >= r.maxPlayers} className="btn-primary !py-1.5 text-xs disabled:opacity-50">Vào</button>
            </div>
          ))}
          {rooms.length === 0 && <p className="col-span-full text-center text-ink-500">Chưa có bàn. Tạo bàn mới!</p>}
        </div>
      </div>
    );
  }

  const myTurn = view.currentTurn === view.mySeat && view.winner == null;
  const marks = ['', '✕', '◯'];
  return (
    <div className="space-y-3">
      <Link href="/cong-game" className="inline-flex items-center text-sm text-ink-400 hover:text-brand-600"><ChevronLeft size={16} /> Trò chơi khác</Link>
      <div className="card flex items-center justify-between p-4">
        <div>
          <h1 className="font-bold">Bàn Caro · Pot {view.potCoin}</h1>
          <p className="flex items-center gap-1 text-sm text-ink-500">Bạn là <b>{marks[view.mySeat + 1]}</b> · {view.winner != null ? (view.winner === view.mySeat ? 'Bạn THẮNG!' : view.winner === -1 ? 'Hòa' : 'Bạn thua') : myTurn ? <span className="inline-flex items-center gap-1"><ArrowRight size={14} /> Lượt bạn</span> : 'Chờ đối thủ…'}</p>
        </div>
        <button onClick={leave} className="btn-ghost text-xs text-red-600">Rời bàn</button>
      </div>
      {msg && <p className="text-center text-sm text-brand-600">{msg}</p>}
      <div className="card overflow-auto p-2">
        <div className="inline-grid" style={{ gridTemplateColumns: `repeat(15, 22px)` }}>
          {view.board.map((row, y) => row.map((cell, x) => (
            <button key={`${x}-${y}`} disabled={!myTurn || cell !== 0} onClick={() => move(x, y)}
              className={`h-[22px] w-[22px] border border-ink-200 text-xs dark:border-ink-700 ${cell === 1 ? 'text-rose-500' : 'text-sky-500'} ${view.lastMove?.x === x && view.lastMove?.y === y ? 'bg-amber-100 dark:bg-ink-700' : ''} disabled:cursor-default hover:bg-brand-50 dark:hover:bg-ink-800`}>
              {marks[cell]}
            </button>
          )))}
        </div>
      </div>
    </div>
  );
}
