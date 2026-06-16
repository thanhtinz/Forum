'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import { Send, Heart, Lock } from 'lucide-react';
import { api, getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

// Live2D chỉ render phía client (dùng pixi + cubism core)
const Live2DStage = dynamic(() => import('@/components/Live2DStage'), { ssr: false });

interface Msg { role: 'user' | 'ai'; text: string }
interface Outfit {
  id: string; slug: string; name: string; modelPath: string; description?: string;
  rarity: string; unlockBondLevel: number; isUnlocked: boolean; isCurrent: boolean;
}
interface BondState {
  character: { id: string; name: string; slug: string };
  bond: { level: number; points: number; totalMessages: number; currentOutfit: string; pointsToNextLevel: number };
  outfits: Outfit[];
}

const RARITY_RING: Record<string, string> = {
  common: 'ring-ink-300', rare: 'ring-sky-400', legendary: 'ring-amber-400',
};

export default function AiCompanionPage() {
  const { user, loading } = useAuth();
  const [persona, setPersona] = useState<any>(null);
  const [sessionId, setSessionId] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState('neutral');
  const [modelPath, setModelPath] = useState<string | undefined>(undefined);
  const [bond, setBond] = useState<BondState | null>(null);
  const [toast, setToast] = useState('');
  const [typing, setTyping] = useState(false);
  const sock = useRef<Socket | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const characterId = useRef<string | null>(null);

  async function refreshBond() {
    if (!characterId.current) return;
    const st = await api.get<BondState>(`/ai/characters/${characterId.current}/bond`).catch(() => null);
    if (st) {
      setBond(st);
      const cur = st.outfits.find((o) => o.isCurrent) || st.outfits.find((o) => o.slug === st.bond.currentOutfit);
      if (cur) setModelPath(cur.modelPath);
    }
  }

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const personas = await api.get<any[]>('/ai/personas').catch(() => []);
      const p = personas[0]; setPersona(p);
      const s = await api.post<{ id: string }>('/ai/sessions', { personaId: p?.id });
      setSessionId(s.id);
      if (p?.greetingText) setMsgs([{ role: 'ai', text: p.greetingText }]);

      if (p?.characterId) { characterId.current = p.characterId; await refreshBond(); }

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
      socket.on('bond', (d: { leveledUp: boolean; newLevel: number; unlockedOutfits: string[] }) => {
        refreshBond();
        if (d.unlockedOutfits?.length) {
          setToast(`🎉 Thân thiết cấp ${d.newLevel}! Mở khoá: ${d.unlockedOutfits.join(', ')}`);
          setTimeout(() => setToast(''), 6000);
        } else if (d.leveledUp) {
          setToast(`💗 Thân thiết tăng lên cấp ${d.newLevel}!`);
          setTimeout(() => setToast(''), 4000);
        }
      });
    })();
    return () => { sock.current?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function pickOutfit(o: Outfit) {
    if (!o.isUnlocked) {
      setToast(`🔒 "${o.name}" cần thân thiết cấp ${o.unlockBondLevel}. Trò chuyện thêm để mở khoá!`);
      setTimeout(() => setToast(''), 4000);
      return;
    }
    if (!characterId.current) { setModelPath(o.modelPath); return; }
    try {
      const r = await api.post<{ currentOutfit: string; modelPath: string }>(
        `/ai/characters/${characterId.current}/outfit`, { outfitSlug: o.slug });
      setModelPath(r.modelPath);
      setBond((b) => b ? { ...b, bond: { ...b.bond, currentOutfit: r.currentOutfit }, outfits: b.outfits.map((x) => ({ ...x, isCurrent: x.slug === r.currentOutfit })) } : b);
    } catch (e: any) { setToast(e.message); setTimeout(() => setToast(''), 4000); }
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để trò chuyện với AI.</div>;

  const pct = bond ? Math.min(100, Math.round(((bond.bond.points % bond.bond.pointsToNextLevel) / bond.bond.pointsToNextLevel) * 100)) : 0;

  return (
    <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-ink-900 px-4 py-2 text-sm text-white shadow-card dark:bg-white dark:text-ink-900">{toast}</div>
      )}

      {/* Avatar Live2D + thân thiết + trang phục */}
      <div className="card flex flex-col items-center p-4">
        <div className="w-full overflow-hidden rounded-2xl bg-gradient-to-b from-violet-100 to-fuchsia-100 shadow-card dark:from-violet-950/40 dark:to-fuchsia-950/40">
          <Live2DStage modelPath={modelPath} emotion={emotion} className="relative h-80 w-full" />
        </div>
        <h2 className="mt-3 text-lg font-bold">{persona?.name || bond?.character.name || 'AI Companion'}</h2>
        <p className="text-sm text-ink-500">Cảm xúc: {emotion}</p>

        {bond && (
          <div className="mt-3 w-full">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-rose-500"><Heart size={13} /> Thân thiết · Cấp {bond.bond.level}</span>
              <span className="text-ink-500">{bond.bond.points % bond.bond.pointsToNextLevel}/{bond.bond.pointsToNextLevel}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
              <div className="h-full bg-gradient-to-r from-rose-400 to-fuchsia-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-ink-400">Đã trò chuyện {bond.bond.totalMessages} lượt</p>
          </div>
        )}

        <div className="mt-3 w-full">
          <p className="mb-1.5 text-xs font-medium text-ink-500">Trang phục</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(bond?.outfits ?? []).map((o) => (
              <button key={o.id} onClick={() => pickOutfit(o)}
                className={`relative rounded-lg px-2.5 py-2 text-left text-xs ring-1 transition ${
                  o.isCurrent ? 'bg-brand-600 text-white ring-brand-600'
                    : o.isUnlocked ? `bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 ${RARITY_RING[o.rarity] || 'ring-transparent'}`
                    : 'cursor-not-allowed bg-ink-100/60 text-ink-400 ring-transparent dark:bg-ink-800/50'
                }`}>
                <span className="flex items-center gap-1 font-medium">
                  {!o.isUnlocked && <Lock size={11} />} {o.name}
                </span>
                {!o.isUnlocked && <span className="block text-[10px]">Cấp {o.unlockBondLevel}</span>}
                {o.rarity === 'legendary' && o.isUnlocked && <span className="block text-[10px] text-amber-500">★ Huyền thoại</span>}
              </button>
            ))}
            {!bond && <p className="col-span-2 text-xs text-ink-400">Đang tải trang phục…</p>}
          </div>
        </div>
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
