/**
 * Màu thân máy cho skin emulator, chia theo hãng.
 *
 * Máy Java ME mỗi hãng một chất vỏ khác nhau: Nokia bạc lạnh, Motorola RAZR
 * nhôm anod đen, LG Chocolate đen bóng, Siemens xám ngả olive… Chọn máy nào thì
 * thân máy đổi theo máy đó cho ra chất, chứ không phải máy nào cũng một màu.
 *
 * Class viết nguyên chuỗi chứ không ghép động, vì Tailwind quét mã nguồn theo
 * chuỗi hoàn chỉnh — ghép động là mất class lúc build.
 */

export interface ChassisSkin {
  /** Nửa trên: mặt trước quanh kính màn hình. */
  top: string;
  /** Nửa dưới: tấm nền mặt phím. */
  keypad: string;
  /** Viền ngoài thân máy. */
  edge: string;
}

const GENERIC: ChassisSkin = {
  top: 'bg-gradient-to-b from-ink-900 to-ink-950',
  keypad: 'bg-gradient-to-b from-ink-700 to-ink-800',
  edge: 'border-black/80',
};

export const CHASSIS_SKIN: Record<string, ChassisSkin> = {
  // Nokia S40/S60: mặt trước đen, vỏ và phím bạc lạnh.
  nokia: {
    top: 'bg-gradient-to-b from-slate-800 to-slate-950',
    keypad: 'bg-gradient-to-b from-slate-500 to-slate-700',
    edge: 'border-slate-950',
  },
  // Sony Ericsson: xám trung tính, hơi ngả nâu.
  sonyericsson: {
    top: 'bg-gradient-to-b from-zinc-800 to-zinc-950',
    keypad: 'bg-gradient-to-b from-zinc-500 to-zinc-700',
    edge: 'border-zinc-950',
  },
  // Samsung đời D900/E250: mặt trước ngả xanh, phím bạc sáng.
  samsung: {
    top: 'bg-gradient-to-b from-blue-950 to-slate-950',
    keypad: 'bg-gradient-to-b from-slate-400 to-slate-600',
    edge: 'border-slate-950',
  },
  // Motorola RAZR: nhôm anod, gần như đen tuyền.
  motorola: {
    top: 'bg-gradient-to-b from-neutral-900 to-black',
    keypad: 'bg-gradient-to-b from-neutral-500 to-neutral-700',
    edge: 'border-black',
  },
  // LG Chocolate: đen bóng.
  lg: {
    top: 'bg-gradient-to-b from-stone-900 to-black',
    keypad: 'bg-gradient-to-b from-stone-500 to-stone-700',
    edge: 'border-black',
  },
  // Siemens: xám ngả olive.
  siemens: {
    top: 'bg-gradient-to-b from-stone-800 to-stone-950',
    keypad: 'bg-gradient-to-b from-stone-400 to-stone-600',
    edge: 'border-stone-950',
  },
  generic: GENERIC,
};

export function chassisSkin(keyLayout: string | null | undefined): ChassisSkin {
  return CHASSIS_SKIN[keyLayout ?? 'generic'] ?? GENERIC;
}
