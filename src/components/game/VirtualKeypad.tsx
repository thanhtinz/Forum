'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle } from 'lucide-react';
import { EMU_KEY_LABEL, NUMPAD_ROWS, SOFT_KEY_LABEL, type EmuKey } from '@/lib/emulator-keys';
import { cn } from '@/lib/utils';

export interface VirtualKeypadProps {
  keyLayout: string;
  softKeys: boolean;
  onPress: (key: EmuKey) => void;
  onRelease: (key: EmuKey) => void;
  /** Phím đang được giữ — để tô sáng nút. */
  held: Set<string>;
}

/**
 * Bàn phím ảo cho thiết bị chạm: D-pad + phím mềm + bàn phím số.
 * Mỗi nút phát cặp sự kiện press/release để runtime nhận đúng keyPressed/keyReleased.
 */
export function VirtualKeypad({ keyLayout, softKeys, onPress, onRelease, held }: VirtualKeypadProps) {
  const soft = SOFT_KEY_LABEL[keyLayout] ?? SOFT_KEY_LABEL.generic!;

  const bind = (key: EmuKey) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); onPress(key); },
    onPointerUp: (e: React.PointerEvent) => { e.preventDefault(); onRelease(key); },
    onPointerLeave: () => onRelease(key),
    onPointerCancel: () => onRelease(key),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    'aria-label': EMU_KEY_LABEL[key],
  });

  const btn = (key: EmuKey, extra?: string) =>
    cn(
      'select-none touch-none grid place-items-center rounded-xl border border-ink-700/50 bg-ink-800 text-ink-100 shadow-sm transition active:scale-95',
      held.has(key) && 'bg-brand-500 text-white',
      extra,
    );

  return (
    <div className="mx-auto w-full max-w-sm select-none space-y-3">
      {softKeys && (
        <div className="flex justify-between gap-3">
          <button type="button" {...bind('SOFT_LEFT')} className={btn('SOFT_LEFT', 'h-11 flex-1 text-xs font-semibold')}>
            {soft.left}
          </button>
          <button type="button" {...bind('SOFT_RIGHT')} className={btn('SOFT_RIGHT', 'h-11 flex-1 text-xs font-semibold')}>
            {soft.right}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        {/* D-pad */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1">
          <span />
          <button type="button" {...bind('UP')} className={btn('UP', 'h-12 w-12')}><ChevronUp size={20} /></button>
          <span />
          <button type="button" {...bind('LEFT')} className={btn('LEFT', 'h-12 w-12')}><ChevronLeft size={20} /></button>
          <button type="button" {...bind('FIRE')} className={btn('FIRE', 'h-12 w-12 !bg-brand-600 text-white')}><Circle size={14} fill="currentColor" /></button>
          <button type="button" {...bind('RIGHT')} className={btn('RIGHT', 'h-12 w-12')}><ChevronRight size={20} /></button>
          <span />
          <button type="button" {...bind('DOWN')} className={btn('DOWN', 'h-12 w-12')}><ChevronDown size={20} /></button>
          <span />
        </div>

        {/* Bàn phím số */}
        <div className="grid grid-cols-3 gap-1">
          {NUMPAD_ROWS.flat().map((k) => (
            <button key={k} type="button" {...bind(k)} className={btn(k, 'h-10 w-11 text-sm font-semibold')}>
              {EMU_KEY_LABEL[k]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
