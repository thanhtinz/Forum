'use client';

import { useEffect, useRef, useState } from 'react';
import { Smile, Sticker, Search, Loader2, ImageOff } from 'lucide-react';
import { EMOJI_GROUPS } from '@/lib/emoji';
import { cn } from '@/lib/utils';

type Tab = 'emoji' | 'sticker' | 'gif';

interface GifItem { id: string; url: string; preview: string; description?: string }

/**
 * Bảng chọn emoji / sticker / GIF.
 * - Emoji: chèn ký tự vào vị trí con trỏ
 * - Sticker & GIF: chèn thẻ ảnh dạng markdown `![](url)` để hiển thị khi đăng
 */
export function MediaPicker({ onPickText, onPickImage }: {
  onPickText: (text: string) => void;
  onPickImage: (url: string, alt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('emoji');
  const boxRef = useRef<HTMLDivElement>(null);

  // Đóng khi bấm ra ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} title="Emoji, sticker & GIF"
        aria-expanded={open}
        className={cn('grid size-8 place-items-center rounded-lg transition-colors',
          open ? 'bg-brand-100 text-brand-600 dark:bg-brand-950/50' : 'text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800')}>
        <Smile size={18} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-[320px] overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl sm:w-[360px] dark:border-ink-700 dark:bg-ink-900">
          <div className="flex border-b border-ink-100 dark:border-ink-800">
            {([['emoji', 'Emoji'], ['sticker', 'Sticker'], ['gif', 'GIF']] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)}
                className={cn('flex-1 py-2 text-sm font-semibold transition-colors',
                  tab === k ? 'border-b-2 border-brand-500 text-brand-600' : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200')}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'emoji' && <EmojiTab onPick={(e) => { onPickText(e); }} />}
          {tab === 'sticker' && <StickerTab onPick={(s, alt) => { onPickImage(s, alt); setOpen(false); }} />}
          {tab === 'gif' && <GifTab onPick={(u, alt) => { onPickImage(u, alt); setOpen(false); }} />}
        </div>
      )}
    </div>
  );
}

function EmojiTab({ onPick }: { onPick: (e: string) => void }) {
  const [group, setGroup] = useState(EMOJI_GROUPS[0].key);
  const current = EMOJI_GROUPS.find((g) => g.key === group) ?? EMOJI_GROUPS[0];
  return (
    <div>
      <div className="grid max-h-[240px] grid-cols-8 gap-0.5 overflow-y-auto p-2">
        {current.items.map((e) => (
          <button key={e} type="button" onClick={() => onPick(e)}
            className="grid aspect-square place-items-center rounded text-xl hover:bg-ink-100 dark:hover:bg-ink-800">
            {e}
          </button>
        ))}
      </div>
      <div className="flex border-t border-ink-100 dark:border-ink-800">
        {EMOJI_GROUPS.map((g) => (
          <button key={g.key} type="button" onClick={() => setGroup(g.key)} title={g.label}
            className={cn('flex-1 py-1.5 text-lg', group === g.key ? 'bg-ink-100 dark:bg-ink-800' : 'hover:bg-ink-50 dark:hover:bg-ink-800/50')}>
            {g.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

interface StickerPackData { id: string; name: string; stickers: { id: string; name: string; url: string }[] }

function StickerTab({ onPick }: { onPick: (src: string, alt: string) => void }) {
  const [packs, setPacks] = useState<StickerPackData[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/stickers')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const list: StickerPackData[] = j.packs ?? [];
        setPacks(list);
        setActive(list[0]?.id ?? null);
      })
      .catch(() => { if (alive) setPacks([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-10 text-ink-400"><Loader2 size={20} className="animate-spin" /></div>;
  }

  if (packs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-ink-400">
        <ImageOff size={24} />
        <p>Chưa có bộ sticker nào. Quản trị viên có thể tải lên trong trang quản trị.</p>
      </div>
    );
  }

  const current = packs.find((p) => p.id === active) ?? packs[0];

  return (
    <div>
      <div className="grid max-h-[250px] grid-cols-4 gap-1.5 overflow-y-auto p-2">
        {current.stickers.map((s) => (
          <button key={s.id} type="button" onClick={() => onPick(s.url, s.name)} title={s.name}
            className="rounded-lg p-0.5 transition-transform hover:scale-105 hover:bg-ink-100 dark:hover:bg-ink-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.url} alt={s.name} loading="lazy" className="aspect-square w-full object-contain" />
          </button>
        ))}
      </div>
      {packs.length > 1 && (
        <div className="flex overflow-x-auto border-t border-ink-100 dark:border-ink-800">
          {packs.map((p) => (
            <button key={p.id} type="button" onClick={() => setActive(p.id)}
              className={cn('shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-medium',
                current.id === p.id ? 'bg-ink-100 text-brand-600 dark:bg-ink-800' : 'text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-800/50')}>
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GifTab({ onPick }: { onPick: (url: string, alt: string) => void }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/gifs?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        if (!alive) return;
        setDisabled(!!j.disabled);
        setItems(j.items ?? []);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }, q ? 400 : 0); // gõ tới đâu tìm tới đó, có độ trễ nhỏ
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  if (disabled) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-ink-400">
        <ImageOff size={24} />
        <p>Tính năng GIF chưa được bật. Quản trị viên cần cấu hình khoá API trong trang quản trị.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative p-2">
        <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm GIF…"
          className="h-8 w-full rounded-lg border border-ink-200 bg-white pl-7 pr-2 text-sm outline-none focus:border-brand-400 dark:border-ink-700 dark:bg-ink-900" />
      </div>
      <div className="max-h-[240px] overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="flex justify-center py-8 text-ink-400"><Loader2 size={20} className="animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">Không tìm thấy GIF nào.</p>
        ) : (
          <div className="columns-2 gap-1.5">
            {items.map((g) => (
              <button key={g.id} type="button" onClick={() => onPick(g.url, g.description ?? 'GIF')}
                className="mb-1.5 block w-full overflow-hidden rounded-lg hover:opacity-80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.preview} alt={g.description ?? ''} loading="lazy" className="w-full" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { Sticker };
