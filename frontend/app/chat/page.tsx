'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send } from 'lucide-react';
import { api, getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Msg {
  id: string;
  channelId: string;
  senderId: string;
  type: string;
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const { user, loading } = useAuth();
  const [channelId, setChannelId] = useState<string>('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || !user) return;
    let socket: Socket;

    (async () => {
      const ch = await api.get<{ id: string }>('/chat/global');
      setChannelId(ch.id);
      const hist = await api.get<Msg[]>(`/chat/channels/${ch.id}/messages`);
      setMessages(hist);

      const base = process.env.NEXT_PUBLIC_API_URL || '';
      socket = io(`${base}/chat`, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.on('connect', () => { setConnected(true); socket.emit('join', { channelId: ch.id }); });
      socket.on('disconnect', () => setConnected(false));
      socket.on('message', (m: Msg) => setMessages((prev) => [...prev, m]));
    })();

    return () => { socket?.disconnect(); };
  }, [user, loading]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !channelId || !socketRef.current) return;
    socketRef.current.emit('message', { channelId, type: 'TEXT', content });
    setText('');
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào chat.</div>;

  return (
    <div className="mx-auto flex h-[calc(100vh-160px)] max-w-3xl flex-col card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
        <h1 className="font-semibold"># Chat Tổng</h1>
        <span className={`chip ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-200 text-ink-600'}`}>
          {connected ? 'Đang kết nối' : 'Ngoại tuyến'}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && <p className="text-center text-sm text-ink-400">Chưa có tin nhắn. Bắt đầu trò chuyện!</p>}
        {messages.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
                {!mine && <div className="mb-0.5 text-[11px] opacity-70">{m.senderId.slice(0, 8)}</div>}
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-ink-200/70 p-3 dark:border-ink-800">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập tin nhắn…" className="input flex-1" />
        <button type="submit" className="btn-primary !px-3"><Send size={18} /></button>
      </form>
    </div>
  );
}
