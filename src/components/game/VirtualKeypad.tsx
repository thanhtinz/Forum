'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Phone, PhoneOff } from 'lucide-react';
import {
  EMU_KEY_LABEL, NUMPAD_ROWS, NUM_KEY_LETTERS, SOFT_KEY_LABEL, type EmuKey,
} from '@/lib/emulator-keys';
import { cn } from '@/lib/utils';

export interface VirtualKeypadProps {
  keyLayout: string;
  softKeys: boolean;
  onPress: (key: EmuKey) => void;
  onRelease: (key: EmuKey) => void;
  /** Phím đang được giữ — để tô sáng nút. */
  held: Set<string>;
}

/** Các mảnh của bàn phím, để bố cục ngang đặt được sang hai bên màn hình. */
export interface KeypadParts {
  /** Hàng chức năng: phím mềm + phím gọi/kết thúc như máy thật. */
  functionRow: React.ReactNode;
  dpad: React.ReactNode;
  numpad: React.ReactNode;
  /**
   * Nguyên mặt phím của máy candybar: phím mềm và gọi/kết thúc kẹp hai bên
   * vòng xoay, bàn phím số 4×3 nằm dưới — dùng khi cầm máy dọc.
   */
  phonePad: React.ReactNode;
}

/** Mặt phím nhựa: hơi sáng ở trên, viền tối ở dưới cho có khối. */
const KEY_FACE =
  'select-none touch-none relative grid place-items-center border border-ink-950/60 ' +
  'bg-gradient-to-b from-ink-700 to-ink-800 text-ink-100 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_2px_3px_rgba(0,0,0,0.45)] ' +
  'transition active:translate-y-px active:from-ink-800 active:to-ink-800';

const KEY_HELD = 'from-brand-500 to-brand-600 text-white border-brand-700';

/**
 * Bàn phím ảo dựng theo máy Java ME thật: phím số có chữ ABC/DEF bên dưới,
 * D-pad hình vòng xoay (Nokia/Samsung/LG) hoặc phím bốn hướng (Sony Ericsson,
 * Motorola, Siemens), kèm hàng phím mềm và phím gọi/kết thúc.
 *
 * Mỗi nút phát cặp press/release để runtime nhận đúng keyPressed/keyReleased.
 */
