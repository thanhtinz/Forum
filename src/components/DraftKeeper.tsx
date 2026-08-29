'use client';

import { useEffect, useRef, useState } from 'react';
import { FileClock, RotateCcw, X } from 'lucide-react';

interface Draft {
  t: number;
  /** Giá trị các ô chữ, theo tên; một tên có thể có nhiều ô. */
  v: Record<string, string[]>;
  /** Các ô đánh dấu đang bật, theo tên → danh sách value. Nháp cũ không có. */
  c?: Record<string, string[]>;
}

/** Bản nháp cũ hơn ngần này thì bỏ qua, khỏi gợi ý những thứ đã quên từ lâu. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SAVE_DELAY_MS = 1200;

/** Chỉ giữ phần chữ — ô chọn, ảnh, tệp không lưu vào bản nháp. */
function textFields(form: HTMLFormElement): (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[] {
  return [...form.elements].filter((el): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return !!el.name;
    if (!(el instanceof HTMLInputElement)) return false;
    return !!el.name && ['text', 'search', 'url', 'number'].includes(el.type);
  });
}

/** Ô đánh dấu và ô chọn một trong nhiều — quyết định phần nào của form hiện ra. */
function toggleFields(form: HTMLFormElement): HTMLInputElement[] {
  return [...form.elements].filter((el): el is HTMLInputElement =>
    el instanceof HTMLInputElement && !!el.name && (el.type === 'checkbox' || el.type === 'radio'));
}

function read(form: HTMLFormElement): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const el of textFields(form)) (out[el.name] ??= []).push(el.value);
  return out;
}

function readChecked(form: HTMLFormElement): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const el of toggleFields(form)) {
    out[el.name] ??= [];
    if (el.checked) out[el.name].push(el.value);
  }
  return out;
}

function isEmpty(v: Record<string, string[]>): boolean {
  return Object.values(v).every((list) => list.every((x) => !x.trim()));
}

function same(a: Record<string, string[]>, b: Record<string, string[]>): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Đặt giá trị theo cách React nhận ra.
 *
 * Ô soạn BBCode là ô có điều khiển (giữ giá trị trong state), gán thẳng
 * `.value` thì React không biết và sẽ ghi đè lại ở lần vẽ sau.
 */
function setValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
    : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype
    : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Bật/tắt ô đánh dấu bằng một cú bấm thật.
 *
 * React theo dõi ô đánh dấu qua sự kiện click chứ không phải input, nên gán
 * thẳng `.checked` thì ô có điều khiển sẽ bật lại như cũ ở lần vẽ sau.
 */
function setChecked(el: HTMLInputElement, on: boolean) {
  if (el.checked !== on) el.click();
}

const when = (t: number) => new Date(t).toLocaleString('vi-VN', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

/**
 * Giữ hộ bản nháp của một form vào trình duyệt.
 *
 * Đặt làm phần tử đầu trong form. Cứ hơn một giây không gõ là lưu lại; mở lại
 * trang mà thấy bản nháp khác nội dung đang có thì hiện thanh mời khôi phục.
 * Bản nháp chỉ nằm trên máy người dùng, không gửi đi đâu.
 *
 * Gửi form là xoá nháp. Nếu máy chủ trả lỗi thì nội dung vẫn còn nguyên trên
 * màn hình, và gõ tiếp một chữ là được lưu lại ngay.
 */
export function DraftKeeper({ storageKey }: { storageKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;

    // Trình duyệt riêng tư hoặc chặn lưu trữ thì bỏ qua, đừng làm hỏng form.
    let store: Storage;
    try {
      store = window.localStorage;
      store.getItem(storageKey);
    } catch {
      return;
    }

    try {
      const raw = store.getItem(storageKey);
      const saved: Draft | null = raw ? JSON.parse(raw) : null;
      if (saved?.v && Date.now() - saved.t < MAX_AGE_MS && !isEmpty(saved.v)
        && !(same(saved.v, read(form)) && same(saved.c ?? {}, readChecked(form)))) {
        setDraft(saved);
      } else if (saved) {
        store.removeItem(storageKey);
      }
    } catch {
      store.removeItem(storageKey);
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const onInput = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const v = read(form);
        try {
          if (isEmpty(v)) store.removeItem(storageKey);
          else store.setItem(storageKey, JSON.stringify({ t: Date.now(), v, c: readChecked(form) } satisfies Draft));
        } catch {
          // Hết dung lượng thì thôi, không cản người dùng viết tiếp.
        }
      }, SAVE_DELAY_MS);
    };
    const onSubmit = () => {
      if (timer) clearTimeout(timer);
      try { store.removeItem(storageKey); } catch { /* bỏ qua */ }
    };

    form.addEventListener('input', onInput);
    // Ô đánh dấu ở vài trình duyệt chỉ phát 'change', nghe cả hai cho chắc.
    form.addEventListener('change', onInput);
    form.addEventListener('submit', onSubmit);
    return () => {
      if (timer) clearTimeout(timer);
      form.removeEventListener('input', onInput);
      form.removeEventListener('change', onInput);
      form.removeEventListener('submit', onSubmit);
    };
  }, [storageKey]);

  const dismiss = () => {
    setDraft(null);
    try { window.localStorage.removeItem(storageKey); } catch { /* bỏ qua */ }
  };

  const restore = async () => {
    const form = ref.current?.closest('form');
    if (!form || !draft) return;

    // Đặt lại các ô đánh dấu TRƯỚC: chúng quyết định phần nào của form được vẽ.
    // Ví dụ ô "Nội dung ẩn" chỉ tồn tại khi quyền xem bài khác "Miễn phí" —
    // gán chữ trước thì lúc đó chưa có ô nào để gán vào, nội dung ẩn mất luôn.
    if (draft.c) {
      for (const el of toggleFields(form)) {
        const want = draft.c[el.name];
        if (!want) continue;
        setChecked(el, want.includes(el.value));
      }
      // Đợi React vẽ xong phần vừa hiện ra rồi mới điền chữ.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    const used: Record<string, number> = {};
    for (const el of textFields(form)) {
      const i = used[el.name] ?? 0;
      used[el.name] = i + 1;
      const value = draft.v[el.name]?.[i];
      if (value != null) setValue(el, value);
    }
    setDraft(null);
  };

  return (
    <div ref={ref}>
      {draft && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <FileClock size={16} className="shrink-0 text-amber-600" />
          <span className="min-w-0 flex-1 text-ink-700 dark:text-ink-200">
            Có bản nháp lưu lúc <strong>{when(draft.t)}</strong>.
          </span>
          <button type="button" onClick={() => { void restore(); }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-600">
            <RotateCcw size={13} /> Khôi phục
          </button>
          <button type="button" onClick={dismiss} title="Bỏ bản nháp" aria-label="Bỏ bản nháp"
            className="shrink-0 text-ink-400 hover:text-ink-600"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}
