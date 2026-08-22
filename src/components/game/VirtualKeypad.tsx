'use client';

import { useState } from 'react';
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Delete, Grid3x3,
  Menu as MenuIcon, Phone, PhoneOff, Undo2,
} from 'lucide-react';
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
    ? 'h-full max-h-[8.5rem] aspect-square'
    : compact ? 'h-28 w-28' : 'h-[6.5rem] w-[6.5rem]';
  const numH = compact ? 'h-9' : 'h-11';

  // ── D-pad ────────────────────────────────────────────────
  const arrows: { key: EmuKey; icon: React.ReactNode; at: string }[] = [
    { key: 'UP', icon: <ChevronUp size={18} />, at: 'top-0 left-1/2 -translate-x-1/2' },
    { key: 'DOWN', icon: <ChevronDown size={18} />, at: 'bottom-0 left-1/2 -translate-x-1/2' },
    { key: 'LEFT', icon: <ChevronLeft size={18} />, at: 'left-0 top-1/2 -translate-y-1/2' },
    { key: 'RIGHT', icon: <ChevronRight size={18} />, at: 'right-0 top-1/2 -translate-y-1/2' },
  ];

  const dpad = skinned ? (
    /**
     * Vòng xoay của skin máy thật: vành bạc trơn, nút chọn hình vuông bo góc ở
     * tâm. Máy thật không in mũi tên lên vành nên bốn mũi tên để mờ, vừa đủ
     * thấy vùng bấm mà không phá dáng.
     */
    <div className={cn(
      'relative shrink-0 rounded-full border',
      dark
        ? 'border-black/70 bg-gradient-to-b from-ink-700 to-ink-900 shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_-2px_4px_rgba(0,0,0,0.5)_inset,0_3px_6px_rgba(0,0,0,0.6)]'
        : 'border-ink-500/50 bg-gradient-to-b from-ink-200 to-ink-400 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_-2px_4px_rgba(0,0,0,0.3)_inset,0_3px_6px_rgba(0,0,0,0.5)]',
      wheel,
    )}>
      {arrows.map((a) => (
        <button
          key={a.key}
          type="button"
          {...bind(a.key)}
          className={cn(
            'absolute grid h-1/3 w-1/3 place-items-center rounded-full transition active:scale-95',
            dark ? 'text-ink-400/60' : 'text-ink-600/50',
            held.has(a.key) && 'bg-brand-500/80 !text-white',
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
          'absolute left-1/2 top-1/2 grid h-[36%] w-[36%] -translate-x-1/2 -translate-y-1/2 place-items-center',
          'rounded-[32%] border transition active:translate-y-px',
          dark
            ? 'border-black/70 bg-gradient-to-b from-ink-600 to-ink-800 shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_2px_4px_rgba(0,0,0,0.6)]'
            : 'border-ink-500/60 bg-gradient-to-b from-ink-100 to-ink-300 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_2px_4px_rgba(0,0,0,0.45)]',
          held.has('FIRE') && 'from-brand-400 to-brand-600',
        )}
        aria-label={EMU_KEY_LABEL.FIRE}
      />
    </div>
  ) : (
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
  // Phím gọi / kết thúc — máy Java ME nào cũng có, để bàn phím ra dáng điện thoại.
  const sendKey = (extra: string) => (
    <button type="button" {...bind('SEND')} className={face('SEND', cn(extra, '!text-emerald-400'))}><Phone size={15} /></button>
  );
  const endKey = (extra: string) => (
    <button type="button" {...bind('END')} className={face('END', cn(extra, '!text-red-400'))}><PhoneOff size={15} /></button>
  );

  // ── Mặt phím dựng theo họ bố cục của từng dòng máy ───────
  // Máy thật có vài phím cứng không mang mã Java riêng (Menu của S60, phím back
  // của Sony Ericsson). Những phím đó gán về phím gần nghĩa nhất — Menu về phím
  // mềm trái, back về phím mềm phải — đúng như cách dùng trên máy thật.
  const [padOpen, setPadOpen] = useState(false);

  const PILL_L = 'rounded-l-[1.1rem] rounded-r-[0.3rem] text-[11px] font-bold';
  const PILL_R = 'rounded-r-[1.1rem] rounded-l-[0.3rem] text-[11px] font-bold';

  const aux = (key: EmuKey, label: React.ReactNode, extra: string) => (
    <button type="button" {...bind(key)} className={face(key, extra)}>{label}</button>
  );
  const callPill = (extra: string) => (
    <button type="button" {...bind('SEND')}
      className={cn('grid place-items-center border border-emerald-900/60 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white',
        'shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_2px_3px_rgba(0,0,0,0.5)] transition active:translate-y-px',
        held.has('SEND') && 'from-brand-400 to-brand-600', extra)}>
      <Phone size={13} />
    </button>
  );
  const endPill = (extra: string) => (
    <button type="button" {...bind('END')}
      className={cn('grid place-items-center border border-red-900/60 bg-gradient-to-b from-red-500 to-red-700 text-white',
        'shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_2px_3px_rgba(0,0,0,0.5)] transition active:translate-y-px',
        held.has('END') && 'from-brand-400 to-brand-600', extra)}>
      <PhoneOff size={13} />
    </button>
  );

  /** Bàn phím số 4×3 — dùng lại cho gần hết các họ máy. */
  const numGrid = (flat = false) => (
    <div className={cn('grid h-full min-h-0 grid-cols-3 grid-rows-4', flat ? 'gap-px' : 'gap-1.5')}>
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
            className={cn(skinFace, held.has(k) && skinHeld, 'h-full w-full px-3',
              // RAZR: phím phẳng khắc laser, chỉ có đường gân ngăn chứ không bo tròn.
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

  /** Phím bốn hướng vuông của S60 / máy đời đầu. */
  const squarePad = (
    <div className="grid h-full max-h-[7.5rem] shrink-0 grid-cols-3 grid-rows-3 gap-0.5"
      style={{ aspectRatio: '1 / 1' }}>
      <span />
      <button type="button" {...bind('UP')} className={face('UP', 'rounded-t-xl rounded-b-sm')}><ChevronUp size={16} /></button>
      <span />
      <button type="button" {...bind('LEFT')} className={face('LEFT', 'rounded-l-xl rounded-r-sm')}><ChevronLeft size={16} /></button>
      <button type="button" {...bind('FIRE')} className={face('FIRE', 'rounded-sm text-[10px] font-bold')}>OK</button>
      <button type="button" {...bind('RIGHT')} className={face('RIGHT', 'rounded-r-xl rounded-l-sm')}><ChevronRight size={16} /></button>
      <span />
      <button type="button" {...bind('DOWN')} className={face('DOWN', 'rounded-b-xl rounded-t-sm')}><ChevronDown size={16} /></button>
      <span />
    </div>
  );

  /** Phím bập bênh nằm ngang của máy đời đầu / Samsung / Siemens. */
  const rockerPad = (
    <div className="flex h-full max-h-[6rem] shrink-0 flex-col items-center justify-center gap-1">
      <button type="button" {...bind('UP')} className={face('UP', 'h-7 w-24 rounded-t-2xl rounded-b-sm')}><ChevronUp size={16} /></button>
      <div className="flex items-stretch gap-1">
        <button type="button" {...bind('LEFT')} className={face('LEFT', 'h-8 w-9 rounded-l-2xl rounded-r-sm')}><ChevronLeft size={16} /></button>
        <button type="button" {...bind('FIRE')} className={face('FIRE', 'h-8 w-10 rounded-sm text-[10px] font-bold')}>OK</button>
        <button type="button" {...bind('RIGHT')} className={face('RIGHT', 'h-8 w-9 rounded-r-2xl rounded-l-sm')}><ChevronRight size={16} /></button>
      </div>
      <button type="button" {...bind('DOWN')} className={face('DOWN', 'h-7 w-24 rounded-b-2xl rounded-t-sm')}><ChevronDown size={16} /></button>
    </div>
  );

  /** Nokia S60: phím bốn hướng vuông, Menu và C kẹp hai bên, gọi/kết thúc ngoài cùng. */
  const faceS60 = (
    <div className="flex h-full w-full flex-col gap-1.5">
      <div className="flex shrink-0 items-stretch gap-1.5">
        {softKeys && softLeft(cn('h-8 flex-1', PILL_L))}
        {softKeys && softRight(cn('h-8 flex-1', PILL_R))}
      </div>
      <div className="flex min-h-0 flex-[34] items-center justify-center gap-1.5">
        <div className="flex flex-col gap-1.5">
          {callPill('h-8 w-14 rounded-full')}
          {aux('SOFT_LEFT', <MenuIcon size={14} />, 'h-8 w-14 rounded-full')}
        </div>
        {squarePad}
        <div className="flex flex-col gap-1.5">
          {endPill('h-8 w-14 rounded-full')}
          {aux('CLEAR', <Delete size={14} />, 'h-8 w-14 rounded-full')}
        </div>
      </div>
      <div className="min-h-0 flex-[60]">{numGrid()}</div>
    </div>
  );

  /** Sony Ericsson: hàng trên ba phím, hàng dưới ← back và C kẹp joystick. */
  const faceSE = (
    <div className="flex h-full w-full flex-col gap-1.5">
      <div className="flex shrink-0 items-stretch gap-1.5">
        {softKeys && softLeft(cn('h-8 flex-1', PILL_L))}
        {callPill('h-8 w-12 rounded-[0.3rem]')}
        {endPill('h-8 w-12 rounded-[0.3rem]')}
        {softKeys && softRight(cn('h-8 flex-1', PILL_R))}
      </div>
      <div className="flex min-h-0 flex-[32] items-center justify-center gap-2">
        {aux('SOFT_RIGHT', <Undo2 size={14} />, 'h-9 w-16 rounded-full')}
        {dpad}
        {aux('CLEAR', <span className="text-xs font-bold">C</span>, 'h-9 w-16 rounded-full')}
      </div>
      <div className="min-h-0 flex-[62]">{numGrid()}</div>
    </div>
  );

  /** Motorola RAZR: phím phẳng khắc laser, lưới liền không khe. */
  const faceRazr = (
    <div className="flex h-full w-full flex-col gap-1">
      <div className="flex shrink-0 items-stretch gap-px">
        {softKeys && softLeft('h-8 flex-1 rounded-l-md rounded-r-[3px] text-[11px] font-bold')}
        {callPill('h-8 w-12 rounded-[3px]')}
        {endPill('h-8 w-12 rounded-[3px]')}
        {softKeys && softRight('h-8 flex-1 rounded-r-md rounded-l-[3px] text-[11px] font-bold')}
      </div>
      <div className="flex min-h-0 flex-[32] items-center justify-center">{squarePad}</div>
      <div className="min-h-0 flex-[62] overflow-hidden rounded-md border border-white/10">
        {numGrid(true)}
      </div>
    </div>
  );

  /** Máy đời đầu / Samsung / Siemens: phím bập bênh nằm ngang. */
  const faceRocker = (
    <div className="flex h-full w-full flex-col gap-1.5">
      <div className="flex shrink-0 items-stretch gap-1.5">
        {softKeys && softLeft(cn('h-8 flex-1', PILL_L))}
        {callPill('h-8 w-12 rounded-[0.3rem]')}
        {endPill('h-8 w-12 rounded-[0.3rem]')}
        {softKeys && softRight(cn('h-8 flex-1', PILL_R))}
      </div>
      <div className="flex min-h-0 flex-[30] items-center justify-center">{rockerPad}</div>
      <div className="min-h-0 flex-[64]">{numGrid()}</div>
    </div>
  );

  /**
   * Nokia E71: cụm điều hướng, bốn phím tắt, rồi bàn phím QWERTY.
   * Số nằm chồng lên các phím chữ bên phải (U I O / J K L / M , .) đúng như máy
   * thật; phím chữ không mang số thì game Java không đọc được nên để trơ.
   */
  const QWERTY_ROWS: { ch: string; key?: EmuKey }[][] = [
    [{ ch: 'Q' }, { ch: 'W' }, { ch: 'E' }, { ch: 'R' }, { ch: 'T' }, { ch: 'Y' },
      { ch: 'U', key: 'NUM1' }, { ch: 'I', key: 'NUM2' }, { ch: 'O', key: 'NUM3' }, { ch: 'P' }],
    [{ ch: 'A' }, { ch: 'S' }, { ch: 'D' }, { ch: 'F' }, { ch: 'G' }, { ch: 'H' },
      { ch: 'J', key: 'NUM4' }, { ch: 'K', key: 'NUM5' }, { ch: 'L', key: 'NUM6' }],
    [{ ch: 'Z' }, { ch: 'X' }, { ch: 'C' }, { ch: 'V' }, { ch: 'B' }, { ch: 'N' },
      { ch: 'M', key: 'NUM7' }, { ch: ',', key: 'NUM8' }, { ch: '.', key: 'NUM9' }],
    [{ ch: '*', key: 'STAR' }, { ch: '␣', key: 'NUM0' }, { ch: '#', key: 'POUND' }],
  ];

  const faceQwerty = (
    <div className="flex h-full w-full flex-col gap-1.5">
      <div className="flex min-h-0 flex-[26] items-center justify-center gap-1.5">
        {softKeys && softLeft(cn('h-8 flex-1', PILL_L))}
        {callPill('h-8 w-11 rounded-full')}
        <div className="h-full max-h-[4.5rem]" style={{ aspectRatio: '1 / 1' }}>{squarePad}</div>
        {endPill('h-8 w-11 rounded-full')}
        {softKeys && softRight(cn('h-8 flex-1', PILL_R))}
      </div>

      {/* Bốn phím tắt: trang chủ, lịch, danh bạ, tin nhắn */}
      <div className="grid shrink-0 grid-cols-4 gap-1">
        {['⌂', '▤', '☎', '✉'].map((g) => (
          <span key={g} className={cn(skinFace, 'h-6 justify-center rounded-full text-[10px] opacity-60')}>{g}</span>
        ))}
      </div>

      <div className="flex min-h-0 flex-[62] flex-col gap-1">
        {QWERTY_ROWS.map((row, r) => (
          <div key={r} className={cn('flex min-h-0 flex-1 gap-1', r === 3 ? 'justify-center' : 'justify-stretch')}>
            {row.map(({ ch, key }) => (
              key ? (
                <button
                  key={ch} type="button" {...bind(key)}
                  className={cn(skinFace, held.has(key) && skinHeld,
                    'h-full flex-1 flex-col justify-center gap-0 rounded-md px-0',
                    r === 3 && 'max-w-[6rem]')}
                >
                  <span className="text-[11px] font-semibold leading-none">{ch}</span>
                  {r < 3 && (
                    <span className={cn('mt-0.5 text-[8px] font-bold leading-none', subColor)}>
                      {EMU_KEY_LABEL[key]}
                    </span>
                  )}
                </button>
              ) : (
                <span
                  key={ch}
                  className={cn(skinFace, 'h-full flex-1 justify-center rounded-md text-[11px] font-semibold opacity-55')}
                >
                  {ch}
                </span>
              )
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  /**
   * Máy cảm ứng (5800, Cookie): mặt trước chỉ có ba phím gọi / menu / kết thúc.
   * Game Java vẫn cần phím số nên thêm nút gọi bàn phím trượt lên khi cần —
   * đúng cách máy cảm ứng đời đó cho chơi game phím.
   */
  const faceTouch = (
    <div className="flex h-full w-full flex-col justify-end gap-2">
      {padOpen && <div className="min-h-0 flex-1">{numGrid()}</div>}
      <div className="flex shrink-0 items-stretch justify-center gap-2">
        {callPill('h-9 w-24 rounded-full')}
        {aux('SOFT_LEFT', <MenuIcon size={15} />, 'h-9 w-20 rounded-full')}
        {endPill('h-9 w-24 rounded-full')}
      </div>
      <button
        type="button"
        onClick={() => setPadOpen((v) => !v)}
        className={cn(skinFace, 'h-8 shrink-0 justify-center gap-1.5 rounded-full text-[11px] font-bold')}
      >
        <Grid3x3 size={13} /> {padOpen ? 'Ẩn bàn phím số' : 'Hiện bàn phím số'}
      </button>
    </div>
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
    phonePad: fill ? (
      faceLayout === 's60' ? faceS60
      : faceLayout === 'se' ? faceSE
      : faceLayout === 'razr' ? faceRazr
      : faceLayout === 'rocker' ? faceRocker
      : faceLayout === 'qwerty' ? faceQwerty
      : faceLayout === 'touch' ? faceTouch
      : (
      /**
       * Mặt phím của skin máy thật (tham khảo skin candybar của Manic EMU):
       * hàng phím gọi/kết thúc ở trên, phím mềm ngay dưới, vòng xoay kẹp giữa
       * bốn phím đó, rồi tới bàn phím số phím bè ngang.
       */
      <div className="flex h-full w-full flex-col gap-1.5">
        <div className="grid min-h-0 flex-[34] grid-cols-[1fr_auto_1fr] grid-rows-2 items-center gap-x-2 gap-y-1.5">
          {/* Phím gọi / kết thúc: viên thuốc màu nhỏ ở hai vai, như máy thật */}
          <button
            type="button" {...bind('SEND')}
            className={cn(
              'col-start-1 row-start-1 grid h-7 w-full max-w-[5rem] place-items-center justify-self-start rounded-full',
              'border border-emerald-900/60 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white',
              'shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_2px_3px_rgba(0,0,0,0.5)] transition active:translate-y-px',
              held.has('SEND') && 'from-brand-400 to-brand-600',
            )}
          >
            <Phone size={13} />
          </button>
          <button
            type="button" {...bind('END')}
            className={cn(
              'col-start-3 row-start-1 grid h-7 w-full max-w-[5rem] place-items-center justify-self-end rounded-full',
              'border border-red-900/60 bg-gradient-to-b from-red-500 to-red-700 text-white',
              'shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_2px_3px_rgba(0,0,0,0.5)] transition active:translate-y-px',
              held.has('END') && 'from-brand-400 to-brand-600',
            )}
          >
            <PhoneOff size={13} />
          </button>

          {/* Vòng xoay chiếm cả hai hàng, đúng chỗ giữa bốn phím kia */}
          <div className="col-start-2 row-start-1 row-span-2 flex h-full items-center justify-center px-2">
            {dpad}
          </div>

          {softKeys && (
            <button
              type="button" {...bind('SOFT_LEFT')}
              className={cn(skinFace, held.has('SOFT_LEFT') && skinHeld,
                'col-start-1 row-start-2 h-8 w-full max-w-[6rem] justify-center justify-self-start rounded-full text-[11px] font-bold')}
            >
              {soft.left}
            </button>
          )}
          {softKeys && (
            <button
              type="button" {...bind('SOFT_RIGHT')}
              className={cn(skinFace, held.has('SOFT_RIGHT') && skinHeld,
                'col-start-3 row-start-2 h-8 w-full max-w-[6rem] justify-center justify-self-end rounded-full text-[11px] font-bold')}
            >
              {soft.right}
            </button>
          )}
        </div>

        {/* Đường gân ngăn cụm điều hướng với bàn phím số */}
        <div className="mx-2 h-px shrink-0 bg-gradient-to-r from-transparent via-ink-500/40 to-transparent" />

        {/* Bàn phím số: chữ số và chữ cái nằm cạnh nhau, cột phải đảo thứ tự
            đúng như bàn phím Nokia đời sau. */}
        <div className="grid min-h-0 flex-[62] grid-cols-3 grid-rows-4 gap-1.5">
          {NUMPAD_ROWS.flat().map((k, i) => {
            const letters = NUM_KEY_LETTERS[k];
            const col = i % 3;
            const digit = <span className="text-base font-semibold leading-none">{EMU_KEY_LABEL[k]}</span>;
            const sub = letters
              ? <span className={cn('text-[9px] font-bold leading-none tracking-wider', subColor)}>{letters}</span>
              : null;
            return (
              <button
                key={k}
                type="button"
                {...bind(k)}
                className={cn(skinFace, held.has(k) && skinHeld, 'h-full w-full rounded-full px-3',
                  col === 0 ? 'justify-start' : col === 1 ? 'justify-center' : 'justify-end')}
              >
                <span className="flex items-baseline gap-1.5">
                  {col === 2 ? <>{sub}{digit}</> : <>{digit}{sub}</>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )
    ) : (
      <div className="mx-auto w-full max-w-[19rem] rounded-[1.6rem] border border-ink-800/70 bg-gradient-to-b from-ink-800/40 to-ink-900/40 p-2 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]">
        <div className="flex items-stretch gap-1.5">
          {softKeys && softLeft('h-9 flex-1 rounded-l-[1.1rem] rounded-r-[0.3rem] text-[11px] font-semibold')}
          {sendKey('h-9 w-14 rounded-[0.3rem]')}
          {endKey('h-9 w-14 rounded-[0.3rem]')}
          {softKeys && softRight('h-9 flex-1 rounded-r-[1.1rem] rounded-l-[0.3rem] text-[11px] font-semibold')}
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
