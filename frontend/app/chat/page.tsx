'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Hash, Users, User, Plus, ArrowLeft, Reply } from 'lucide-react';
import { api, getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';
import { ChatChannel, ChatMsg } from '@/lib/chat';
import { MessageView } from '@/components/chat/MessageView';
import { Composer } from '@/components/chat/Composer';
import { NewChat } from '@/components/chat/NewChat';

function ChannelIcon({ c }: { c: ChatChannel }) {
  if (c.avatarUrl) return <img src={c.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />;
  const Icon = c.type === 'GLOBAL' ? Hash : c.type === 'GROUP' || c.type === 'GUILD' ? Users : User;
  return <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-brand-600 dark:bg-ink-800"><Icon size={18} /></span>;
}

export default function ChatPage() {
  const { user, loading } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [connected, setConnected] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [mobileList, setMobileList] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const activeRef = useRef('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<any>(null);
  activeRef.current = activeId;

  const loadChannels = useCallback(async () => {
    const list = await api.get<ChatChannel[]>('/chat/channels');
    setChannels(list);
    return list;
  }, []);

  // Kết nối socket 1 lần
  useEffect(() => {
    if (loading || !user) return;
    let socket: Socket;
    (async () => {
      const list = await loadChannels();
      const first = list.find((c) => c.type === 'GLOBAL') || list[0];
      if (first) setActiveId(first.id);

      const base = process.env.NEXT_PUBLIC_API_URL || '';
      socket = io(`${base}/chat`, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.on('connect', () => { setConnected(true); if (activeRef.current) socket.emit('join', { channelId: activeRef.current }); });
      socket.on('disconnect', () => setConnected(false));
      socket.on('message', (m: ChatMsg) => {
        if (m.channelId === activeRef.current) setMessages((prev) => [...prev, m]);
        setChannels((prev) => prev.map((c) => c.id === m.channelId ? { ...c, lastMessage: m } : c)
          .sort((a, b) => (b.lastMessage?.createdAt || '').localeCompare(a.lastMessage?.createdAt || '')));
      });
      socket.on('typing', (d: { userId: string; channelId: string }) => {
        if (d.channelId !== activeRef.current || d.userId === user.id) return;
        setTyping(d.userId);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(null), 2500);
      });
    })();
    return () => { socket?.disconnect(); };
  }, [user, loading, loadChannels]);

  // Đổi kênh: join room + tải lịch sử
  useEffect(() => {
    if (!activeId) return;
    const socket = socketRef.current;
    socket?.emit('join', { channelId: activeId });
    setReplyTo(null); setTyping(null);
    api.get<ChatMsg[]>(`/chat/channels/${activeId}/messages`).then(setMessages).catch(() => setMessages([]));
    return () => { socket?.emit('leave', { channelId: activeId }); };
  }, [activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  function handleSend(payload: { type: ChatMsg['type']; content: string; metadata?: any }) {
    if (!activeId || !socketRef.current) return;
    socketRef.current.emit('message', { channelId: activeId, replyToId: replyTo?.id, ...payload });
    setReplyTo(null);
  }
  function handleTyping() {
    socketRef.current?.emit('typing', { channelId: activeId });
  }
  function selectChannel(id: string) { setActiveId(id); setMobileList(false); }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để vào chat.</div>;

  const active = channels.find((c) => c.id === activeId);

  return (
    <div className="flex h-[calc(100vh-140px)] overflow-hidden card">
      {/* Danh sách kênh */}
      <aside className={`${mobileList ? 'flex' : 'hidden'} w-full flex-col border-r border-ink-200/70 dark:border-ink-800 sm:flex sm:w-72`}>
        <div className="flex items-center justify-between border-b border-ink-200/70 p-3 dark:border-ink-800">
          <h1 className="font-semibold">Tin nhắn</h1>
          <button onClick={() => setShowNew(true)} className="btn-primary !p-1.5" title="Tin nhắn mới"><Plus size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {channels.map((c) => (
            <button key={c.id} onClick={() => selectChannel(c.id)}
              className={`flex w-full items-center gap-2 rounded-lg p-2 text-left ${c.id === activeId ? 'bg-brand-50 dark:bg-ink-800' : 'hover:bg-ink-100 dark:hover:bg-ink-800'}`}>
              <ChannelIcon c={c} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <p className="truncate text-xs text-ink-400">
                  {c.lastMessage ? (c.lastMessage.type === 'TEXT' ? c.lastMessage.content : `[${c.lastMessage.type.toLowerCase()}]`) : (c.type === 'GROUP' ? `${c.memberCount} thành viên` : 'Bắt đầu trò chuyện')}
                </p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Khung hội thoại */}
      <section className={`${mobileList ? 'hidden' : 'flex'} w-full flex-1 flex-col sm:flex`}>
        {!active ? (
          <div className="grid flex-1 place-items-center text-ink-400">Chọn một cuộc trò chuyện</div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-ink-200/70 p-3 dark:border-ink-800">
              <button className="sm:hidden" onClick={() => setMobileList(true)}><ArrowLeft size={18} /></button>
              <ChannelIcon c={active} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{active.title}</p>
                <p className="text-xs text-ink-400">{connected ? 'Đang kết nối' : 'Ngoại tuyến'}{active.type === 'GROUP' ? ` · ${active.memberCount} thành viên` : ''}</p>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.length === 0 && <p className="text-center text-sm text-ink-400">Chưa có tin nhắn. Bắt đầu trò chuyện!</p>}
              {messages.map((m) => {
                const mine = m.senderId === user?.id;
                return (
                  <div key={m.id} className="group flex items-end gap-1">
                    {!mine && <Avatar user={m.sender || { username: m.senderId }} size={24} />}
                    <div className="flex-1">
                      <MessageView m={m} mine={mine} showName={active.type !== 'PRIVATE'} />
                    </div>
                    <button onClick={() => setReplyTo(m)} className="opacity-0 group-hover:opacity-100" title="Trả lời"><Reply size={14} className="text-ink-400" /></button>
                  </div>
                );
              })}
              {typing && <p className="text-xs italic text-ink-400">Đang nhập…</p>}
              <div ref={bottomRef} />
            </div>

            <Composer onSend={handleSend} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onTyping={handleTyping} />
          </>
        )}
      </section>

      {showNew && <NewChat onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); loadChannels().then(() => selectChannel(id)); }} />}
    </div>
  );
}
