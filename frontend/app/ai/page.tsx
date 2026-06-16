'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send } from 'lucide-react';
import { api, getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

// Cảm xúc -> emoji (chỗ cắm Live2D expression sau này)
const EMOTION_FACE: Record<string, string> = {
  neutral: '🙂', happy: '😊', joy: '😄', sad: '😢', angry: '😠',
  surprise: '😮', shy: '😳', love: '🥰', think: '🤔', cry: '😭',
};

interface Msg { role: 'user' | 'ai'; text: string }

export default function AiCompanionPage() {
  const { user, loading } = useAuth();
  const [persona, setPersona] = useState<any>(null);
  const [sessionId, setSessionId] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState('neutral');
  const [typing, setTyping] = useState(false);
  const sock = useRef<Socket | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const personas = await api.get<any[]>('/ai/personas').catch(() => []);
      const p = personas[0]; setPersona(p);
      const s = await api.post<{ id: string }>('/ai/sessions', { personaId: p?.id });
      setSessionId(s.id);
      if (p?.greetingText) setMsgs([{ role: 'ai', text: p.greetingText }]);

      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const socket = io(`${base}/ai`, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
      sock.current = socket;
      socket.on('emotion', (d: { emotion: string }) => setEmotion(d.emotion || 'neutral'));
      socket.on('chunk', (d: { text: string }) => {
        setTyping(false);
        setMsgs((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'ai' && (last as any)._streaming) {
            return [...prev.slice(0, -1), { ...last, text: last.text + d.text }];
          }
          return [...prev, { role: 'ai', text: d.text, _streaming: true } as any];
        });
      });
      socket.on('done', () => setMsgs((prev) => prev.map((m) => ({ ...m, _streaming: false } as any))));
    })();
    return () => { sock.current?.disconnect(); };
  }, [user, loading]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const m = text.trim();
    if (!m || !sessionId) return;
    setMsgs((prev) => [...prev, { role: 'user', text: m }]);
    sock.current?.emit('chat', { sessionId, message: m });
    setText(''); setTyping(true);
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để trò chuyện với AI.</div>;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
      {/* Avatar (chỗ cắm Live2D) */}
      <div className="card flex flex-col items-center p-6">
        <div className="grid h-48 w-48 place-items-center rounded-2xl bg-gradient-to-b from-violet-500 to-fuchsia-600 text-7xl shadow-card transition-transform">
          {EMOTION_FACE[emotion] || '🙂'}
        </div>
        <h2 className="mt-3 text-lg font-bold">{persona?.name || 'AI Companion'}</h2>
        <p className="text-sm text-ink-500">Cảm xúc: {emotion}</p>
      </div>

      {/* Chat */}
      <div className="card flex h-[calc(100vh-200px)] flex-col overflow-hidden">
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{m.text}</div>
            </div>
          ))}
          {typing && <div className="text-sm text-ink-400">AI đang trả lời…</div>}
          <div ref={bottom} />
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-ink-200/70 p-3 dark:border-ink-800">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhắn cho AI…" className="input flex-1" />
          <button type="submit" className="btn-primary !px-3"><Send size={18} /></button>
        </form>
      </div>
    </div>
  );
}
