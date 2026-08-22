'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import {
  EMU_KEY_LABEL, NUMPAD_ROWS, NUM_KEY_LETTERS, SOFT_KEY_LABEL, type EmuKey,
} from '@/lib/emulator-keys';
import type { FaceLayout } from '@/lib/emulator-skin';
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
 * Phím nhựa bạc của skin máy thật: mặt sáng, chữ tối, vát nhẹ ở mép trên.
 * Dùng cho bố cục "thân máy" khi cầm dọc — phần còn lại vẫn dùng phím tối.
 */
const SILVER_FACE =
  'select-none touch-none relative flex items-center border border-ink-500/50 ' +
  'bg-gradient-to-b from-ink-200 to-ink-400 text-ink-900 ' +
  'shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_-1px_2px_rgba(0,0,0,0.25)_inset,0_2px_3px_rgba(0,0,0,0.45)] ' +
  'transition active:translate-y-px active:from-ink-400 active:to-ink-400';

const SILVER_HELD = 'from-brand-400 to-brand-600 !text-white border-brand-700';

/** Phím tối của máy vỏ đen (Chocolate, Walkman, Cyber-shot…): chữ sáng. */
const DARK_FACE =
  'select-none touch-none relative flex items-center border border-black/70 ' +
  'bg-gradient-to-b from-ink-700 to-ink-900 text-ink-100 ' +
  'shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_2px_3px_rgba(0,0,0,0.6)] ' +
  'transition active:translate-y-px active:from-ink-900 active:to-ink-900';

/**
 * Bàn phím ảo dựng theo máy Java ME thật: phím số có chữ ABC/DEF bên dưới,
 * D-pad hình vòng xoay (Nokia/Samsung/LG) hoặc phím bốn hướng (Sony Ericsson,
 * Motorola, Siemens), kèm hàng phím mềm và phím gọi/kết thúc.
 *
 * Mỗi nút phát cặp press/release để runtime nhận đúng keyPressed/keyReleased.
 */
