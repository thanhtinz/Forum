'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, Hash } from 'lucide-react';
import { api, getToken } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { Avatar } from './Header';
import type { ChatMsg } from '@/lib/chat';
import Link from 'next/link';

function timeShort(s: string) {
  try {
    const d = new Date(s);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'vừa xong';
    if (diffMin < 60) return `${diffMin} phút`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    return d.toLocaleDateString('vi');
  } catch { return ''; }
}

export function GlobalChat() {
  const { user, loading } = useAuth();
  const [channelId, setChannelId] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const channelRef = useRef('');
  channelRef.current = channelId;

  const scrollBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    let socket: Socket;
    (async () => {
      // Lấy global channel
      const ch = await api.get<{ id: string }>('/chat/global').catch(() => null);
      if (!ch?.id) return;
      setChannelId(ch.id);

      // Tải tin nhắn gần nhất
      const msgs = await api.get<ChatMsg[]>(`/chat/channels/${ch.id}/messages`).catch(() => []);
      setMessages(msgs.slice(-30).reverse());
      scrollBottom();

      // Kết nối socket
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      socket = io(`${base}/chat`, {
        auth: { token: getToken() },
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join', { channelId: ch.id });
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('message', (m: ChatMsg) => {
        if (m.channelId !== channelRef.current) return;
        setMessages((prev) => [...prev, m]);
        scrollBottom();
      });
      socket.on('messageDeleted', (d: { id: string }) => {
        setMessages((prev) => prev.filter((m) => m.id !== d.id));
      });
      socket.on('channelCleared', () => setMessages([]));
    })();

    return () => { socket?.disconnect(); };
  }, [user, loading, scrollBottom]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !channelId || sending) return;
    setSending(true);
    try {
      socketRef.current?.emit('message', { channelId, content, type: 'TEXT' });
      setText('');
    } finally {
      setSending(false);
    }
  }

  if (loading) return null;

  return (
    <section className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <Hash size={15} className="text-brand-500" />
          <h2 className="font-semibold">Chat cộng đồng</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-ink-400'}`} />
          <Link href="/chat" className="text-xs text-ink-400 hover:text-brand-600">Mở chat</Link>
        </div>
      </div>

      {!user ? (
        /* Guest placeholder */
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <Hash size={28} className="text-ink-300" />
          <p className="text-sm text-ink-500">
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link>
            {' '}để tham gia chat cộng đồng
          </p>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex h-64 flex-col gap-0 overflow-y-auto px-3 py-2 scroll-smooth">
            {messages.length === 0 && (
              <p className="m-auto text-xs text-ink-400">Chưa có tin nhắn nào. Hãy là người đầu tiên!</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-ink-50/60 dark:hover:bg-ink-800/30 ${m.senderId === user.id ? 'flex-row-reverse' : ''}`}>
                <div className="mt-0.5 shrink-0">
                  <Avatar user={{ username: m.sender?.username || '?', avatar: m.sender?.avatar }} size={24} />
                </div>
                <div className={`max-w-[75%] ${m.senderId === user.id ? 'items-end' : 'items-start'} flex flex-col`}>
                  {m.senderId !== user.id && (
                    <span className="mb-0.5 text-[10px] font-semibold text-ink-500">
                      {m.sender?.displayName || m.sender?.username}
                    </span>
                  )}
                  <div className={`rounded-2xl px-3 py-1.5 text-sm leading-relaxed ${m.senderId === user.id ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100'}`}>
                    {m.content}
                  </div>
                  <span className="mt-0.5 text-[10px] text-ink-400">{timeShort(m.createdAt)}</span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={send}
            className="flex items-center gap-2 border-t border-ink-200/70 px-3 py-2 dark:border-ink-800">
            <div className="shrink-0">
              <Avatar user={{ username: user.username, avatar: user.avatar }} size={28} />
            </div>
            <input
              className="input flex-1 text-sm !py-1.5"
              placeholder="Nhắn gì đó…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              autoComplete="off"
            />
            <button type="submit" disabled={!text.trim() || sending || !connected}
              className="btn-primary !p-2 disabled:opacity-40">
              <Send size={14} />
            </button>
          </form>
        </>
      )}
    </section>
  );
}
