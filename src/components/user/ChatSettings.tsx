'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings2, X, Check, Images, Timer, Tag, Palette, MessageSquare } from 'lucide-react';
import { setChatAppearance, setNickname, setAutoDelete } from '@/app/(site)/user/messages/actions';
import { CHAT_THEMES, CHAT_BUBBLES, AUTO_DELETE_OPTIONS, NICKNAME_MAX } from '@/lib/chat-theme';
import { cn } from '@/lib/utils';

export interface ChatSettingsProps {
  conversationId: string;
  theme: string;
  bubble: string;
  autoDeleteHours: number;
  me: { id: string; name: string; nickname: string };
  partner: { id: string; name: string; nickname: string };
}

export function ChatSettings(p: ChatSettingsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(p.theme);
  const [bubble, setBubble] = useState(p.bubble);
  const [hours, setHours] = useState(p.autoDeleteHours);
  const [myNick, setMyNick] = useState(p.me.nickname);
  const [theirNick, setTheirNick] = useState(p.partner.nickname);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else router.refresh();
    });
  };

  const pickTheme = (v: string) => { setTheme(v); run(() => setChatAppearance(p.conversationId, v, bubble)); };
  const pickBubble = (v: string) => { setBubble(v); run(() => setChatAppearance(p.conversationId, theme, v)); };
  const pickHours = (h: number) => { setHours(h); run(() => setAutoDelete(p.conversationId, h)); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Tuỳ chỉnh đoạn chat"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
        <Settings2 size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-ink-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-ink-900 dark:text-white">Tuỳ chỉnh đoạn chat</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
            </div>

            {/* Ảnh nền */}
            <section className="mb-5">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-700 dark:text-ink-200">
                <Palette size={15} className="text-ink-400" /> Ảnh nền
              </p>
              <div className="grid grid-cols-4 gap-2">
                {CHAT_THEMES.map((t) => (
                  <button key={t.value} type="button" disabled={pending} onClick={() => pickTheme(t.value)}
                    className={cn('rounded-xl border p-1.5 text-center transition-colors disabled:opacity-60',
                      theme === t.value ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800')}>
                    <span className="relative block h-10 w-full overflow-hidden rounded-lg" style={{ backgroundColor: t.swatch }}>
                      {theme === t.value && <Check size={16} className="absolute inset-0 m-auto text-white drop-shadow" />}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-ink-500">{t.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Bong bóng */}
            <section className="mb-5">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-700 dark:text-ink-200">
                <MessageSquare size={15} className="text-ink-400" /> Bong bóng chat
              </p>
              <div className="grid grid-cols-3 gap-2">
                {CHAT_BUBBLES.map((b) => (
                  <button key={b.value} type="button" disabled={pending} onClick={() => pickBubble(b.value)}
                    className={cn('rounded-xl border p-2 transition-colors disabled:opacity-60',
                      bubble === b.value ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800')}>
                    {/* Xem trước đúng kiểu bong bóng sẽ dùng */}
                    <span className={cn('mx-auto block h-5 w-14 px-2', b.mine, b.radius)} />
                    <span className="mt-1.5 block truncate text-[11px] text-ink-500">{b.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Biệt danh */}
            <section className="mb-5">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-700 dark:text-ink-200">
                <Tag size={15} className="text-ink-400" /> Biệt danh
              </p>
              <div className="space-y-2">
                <NickRow label={p.partner.name} value={theirNick} onChange={setTheirNick} pending={pending}
                  onSave={() => run(() => setNickname(p.conversationId, p.partner.id, theirNick))} />
                <NickRow label={`${p.me.name} (bạn)`} value={myNick} onChange={setMyNick} pending={pending}
                  onSave={() => run(() => setNickname(p.conversationId, p.me.id, myNick))} />
              </div>
              <p className="mt-1 text-xs text-ink-400">Để trống rồi lưu là gỡ biệt danh. Cả hai đều nhìn thấy.</p>
            </section>

            {/* Tin nhắn tự xoá */}
            <section className="mb-5">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-700 dark:text-ink-200">
                <Timer size={15} className="text-ink-400" /> Tin nhắn tự xoá
              </p>
              <select value={hours} disabled={pending} onChange={(e) => pickHours(Number(e.target.value))} className="input">
                {AUTO_DELETE_OPTIONS.map((o) => <option key={o.hours} value={o.hours}>{o.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-ink-400">
                Chỉ áp dụng cho tin gửi <b>sau khi bật</b> — tin cũ từ trước vẫn giữ nguyên.
                Tin quá hạn bị xoá hẳn, không khôi phục được.
              </p>
            </section>

            <Link href={`/user/messages/${p.conversationId}/media`}
              className="flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800">
              <Images size={16} className="text-ink-400" /> Xem ảnh đã gửi
            </Link>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}

function NickRow({ label, value, onChange, onSave, pending }: {
  label: string; value: string; onChange: (v: string) => void; onSave: () => void; pending: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 truncate text-sm text-ink-500">{label}</span>
      <input value={value} maxLength={NICKNAME_MAX} onChange={(e) => onChange(e.target.value)}
        placeholder="Chưa đặt" className="input !py-1.5 text-sm" />
      <button type="button" onClick={onSave} disabled={pending}
        className="shrink-0 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-60 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800">
        Lưu
      </button>
    </div>
  );
}
