'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Smile, Sticker as StickerIcon, Film, Image as ImageIcon, Paperclip, Music, Mic, Square, X, Reply } from 'lucide-react';
import { api, uploadImage, uploadAttachment } from '@/lib/api';
import { EMOJIS, StickerPack, searchGifs, ChatMsg } from '@/lib/chat';

type OutMsg = { type: ChatMsg['type']; content: string; metadata?: any };
type Panel = 'emoji' | 'sticker' | 'gif' | 'music' | null;

export function Composer({ onSend, replyTo, onCancelReply, onTyping }: {
  onSend: (m: OutMsg) => void;
  replyTo: ChatMsg | null;
  onCancelReply: () => void;
  onTyping?: () => void;
}) {
  const [text, setText] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
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
    if (panel === 'sticker' && packs.length === 0) api.get<StickerPack[]>('/chat/stickers').then(setPacks).catch(() => {});
    if (panel === 'gif') searchGifs(gifQ).then((g) => { setGifs(g); setGifNoKey(g.length === 0 && !process.env.NEXT_PUBLIC_TENOR_KEY); });
  }, [panel]); // eslint-disable-line

  function sendText() {
    const c = text.trim();
    if (!c) return;
    onSend({ type: 'TEXT', content: c });
    setText('');
  }

  async function pickImage(f: File) {
    setUploading(true);
    try { const { url } = await uploadImage(f); onSend({ type: 'IMAGE', content: url }); }
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
    if (recording) {
      recRef.current?.stop();
      return;
    }
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
    } catch {
      alert('Không truy cập được micro.');
    }
  }

  return (
    <div className="border-t border-ink-200/70 dark:border-ink-800">
      {replyTo && (
        <div className="flex items-center justify-between bg-ink-50 px-3 py-1.5 text-xs dark:bg-ink-800/50">
          <span className="flex items-center gap-1 truncate text-ink-500"><Reply size={12} /> Trả lời: {replyTo.type === 'TEXT' ? replyTo.content.slice(0, 50) : replyTo.type}</span>
          <button onClick={onCancelReply}><X size={14} /></button>
        </div>
      )}

      {/* Bảng emoji */}
      {panel === 'emoji' && (
        <div className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto p-3 sm:grid-cols-12">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setText((t) => t + e)} className="rounded p-1 text-xl hover:bg-ink-100 dark:hover:bg-ink-800">{e}</button>
          ))}
        </div>
      )}

      {/* Bảng sticker */}
      {panel === 'sticker' && (
        <div className="max-h-52 overflow-y-auto p-3">
          {packs.length === 0 && <p className="text-center text-sm text-ink-400">Chưa có sticker.</p>}
          {packs.map((p) => (
            <div key={p.id} className="mb-3">
              <p className="mb-1 text-xs font-semibold text-ink-500">{p.name}{!p.isOwned && ' 🔒'}</p>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                {p.stickers.map((s) => (
                  <button key={s.id} disabled={!p.isOwned}
                    onClick={() => { onSend({ type: 'STICKER', content: s.imageUrl, metadata: { packId: p.id } }); setPanel(null); }}
                    className="rounded-lg p-1 hover:bg-ink-100 disabled:opacity-40 dark:hover:bg-ink-800">
                    <img src={s.imageUrl} alt={s.name} className="h-14 w-14 object-contain" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bảng GIF */}
      {panel === 'gif' && (
        <div className="max-h-56 overflow-y-auto p-3">
          <input className="input mb-2" placeholder="Tìm GIF…" value={gifQ}
            onChange={(e) => setGifQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchGifs(gifQ).then(setGifs)} />
          {gifNoKey ? (
            <div className="space-y-2">
              <p className="text-xs text-ink-400">Chưa cấu hình Tenor. Dán link GIF trực tiếp:</p>
              <div className="flex gap-2">
                <input className="input" placeholder="https://...gif" value={gifQ} onChange={(e) => setGifQ(e.target.value)} />
                <button className="btn-primary" onClick={() => { if (gifQ.trim()) { onSend({ type: 'GIF', content: gifQ.trim() }); setPanel(null); setGifQ(''); } }}>Gửi</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {gifs.map((g) => (
                <button key={g.id} onClick={() => { onSend({ type: 'GIF', content: g.url }); setPanel(null); }}>
                  <img src={g.preview} alt="gif" className="h-24 w-full rounded-lg object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bảng nhạc */}
      {panel === 'music' && (
        <div className="flex gap-2 p-3">
          <input className="input flex-1" placeholder="Link YouTube / Spotify / SoundCloud / .mp3" value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} />
          <button className="btn-primary" onClick={() => { if (musicUrl.trim()) { onSend({ type: 'MUSIC', content: musicUrl.trim() }); setMusicUrl(''); setPanel(null); } }}>Gửi</button>
        </div>
      )}

      {/* Thanh công cụ + input */}
      <div className="flex items-center gap-1 p-2">
        <input ref={imgInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && pickImage(e.target.files[0])} />
        <input ref={fileInput} type="file" hidden onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />

        <ToolBtn active={panel === 'emoji'} onClick={() => setPanel(panel === 'emoji' ? null : 'emoji')} title="Emoji"><Smile size={19} /></ToolBtn>
        <ToolBtn active={panel === 'sticker'} onClick={() => setPanel(panel === 'sticker' ? null : 'sticker')} title="Sticker"><StickerIcon size={19} /></ToolBtn>
        <ToolBtn active={panel === 'gif'} onClick={() => setPanel(panel === 'gif' ? null : 'gif')} title="GIF"><Film size={19} /></ToolBtn>
        <ToolBtn onClick={() => imgInput.current?.click()} title="Ảnh"><ImageIcon size={19} /></ToolBtn>
        <ToolBtn onClick={() => fileInput.current?.click()} title="Tập tin"><Paperclip size={19} /></ToolBtn>
        <ToolBtn active={panel === 'music'} onClick={() => setPanel(panel === 'music' ? null : 'music')} title="Nhạc"><Music size={19} /></ToolBtn>
        <ToolBtn active={recording} onClick={toggleRecord} title="Ghi âm">{recording ? <Square size={19} className="text-red-500" /> : <Mic size={19} />}</ToolBtn>

        <input
          value={text}
          onChange={(e) => { setText(e.target.value); onTyping?.(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
          placeholder={uploading ? 'Đang tải lên…' : recording ? 'Đang ghi âm…' : 'Nhập tin nhắn…'}
          disabled={uploading}
          className="input flex-1"
        />
        <button onClick={sendText} className="btn-primary !px-3" aria-label="Gửi"><Send size={18} /></button>
      </div>
    </div>
  );
}

function ToolBtn({ children, onClick, active, title }: { children: React.ReactNode; onClick: () => void; active?: boolean; title: string }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`rounded-lg p-2 hover:bg-ink-100 dark:hover:bg-ink-800 ${active ? 'text-brand-600' : 'text-ink-500'}`}>
      {children}
    </button>
  );
}
