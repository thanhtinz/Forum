'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import { Send, Heart, Lock, Star, Sparkles, Settings2, Wand2, Shirt, RefreshCw, X } from 'lucide-react';
import { api, getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const AI_PROVIDERS: { value: string; label: string; needBase?: boolean; defaultBase?: string }[] = [
  { value: 'GEMINI', label: 'Google Gemini' },
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'OPENAI_COMPAT', label: 'OpenAI-compatible (URL)', needBase: true },
  { value: 'OLLAMA', label: 'Ollama (tự host)', needBase: true, defaultBase: 'http://localhost:11434' },
];
const AI_PRESETS = [
  { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
  { label: 'Groq', url: 'https://api.groq.com/openai/v1' },
  { label: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
];

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

const TRAIT_PRESETS = ['Vui vẻ', 'Dịu dàng', 'Hài hước', 'Nghiêm túc', 'Tsundere', 'Năng động', 'Điềm tĩnh', 'Thông minh', 'Tinh nghịch', 'Ấm áp', 'Lạnh lùng', 'Tốt bụng'];

// ── Form thiết lập AI riêng (tên + tính cách → hệ thống tự sinh prompt) ──
function PersonaSetup({ initial, onSaved, isEdit }: { initial?: any; onSaved: (p: any) => void; isEdit?: boolean }) {
  const [name, setName] = useState(initial?.name || '');
  const [traits, setTraits] = useState<string[]>([]);
  const [personality, setPersonality] = useState(initial?.personality || '');
  const [speakingStyle, setSpeakingStyle] = useState('');
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Cấu hình AI riêng (key/model) — gộp vào đây
  const [aiProvider, setAiProvider] = useState('GEMINI');
  const [aiModel, setAiModel] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [aiHasKey, setAiHasKey] = useState(false);
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [aiLoadingModels, setAiLoadingModels] = useState(false);
  const pInfo = AI_PROVIDERS.find((p) => p.value === aiProvider);

  useEffect(() => {
    api.get<{ provider: string; model: string; baseUrl: string; hasKey: boolean }>('/users/me/ai').then((r) => {
      if (r.provider) setAiProvider(r.provider);
      setAiModel(r.model || ''); setAiBaseUrl(r.baseUrl || ''); setAiHasKey(r.hasKey);
    }).catch(() => {});
  }, []);

  async function fetchAiModels() {
    setAiLoadingModels(true); setErr('');
    try {
      const r = await api.post<{ models: string[] }>('/ai/models', { provider: aiProvider, apiKey: aiKey || undefined, baseUrl: aiBaseUrl || undefined });
      setAiModels(r.models || []);
      if (!r.models?.length) setErr('Không có model nào — kiểm tra lại API key/Base URL.');
    } catch (e: any) { setErr(`Tải model lỗi: ${e.message}`); } finally { setAiLoadingModels(false); }
  }

  function toggleTrait(t: string) {
    setTraits((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  async function saveAiConfig() {
    await api.patch('/users/me/ai', { provider: aiProvider, model: aiModel, baseUrl: aiBaseUrl, ...(aiKey ? { apiKey: aiKey } : {}) }).catch(() => {});
  }

  async function doPreview() {
    if (!name.trim()) { setErr('Hãy đặt tên cho AI'); return; }
    try {
      const r = await api.post<{ systemPrompt: string }>('/ai/me/persona/preview', { name, traits, personality, speakingStyle });
      setPreview(r.systemPrompt);
    } catch (e: any) { setErr(e.message); }
  }

  async function submit() {
    setErr('');
    if (!name.trim()) { setErr('Hãy đặt tên cho AI'); return; }
    setBusy(true);
    try {
      await saveAiConfig();
      const p = await api.post<any>('/ai/me/persona', { name, traits, personality, speakingStyle });
      onSaved(p);
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="card p-6">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Sparkles size={20} className="text-fuchsia-500" /> {isEdit ? 'Tùy chỉnh AI của bạn' : 'Tạo người bạn AI của riêng bạn'}</h1>
        <p className="mt-1 text-sm text-ink-500">Đặt tên và mô tả tính cách — hệ thống sẽ tự tạo "tính cách" (prompt) riêng cho AI của bạn.</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Tên AI</label>
            <input className="input" placeholder="VD: Mira, Tom, Bé Na…" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tính cách (chọn nhanh)</label>
            <div className="flex flex-wrap gap-1.5">
              {TRAIT_PRESETS.map((t) => (
                <button key={t} type="button" onClick={() => toggleTrait(t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${traits.includes(t) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-ink-100 ring-transparent hover:bg-ink-200 dark:bg-ink-800'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Mô tả thêm (tuỳ chọn)</label>
            <textarea className="input min-h-[80px] resize-y" placeholder="VD: thích anime, hay trêu chọc nhẹ nhàng, giỏi động viên, mê công nghệ…" value={personality} maxLength={800} onChange={(e) => setPersonality(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Cách xưng hô / giọng điệu (tuỳ chọn)</label>
            <input className="input" placeholder="VD: xưng mình - gọi bạn, nhẹ nhàng" value={speakingStyle} onChange={(e) => setSpeakingStyle(e.target.value)} />
          </div>

          {/* Cấu hình AI (nguồn/key/model) — gộp vào đây, dùng cho chat của bạn */}
          <div className="rounded-lg border border-ink-200/70 p-3 dark:border-ink-800">
            <p className="mb-2 text-sm font-medium">Cấu hình AI (nguồn & model)</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-xs">Nguồn AI
                <select className="input mt-1 !py-1.5" value={aiProvider} onChange={(e) => { const v = e.target.value; setAiProvider(v); setAiModel(''); const np = AI_PROVIDERS.find((p) => p.value === v); if (np?.defaultBase !== undefined) setAiBaseUrl(np.defaultBase || ''); }}>
                  {AI_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </label>
              <label className="text-xs">API key {aiProvider === 'OLLAMA' ? '(không cần)' : ''}
                <input className="input mt-1 !py-1.5" type="password" autoComplete="off" placeholder={aiHasKey ? '•••• (đã lưu)' : 'Dán API key…'} value={aiKey} onChange={(e) => setAiKey(e.target.value)} />
              </label>
            </div>
            {pInfo?.needBase && (
              <label className="mt-2 block text-xs">Base URL
                <input className="input mt-1 !py-1.5" placeholder={pInfo.defaultBase || 'https://…/v1'} value={aiBaseUrl} onChange={(e) => setAiBaseUrl(e.target.value)} />
                {aiProvider === 'OPENAI_COMPAT' && <span className="mt-1 flex flex-wrap gap-1">{AI_PRESETS.map((p) => <button key={p.url} type="button" onClick={() => setAiBaseUrl(p.url)} className="rounded bg-ink-100 px-2 py-0.5 text-[11px] dark:bg-ink-800">{p.label}</button>)}</span>}
              </label>
            )}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs">
                <span>Model</span>
                <button type="button" onClick={fetchAiModels} disabled={aiLoadingModels} className="inline-flex items-center gap-1 text-brand-600 hover:underline disabled:opacity-50"><RefreshCw size={11} className={aiLoadingModels ? 'animate-spin' : ''} /> Tải model thực tế</button>
              </div>
              <input className="input mt-1 !py-1.5" list="ai-models-chat" placeholder="Chọn/nhập model…" value={aiModel} onChange={(e) => setAiModel(e.target.value)} />
              <datalist id="ai-models-chat">{aiModels.map((m) => <option key={m} value={m} />)}</datalist>
            </div>
            <p className="mt-1 text-[11px] text-ink-400">Để trống = dùng AI mặc định của hệ thống. Hỗ trợ cả nguồn không kiểm duyệt (OpenRouter…).</p>
          </div>

          {err && <p className="text-sm text-red-500">{err}</p>}

          <div className="flex flex-wrap gap-2">
            <button onClick={submit} disabled={busy} className="btn-primary inline-flex items-center gap-1">
              <Sparkles size={16} /> {busy ? 'Đang tạo…' : (isEdit ? 'Lưu thay đổi' : 'Tạo AI của tôi')}
            </button>
            <button type="button" onClick={doPreview} className="btn-outline inline-flex items-center gap-1"><Wand2 size={16} /> Xem prompt</button>
          </div>

          {preview && (
            <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 text-xs text-ink-600 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300">
              <p className="mb-1 font-medium text-ink-500">Prompt hệ thống sẽ tạo:</p>
              <pre className="whitespace-pre-wrap font-sans">{preview}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AiCompanionPage() {
  const { user, loading } = useAuth();
  const [persona, setPersona] = useState<any>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [editing, setEditing] = useState(false);
  const [booting, setBooting] = useState(true);
  const [sessionId, setSessionId] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState('neutral');
  const [modelPath, setModelPath] = useState<string | undefined>(undefined);
  const [bond, setBond] = useState<BondState | null>(null);
  const [toast, setToast] = useState('');
  const [typing, setTyping] = useState(false);
  const [showOutfits, setShowOutfits] = useState(false);
  const sock = useRef<Socket | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const characterId = useRef<string | null>(null);
  const started = useRef(false);

  function showToast(t: string, ms = 4000) { setToast(t); setTimeout(() => setToast(''), ms); }

  async function refreshBond() {
    if (!characterId.current) return;
    const st = await api.get<BondState>(`/ai/characters/${characterId.current}/bond`).catch(() => null);
    if (st) {
      setBond(st);
      const cur = st.outfits.find((o) => o.isCurrent) || st.outfits.find((o) => o.slug === st.bond.currentOutfit);
      if (cur) setModelPath(cur.modelPath);
    }
  }

  async function startChat(p: any) {
    setPersona(p);
    const s = await api.post<{ id: string }>('/ai/sessions', { personaId: p?.id });
    setSessionId(s.id);
    setMsgs(p?.greetingText ? [{ role: 'ai', text: p.greetingText }] : []);
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
    socket.on('error', (d: { message?: string }) => {
      setTyping(false);
      showToast(d?.message ? `AI lỗi: ${d.message}. Kiểm tra cấu hình AI (key/model) ở nút ⚙.` : 'AI gặp lỗi. Kiểm tra cấu hình AI.', 6000);
    });
    socket.on('bond', (d: { leveledUp: boolean; newLevel: number; unlockedOutfits: string[] }) => {
      refreshBond();
      if (d.unlockedOutfits?.length) showToast(`Thân thiết cấp ${d.newLevel}! Mở khoá: ${d.unlockedOutfits.join(', ')}`, 6000);
      else if (d.leveledUp) showToast(`Thân thiết tăng lên cấp ${d.newLevel}!`);
    });
  }

  useEffect(() => {
    if (loading || !user || started.current) return;
    (async () => {
      const mine = await api.get<any>('/ai/me/persona').catch(() => null);
      if (mine && mine.id) { started.current = true; await startChat(mine); }
      else setNeedsSetup(true);
      setBooting(false);
    })();
    return () => { sock.current?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing]);

  async function onPersonaSaved(p: any) {
    setNeedsSetup(false);
    setEditing(false);
    if (!started.current) { started.current = true; await startChat(p); }
    else { setPersona(p); showToast('Đã cập nhật AI của bạn'); }
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const m = text.trim();
    if (!m || !sessionId) return;
    setMsgs((prev) => [...prev, { role: 'user', text: m }]);
    sock.current?.emit('chat', { sessionId, message: m });
    setText(''); setTyping(true);
  }

  async function pickOutfit(o: Outfit) {
    if (!o.isUnlocked) { showToast(`"${o.name}" cần thân thiết cấp ${o.unlockBondLevel}. Trò chuyện thêm để mở khoá!`); return; }
    if (!characterId.current) { setModelPath(o.modelPath); return; }
    try {
      const r = await api.post<{ currentOutfit: string; modelPath: string }>(
        `/ai/characters/${characterId.current}/outfit`, { outfitSlug: o.slug });
      setModelPath(r.modelPath);
      setBond((b) => b ? { ...b, bond: { ...b.bond, currentOutfit: r.currentOutfit }, outfits: b.outfits.map((x) => ({ ...x, isCurrent: x.slug === r.currentOutfit })) } : b);
    } catch (e: any) { showToast(e.message); }
  }

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để trò chuyện với AI.</div>;
  if (booting) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (needsSetup) return <PersonaSetup onSaved={onPersonaSaved} />;
  if (editing) return <PersonaSetup initial={persona} isEdit onSaved={onPersonaSaved} />;

  const pct = bond ? Math.min(100, Math.round(((bond.bond.points % bond.bond.pointsToNextLevel) / bond.bond.pointsToNextLevel) * 100)) : 0;

  return (
    <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-ink-900 px-4 py-2 text-sm text-white shadow-card dark:bg-white dark:text-ink-900">{toast}</div>
      )}

      {/* Avatar Live2D + thân thiết + trang phục */}
      <div className="card flex flex-col items-center p-4">
        <div className="w-full overflow-hidden rounded-2xl bg-ink-100 dark:bg-ink-900">
          <Live2DStage modelPath={modelPath} emotion={emotion} className="relative h-96 w-full" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <h2 className="text-lg font-bold">{persona?.name || bond?.character.name || 'AI Companion'}</h2>
          <button onClick={() => setEditing(true)} title="Tùy chỉnh AI & cấu hình AI" className="text-ink-400 hover:text-brand-600"><Settings2 size={16} /></button>
          <button onClick={() => setShowOutfits(true)} title="Trang phục" className="text-ink-400 hover:text-brand-600"><Shirt size={16} /></button>
        </div>
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
      </div>


      {/* Popup trang phục */}
      {showOutfits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowOutfits(false)}>
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-md p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold"><Shirt size={18} /> Trang phục</h3>
              <button onClick={() => setShowOutfits(false)} className="text-ink-400 hover:text-ink-600"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(bond?.outfits ?? []).map((o) => (
                <button key={o.id} onClick={() => { pickOutfit(o); }}
                  className={`relative rounded-lg px-2.5 py-2 text-left text-xs ring-1 transition ${
                    o.isCurrent ? 'bg-brand-600 text-white ring-brand-600'
                      : o.isUnlocked ? `bg-ink-100 hover:bg-ink-200 dark:bg-ink-800 ${RARITY_RING[o.rarity] || 'ring-transparent'}`
                      : 'cursor-not-allowed bg-ink-100/60 text-ink-400 ring-transparent dark:bg-ink-800/50'
                  }`}>
                  <span className="flex items-center gap-1 font-medium">{!o.isUnlocked && <Lock size={11} />} {o.name}</span>
                  {!o.isUnlocked && <span className="block text-[10px]">Cấp {o.unlockBondLevel}</span>}
                  {o.rarity === 'legendary' && o.isUnlocked && <span className="flex items-center gap-0.5 text-[10px] text-amber-500"><Star size={9} className="fill-amber-500" /> Huyền thoại</span>}
                </button>
              ))}
              {!bond && <p className="col-span-full text-xs text-ink-400">Đang tải trang phục…</p>}
            </div>
          </div>
        </div>
      )}

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