export function useKeypadParts({ keyLayout, softKeys, onPress, onRelease, held, compact = false }:
  VirtualKeypadProps & { compact?: boolean }): KeypadParts {
  const soft = SOFT_KEY_LABEL[keyLayout] ?? SOFT_KEY_LABEL.generic!;

  const bind = (key: EmuKey) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); onPress(key); },
    onPointerUp: (e: React.PointerEvent) => { e.preventDefault(); onRelease(key); },
    onPointerLeave: () => onRelease(key),
    onPointerCancel: () => onRelease(key),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    'aria-label': EMU_KEY_LABEL[key],
  });

  const face = (key: EmuKey, extra?: string) =>
    cn(KEY_FACE, held.has(key) && KEY_HELD, extra);

  // Cầm ngang thì chiều cao eo hẹp — phím nhỏ lại cho đủ chỗ.
  const wheel = compact ? 'h-28 w-28' : 'h-[6.5rem] w-[6.5rem]';
  const numH = compact ? 'h-9' : 'h-11';

  // ── D-pad ────────────────────────────────────────────────
  const arrows: { key: EmuKey; icon: React.ReactNode; at: string }[] = [
    { key: 'UP', icon: <ChevronUp size={18} />, at: 'top-0 left-1/2 -translate-x-1/2' },
    { key: 'DOWN', icon: <ChevronDown size={18} />, at: 'bottom-0 left-1/2 -translate-x-1/2' },
    { key: 'LEFT', icon: <ChevronLeft size={18} />, at: 'left-0 top-1/2 -translate-y-1/2' },
    { key: 'RIGHT', icon: <ChevronRight size={18} />, at: 'right-0 top-1/2 -translate-y-1/2' },
  ];

  const dpad = (
    // Vòng xoay kiểu Nokia: vành tròn, nút OK ở giữa — máy nào cũng dùng kiểu này.
    <div className={cn('relative shrink-0 rounded-full border border-ink-950/70 bg-gradient-to-b from-ink-700 to-ink-800 shadow-[0_2px_6px_rgba(0,0,0,0.5)]', wheel)}>
      {arrows.map((a) => (
        <button
          key={a.key}
          type="button"
          {...bind(a.key)}
          className={cn(
            'absolute grid h-1/3 w-1/3 place-items-center rounded-full text-ink-200 transition active:scale-95',
            held.has(a.key) && 'bg-brand-500/80 text-white',
            a.at,
          )}
        >
          {a.icon}
        </button>
      ))}
      <button
        type="button"
        {...bind('FIRE')}
        className={cn(
          'absolute left-1/2 top-1/2 grid h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 place-items-center',
          'rounded-full border border-ink-950/70 bg-gradient-to-b from-ink-600 to-ink-700 text-[10px] font-bold tracking-wide text-ink-100',
          'shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_4px_rgba(0,0,0,0.5)] transition active:translate-y-px',
          held.has('FIRE') && 'from-brand-500 to-brand-600 text-white',
        )}
      >
        OK
      </button>
    </div>
  );

  /** Một phím số: chữ số to ở giữa, chữ cái in nhỏ bên dưới như phím máy thật. */
  const numKey = (k: EmuKey, extra: string) => {
    const letters = NUM_KEY_LETTERS[k];
    return (
      <button key={k} type="button" {...bind(k)} className={face(k, `${extra} flex-col gap-0`)}>
        <span className={cn('font-semibold leading-none', compact ? 'text-xs' : 'text-sm')}>{EMU_KEY_LABEL[k]}</span>
        {letters && !compact && (
          <span className="mt-0.5 text-[8px] leading-none tracking-[0.08em] text-ink-400">{letters}</span>
        )}
      </button>
    );
  };

  const softLeft = (extra: string) => (
    <button type="button" {...bind('SOFT_LEFT')} className={face('SOFT_LEFT', extra)}>{soft.left}</button>
  );
  const softRight = (extra: string) => (
    <button type="button" {...bind('SOFT_RIGHT')} className={face('SOFT_RIGHT', extra)}>{soft.right}</button>
  );
  // Phím gọi / kết thúc — máy Java ME nào cũng có, để bàn phím ra dáng điện thoại.
  const sendKey = (extra: string) => (
    <button type="button" {...bind('SEND')} className={face('SEND', cn(extra, '!text-emerald-400'))}><Phone size={15} /></button>
  );
  const endKey = (extra: string) => (
    <button type="button" {...bind('END')} className={face('END', cn(extra, '!text-red-400'))}><PhoneOff size={15} /></button>
  );

  return {
    functionRow: (
      <div className="flex w-full items-stretch gap-1.5">
        {softKeys && softLeft('h-10 flex-1 rounded-l-[1.1rem] rounded-r-[0.3rem] text-[11px] font-semibold')}
        {sendKey('h-10 w-12 rounded-md')}
        {endKey('h-10 w-12 rounded-md')}
        {softKeys && softRight('h-10 flex-1 rounded-r-[1.1rem] rounded-l-[0.3rem] text-[11px] font-semibold')}
      </div>
    ),

    dpad,

    numpad: (
      <div className="grid shrink-0 grid-cols-3 gap-1">
        {NUMPAD_ROWS.flat().map((k) => numKey(k, `${numH} w-12 rounded-lg`))}
      </div>
    ),

    // ── Mặt phím máy candybar ───────────────────────────────
    // Trên máy thật, phím mềm nằm sát dưới màn hình, phím gọi/kết thúc ở hàng
    // dưới, vòng xoay kẹp giữa bốn phím đó, rồi mới tới bàn phím số.
    phonePad: (
      <div className="mx-auto w-full max-w-[19rem] rounded-[1.6rem] border border-ink-800/70 bg-gradient-to-b from-ink-800/40 to-ink-900/40 p-2 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]">
        {/* Phím mềm và phím gọi/kết thúc nằm chung một hàng, ngay dưới màn hình. */}
        <div className="flex items-stretch gap-1.5">
          {softKeys && softLeft('h-9 flex-1 rounded-l-[1.1rem] rounded-r-[0.3rem] text-[11px] font-semibold')}
          {sendKey('h-9 w-12 rounded-[0.3rem]')}
          {endKey('h-9 w-12 rounded-[0.3rem]')}
          {softKeys && softRight('h-9 flex-1 rounded-r-[1.1rem] rounded-l-[0.3rem] text-[11px] font-semibold')}
        </div>

        {/* Vòng xoay nằm giữa, ngay trên bàn phím số. */}
        <div className="mt-2 flex justify-center">{dpad}</div>

        {/* Bàn phím số: phím bè ngang, xếp khít nhau đúng kiểu máy cổ. */}
        <div className="mt-2 grid grid-cols-3 gap-1">
          {NUMPAD_ROWS.flat().map((k) => numKey(k, 'h-10 w-full rounded-lg'))}
        </div>
      </div>
    ),
  };
}

/** Bàn phím ảo xếp dọc dưới màn hình — dùng khi cầm máy dọc. */
export function VirtualKeypad(props: VirtualKeypadProps) {
  const { phonePad } = useKeypadParts(props);
  return <div className="select-none">{phonePad}</div>;
}
