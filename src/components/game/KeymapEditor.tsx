'use client';

import { useEffect, useState } from 'react';
import { Check, Keyboard, Loader2, RotateCcw } from 'lucide-react';
import { DEFAULT_KEYMAP, EMU_KEYS, EMU_KEY_LABEL, type EmuKey } from '@/lib/emulator-keys';
import { cn } from '@/lib/utils';

export interface KeymapEditorProps {
  profileId: string;
  /** Keymap hiện hành: mã phím PC → phím Java. */
  keymap: Record<string, EmuKey>;
  onChange: (next: Record<string, EmuKey>) => void;
  /** Có lưu lên máy chủ được không (chỉ khi đã đăng nhập). */
  canPersist: boolean;
}

/** Phím Java được ưu tiên cho gán lại — số ít dùng nên bỏ qua để UI gọn. */
const EDITABLE: EmuKey[] = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'FIRE', 'SOFT_LEFT', 'SOFT_RIGHT', 'STAR', 'POUND', 'CLEAR'];

/** Cấu hình A/B/Soft keys: bấm "Gán" rồi nhấn phím muốn dùng. */
export function KeymapEditor({ profileId, keymap, onChange, canPersist }: KeymapEditorProps) {
  const [capturing, setCapturing] = useState<EmuKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { setCapturing(null); return; }
      const next: Record<string, EmuKey> = { ...keymap };
      // Một mã PC chỉ trỏ tới một phím Java.
      for (const code of Object.keys(next)) if (next[code] === capturing) delete next[code];
      next[e.code] = capturing;
      onChange(next);
      setCapturing(null);
      setSaved(false);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [capturing, keymap, onChange]);

  const codesFor = (key: EmuKey) =>
    Object.entries(keymap).filter(([, v]) => v === key).map(([code]) => code);

  const save = async () => {
    if (!canPersist) return;
    setSaving(true);
    try {
      const res = await fetch('/api/emulator/keymap', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, mapping: keymap }),
      });
      setSaved(res.ok);
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => { onChange({ ...DEFAULT_KEYMAP }); setSaved(false); };

  return (
    <div className="space-y-3 text-sm">
      <p className="flex items-center gap-1.5 text-xs text-ink-400">
        <Keyboard size={14} /> Bấm “Gán” rồi nhấn phím trên bàn phím. Esc để huỷ.
      </p>

      <ul className="divide-y divide-ink-100 dark:divide-ink-800">
        {EDITABLE.filter((k) => EMU_KEYS.includes(k)).map((k) => (
          <li key={k} className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-ink-500">{EMU_KEY_LABEL[k]}</span>
            <span className="flex items-center gap-2">
              <code className="rounded bg-ink-100 px-1.5 py-0.5 text-[11px] dark:bg-ink-800">
                {codesFor(k).join(' / ') || '—'}
              </code>
              <button
                type="button"
                onClick={() => setCapturing(k)}
                className={cn('btn !px-2 !py-1 text-xs', capturing === k
                  ? 'bg-brand-500 text-white'
                  : 'border border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300')}
              >
                {capturing === k ? 'Nhấn phím…' : 'Gán'}
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <button type="button" onClick={reset} className="btn-outline flex-1 !py-1.5 text-xs">
          <RotateCcw size={13} /> Mặc định
        </button>
        {canPersist && (
          <button type="button" onClick={save} disabled={saving} className="btn-primary flex-1 !py-1.5 text-xs">
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
            {saved ? 'Đã lưu' : 'Lưu cấu hình'}
          </button>
        )}
      </div>
      {!canPersist && <p className="text-[11px] text-ink-400">Đăng nhập để lưu cấu hình phím theo tài khoản.</p>}
    </div>
  );
}
