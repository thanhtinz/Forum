'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Send, Plus, X, ArrowLeft, Trash2, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';
import { interceptExternalLink } from '@/lib/externalLink';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ConvSummary {
  id: string;
  title?: string | null;
  lastMessageAt: string;
  participants: { id: string; username: string; displayName?: string | null; avatar?: string | null }[];
  lastMessage?: { content: string; senderId: string; createdAt: string } | null;
  hasUnread: boolean;
}

interface Message {
  id: string;
  content: string;
  contentRaw: string;
  createdAt: string;
  isDeleted: boolean;
  sender: { id: string; username: string; displayName?: string | null; avatar?: string | null };
}

function ConversationsInner() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get('id') || '';
  const newParam = params.get('new') || '';

  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  // New conversation modal
  const [showNew, setShowNew] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newBusy, setNewBusy] = useState(false);
  const [userSearch, setUserSearch] = useState<{ id: string; username: string; displayName?: string | null }[]>([]);

  const msgEndRef = useRef<HTMLDivElement>(null);

  async function loadConvs() {
    if (!user) return;
    try {
      const r = await api.get<ConvSummary[]>('/conversations');
      setConvs(r || []);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function loadMessages(id: string) {
    setMsgLoading(true);
    try {
      const r = await api.get<{ data: Message[]; participants: any[] }>(`/conversations/${id}/messages?limit=50`);
      setMessages(r.data || []);
      setParticipants(r.participants || []);
    } catch (e: any) { setErr(e.message); }
    finally { setMsgLoading(false); }
  }

  useEffect(() => {
    loadConvs();
    if (newParam) { setShowNew(true); setNewRecipient(newParam); searchUsers(newParam); }
    /* eslint-disable-next-line */
  }, [user]);
  useEffect(() => { if (selectedId) loadMessages(selectedId); /* eslint-disable-next-line */ }, [selectedId]);
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function searchUsers(q: string) {
    setNewRecipient(q);
    if (q.trim().length < 2) { setUserSearch([]); return; }
    try {
      const r = await api.get<{ data: any[] }>(`/social/members?q=${encodeURIComponent(q)}&limit=5`);
      setUserSearch((r.data || []).filter((u) => u.id !== user?.id));
    } catch { setUserSearch([]); }
  }

  async function createConv(recipientId: string, recipientName: string) {
    if (!newContent.trim()) { setErr('Vui lòng nhập nội dung tin nhắn'); return; }
    setNewBusy(true);
    try {
      const r = await api.post<{ id: string }>('/conversations', {
        recipientIds: [recipientId],
        title: newTitle.trim() || undefined,
        content: newContent.trim(),
      });
      setShowNew(false); setNewRecipient(''); setNewTitle(''); setNewContent(''); setUserSearch([]);
      await loadConvs();
      router.push(`/conversations?id=${r.id}`);
    } catch (e: any) { setErr(e.message); }
    finally { setNewBusy(false); }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      const msg = await api.post<Message>(`/conversations/${selectedId}/messages`, { content: reply });
      setReply('');
      setMessages((prev) => [...prev, msg]);
      loadConvs();
    } catch (e: any) { setErr(e.message); }
    finally { setSending(false); }
  }

  async function deleteMsg(msgId: string) {
    if (!confirm('Xoá tin nhắn này?')) return;
    try {
      await api.del(`/conversations/${selectedId}/messages/${msgId}`);
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isDeleted: true } : m));
    } catch (e: any) { setErr(e.message); }
  }

  async function leaveConv() {
    if (!selectedId || !confirm('Rời cuộc hội thoại này?')) return;
    try {
      await api.del(`/conversations/${selectedId}/leave`);
      router.push('/conversations');
      await loadConvs();
    } catch (e: any) { setErr(e.message); }
  }

  if (!user) return <div className="card p-8 text-center text-ink-500">Vui lòng <a href="/login" className="text-brand-600 hover:underline">đăng nhập</a> để xem tin nhắn.</div>;

  const selectedConv = convs.find((c) => c.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar — danh sách hội thoại */}
      <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full flex-col md:w-72 shrink-0`}>
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold">Tin nhắn</h1>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">
            <Plus size={14} /> Mới
          </button>
        </div>
        <div className="flex-1 overflow-y-auto rounded-xl border border-ink-200 dark:border-ink-800">
          {loading && <p className="p-4 text-sm text-ink-500">Đang tải…</p>}
          {!loading && convs.length === 0 && <p className="p-4 text-sm text-ink-500">Chưa có cuộc hội thoại nào.</p>}
          {convs.map((c) => {
            const others = c.participants.filter((p) => p.id !== user.id);
            const name = c.title || others.map((u) => u.displayName || u.username).join(', ') || 'Hội thoại';
            return (
              <button key={c.id} onClick={() => router.push(`/conversations?id=${c.id}`)}
                className={`flex w-full items-center gap-3 border-b border-ink-200/70 p-3 text-left hover:bg-ink-50 dark:border-ink-800/70 dark:hover:bg-ink-900 ${c.id === selectedId ? 'bg-brand-50 dark:bg-brand-950/30' : ''}`}>
                <div className="shrink-0">
                  {others[0] ? <Avatar user={others[0]} size={36} /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-200"><Users size={16} /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`truncate text-sm font-medium ${c.hasUnread ? 'text-brand-600' : ''}`}>{name}</span>
                    {c.hasUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  </div>
                  {c.lastMessage && (
                    <p className="truncate text-xs text-ink-500" dangerouslySetInnerHTML={{ __html: c.lastMessage.content.replace(/<[^>]+>/g, ' ').slice(0, 60) }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main — chi tiết hội thoại */}
      {selectedId ? (
        <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-ink-200 dark:border-ink-800">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-ink-200 px-4 py-3 dark:border-ink-800">
            <button onClick={() => router.push('/conversations')} className="md:hidden rounded p-1 hover:bg-ink-100 dark:hover:bg-ink-800">
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {selectedConv?.title || participants.filter((p) => p.id !== user.id).map((u: any) => u.displayName || u.username).join(', ') || 'Hội thoại'}
              </p>
              <p className="text-xs text-ink-500">{participants.length} thành viên</p>
            </div>
            <button onClick={leaveConv} className="shrink-0 text-ink-500 hover:text-red-500" title="Rời hội thoại"><X size={16} /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgLoading && <p className="text-center text-sm text-ink-500">Đang tải…</p>}
            {messages.map((m) => {
              const isMine = m.sender.id === user.id;
              return (
                <div key={m.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="shrink-0"><Avatar user={m.sender} size={28} /></div>
                  <div className={`group max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isMine && <span className="mb-0.5 text-[11px] text-ink-500">{m.sender.displayName || m.sender.username}</span>}
                    {m.isDeleted ? (
                      <span className="rounded-lg bg-ink-100 px-3 py-2 text-xs italic text-ink-400 dark:bg-ink-800">Tin nhắn đã xoá</span>
                    ) : (
                      <div className={`relative rounded-2xl px-3 py-2 text-sm ${isMine ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-ink-100 dark:bg-ink-800 rounded-tl-sm'}`}>
                        <div onClick={interceptExternalLink} dangerouslySetInnerHTML={{ __html: m.content }} />
                        {isMine && (
                          <button onClick={() => deleteMsg(m.id)} className="absolute -right-6 top-1 hidden text-ink-400 hover:text-red-500 group-hover:block">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                    <span className="mt-0.5 text-[10px] text-ink-400">
                      {(() => { try { return formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={msgEndRef} />
          </div>

          {/* Reply box */}
          <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-ink-200 p-3 dark:border-ink-800">
            <textarea
              className="input flex-1 resize-none text-sm"
              rows={2}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e as any); } }}
              placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
            />
            <button type="submit" disabled={sending || !reply.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white disabled:opacity-50 hover:bg-brand-700">
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden flex-1 items-center justify-center text-ink-400 md:flex">
          <p className="text-sm">Chọn một cuộc hội thoại để xem tin nhắn</p>
        </div>
      )}

      {/* New conversation modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !newBusy && setShowNew(false)}>
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">Tin nhắn mới</h3>
            <div className="relative mt-3">
              <input className="input w-full" placeholder="Tìm người dùng…" value={newRecipient} onChange={(e) => searchUsers(e.target.value)} />
              {userSearch.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-ink-200 bg-white shadow-lg dark:border-ink-800 dark:bg-ink-900">
                  {userSearch.map((u) => (
                    <button key={u.id} onClick={() => createConv(u.id, u.displayName || u.username)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800">
                      <span className="font-medium">{u.displayName || u.username}</span>
                      <span className="text-ink-400">@{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input className="input mt-2 w-full" placeholder="Tiêu đề (tuỳ chọn)…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <textarea className="input mt-2 w-full resize-none" rows={4} placeholder="Nội dung tin nhắn…" value={newContent} onChange={(e) => setNewContent(e.target.value)} />
            {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="rounded-lg bg-ink-100 px-4 py-1.5 text-sm dark:bg-ink-800">Hủy</button>
            </div>
            <p className="mt-2 text-xs text-ink-400">Chọn người dùng từ danh sách gợi ý để gửi tin nhắn.</p>
          </div>
        </div>
      )}

      {err && !showNew && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-500 px-4 py-2 text-sm text-white shadow-lg">{err}</div>}
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <ConversationsInner />
    </Suspense>
  );
}
