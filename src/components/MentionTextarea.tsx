'use client';

import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState,
  type TextareaHTMLAttributes,
} from 'react';
import { AtSign } from 'lucide-react';
import { Popover } from '@/components/Popover';
import { cn } from '@/lib/utils';

interface Suggestion { username: string; name: string | null; image: string | null; level: number }

/** Phần @tên đang gõ dở, tính từ vị trí con trỏ ngược về trước. */
const TRAILING = /(?:^|[\s(\[{>«"'’])@([A-Za-z0-9_]{0,30})$/;

/**
 * Ô soạn có gợi ý nhắc tên.
 *
 * Gõ @ rồi vài chữ sẽ hiện danh sách thành viên; chọn bằng chuột, Enter hoặc
 * Tab. Dùng thay cho <textarea> ở mọi chỗ cho phép nhắc tên — mọi thuộc tính
 * đều được chuyển thẳng xuống thẻ bên trong nên gọi như textarea bình thường.
 */
export const MentionTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function MentionTextarea({ className, onKeyDown, onInput, onBlur, ...rest }, outerRef) {
    const inner = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(outerRef, () => inner.current as HTMLTextAreaElement, []);

    const [query, setQuery] = useState<string | null>(null);
    const [items, setItems] = useState<Suggestion[]>([]);
    const [active, setActive] = useState(0);
    const open = query !== null && items.length > 0;

    // Bảng gợi ý phải bám vào chính ô soạn, mà `Popover` nhận mốc bám qua prop
    // nên phải là state chứ không phải ref: ref đổi không dựng lại hình.
    const [moc, setMoc] = useState<HTMLTextAreaElement | null>(null);
    // Bảng dựng ngoài cây thẻ nên không tự rộng bằng ô soạn được nữa — đo lấy.
    const [rong, setRong] = useState(0);
    useEffect(() => {
      if (!open || !moc) return;
      const do_ = () => setRong(moc.getBoundingClientRect().width);
      do_();
      window.addEventListener('resize', do_);
      return () => window.removeEventListener('resize', do_);
    }, [open, moc]);

    /** Đọc lại phần đang gõ mỗi khi nội dung hoặc con trỏ đổi. */
    const sync = useCallback(() => {
      const ta = inner.current;
      if (!ta) return;
      const before = ta.value.slice(0, ta.selectionStart ?? 0);
      const m = TRAILING.exec(before);
      setQuery(m ? m[1] : null);
    }, []);

    useEffect(() => {
      if (query === null || query.length < 1) { setItems([]); return; }
      const ctrl = new AbortController();
      const t = setTimeout(async () => {
        try {
          const r = await fetch(`/api/mentions?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
          const j = await r.json();
          setItems(Array.isArray(j.items) ? j.items : []);
          setActive(0);
        } catch {
          // Huỷ giữa chừng hoặc mất mạng: coi như không có gợi ý.
        }
      }, 150);
      return () => { clearTimeout(t); ctrl.abort(); };
    }, [query]);

    /** Thay phần @đang gõ bằng tên đã chọn, thêm một dấu cách cho gõ tiếp. */
    const pick = (username: string) => {
      const ta = inner.current;
      if (ta === null || query === null) return;
      const caret = ta.selectionStart ?? ta.value.length;
      const start = caret - query.length - 1;
      const text = `@${username} `;
      ta.value = ta.value.slice(0, start) + text + ta.value.slice(caret);
      const pos = start + text.length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
      setQuery(null);
      setItems([]);
    };

    return (
      <div className="relative">
        <textarea {...rest}
          ref={(el) => { inner.current = el; setMoc(el); }}
          className={className}
          onInput={(e) => { sync(); onInput?.(e); }}
          onClick={sync}
          onBlur={(e) => { setQuery(null); onBlur?.(e); }}
          onKeyDown={(e) => {
            if (open) {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % items.length); return; }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + items.length) % items.length); return; }
              if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(items[active].username); return; }
              if (e.key === 'Escape') { e.preventDefault(); setQuery(null); return; }
            }
            onKeyDown?.(e);
          }}
          onKeyUp={(e) => {
            // Mũi tên trái/phải cũng đổi vị trí con trỏ nên phải đọc lại.
            if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') sync();
          }} />

        {/* Bảng gợi ý dựng ở gốc trang. Trước đây nó là `absolute` ngay tại
            chỗ này, mà ô trả lời nằm trong khối bài viết có `overflow-hidden`
            nên danh sách bị CẮT mất — gõ @ thấy loé một vạch rồi thôi. */}
        <Popover open={open} anchor={moc} onClose={() => setQuery(null)} gap={4}
          className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-900">
          <ul style={{ width: rong || undefined }} className="overflow-y-auto">
            <li className="flex items-center gap-1.5 border-b border-ink-100 px-3 py-1.5 text-[11px] text-ink-400 dark:border-ink-800">
              <AtSign size={11} /> Chọn bằng Enter hoặc Tab
            </li>
            {items.map((u, i) => (
              <li key={u.username}>
                <button type="button"
                  // Giữ con trỏ trong ô soạn: để blur chạy trước thì phần
                  // @đang gõ đã bị xoá mất, không chèn tên vào đâu được nữa.
                  onMouseDown={(e) => { e.preventDefault(); pick(u.username); }}
                  onMouseEnter={() => setActive(i)}
                  className={cn('flex w-full items-center gap-2 px-3 py-2 text-left',
                    i === active ? 'bg-brand-50 dark:bg-brand-950/50' : 'hover:bg-ink-50 dark:hover:bg-ink-800')}>
                  {u.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={u.image} alt="" className="size-7 shrink-0 rounded-full object-cover" />
                    : <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {(u.name || u.username).charAt(0).toUpperCase()}
                      </span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-900 dark:text-white">{u.name || u.username}</span>
                    <span className="block truncate text-xs text-ink-400">@{u.username}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-400">Lv{u.level}</span>
                </button>
              </li>
            ))}
          </ul>
        </Popover>

      </div>
    );
  },
);
