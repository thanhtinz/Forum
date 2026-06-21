'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Smile, Plus, Image as ImageIcon, Paperclip, Music, Mic, Square, X, Reply } from 'lucide-react';
import { api, uploadEditorImage, uploadAttachment } from '@/lib/api';
import { EMOJIS, StickerPack, searchGifs, ChatMsg } from '@/lib/chat';

type OutMsg = { type: ChatMsg['type']; content: string; metadata?: any };
type SmileyTab = 'emoji' | 'sticker' | 'gif';

export function Composer({ onSend, replyTo, onCancelReply, onTyping }: {
  onSend: (m: OutMsg) => void;
  replyTo: ChatMsg | null;
  onCancelReply: () => void;
  onTyping?: () => void;
}) {
  const [text, setText] = useState('');
  const [smiley, setSmiley] = useState(false);          // bảng mặt cười (emoji/sticker/gif)
  const [tab, setTab] = useState<SmileyTab>('emoji');
  const [mediaMenu, setMediaMenu] = useState(false);    // menu media (ảnh/file/nhạc/ghi âm)
  const [musicOpen, setMusicOpen] = useState(false);

  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [gifQ, setGifQ] = useState('');
  const [gifs, setGifs] = useState<{ id: string; url: string; preview: string }[]>([]);
  const [gifNoKey, setGifNoKey] = useState(false);
  const [musicUrl, setMusicUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const imgInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!smiley) return;
    if (tab === 'sticker' && packs.length === 0) api.get<StickerPack[]>('/chat/stickers').then(setPacks).catch(() => {});
    if (tab === 'gif') searchGifs(gifQ).then((r) => { setGifs(r.results); setGifNoKey(!r.configured); });
  }, [smiley, tab]); // eslint-disable-line

  function closeAll() { setSmiley(false); setMediaMenu(false); setMusicOpen(false); }

  function sendText() {
    const c = text.trim();
    if (!c) return;
    onSend({ type: 'TEXT', content: c });
    setText('');
  }

  async function pickImage(f: File) {
    setUploading(true);
    try { const { url } = await uploadEditorImage(f); onSend({ type: 'IMAGE', content: url }); }
    finally { setUploading(false); }
  }
  async function pickFile(f: File) {
    setUploading(true);
    try {
      const r = await uploadAttachment(f);
      onSend({ type: 'FILE', content: r.url, metadata: { filename: r.filename, size: r.size } });
    } finally { setUploading(false); }
  }

  async function toggleRecord() {
    if (recording) { recRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        setUploading(true);
        try { const r = await uploadAttachment(file); onSend({ type: 'VOICE', content: r.url, metadata: { size: r.size } }); }
        finally { setUploading(false); }
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch { alert('Không truy cập được micro.'); }
  }

  return (
    <div className="relative border-t border-ink-200/70 dark:border-ink-800">
      {replyTo && (
        <div className="flex items-center justify-between bg-ink-50 px-3 py-1.5 text-xs dark:bg-ink-800/50">
          <span className="flex items-center gap-1 truncate text-ink-500"><Reply size={12} /> Trả lời: {replyTo.type === 'TEXT' ? replyTo.content.slice(0, 50) : replyTo.type}</span>
          <button onClick={onCancelReply}><X size={14} /></button>
        </div>
      )}

      {/* Bảng mặt cười: Emoji / Sticker / GIF (kiểu Messenger) */}
      {smiley && (
        <div className="absolute bottom-full left-2 z-20 mb-2 w-[340px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-lg dark:border-ink-800 dark:bg-ink-900">
          <div className="flex border-b border-ink-200/70 dark:border-ink-800">
            {(['emoji', 'sticker', 'gif'] as SmileyTab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-brand-600 text-brand-600' : 'text-ink-500'}`}>
                {t === 'emoji' ? 'Emoji' : t === 'sticker' ? 'Sticker' : 'GIF'}
              </button>
            ))}
          </div>

          {tab === 'emoji' && (
            <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto p-3">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setText((t) => t + e)} className="rounded p-1 text-xl hover:bg-ink-100 dark:hover:bg-ink-800">{e}</button>
              ))}
            </div>
          )}

          {tab === 'sticker' && (
            <div className="max-h-56 overflow-y-auto p-3">
              {packs.length === 0 && <p className="text-center text-sm text-ink-400">Chưa có sticker.</p>}
              {packs.map((p) => (
                <div key={p.id} className="mb-3">
                  <p className="mb-1 text-xs font-semibold text-ink-500">{p.name}{!p.isOwned && ' 🔒'}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {p.stickers.map((s) => (
                      <button key={s.id} disabled={!p.isOwned}
                        onClick={() => { onSend({ type: 'STICKER', content: s.imageUrl, metadata: { packId: p.id } }); closeAll(); }}
                        className="rounded-lg p-1 hover:bg-ink-100 disabled:opacity-40 dark:hover:bg-ink-800">
                        <img src={s.imageUrl} alt={s.name} className="h-14 w-14 object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'gif' && (
            <div className="max-h-60 overflow-y-auto p-3">
              <input className="input mb-2" placeholder="Tìm GIF…" value={gifQ}
                onChange={(e) => setGifQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchGifs(gifQ).then((r) => { setGifs(r.results); setGifNoKey(!r.configured); })} />
              {gifNoKey ? (
                <div className="space-y-2">
                  <p className="text-xs text-ink-400">Chưa cấu hình Tenor. Dán link GIF trực tiếp:</p>
                  <div className="flex gap-2">
                    <input className="input" placeholder="https://...gif" value={gifQ} onChange={(e) => setGifQ(e.target.value)} />
                    <button className="btn-primary" onClick={() => { if (gifQ.trim()) { onSend({ type: 'GIF', content: gifQ.trim() }); closeAll(); setGifQ(''); } }}>Gửi</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {gifs.map((g) => (
                    <button key={g.id} onClick={() => { onSend({ type: 'GIF', content: g.url }); closeAll(); }}>
                      <img src={g.preview} alt="gif" className="h-24 w-full rounded-lg object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Menu media */}
      {mediaMenu && (
        <div className="absolute bottom-full left-2 z-20 mb-2 w-48 overflow-hidden rounded-xl border border-ink-200/70 bg-white py-1 shadow-lg dark:border-ink-800 dark:bg-ink-900">
          <MediaItem icon={<ImageIcon size={17} className="text-emerald-600" />} label="Hình ảnh" onClick={() => { setMediaMenu(false); imgInput.current?.click(); }} />
          <MediaItem icon={<Paperclip size={17} className="text-sky-600" />} label="Tập tin" onClick={() => { setMediaMenu(false); fileInput.current?.click(); }} />
          <MediaItem icon={<Music size={17} className="text-fuchsia-600" />} label="Nhạc" onClick={() => { setMediaMenu(false); setMusicOpen(true); }} />
          <MediaItem icon={recording ? <Square size={17} className="text-red-500" /> : <Mic size={17} className="text-amber-600" />} label={recording ? 'Dừng ghi âm' : 'Ghi âm'} onClick={() => { setMediaMenu(false); toggleRecord(); }} />
        </div>
      )}

      {/* Ô nhập link nhạc */}
      {musicOpen && (
        <div className="flex gap-2 border-b border-ink-200/70 p-2 dark:border-ink-800">
          <input className="input flex-1" placeholder="Link YouTube / Spotify / SoundCloud / .mp3" value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} autoFocus />
          <button className="btn-primary" onClick={() => { if (musicUrl.trim()) { onSend({ type: 'MUSIC', content: musicUrl.trim() }); setMusicUrl(''); setMusicOpen(false); } }}>Gửi</button>
          <button className="btn-ghost !px-2" onClick={() => setMusicOpen(false)}><X size={16} /></button>
        </div>
      )}

      {/* Thanh nhập */}
      <div className="flex items-center gap-1 p-2">
        <input ref={imgInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0])} />
        <input ref={fileInput} type="file" hidden onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />

        <button type="button" title="Media" onClick={() => { setMediaMenu((v) => !v); setSmiley(false); }}
          className={`rounded-lg p-2 hover:bg-ink-100 dark:hover:bg-ink-800 ${mediaMenu ? 'text-brand-600' : 'text-ink-500'}`}>
          {recording ? <Square size={20} className="text-red-500" /> : <Plus size={20} />}
        </button>
        <button type="button" title="Cảm xúc" onClick={() => { setSmiley((v) => !v); setMediaMenu(false); }}
          className={`rounded-lg p-2 hover:bg-ink-100 dark:hover:bg-ink-800 ${smiley ? 'text-brand-600' : 'text-ink-500'}`}>
          <Smile size={20} />
        </button>

        <input
          value={text}
          onChange={(e) => { setText(e.target.value); onTyping?.(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
          onFocus={closeAll}
          placeholder={uploading ? 'Đang tải lên…' : recording ? 'Đang ghi âm…' : 'Nhập tin nhắn…'}
          disabled={uploading}
          className="input flex-1"
        />
        <button onClick={sendText} className="btn-primary !px-3" aria-label="Gửi"><Send size={18} /></button>
      </div>
    </div>
  );
}

function MediaItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800">
      {icon} {label}
    </button>
  );
}
