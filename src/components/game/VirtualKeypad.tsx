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
  /**
   * `stack` xếp dọc dưới màn hình (máy cầm dọc);
   * `sides` tách D-pad và bàn phím số ra hai bên để chừa chỗ cho màn hình khi cầm ngang.
   */
  layout?: 'stack' | 'sides';
}

/** Các mảnh của bàn phím ảo, để bố cục ngang đặt được sang hai bên màn hình. */
export interface KeypadParts {
  softKeys: React.ReactNode;
  dpad: React.ReactNode;
  numpad: React.ReactNode;
}

/**
 * Bàn phím ảo cho thiết bị chạm: D-pad + phím mềm + bàn phím số.
 * Mỗi nút phát cặp sự kiện press/release để runtime nhận đúng keyPressed/keyReleased.
 */
export function useKeypadParts({ keyLayout, softKeys, onPress, onRelease, held, compact = false }:
  Omit<VirtualKeypadProps, 'layout'> & { compact?: boolean }): KeypadParts {
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

  // Cầm ngang thì chiều cao eo hẹp — nút nhỏ lại một chút cho đủ chỗ.
  const dpadSize = compact ? 'h-10 w-10' : 'h-12 w-12';
  const numSize = compact ? 'h-8 w-9 text-xs' : 'h-10 w-11 text-sm';

  return {
    softKeys: softKeys ? (
      <div className="flex w-full justify-between gap-3">
        <button type="button" {...bind('SOFT_LEFT')} className={btn('SOFT_LEFT', 'h-11 flex-1 text-xs font-semibold')}>
          {soft.left}
        </button>
        <button type="button" {...bind('SOFT_RIGHT')} className={btn('SOFT_RIGHT', 'h-11 flex-1 text-xs font-semibold')}>
          {soft.right}
        </button>
      </div>
    ) : null,

    dpad: (
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        <span />
        <button type="button" {...bind('UP')} className={btn('UP', dpadSize)}><ChevronUp size={20} /></button>
        <span />
        <button type="button" {...bind('LEFT')} className={btn('LEFT', dpadSize)}><ChevronLeft size={20} /></button>
        <button type="button" {...bind('FIRE')} className={btn('FIRE', `${dpadSize} !bg-brand-600 text-white`)}><Circle size={14} fill="currentColor" /></button>
        <button type="button" {...bind('RIGHT')} className={btn('RIGHT', dpadSize)}><ChevronRight size={20} /></button>
        <span />
        <button type="button" {...bind('DOWN')} className={btn('DOWN', dpadSize)}><ChevronDown size={20} /></button>
        <span />
      </div>
    ),

    numpad: (
      <div className="grid grid-cols-3 gap-1">
        {NUMPAD_ROWS.flat().map((k) => (
          <button key={k} type="button" {...bind(k)} className={btn(k, `${numSize} font-semibold`)}>
            {EMU_KEY_LABEL[k]}
          </button>
        ))}
      </div>
    ),
  };
}

/** Bàn phím ảo xếp dọc dưới màn hình — dùng khi cầm máy dọc. */
export function VirtualKeypad(props: VirtualKeypadProps) {
  const parts = useKeypadParts(props);
  return (
    <div className="mx-auto w-full max-w-sm select-none space-y-3">
      {parts.softKeys}
      <div className="flex items-center justify-between gap-4">
        {parts.dpad}
        {parts.numpad}
      </div>
    </div>
  );
}
