'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Hash, Reply, Trash2 } from 'lucide-react';
import { api, getToken } from '@/lib/api';
import { useAuth } from './AuthProvider';
import { Avatar } from './Header';
import type { ChatMsg } from '@/lib/chat';
import { MessageView } from './chat/MessageView';
import { Composer } from './chat/Composer';
import Link from 'next/link';

export function GlobalChat() {
  const { user, loading } = useAuth();
  const [channelId, setChannelId] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [connected, setConnected] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const channelRef = useRef('');
  const typingTimer = useRef<any>(null);
  channelRef.current = channelId;

  const scrollBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    let socket: Socket;
    (async () => {
      const ch = await api.get<{ id: string }>('/chat/global').catch(() => null);
      if (!ch?.id) return;
      setChannelId(ch.id);

      const msgs = await api.get<ChatMsg[]>(`/chat/channels/${ch.id}/messages`).catch(() => []);
      setMessages(msgs);
      scrollBottom();

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
      socket.on('typing', (d: { userId: string; channelId: string }) => {
        if (d.channelId !== channelRef.current || d.userId === user.id) return;
        setTyping(d.userId);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(null), 2500);
      });
      socket.on('messageDeleted', (d: { id: string }) => {
        setMessages((prev) => prev.filter((m) => m.id !== d.id));
      });
      socket.on('channelCleared', () => setMessages([]));
    })();

    return () => { socket?.disconnect(); };
  }, [user, loading, scrollBottom]);

  function handleSend(payload: { type: ChatMsg['type']; content: string; metadata?: any }) {
    if (!channelId || !socketRef.current) return;
    socketRef.current.emit('message', { channelId, replyToId: replyTo?.id, ...payload });
    setReplyTo(null);
  }

  function deleteMessage(id: string) {
    socketRef.current?.emit('deleteMessage', { messageId: id, channelId });
  }

  if (loading) return null;

  const isStaff = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <Hash size={15} className="text-brand-500" />
          <h2 className="font-semibold">Chat cộng đồng</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-ink-400'}`} />
          <span className="text-xs text-ink-400">{connected ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
        </div>
      </div>

      {!user ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <Hash size={28} className="text-ink-300" />
          <p className="text-sm text-ink-500">
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link>
            {' '}để tham gia chat cộng đồng
          </p>
        </div>
      ) : (
        <>
          <div className="h-96 space-y-1 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-ink-400">Chưa có tin nhắn nào. Hãy là người đầu tiên!</p>
            )}
            {messages.map((m) => {
              const mine = m.senderId === user.id;
              return (
                <div key={m.id} className={`group flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                  {!mine && (
                    <div className="shrink-0">
                      <Avatar user={m.sender || { username: m.senderId }} size={28} />
                    </div>
                  )}
                  <div className="min-w-0 max-w-[78%]">
                    <MessageView m={m} mine={mine} showName />
                  </div>
                  <div className="flex items-center gap-1 self-center opacity-0 group-hover:opacity-100">
                    <button onClick={() => setReplyTo(m)} title="Trả lời">
                      <Reply size={14} className="text-ink-400 hover:text-brand-600" />
                    </button>
                    {(isStaff || mine) && (
                      <button onClick={() => deleteMessage(m.id)} title="Xoá">
                        <Trash2 size={14} className="text-ink-400 hover:text-rose-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {typing && <p className="text-xs italic text-ink-400">Đang nhập…</p>}
            <div ref={bottomRef} />
          </div>

          <p className="border-t border-amber-200/60 bg-amber-50 px-4 py-1.5 text-center text-[11px] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            ⚠️ Không bình luận ngôn từ xúc phạm, spam, liên kết lừa đảo… Vi phạm sẽ bị cảnh cáo hoặc ban.
          </p>
          <Composer
            onSend={handleSend}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onTyping={() => socketRef.current?.emit('typing', { channelId })}
          />
        </>
      )}
    </section>
  );
}
