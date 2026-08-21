'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gamepad2, Loader2, Search } from 'lucide-react';

interface Suggestion {
  slug: string;
  title: string;
  titleVi: string | null;
  icon: string | null;
}

/**
 * Ô tìm game với autocomplete. Gọi `/api/games/search` (đã fuzzy + bỏ dấu) sau
 * 200ms ngừng gõ; huỷ request cũ để kết quả không nhảy lộn xộn.
 */
export function GameSearchBox({ defaultValue = '', autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) { setItems([]); setLoading(false); return; }

    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/games/search?q=${encodeURIComponent(term)}&limit=8`, { signal: ctrl.signal });
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setItems(data.suggestions ?? []);
        setActive(-1);
      } catch {
        // request bị huỷ hoặc mạng lỗi — giữ nguyên gợi ý cũ
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  // Nhấp ra ngoài thì đóng gợi ý
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const go = (slug: string) => { setOpen(false); router.push(`/games/${slug}`); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + items.length) % items.length); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); go(items[active]!.slug); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <form action="/games/search" onSubmit={() => setOpen(false)}>
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          name="q"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder="Tìm game, nhà phát triển, series, tag…"
          className="input pl-10 pr-9"
          aria-label="Tìm game"
        />
        {loading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-400" />}
      </form>

      {open && q.trim() && (
        <ul className="card absolute z-30 mt-1.5 max-h-80 w-full overflow-y-auto p-1.5 text-sm shadow-card-hover">
          {items.length === 0 && !loading && (
            <li className="px-3 py-4 text-center text-ink-400">Không có gợi ý cho “{q.trim()}”.</li>
          )}
          {items.map((s, i) => (
            <li key={s.slug}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(s.slug)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ${i === active ? 'bg-ink-100 dark:bg-ink-800' : ''}`}
              >
                {s.icon
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={s.icon} alt="" className="h-8 w-8 rounded-lg object-cover" style={{ imageRendering: 'pixelated' }} />
                  : <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-950"><Gamepad2 size={16} /></span>}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{s.title}</span>
                  {s.titleVi && <span className="block truncate text-xs text-ink-400">{s.titleVi}</span>}
                </span>
              </button>
            </li>
          ))}
          {items.length > 0 && (
            <li className="border-t border-ink-100 pt-1 dark:border-ink-800">
              <button
                type="button"
                onClick={() => { setOpen(false); router.push(`/games/search?q=${encodeURIComponent(q.trim())}`); }}
                className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-brand-600 hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                Xem tất cả kết quả cho “{q.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
