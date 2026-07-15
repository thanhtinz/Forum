'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Send, Plus, X, ArrowLeft, Check, CheckCheck, Trash2 } from 'lucide-react';
import { api, getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';

interface UserCard { id: string; username: string; displayName: string | null; avatar: string | null }
interface ConvListItem {
  id: string; title: string | null; lastMessageAt: string;
  participants: UserCard[]; lastMessage: { content: string; createdAt: string; senderId: string } | null; hasUnread: boolean;
}
interface Message { id: string; conversationId?: string; content: string; contentRaw: string; createdAt: string; senderId: string; sender: UserCard }
interface Participant extends UserCard { lastReadAt: string }

function ConversationsView() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get('id') || '';
  const toUsername = searchParams.get('to') || '';
  const [convs, setConvs] = useState<ConvListItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [prefillUser, setPrefillUser] = useState<UserCard | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Mở sẵn modal "Tin nhắn mới" với người này khi tới từ nút "Nhắn tin riêng" ở trang cá nhân
  useEffect(() => {
    if (!toUsername) return;
    api.get<UserCard>(`/users/${toUsername}`).then((u) => { setPrefillUser(u); setShowNew(true); }).catch(() => {});
  }, [toUsername]);

  function loadList() {
    api.get<ConvListItem[]>('/conversations').then(setConvs).catch(() => {});
  }
  useEffect(() => { loadList(); }, []);

  function loadMessages(id: string) {
    if (!id) { setMessages([]); setParticipants([]); return; }
    api.get<{ data: Message[]; participants: Participant[] }>(`/conversations/${id}/messages?limit=50`)
      .then((r) => { setMessages(r.data); setParticipants(r.participants); loadList(); })
      .catch(() => {});
  }
  useEffect(() => { loadMessages(activeId); }, [activeId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Realtime: tin nhắn mới + trạng thái đã xem, qua socket /notif dùng chung
  useEffect(() => {
    if (!user) return;
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const s = io(`${base}/notif`, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
    socketRef.current = s;
    s.on('conversation.message', (d: { conversationId: string; message: Message }) => {
      if (d.conversationId === activeId) setMessages((m) => (m.some((x) => x.id === d.message.id) ? m : [...m, d.message]));
      loadList();
    });
    s.on('conversation.read', (d: { conversationId: string; readerId: string; readAt: string }) => {
      if (d.conversationId !== activeId) return;
      setParticipants((ps) => ps.map((p) => (p.id === d.readerId ? { ...p, lastReadAt: d.readAt } : p)));
    });
    return () => { s.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeId]);

  async function send() {
    if (!input.trim() || !activeId) return;
    setBusy(true);
    const text = input;
    setInput('');
    try { await api.post(`/conversations/${activeId}/messages`, { content: text }); }
    catch (e: any) { alert(e.message); setInput(text); }
    finally { setBusy(false); }
  }

  async function deleteMsg(id: string) {
    if (!confirm('Xoá tin nhắn này?')) return;
    try { await api.del(`/conversations/${activeId}/messages/${id}`); setMessages((m) => m.filter((x) => x.id !== id)); } catch (e: any) { alert(e.message); }
  }

  const others = participants.filter((p) => p.id !== user?.id);
  const otherName = (c: ConvListItem) => c.title || c.participants.map((p) => p.displayName || p.username).join(', ') || '(Không có tiêu đề)';

  // Tin cuối của mình đã được TẤT CẢ người khác xem chưa (đã xem đến sau thời điểm gửi)
  function seenByAll(msg: Message): boolean {
    if (!others.length) return false;
    return others.every((p) => new Date(p.lastReadAt) >= new Date(msg.createdAt));
  }
  const myLastMsgId = [...messages].reverse().find((m) => m.senderId === user?.id)?.id;

  return (
    <div className="grid h-[calc(100vh-var(--header-h)-2rem)] grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
      {/* Danh sách hội thoại */}
      <div className={`card flex flex-col overflow-hidden p-0 ${activeId ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between border-b border-ink-100 p-3 dark:border-ink-800">
          <h1 className="font-semibold">Tin nhắn</h1>
          <button onClick={() => setShowNew(true)} className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30"><Plus size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.length === 0 && <p className="p-4 text-sm text-ink-400">Chưa có cuộc hội thoại nào.</p>}
          {convs.map((c) => (
            <button key={c.id} onClick={() => router.push(`/conversations?id=${c.id}`)}
              className={`flex w-full items-center gap-2.5 border-b border-ink-50 p-3 text-left hover:bg-ink-50 dark:border-ink-900 dark:hover:bg-ink-800/50 ${activeId === c.id ? 'bg-ink-100 dark:bg-ink-800' : ''}`}>
              <Avatar user={c.participants[0] || { username: '?' }} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className={`truncate text-sm ${c.hasUnread ? 'font-bold' : 'font-medium'}`}>{otherName(c)}</span>
                  {c.hasUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                </div>
                <p className="truncate text-xs text-ink-400">{c.lastMessage?.content?.replace(/<[^>]+>/g, ' ').trim() || 'Chưa có tin nhắn'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Khung chat */}
      <div className={`card flex flex-col overflow-hidden p-0 ${activeId ? 'flex' : 'hidden md:flex'}`}>
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-400">Chọn 1 cuộc hội thoại để bắt đầu.</div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-ink-100 p-3 dark:border-ink-800">
              <button onClick={() => router.push('/conversations')} className="rounded p-1 text-ink-400 hover:text-ink-700 md:hidden"><ArrowLeft size={18} /></button>
              <div className="flex -space-x-2">
                {others.slice(0, 3).map((p) => <Avatar key={p.id} user={p} size={28} />)}
              </div>
              <span className="truncate text-sm font-semibold">{others.map((p) => p.displayName || p.username).join(', ') || 'Hội thoại'}</span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => {
                const mine = m.senderId === user?.id;
                return (
                  <div key={m.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    {!mine && <div className="mr-2 shrink-0"><Avatar user={m.sender} size={28} /></div>}
                    <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
                        <div dangerouslySetInnerHTML={{ __html: m.content }} />
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 px-1 text-[10px] text-ink-400">
                        <span>{new Date(m.createdAt).toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' })}</span>
                        {mine && m.id === myLastMsgId && (seenByAll(m) ? <CheckCheck size={12} className="text-brand-500" /> : <Check size={12} />)}
                        {mine && (
                          <button onClick={() => deleteMsg(m.id)} className="opacity-0 hover:text-red-500 group-hover:opacity-100"><Trash2 size={11} /></button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-ink-100 p-3 dark:border-ink-800">
              <input className="input flex-1" placeholder="Nhập tin nhắn…" value={input} onChange={(e) => setInput(e.target.value)} disabled={busy} />
              <button type="submit" disabled={busy || !input.trim()} className="btn-primary !px-3"><Send size={16} /></button>
            </form>
          </>
        )}
      </div>

      {showNew && (
        <NewConversationModal
          initialUser={prefillUser}
          onClose={() => { setShowNew(false); setPrefillUser(null); }}
          onCreated={(id) => { setShowNew(false); setPrefillUser(null); router.push(`/conversations?id=${id}`); loadList(); }}
        />
      )}
    </div>
  );
}

function NewConversationModal({ onClose, onCreated, initialUser }: { onClose: () => void; onCreated: (id: string) => void; initialUser?: UserCard | null }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<UserCard[]>([]);
  const [picked, setPicked] = useState<UserCard[]>(initialUser ? [initialUser] : []);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (initialUser && !picked.some((p) => p.id === initialUser.id)) setPicked((ps) => [...ps, initialUser]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser]);

  useEffect(() => {
    const query = q.trim();
    if (!query) { setHits([]); return; }
    const t = setTimeout(() => {
      api.get<{ data: UserCard[] }>(`/social/members?q=${encodeURIComponent(query)}&limit=8`).then((r) => setHits(r.data)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function create() {
    if (!picked.length || !content.trim()) return;
    setBusy(true); setErr('');
    try {
      const conv = await api.post<{ id: string }>('/conversations', { recipientIds: picked.map((p) => p.id), content });
      onCreated(conv.id);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-md space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tin nhắn mới</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X size={20} /></button>
        </div>

        {picked.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {picked.map((p) => (
              <span key={p.id} className="chip flex items-center gap-1 bg-brand-100 text-brand-700 dark:bg-brand-950/40">
                {p.displayName || p.username}
                <button onClick={() => setPicked((ps) => ps.filter((x) => x.id !== p.id))}><X size={11} /></button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <input className="input" placeholder="Tìm theo username…" value={q} onChange={(e) => setQ(e.target.value)} />
          {hits.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-ink-200 bg-white shadow-card dark:border-ink-700 dark:bg-ink-900">
              {hits.filter((h) => !picked.some((p) => p.id === h.id)).map((h) => (
                <button key={h.id} type="button" onClick={() => { setPicked((ps) => [...ps, h]); setQ(''); setHits([]); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800">
                  <Avatar user={h} size={22} /> {h.displayName || h.username} <span className="text-ink-400">@{h.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea className="input resize-y" rows={3} placeholder="Nhập tin nhắn đầu tiên…" value={content} onChange={(e) => setContent(e.target.value)} />
        {err && <p className="text-sm text-red-500">{err}</p>}
        <button onClick={create} disabled={busy || !picked.length || !content.trim()} className="btn-primary w-full">{busy ? 'Đang gửi…' : 'Gửi'}</button>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><ConversationsView /></Suspense>;
}
