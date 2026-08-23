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

  /**
   * Cụm điều hướng bám theo **chiều cao chỗ chứa** ở cả hai hướng cầm máy.
   * Cầm ngang trước đây ép cứng `h-28 w-28` nên vòng xoay chỉ còn nửa diện
   * tích bản dọc, trong khi hai bên thân máy thừa rất nhiều chỗ.
   */
  const wheel = fill
    ? 'h-full max-h-[13rem] aspect-square shrink-0'
    : compact ? 'h-full max-h-[9.5rem] aspect-square shrink-0' : 'h-[6.5rem] w-[6.5rem]';

  // ── D-pad ────────────────────────────────────────────────
  /**
   * Vùng bấm của bốn mũi tên cắt theo **góc phần tư** chứ không phải ô vuông
   * nhỏ ở mép: trên máy thật bấm chỗ nào ở nửa trên của vành cũng là đi lên.
   * Cách cũ mỗi mũi tên chỉ chiếm 1/9 vòng, bốn góc thành vùng chết — mà mũi
   * tên lại là phím bấm nhiều nhất khi chơi.
   */
  const NAV_ZONES: { key: EmuKey; icon: React.ReactNode; clip: string; at: string }[] = [
    { key: 'UP', icon: <ChevronUp size={22} />, clip: 'polygon(50% 50%, 0% 0%, 100% 0%)', at: 'items-start justify-center pt-[6%]' },
    { key: 'RIGHT', icon: <ChevronRight size={22} />, clip: 'polygon(50% 50%, 100% 0%, 100% 100%)', at: 'items-center justify-end pr-[6%]' },
    { key: 'DOWN', icon: <ChevronDown size={22} />, clip: 'polygon(50% 50%, 100% 100%, 0% 100%)', at: 'items-end justify-center pb-[6%]' },
    { key: 'LEFT', icon: <ChevronLeft size={22} />, clip: 'polygon(50% 50%, 0% 100%, 0% 0%)', at: 'items-center justify-start pl-[6%]' },
  ];

  /**
   * Cụm điều hướng: `round` là vòng xoay, `square` là phím bốn hướng vuông.
   *
   * Phím vuông dựng theo ảnh phím thật: **một khối vuông bo góc liền**, mặt
   * trên là vành bấm bốn hướng, giữa lồng **một ô vuông nhỏ có viền riêng** nổi
   * lên. Không kẻ đường chia cánh — vành trên máy thật là một mặt liền, bốn mũi
   * tên in trên đó chỉ để chỉ hướng. Vòng xoay tròn thì vẫn giữ đường chia vì
   * mặt nó rộng và không có ô vuông ở giữa để lấy mốc.
   */
  const navPad = (shape: 'round' | 'square', size: string) => {
    const square = shape === 'square';
    const round = square ? 'rounded-[30%]' : 'rounded-full';
    /** Đường chỉ chia bốn cánh — vỏ sáng thì mảnh và nhạt hơn vỏ tối. */
    const seam = skinned && !dark ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.42)';

    return (
      <div
        className={cn(
          'relative shrink-0 overflow-hidden border', round,
          skinned
            ? dark
              ? 'border-black/70 bg-gradient-to-b from-ink-700 to-ink-900 shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_-2px_4px_rgba(0,0,0,0.5)_inset,0_3px_6px_rgba(0,0,0,0.6)]'
              : 'border-ink-500/50 bg-gradient-to-b from-ink-200 to-ink-400 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_-2px_4px_rgba(0,0,0,0.3)_inset,0_3px_6px_rgba(0,0,0,0.5)]'
            : 'border-ink-950/70 bg-gradient-to-b from-ink-700 to-ink-800 shadow-[0_2px_6px_rgba(0,0,0,0.5)]',
          size,
        )}
      >
        {/* Vòng xoay: bốn đường chéo chia cánh. Phím vuông không có — máy thật
            là một mặt liền, ô vuông ở giữa đã đủ làm mốc. */}
        {!square && (
          <span
            aria-hidden
            className={cn('pointer-events-none absolute inset-0', round)}
            style={{ background: `repeating-conic-gradient(from 45deg, ${seam} 0deg 0.5deg, transparent 0.5deg 90deg)` }}
          />
        )}
        {/* Gờ chìm quanh mép, như đường viền dập nổi trên phím thật */}
        <span
          aria-hidden
          className={cn('pointer-events-none absolute inset-[7%]', square ? 'rounded-[26%]' : 'rounded-full',
            skinned && !dark
              ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.45),inset_0_0_0_1px_rgba(0,0,0,0.09)]'
              : 'shadow-[0_0_0_1px_rgba(255,255,255,0.07),inset_0_0_0_1px_rgba(0,0,0,0.3)]')}
        />

        {NAV_ZONES.map((z) => (
          <button
            key={z.key}
            type="button"
            {...bind(z.key)}
            style={{ clipPath: z.clip }}
            className={cn(
              'absolute inset-0 flex transition',
              z.at,
              skinned ? (dark ? 'text-ink-300/80' : 'text-ink-700/75') : 'text-ink-200',
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
            'absolute left-1/2 top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center',
            square ? 'h-[38%] w-[38%] rounded-[26%]' : 'h-[40%] w-[40%] rounded-[32%]',
            'border transition active:translate-y-px',
            skinned
              ? dark
                ? 'border-black/70 bg-gradient-to-b from-ink-600 to-ink-800 text-ink-100 shadow-[0_0_0_2px_rgba(0,0,0,0.35),0_1px_0_rgba(255,255,255,0.15)_inset,0_2px_4px_rgba(0,0,0,0.6)]'
                : 'border-ink-600/70 bg-gradient-to-b from-ink-100 to-ink-300 text-ink-900 shadow-[0_0_0_3px_rgba(0,0,0,0.22),0_1px_0_rgba(255,255,255,0.9)_inset,0_2px_5px_rgba(0,0,0,0.5)]'
              : 'border-ink-950/70 bg-gradient-to-b from-ink-600 to-ink-700 text-ink-100 shadow-[0_0_0_2px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_4px_rgba(0,0,0,0.5)]',
            held.has('FIRE') && '!from-brand-500 !to-brand-600 !text-white',
          )}
        >
          <span className="text-[10px] font-bold tracking-wide">OK</span>
        </button>
      </div>
    );
  };

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

  /**
   * Bàn phím số 4×3. `flat` là kiểu phím phẳng khắc laser của Motorola.
   *
   * Chữ số nằm trên, chữ cái phụ nằm dưới. Trước đây xếp ngang cạnh nhau như
   * mặt trước máy thật, nhưng từ khi bàn phím số dời sang cột phải thì phím
   * hẹp lại và `WXYZ 9` tràn ra ngoài viền.
   */
  const numGrid = (flat = false) => (
    <div className={cn('grid h-full min-h-0 w-full grid-cols-3 grid-rows-4', flat ? 'gap-px' : 'gap-1.5')}>
      {NUMPAD_ROWS.flat().map((k) => {
        const letters = NUM_KEY_LETTERS[k];
        return (
          <button
            key={k} type="button" {...bind(k)}
            className={cn(skinFace, held.has(k) && skinHeld,
              'h-full w-full min-w-0 flex-col justify-center gap-0 overflow-hidden px-1',
              flat ? 'rounded-[3px] border-x-0 border-b-0 border-t border-white/10' : 'rounded-full')}
          >
            {/*
              Cỡ chữ phải nhỏ hơn hàng phím: hàng thấp nhất đo được là ~34px,
              15px số + 7px chữ cái vừa khít. Để `text-base` + `mt-0.5` như
              trước thì phần chữ cao 26px, hàng 21px là số đè lên chữ cái.
            */}
            <span className="text-[15px] font-semibold leading-none">{EMU_KEY_LABEL[k]}</span>
            {letters && (
              <span className={cn('text-[7px] font-bold leading-[1.4] tracking-wider', subColor)}>
                {letters}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  /** Phím bốn hướng vuông của S60 / E-series — vùng bấm góc phần tư như vòng xoay. */
  const squarePad = navPad('square', 'h-full max-h-[13rem] aspect-square shrink-0');

  /**
   * Phím bập bênh nằm ngang của máy đời đầu / Samsung / Siemens.
   *
   * Hai cánh trái–phải cao hơn thanh trên–dưới: đo thực tế cho thấy để cùng
   * chiều cao thì trái–phải chỉ còn ~2 500px² trong khi phím số đã 4 300px².
   */
  /** Cụm điều hướng theo dòng máy. */
  const navCluster = faceLayout === 's60' ? squarePad : dpad;

  /** Motorola giữ kiểu phím phẳng khắc laser cho bàn phím số. */
  const flatNum = faceLayout === 'razr';

  /**
   * Mặt phím dọc: Options ‧ Back trên cùng (sát dưới màn hình như máy thật),
   * cụm mũi tên ở giữa, bàn phím số dưới cùng.
   *
   * `min-w-0` và `overflow-hidden` ở mọi tầng để không có nhánh nào đẩy mặt
   * phím rộng hơn thân máy.
   */
  /**
   * Mặt phím kiểu **J2ME Loader** — bàn phím ảo của emulator Android quen thuộc
   * chứ không phải mặt trước một máy nào. Ba điểm nhận dạng, lấy theo chính app:
   * cụm mũi tên một bên và bàn phím số bên kia (hai cụm này còn đổi chỗ được
   * trong app), nút **trong suốt** chứ không phải phím nhựa, và mũi tên là bốn
   * **nút tròn rời** xếp chữ thập chứ không phải một khối liền.
   */
  const j2Face = (extra?: string) =>
    cn(
      'select-none touch-none grid place-items-center rounded-full border transition',
      'border-white/30 bg-white/[0.10] text-white/85 backdrop-blur-[2px]',
      'shadow-[0_1px_2px_rgba(0,0,0,0.45)] active:translate-y-px',
      extra,
    );
  const j2Held = 'bg-brand-500/70 border-brand-300/60 !text-white';

  const j2Btn = (key: EmuKey, body: React.ReactNode, extra: string) => (
    <button
      key={key} type="button" {...bind(key)}
      className={cn(j2Face(extra), held.has(key) && j2Held)}
    >
      {body}
    </button>
  );

  /** Bốn mũi tên tròn rời xếp chữ thập, nút giữa ở tâm; bốn góc để trống. */
  const J2_CROSS: { key: EmuKey; icon: React.ReactNode; at: string }[] = [
    { key: 'UP', icon: <ChevronUp size={20} />, at: 'col-start-2 row-start-1' },
    { key: 'LEFT', icon: <ChevronLeft size={20} />, at: 'col-start-1 row-start-2' },
    { key: 'RIGHT', icon: <ChevronRight size={20} />, at: 'col-start-3 row-start-2' },
    { key: 'DOWN', icon: <ChevronDown size={20} />, at: 'col-start-2 row-start-3' },
  ];

  const faceJ2me = (
    <div className="flex h-full w-full min-w-0 flex-col gap-2 overflow-hidden">
      {softKeys && (
        <div className="flex shrink-0 items-stretch gap-2">
          <button type="button" {...bind('SOFT_LEFT')}
            className={cn(j2Face('h-9 min-w-0 flex-1 !rounded-lg text-[11px] font-semibold'), held.has('SOFT_LEFT') && j2Held)}>
            {soft.left}
          </button>
          <button type="button" {...bind('SOFT_RIGHT')}
            className={cn(j2Face('h-9 min-w-0 flex-1 !rounded-lg text-[11px] font-semibold'), held.has('SOFT_RIGHT') && j2Held)}>
            {soft.right}
          </button>
        </div>
      )}

      {/*
        Cụm mũi tên có **trần chiều cao cố định** rồi bàn phím số mới lấp phần
        bề ngang còn lại. Trước đó tôi ép cả hai thành hình vuông theo chiều cao
        chỗ chứa, nên trên màn hình cao thì hai cụm cộng lại rộng hơn thân máy
        và cột số bên phải tràn ra ngoài.
      */}
      <div className="flex min-h-0 w-full min-w-0 flex-1 items-center gap-3 overflow-hidden">
        {/* Bàn phím số bên TRÁI: viên bo tròn lấp kín ô, như bàn phím số của app */}
        <div className="grid h-full min-h-0 w-full min-w-0 max-h-[16rem] flex-1 grid-cols-3 grid-rows-4 gap-1.5">
          {NUMPAD_ROWS.flat().map((k) => {
            const letters = NUM_KEY_LETTERS[k];
            return j2Btn(k, (
              <span className="flex flex-col items-center gap-0 leading-none">
                <span className="text-sm font-semibold">{EMU_KEY_LABEL[k]}</span>
                {letters && <span className="mt-0.5 text-[7px] tracking-wider opacity-70">{letters}</span>}
              </span>
            ), 'h-full min-h-0 w-full !rounded-[1.1rem]');
          })}
        </div>

        {/* Cụm mũi tên bên PHẢI, trần chiều cao cố định để không đẩy tràn cột số */}
        <div className="grid aspect-square h-full max-h-[13rem] shrink-0 grid-cols-3 grid-rows-3 gap-1.5">
          {J2_CROSS.map((z) => (
            <span key={z.key} className={cn(z.at, 'grid min-h-0 place-items-center')}>
              {j2Btn(z.key, z.icon, 'h-full w-full')}
            </span>
          ))}
          <span className="col-start-2 row-start-2 grid min-h-0 place-items-center">
            {j2Btn('FIRE', <span className="text-[10px] font-bold tracking-wide">OK</span>, 'h-full w-full')}
          </span>
        </div>
      </div>
    </div>
  );

  // ── Hai skin nút trắng ───────────────────────────────────
  /**
   * Nút trắng viền đậm, dùng chung cho skin **vòng khuyên** và skin **lưới nút
   * tròn**. Khác hẳn phím nhựa của ba họ máy thật và nút trong suốt của `j2me`.
   */
  const WHITE_KEY =
    'select-none touch-none grid place-items-center border-2 border-ink-800/80 bg-white text-ink-900 ' +
    'font-semibold shadow-[0_2px_3px_rgba(0,0,0,0.28)] transition active:translate-y-px active:bg-ink-200';
  const WHITE_HELD = '!bg-brand-500 !text-white !border-brand-700';

  const whiteBtn = (key: EmuKey, body: React.ReactNode, extra: string, style?: React.CSSProperties) => (
    <button
      key={key} type="button" {...bind(key)} style={style}
      className={cn(WHITE_KEY, held.has(key) && WHITE_HELD, extra)}
    >
      {body}
    </button>
  );

  /**
   * Skin **vòng khuyên**: cụm điều hướng là một vòng tròn rỗng ruột (bấm vào
   * cung nào thì đi hướng đó), bên phải là cụm nút hành động xếp theo hình
   * cung — `7` `9` trên, `3` `1` bên trái, `OK` to nằm dưới. Hàng trên là hai
   * phím vai `L` và `R`.
   *
   * Lỗ giữa vòng khuyên chỉ để nhìn, `pointer-events-none`, nên bấm trúng giữa
   * vẫn ăn cung bên dưới chứ không thành vùng chết.
   */
  const ringPad = (
    <div className="relative aspect-square h-full max-h-[13rem] shrink-0 rounded-full border-2 border-ink-800/80 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
      {NAV_ZONES.map((z) => (
        <button
          key={z.key} type="button" {...bind(z.key)}
          style={{ clipPath: z.clip }}
          className={cn('absolute inset-0 flex rounded-full transition', z.at, 'text-ink-500',
            held.has(z.key) && 'bg-brand-500/80 !text-white')}
        >
          {z.icon}
        </button>
      ))}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-800/70 bg-ink-100"
      />
    </div>
  );

  /** Cụm nút hành động của skin vòng khuyên, xếp theo hình cung. */
  const RING_ACTIONS: { key: EmuKey; label: string; box: React.CSSProperties }[] = [
    { key: 'NUM7', label: '7', box: { left: '32%', top: '2%', width: '30%' } },
    { key: 'NUM9', label: '9', box: { left: '68%', top: '2%', width: '30%' } },
    { key: 'NUM3', label: '3', box: { left: '6%', top: '28%', width: '30%' } },
    { key: 'NUM1', label: '1', box: { left: '0%', top: '64%', width: '30%' } },
    { key: 'FIRE', label: 'OK', box: { left: '44%', top: '42%', width: '40%' } },
  ];

  const faceRing = (
    <div className="flex h-full w-full min-w-0 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-stretch gap-3">
        {whiteBtn('SOFT_LEFT', 'L', 'h-11 min-w-0 flex-1 rounded-xl text-sm')}
        {whiteBtn('SOFT_RIGHT', 'R', 'h-11 min-w-0 flex-1 rounded-xl text-sm')}
      </div>

      <div className="flex min-h-0 w-full min-w-0 flex-1 items-center gap-3 overflow-hidden">
        {ringPad}
        <div className="relative aspect-square h-full max-h-[13rem] min-w-0 flex-1">
          {RING_ACTIONS.map((a) =>
            whiteBtn(a.key, a.label, 'absolute aspect-square rounded-full text-sm', a.box),
          )}
        </div>
      </div>
    </div>
  );

  /**
   * Skin **lưới nút tròn**: `L OK R` rồi bốn hàng số, tất cả cùng một cỡ nút
   * tròn trắng. Không có phím mũi tên riêng — game Java đọc `2 4 6 8` làm bốn
   * hướng, đúng như skin gốc.
   */
  const GRID_KEYS: { key: EmuKey; label: string }[][] = [
    [{ key: 'SOFT_LEFT', label: 'L' }, { key: 'FIRE', label: 'OK' }, { key: 'SOFT_RIGHT', label: 'R' }],
    ...NUMPAD_ROWS.map((row) => row.map((k) => ({ key: k, label: EMU_KEY_LABEL[k] }))),
  ];

  const faceGrid = (
    <div className="grid h-full w-full min-w-0 grid-cols-3 grid-rows-5 gap-2 overflow-hidden">
      {GRID_KEYS.flat().map(({ key, label }) => (
        <span key={key} className="grid min-h-0 place-items-center">
          {whiteBtn(key, label, 'aspect-square h-full max-h-full rounded-full text-sm')}
        </span>
      ))}
    </div>
  );

  const phoneFace = (
    <div className="flex h-full w-full min-w-0 flex-col gap-2 overflow-hidden">
      {/* Options / Back thành một hàng riêng trên cùng, trải hết bề ngang. */}
      {softKeys && (
        <div className="flex shrink-0 items-stretch gap-2">
          {softLeft(cn('h-9 min-w-0 flex-1', PILL_L))}
          {softRight(cn('h-9 min-w-0 flex-1', PILL_R))}
        </div>
      )}

      {/*
        Mũi tên nằm giữa, bàn phím số nằm dưới — như mặt trước máy thật.

        Cụm mũi tên là hình vuông bám theo *chiều cao* hàng chứa nó, nên hàng
        cao bao nhiêu thì cánh mũi tên rộng bấy nhiêu. Hàng phím mềm riêng ăn
        mất 44px chiều cao, nên phải bù lại bằng cách nới cả nửa bàn phím lên
        `22rem` (xem `EmulatorStage`) rồi chia 50 : 50 — giữ được cụm mũi tên
        143px mà hàng phím số vẫn ~31px.
      */}
      <div className="flex min-h-0 w-full min-w-0 flex-[50] items-center justify-center">
        {navCluster}
      </div>

      <div
        className={cn('min-h-0 w-full min-w-0 flex-[50]',
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

    // Bàn phím số của bố cục ngang: kéo cao hết cột thay vì hàng phím dẹt
    // 36px, vì cột bên phải thân máy vốn thừa chỗ.
    numpad: (
      <div className="grid h-full max-h-[13rem] shrink-0 grid-cols-3 grid-rows-4 gap-1">
        {NUMPAD_ROWS.flat().map((k) => numKey(k, 'h-full w-14 rounded-lg'))}
      </div>
    ),

    phonePad: fill ? (
      faceLayout === 'j2me' ? faceJ2me
      : faceLayout === 'ring' ? faceRing
      : faceLayout === 'grid' ? faceGrid
      : phoneFace
    ) : (
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
