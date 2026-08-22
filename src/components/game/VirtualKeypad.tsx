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
    <div className="flex h-full max-h-[7.5rem] shrink-0 flex-col items-center justify-center gap-1">
      <button type="button" {...bind('UP')} className={face('UP', 'h-9 w-24 rounded-t-2xl rounded-b-sm')}><ChevronUp size={16} /></button>
      <div className="flex items-stretch gap-1">
        <button type="button" {...bind('LEFT')} className={face('LEFT', 'h-9 w-9 rounded-l-2xl rounded-r-sm')}><ChevronLeft size={16} /></button>
        <button type="button" {...bind('FIRE')} className={face('FIRE', 'h-9 w-10 rounded-sm text-[10px] font-bold')}>OK</button>
        <button type="button" {...bind('RIGHT')} className={face('RIGHT', 'h-9 w-9 rounded-r-2xl rounded-l-sm')}><ChevronRight size={16} /></button>
      </div>
      <button type="button" {...bind('DOWN')} className={face('DOWN', 'h-9 w-24 rounded-b-2xl rounded-t-sm')}><ChevronDown size={16} /></button>
    </div>
  );

  /** Nokia S60: phím bốn hướng vuông, Menu và C kẹp hai bên, gọi/kết thúc ngoài cùng. */
  const faceS60 = (
    <div className="flex h-full w-full flex-col gap-1.5">
      <div className="flex shrink-0 items-stretch gap-1.5">
        {softKeys && softLeft(cn('h-9 flex-1', PILL_L))}
        {softKeys && softRight(cn('h-9 flex-1', PILL_R))}
      </div>
      <div className="flex min-h-0 flex-[40] items-center justify-center gap-1.5">
        <div className="flex flex-col gap-1.5">
          {callPill('h-9 w-14 rounded-full')}
          {aux('SOFT_LEFT', <MenuIcon size={14} />, 'h-9 w-14 rounded-full')}
        </div>
        {squarePad}
        <div className="flex flex-col gap-1.5">
          {endPill('h-9 w-14 rounded-full')}
          {aux('CLEAR', <Delete size={14} />, 'h-9 w-14 rounded-full')}
        </div>
      </div>
      <div className="min-h-0 flex-[56]">{numGrid()}</div>
    </div>
  );

  /**
   * Sony Ericsson: bốn phím xếp 2×2 quanh joystick — trái là phím hoạt động và
   * phím back, phải là phím tin nhắn và phím C; phím mềm nằm hàng trên cùng.
   */
  const faceSE = (
    <div className="flex h-full w-full flex-col gap-1.5">
      <div className="flex shrink-0 items-stretch gap-1.5">
        {softKeys && softLeft(cn('h-9 flex-1', PILL_L))}
        {callPill('h-9 w-11 rounded-[0.3rem]')}
        {endPill('h-9 w-11 rounded-[0.3rem]')}
        {softKeys && softRight(cn('h-9 flex-1', PILL_R))}
      </div>

      <div className="flex min-h-0 flex-[40] items-center justify-center gap-2">
        <div className="flex flex-col gap-1.5">
          <span className={cn(skinFace, 'h-9 w-16 justify-center rounded-[0.4rem] text-[11px] opacity-70')}>▤</span>
          {aux('SOFT_RIGHT', <Undo2 size={14} />, 'h-9 w-16 rounded-[0.4rem]')}
        </div>
        {dpad}
        <div className="flex flex-col gap-1.5">
          <span className={cn(skinFace, 'h-9 w-16 justify-center rounded-[0.4rem] text-[11px] opacity-70')}>✉</span>
          {aux('CLEAR', <span className="text-xs font-bold">C</span>, 'h-9 w-16 rounded-[0.4rem]')}
        </div>
      </div>

      <div className="min-h-0 flex-[56]">{numGrid()}</div>
    </div>
  );

  /**
   * Motorola RAZR: đĩa điều hướng tròn có vành crôm, hai bên là phím tin nhắn
   * và phím xoá; hàng dưới là gọi ‧ trình duyệt ‧ kết thúc; cuối cùng là lưới
   * phím phẳng khắc laser, chỉ ngăn nhau bằng đường gân chứ không bo tròn.
   */
  const faceRazr = (
    <div className="flex h-full w-full flex-col gap-1">
      <div className="flex shrink-0 items-stretch gap-px">
        {softKeys && softLeft('h-9 flex-1 rounded-l-md rounded-r-[3px] text-[11px] font-bold')}
        {softKeys && softRight('h-9 flex-1 rounded-r-md rounded-l-[3px] text-[11px] font-bold')}
      </div>

      <div className="flex min-h-0 flex-[34] items-center justify-center gap-2">
        <span className={cn(skinFace, 'h-9 w-12 justify-center rounded-[3px] text-[11px] opacity-70')}>✉</span>
        {dpad}
        {aux('CLEAR', <Undo2 size={14} />, 'h-9 w-12 rounded-[3px]')}
      </div>

      <div className="flex shrink-0 items-stretch justify-center gap-1.5">
        {callPill('h-9 w-16 rounded-full')}
        <span className={cn(skinFace, 'h-9 w-12 justify-center rounded-full text-[11px] opacity-70')}>⊕</span>
        {endPill('h-9 w-16 rounded-full')}
      </div>

      <div className="min-h-0 flex-[52] overflow-hidden rounded-md border border-white/10">
        {numGrid(true)}
      </div>
    </div>
  );

  /** Máy đời đầu / Samsung / Siemens: phím bập bênh nằm ngang. */
  const faceRocker = (
    <div className="flex h-full w-full flex-col gap-1.5">
      <div className="flex shrink-0 items-stretch gap-1.5">
        {softKeys && softLeft(cn('h-9 flex-1', PILL_L))}
        {callPill('h-9 w-12 rounded-[0.3rem]')}
        {endPill('h-9 w-12 rounded-[0.3rem]')}
        {softKeys && softRight(cn('h-9 flex-1', PILL_R))}
      </div>
      <div className="flex min-h-0 flex-[36] items-center justify-center">{rockerPad}</div>
      <div className="min-h-0 flex-[56]">{numGrid()}</div>
    </div>
  );

  /**
   * Nokia E71: cụm điều hướng, bốn phím tắt, rồi bàn phím QWERTY.
   * Số nằm chồng lên các phím chữ bên phải (U I O / J K L / M , .) đúng như máy
   * thật; phím chữ không mang số thì game Java không đọc được nên để trơ.
   */
  const QWERTY_ROWS: { ch: string; key?: EmuKey; num?: string; span?: number }[][] = [
    [{ ch: 'Q' }, { ch: 'W' }, { ch: 'E' }, { ch: 'R' },
      { ch: 'T', key: 'NUM1', num: '1' }, { ch: 'Y', key: 'NUM2', num: '2' }, { ch: 'U', key: 'NUM3', num: '3' },
      { ch: 'I', key: 'STAR', num: '*' }, { ch: 'O', num: '+' }, { ch: 'P', num: '=' }],
    [{ ch: 'A' }, { ch: 'S' }, { ch: 'D' },
      { ch: 'F', key: 'NUM4', num: '4' }, { ch: 'G', key: 'NUM5', num: '5' }, { ch: 'H', key: 'NUM6', num: '6' },
      { ch: 'J', key: 'POUND', num: '#' }, { ch: 'K', num: '-' }, { ch: 'L' },
      { ch: '⌫', key: 'CLEAR' }],
    [{ ch: 'Z' }, { ch: 'X' }, { ch: 'C' },
      { ch: 'V', key: 'NUM7', num: '7' }, { ch: 'B', key: 'NUM8', num: '8' }, { ch: 'N', key: 'NUM9', num: '9' },
      { ch: 'M', key: 'NUM0', num: '0' }, { ch: ',', num: ';' }, { ch: '.', num: ':' }, { ch: '↵' }],
    [{ ch: '⇧' }, { ch: 'Sym' }, { ch: '@' }, { ch: '␣', span: 4 }, { ch: '?' }, { ch: '!' }, { ch: 'Ctrl' }],
  ];

  const faceQwerty = (
    <div className="flex h-full w-full flex-col gap-1.5">
      {/*
        Cụm điều hướng E-series: hai phím tắt bên trái, hai bên phải, D-pad vuông
        ở giữa; phím gọi và kết thúc là hai thanh cong nằm dưới hai cặp phím tắt.
      */}
      <div className="flex min-h-0 flex-[34] items-center justify-center gap-2">
        <div className="flex flex-1 flex-col items-end gap-1">
          <div className="flex w-full justify-end gap-1">
            {softKeys && softLeft('h-9 flex-1 rounded-full text-[10px] font-bold')}
            <span className={cn(skinFace, 'h-9 w-9 justify-center rounded-full text-[11px] opacity-60')}>▤</span>
          </div>
          {callPill('h-9 w-full rounded-full')}
        </div>

        <div className="h-full max-h-[6.5rem]" style={{ aspectRatio: '1 / 1' }}>{squarePad}</div>

        <div className="flex flex-1 flex-col items-start gap-1">
          <div className="flex w-full justify-start gap-1">
            <span className={cn(skinFace, 'h-9 w-9 justify-center rounded-full text-[11px] opacity-60')}>✉</span>
            {softKeys && softRight('h-9 flex-1 rounded-full text-[10px] font-bold')}
          </div>
          {endPill('h-9 w-full rounded-full')}
        </div>
      </div>

      {/* Bàn phím QWERTY: số in phía trên chữ, đúng vị trí máy E-series thật. */}
      <div className="flex min-h-0 flex-[66] flex-col gap-1">
        {QWERTY_ROWS.map((row, r) => (
          // Lưới 10 cột cho cả bốn hàng nên mọi phím rộng bằng nhau; phím cách
          // trải 4 cột đúng như bàn phím thật mà vẫn khớp lưới.
          <div key={r} className="grid min-h-0 max-h-[2.9rem] flex-1 grid-cols-10 gap-1">
            {row.map(({ ch, key, num, span }) => {
              const body = (
                <>
                  {num && (
                    <span className={cn('text-[8px] font-bold leading-none', subColor)}>{num}</span>
                  )}
                  <span className="text-[11px] font-semibold leading-none">{ch}</span>
                </>
              );
              const cell = span === 4 ? 'col-span-4' : 'col-span-1';
              return key ? (
                <button
                  key={ch} type="button" {...bind(key)}
                  className={cn(skinFace, held.has(key) && skinHeld, cell,
                    'h-full w-full flex-col justify-center gap-0.5 rounded-md px-0')}
                >
                  {body}
                </button>
              ) : (
                <span
                  key={ch}
                  className={cn(skinFace, cell,
                    'h-full w-full flex-col justify-center gap-0.5 rounded-md opacity-55')}
                >
                  {body}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  /** Nút bật/tắt bàn phím số cho máy cảm ứng. */
  const padToggle = (extra: string) => (
    <button
      type="button"
      onClick={() => setPadOpen((v) => !v)}
      className={cn(skinFace, 'justify-center gap-1.5 rounded-full text-[11px] font-bold', extra)}
    >
      <Grid3x3 size={13} /> {padOpen ? 'Ẩn bàn phím số' : 'Hiện bàn phím số'}
    </button>
  );

  /**
   * Máy cảm ứng còn phím cứng (5800, Cookie): mặt trước chỉ có ba **thanh mảnh**
   * sát đáy — gọi (xanh) ‧ menu ‧ kết thúc (đỏ). Game Java cần phím số thì bật
   * bàn phím trượt lên.
   */
  const faceTouch = (
    <div className="flex h-full w-full flex-col justify-end gap-2">
      {padOpen && <div className="min-h-0 flex-1">{numGrid()}</div>}
      {/*
        Máy thật in ba thanh rất mảnh. Giữ nguyên dáng đó nhưng vùng bấm cao
        bằng phím khác (36px) — thanh 10px thì ngón tay không trúng.
      */}
      <div className="flex shrink-0 items-stretch justify-center gap-2">
        {([
          ['SEND', 'from-emerald-400 to-emerald-600', EMU_KEY_LABEL.SEND],
          ['SOFT_LEFT', 'from-ink-200 to-ink-400', 'Menu'],
          ['END', 'from-red-400 to-red-600', EMU_KEY_LABEL.END],
        ] as const).map(([k, tint, label]) => (
          <button
            key={k} type="button" {...bind(k)} aria-label={label}
            className="grid h-9 flex-1 place-items-center rounded-lg"
          >
            <span className={cn('h-2.5 w-full rounded-full bg-gradient-to-b shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition',
              held.has(k) ? 'from-brand-400 to-brand-600' : tint)} />
          </button>
        ))}
      </div>
      {padToggle('h-9 shrink-0')}
    </div>
  );

  /**
   * Máy cảm ứng thuần, không phím cứng nào: chơi bằng cách chạm thẳng lên màn
   * hình. Chỉ chừa một nút nhỏ gọi bàn phím số ra cho game nào bắt buộc bấm phím.
   */
  const faceTouchOnly = (
    <div className="flex h-full w-full flex-col justify-end gap-1.5">
      {padOpen && <div className="min-h-0 flex-1">{numGrid()}</div>}
      {padToggle('h-9 shrink-0 opacity-80')}
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
      : faceLayout === 'touch-only' ? faceTouchOnly
      : (
      /**
       * Mặt phím của skin máy thật (tham khảo skin candybar của Manic EMU):
       * hàng phím gọi/kết thúc ở trên, phím mềm ngay dưới, vòng xoay kẹp giữa
       * bốn phím đó, rồi tới bàn phím số phím bè ngang.
       */
      <div className="flex h-full w-full flex-col gap-1.5">
        <div className="grid min-h-0 flex-[42] grid-cols-[1fr_auto_1fr] grid-rows-2 items-center gap-x-2 gap-y-1.5">
          {/* Phím gọi / kết thúc: viên thuốc màu nhỏ ở hai vai, như máy thật */}
          <button
            type="button" {...bind('SEND')}
            className={cn(
              'col-start-1 row-start-1 grid h-9 w-full max-w-[5.5rem] place-items-center justify-self-start rounded-full',
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
              'col-start-3 row-start-1 grid h-9 w-full max-w-[5.5rem] place-items-center justify-self-end rounded-full',
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
                'col-start-1 row-start-2 h-9 w-full max-w-[6rem] justify-center justify-self-start rounded-full text-[11px] font-bold')}
            >
              {soft.left}
            </button>
          )}
          {softKeys && (
            <button
              type="button" {...bind('SOFT_RIGHT')}
              className={cn(skinFace, held.has('SOFT_RIGHT') && skinHeld,
                'col-start-3 row-start-2 h-9 w-full max-w-[6rem] justify-center justify-self-end rounded-full text-[11px] font-bold')}
            >
              {soft.right}
            </button>
          )}
        </div>

        {/* Đường gân ngăn cụm điều hướng với bàn phím số */}
        <div className="mx-2 h-px shrink-0 bg-gradient-to-r from-transparent via-ink-500/40 to-transparent" />

        {/* Bàn phím số: chữ số và chữ cái nằm cạnh nhau, cột phải đảo thứ tự
            đúng như bàn phím Nokia đời sau. */}
        <div className="grid min-h-0 flex-[54] grid-cols-3 grid-rows-4 gap-1.5">
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