export function useKeypadParts({
  keyLayout, softKeys, onPress, onRelease, held, compact = false, fill = false,
  keyTone = 'silver', accent, skinned = false, faceLayout = 's40',
}: VirtualKeypadProps & {
  /** Họ bố cục mặt phím của dòng máy đang chọn. */
  faceLayout?: FaceLayout;
  compact?: boolean;
  fill?: boolean;
  /**
   * Dựng theo skin thân máy (phím bạc / phím tối) thay vì bộ phím tối mặc định.
   * Bật cho cả cầm dọc lẫn cầm ngang khi chạy toàn màn hình.
   */
  skinned?: boolean;
  /** Tông phím của skin: máy vỏ sáng phím bạc, máy vỏ đen phím tối. */
  keyTone?: 'silver' | 'dark';
  /** Màu chữ cái phụ in trên phím số — vài máy có đèn phím màu riêng. */
  accent?: string;
}): KeypadParts {
  const dark = keyTone === 'dark';
  /** Mặt phím và trạng thái giữ, chọn theo tông của máy đang dùng. */
  const skinFace = skinned ? (dark ? DARK_FACE : SILVER_FACE) : KEY_FACE;
  const skinHeld = skinned && !dark ? SILVER_HELD : KEY_HELD;
  const subColor = skinned
    ? (accent ?? (dark ? 'text-ink-400' : 'text-ink-600'))
    : 'text-ink-400';
  const soft = SOFT_KEY_LABEL[keyLayout] ?? SOFT_KEY_LABEL.generic!;

  const bind = (key: EmuKey) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); onPress(key); },
    onPointerUp: (e: React.PointerEvent) => { e.preventDefault(); onRelease(key); },
    onPointerLeave: () => onRelease(key),
    onPointerCancel: () => onRelease(key),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    'aria-label': EMU_KEY_LABEL[key],
  });

  // `justify-center` vì mặt phím của skin dùng flex trái, còn bộ tối dùng grid.
  const face = (key: EmuKey, extra?: string) =>
    cn(skinFace, 'justify-center', held.has(key) && skinHeld, extra);

  // Cầm ngang thì chiều cao eo hẹp — phím nhỏ lại cho đủ chỗ.
  const wheel = fill
    ? 'h-full max-h-[10.5rem] aspect-square'
    : compact ? 'h-28 w-28' : 'h-[6.5rem] w-[6.5rem]';
  const numH = compact ? 'h-9' : 'h-11';

  // ── D-pad ────────────────────────────────────────────────
  /**
   * Vùng bấm của bốn mũi tên cắt theo **góc phần tư** chứ không phải ô vuông
   * nhỏ ở mép: trên máy thật bấm chỗ nào ở nửa trên của vành cũng là đi lên.
   * Cách cũ mỗi mũi tên chỉ chiếm 1/9 vòng, bốn góc thành vùng chết — mà mũi
   * tên lại là phím bấm nhiều nhất khi chơi.
   */
  const NAV_ZONES: { key: EmuKey; icon: React.ReactNode; clip: string; at: string }[] = [
    { key: 'UP', icon: <ChevronUp size={20} />, clip: 'polygon(50% 50%, 0% 0%, 100% 0%)', at: 'items-start justify-center pt-1.5' },
    { key: 'RIGHT', icon: <ChevronRight size={20} />, clip: 'polygon(50% 50%, 100% 0%, 100% 100%)', at: 'items-center justify-end pr-1.5' },
    { key: 'DOWN', icon: <ChevronDown size={20} />, clip: 'polygon(50% 50%, 100% 100%, 0% 100%)', at: 'items-end justify-center pb-1.5' },
    { key: 'LEFT', icon: <ChevronLeft size={20} />, clip: 'polygon(50% 50%, 0% 100%, 0% 0%)', at: 'items-center justify-start pl-1.5' },
  ];

  /** Cụm điều hướng: `round` là vòng xoay, `square` là phím bốn hướng vuông. */
  const navPad = (shape: 'round' | 'square', size: string) => (
    <div
      className={cn(
        'relative shrink-0 border',
        shape === 'round' ? 'rounded-full' : 'rounded-2xl',
        skinned
          ? dark
            ? 'border-black/70 bg-gradient-to-b from-ink-700 to-ink-900 shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_-2px_4px_rgba(0,0,0,0.5)_inset,0_3px_6px_rgba(0,0,0,0.6)]'
            : 'border-ink-500/50 bg-gradient-to-b from-ink-200 to-ink-400 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_-2px_4px_rgba(0,0,0,0.3)_inset,0_3px_6px_rgba(0,0,0,0.5)]'
          : 'border-ink-950/70 bg-gradient-to-b from-ink-700 to-ink-800 shadow-[0_2px_6px_rgba(0,0,0,0.5)]',
        size,
      )}
    >
      {NAV_ZONES.map((z) => (
        <button
          key={z.key}
          type="button"
          {...bind(z.key)}
          style={{ clipPath: z.clip }}
          className={cn(
            'absolute inset-0 flex transition',
            z.at,
            skinned ? (dark ? 'text-ink-400/60' : 'text-ink-600/50') : 'text-ink-200',
            held.has(z.key) && 'bg-brand-500/80 !text-white',
          )}
        >
          {z.icon}
        </button>
      ))}
      <button
        type="button"
        {...bind('FIRE')}
        aria-label={EMU_KEY_LABEL.FIRE}
        className={cn(
          'absolute left-1/2 top-1/2 z-10 grid h-[40%] w-[40%] -translate-x-1/2 -translate-y-1/2 place-items-center',
          'border transition active:translate-y-px',
          shape === 'round' ? 'rounded-[32%]' : 'rounded-lg',
          skinned
            ? dark
              ? 'border-black/70 bg-gradient-to-b from-ink-600 to-ink-800 text-ink-100 shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_2px_4px_rgba(0,0,0,0.6)]'
              : 'border-ink-500/60 bg-gradient-to-b from-ink-100 to-ink-300 text-ink-900 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_2px_4px_rgba(0,0,0,0.45)]'
            : 'border-ink-950/70 bg-gradient-to-b from-ink-600 to-ink-700 text-ink-100 shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_4px_rgba(0,0,0,0.5)]',
          held.has('FIRE') && '!from-brand-500 !to-brand-600 !text-white',
        )}
      >
        <span className="text-[10px] font-bold tracking-wide">OK</span>
      </button>
    </div>
  );

  const dpad = navPad('round', wheel);

  /** Một phím số: chữ số to ở giữa, chữ cái in nhỏ bên dưới như phím máy thật. */
  const numKey = (k: EmuKey, extra: string) => {
    const letters = NUM_KEY_LETTERS[k];
    return (
      <button key={k} type="button" {...bind(k)} className={face(k, `${extra} flex-col gap-0`)}>
        <span className={cn('font-semibold leading-none', compact ? 'text-xs' : 'text-sm')}>{EMU_KEY_LABEL[k]}</span>
        {letters && (!compact || skinned) && (
          <span className={cn('mt-0.5 text-[8px] leading-none tracking-[0.08em]', subColor)}>{letters}</span>
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
  /** Hai phím mềm bo tròn ra ngoài như cặp phím dưới màn hình máy thật. */
  const PILL_L = 'justify-center rounded-l-[1.1rem] rounded-r-[0.3rem] text-[11px] font-bold';
  const PILL_R = 'justify-center rounded-r-[1.1rem] rounded-l-[0.3rem] text-[11px] font-bold';

  // ── Mặt phím ─────────────────────────────────────────────
  /**
   * Mặt phím chỉ giữ những gì thật sự dùng khi chơi: **cụm mũi tên**, **bàn
   * phím số**, **Options** và **Back**. Phím gọi ‧ kết thúc ‧ ✉ ‧ C ‧ Menu của
   * máy thật đã bỏ — game Java không đọc chúng, mà chúng lại ăn mất chỗ của
   * mũi tên và làm mặt phím tràn ra ngoài khung máy.
   *
   * Dáng cụm điều hướng vẫn khác nhau theo dòng máy: vòng xoay tròn, phím bốn
   * hướng vuông, hay phím bập bênh nằm ngang.
   */

  /** Bàn phím số 4×3. `flat` là kiểu phím phẳng khắc laser của Motorola. */
  const numGrid = (flat = false) => (
    <div className={cn('grid h-full min-h-0 w-full grid-cols-3 grid-rows-4', flat ? 'gap-px' : 'gap-1.5')}>
      {NUMPAD_ROWS.flat().map((k, i) => {
        const letters = NUM_KEY_LETTERS[k];
        const col = i % 3;
        const digit = <span className="text-base font-semibold leading-none">{EMU_KEY_LABEL[k]}</span>;
        const sub = letters
          ? <span className={cn('text-[9px] font-bold leading-none tracking-wider', subColor)}>{letters}</span>
          : null;
        return (
          <button
            key={k} type="button" {...bind(k)}
            className={cn(skinFace, held.has(k) && skinHeld, 'h-full w-full min-w-0 px-3',
              flat ? 'rounded-[3px] border-x-0 border-b-0 border-t border-white/10' : 'rounded-full',
              col === 0 ? 'justify-start' : col === 1 ? 'justify-center' : 'justify-end')}
          >
            <span className="flex items-baseline gap-1.5">
              {col === 2 ? <>{sub}{digit}</> : <>{digit}{sub}</>}
            </span>
          </button>
        );
      })}
    </div>
  );

  /** Phím bốn hướng vuông của S60 / E-series — vùng bấm góc phần tư như vòng xoay. */
  const squarePad = navPad('square', 'h-full max-h-[10rem] aspect-square');

  /**
   * Phím bập bênh nằm ngang của máy đời đầu / Samsung / Siemens.
   *
   * Hai cánh trái–phải cao hơn thanh trên–dưới: đo thực tế cho thấy để cùng
   * chiều cao thì trái–phải chỉ còn ~2 500px² trong khi phím số đã 4 300px².
   */
  const rockerPad = (
    <div className="flex h-full max-h-[9.5rem] w-full max-w-[17rem] flex-col items-stretch justify-center gap-1">
      <button type="button" {...bind('UP')} className={face('UP', 'h-11 w-full rounded-t-2xl rounded-b-sm')}><ChevronUp size={20} /></button>
      <div className="flex items-stretch gap-1">
        <button type="button" {...bind('LEFT')} className={face('LEFT', 'h-14 flex-[38] rounded-l-2xl rounded-r-sm')}><ChevronLeft size={20} /></button>
        <button type="button" {...bind('FIRE')} className={face('FIRE', 'h-14 flex-[24] rounded-sm text-[10px] font-bold')}>OK</button>
        <button type="button" {...bind('RIGHT')} className={face('RIGHT', 'h-14 flex-[38] rounded-r-2xl rounded-l-sm')}><ChevronRight size={20} /></button>
      </div>
      <button type="button" {...bind('DOWN')} className={face('DOWN', 'h-11 w-full rounded-b-2xl rounded-t-sm')}><ChevronDown size={20} /></button>
    </div>
  );

  /** Cụm điều hướng theo dòng máy. */
  const navCluster =
    faceLayout === 'rocker' ? rockerPad
    : faceLayout === 's60' || faceLayout === 'qwerty' ? squarePad
    : dpad;

  /** Motorola giữ kiểu phím phẳng khắc laser cho bàn phím số. */
  const flatNum = faceLayout === 'razr';

  /**
   * Mặt phím dọc: Options ‧ Back trên cùng (sát dưới màn hình như máy thật),
   * cụm mũi tên ở giữa, bàn phím số dưới cùng.
   *
   * `min-w-0` và `overflow-hidden` ở mọi tầng để không có nhánh nào đẩy mặt
   * phím rộng hơn thân máy.
   */
  const phoneFace = (
    <div className="flex h-full w-full min-w-0 flex-col gap-2 overflow-hidden">
      {softKeys && (
        <div className="flex shrink-0 items-stretch gap-2">
          {softLeft(cn('h-10 min-w-0 flex-1', PILL_L))}
          {softRight(cn('h-10 min-w-0 flex-1', PILL_R))}
        </div>
      )}

      <div className="flex min-h-0 w-full min-w-0 flex-[52] items-center justify-center">
        {navCluster}
      </div>

      <div
        className={cn('min-h-0 w-full min-w-0 flex-[48]',
          flatNum && 'overflow-hidden rounded-md border border-white/10')}
      >
        {numGrid(flatNum)}
      </div>
    </div>
  );

  return {
    functionRow: (
      <div className="flex w-full items-stretch gap-1.5">
        {softKeys && softLeft('h-10 min-w-0 flex-1 rounded-l-[1.1rem] rounded-r-[0.3rem] text-[11px] font-semibold')}
        {softKeys && softRight('h-10 min-w-0 flex-1 rounded-r-[1.1rem] rounded-l-[0.3rem] text-[11px] font-semibold')}
      </div>
    ),

    dpad,

    numpad: (
      <div className="grid shrink-0 grid-cols-3 gap-1">
        {NUMPAD_ROWS.flat().map((k) => numKey(k, `${numH} w-12 rounded-lg`))}
      </div>
    ),

    phonePad: fill ? phoneFace : (
      <div className="mx-auto w-full max-w-[19rem] rounded-[1.6rem] border border-ink-800/70 bg-gradient-to-b from-ink-800/40 to-ink-900/40 p-2 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]">
        <div className="flex items-stretch gap-1.5">
          {softKeys && softLeft(cn('h-9 min-w-0 flex-1', PILL_L))}
          {softKeys && softRight(cn('h-9 min-w-0 flex-1', PILL_R))}
        </div>
        <div className="mt-2 flex justify-center">{dpad}</div>
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
