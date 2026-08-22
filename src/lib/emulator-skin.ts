/**
 * Màu thân máy cho skin emulator, khớp theo từng đời máy thật.
 *
 * Mỗi máy Java ME một chất vỏ khác nhau: Nokia 6300 thép không gỉ, RAZR V3 nhôm
 * anod bạc, LG Chocolate đen bóng phím đỏ, Walkman W200i cam đen… Chọn máy nào
 * thì thân máy ra đúng chất máy đó. Không khai báo riêng thì rơi về màu chung
 * của hãng.
 *
 * Class viết nguyên chuỗi chứ không ghép động, vì Tailwind quét mã nguồn theo
 * chuỗi hoàn chỉnh — ghép động là mất class lúc build. (`src/lib` nằm trong
 * `content` của tailwind.config.ts, đừng bỏ ra.)
 */

export interface ChassisSkin {
  /** Nửa trên: mặt trước quanh kính màn hình. Luôn tối để chữ trên đó đọc được. */
  top: string;
  /** Nửa dưới: tấm nền mặt phím. */
  keypad: string;
  /** Viền ngoài thân máy. */
  edge: string;
  /** Tông phím: máy vỏ sáng dùng phím bạc, máy vỏ đen dùng phím tối. */
  keys: 'silver' | 'dark';
  /** Màu chữ cái phụ in trên phím số — vài máy có đèn phím màu riêng. */
  accent?: string;
}

const GENERIC: ChassisSkin = {
  top: 'bg-gradient-to-b from-ink-900 to-ink-950',
  keypad: 'bg-gradient-to-b from-ink-700 to-ink-800',
  edge: 'border-black/80',
  keys: 'silver',
};

/** Màu chung của hãng, dùng khi máy chưa khai báo riêng. */
const BY_VENDOR: Record<string, ChassisSkin> = {
  nokia: { top: 'bg-gradient-to-b from-slate-800 to-slate-950', keypad: 'bg-gradient-to-b from-slate-500 to-slate-700', edge: 'border-slate-950', keys: 'silver' },
  sonyericsson: { top: 'bg-gradient-to-b from-zinc-800 to-zinc-950', keypad: 'bg-gradient-to-b from-zinc-500 to-zinc-700', edge: 'border-zinc-950', keys: 'silver' },
  samsung: { top: 'bg-gradient-to-b from-blue-950 to-slate-950', keypad: 'bg-gradient-to-b from-slate-400 to-slate-600', edge: 'border-slate-950', keys: 'silver' },
  motorola: { top: 'bg-gradient-to-b from-neutral-900 to-black', keypad: 'bg-gradient-to-b from-neutral-500 to-neutral-700', edge: 'border-black', keys: 'silver' },
  lg: { top: 'bg-gradient-to-b from-stone-900 to-black', keypad: 'bg-gradient-to-b from-stone-500 to-stone-700', edge: 'border-black', keys: 'silver' },
  siemens: { top: 'bg-gradient-to-b from-stone-800 to-stone-950', keypad: 'bg-gradient-to-b from-stone-400 to-stone-600', edge: 'border-stone-950', keys: 'silver' },
  generic: GENERIC,
};

/** Màu riêng theo từng máy — bám màu vỏ bản bán ra phổ biến nhất. */
const BY_MODEL: Record<string, ChassisSkin> = {
  // ── Nokia ──
  // 3510i: vỏ nhựa xanh xám nhạt, phím bạc sáng.
  'nokia-3510i': { top: 'bg-gradient-to-b from-slate-700 to-slate-900', keypad: 'bg-gradient-to-b from-slate-300 to-slate-500', edge: 'border-slate-900', keys: 'silver' },
  // 7210: bản màu nổi bật nhất là xanh dương.
  'nokia-7210': { top: 'bg-gradient-to-b from-blue-800 to-blue-950', keypad: 'bg-gradient-to-b from-slate-300 to-slate-500', edge: 'border-blue-950', keys: 'silver' },
  'nokia-6230': { top: 'bg-gradient-to-b from-zinc-700 to-zinc-900', keypad: 'bg-gradient-to-b from-zinc-400 to-zinc-600', edge: 'border-zinc-950', keys: 'silver' },
  'nokia-6070': { top: 'bg-gradient-to-b from-slate-700 to-slate-900', keypad: 'bg-gradient-to-b from-slate-400 to-slate-600', edge: 'border-slate-950', keys: 'silver' },
  'nokia-6600': { top: 'bg-gradient-to-b from-slate-700 to-slate-900', keypad: 'bg-gradient-to-b from-slate-400 to-slate-600', edge: 'border-slate-950', keys: 'silver' },
  // 7610: vỏ đen ngả tím, phím tối.
  'nokia-7610': { top: 'bg-gradient-to-b from-purple-950 to-black', keypad: 'bg-gradient-to-b from-stone-700 to-stone-900', edge: 'border-black', keys: 'dark' },
  // N70: đen phối viền bạc.
  'nokia-n70': { top: 'bg-gradient-to-b from-neutral-800 to-black', keypad: 'bg-gradient-to-b from-neutral-400 to-neutral-600', edge: 'border-black', keys: 'silver' },
  'nokia-n73': { top: 'bg-gradient-to-b from-stone-800 to-stone-950', keypad: 'bg-gradient-to-b from-stone-400 to-stone-600', edge: 'border-stone-950', keys: 'silver' },
  // 6300: mặt trước đen, vỏ thép không gỉ.
  'nokia-6300': { top: 'bg-gradient-to-b from-slate-800 to-slate-950', keypad: 'bg-gradient-to-b from-slate-400 to-slate-600', edge: 'border-slate-950', keys: 'silver' },
  // 6120 Classic: nhựa đen bóng.
  'nokia-6120': { top: 'bg-gradient-to-b from-neutral-900 to-black', keypad: 'bg-gradient-to-b from-neutral-700 to-neutral-900', edge: 'border-black', keys: 'dark' },
  'nokia-n95': { top: 'bg-gradient-to-b from-slate-800 to-slate-950', keypad: 'bg-gradient-to-b from-slate-500 to-slate-700', edge: 'border-slate-950', keys: 'silver' },
  'nokia-2700': { top: 'bg-gradient-to-b from-neutral-800 to-neutral-950', keypad: 'bg-gradient-to-b from-neutral-600 to-neutral-800', edge: 'border-neutral-950', keys: 'dark' },
  // E71: vỏ thép xám, bàn phím QWERTY.
  'nokia-e71': { top: 'bg-gradient-to-b from-zinc-700 to-zinc-900', keypad: 'bg-gradient-to-b from-zinc-500 to-zinc-700', edge: 'border-zinc-950', keys: 'silver' },
  // 5800 XpressMusic: đen phối xanh, máy cảm ứng.
  'nokia-5800': { top: 'bg-gradient-to-b from-slate-900 to-black', keypad: 'bg-gradient-to-b from-slate-700 to-slate-900', edge: 'border-black', keys: 'dark', accent: 'text-sky-300/70' },

  // ── Sony Ericsson ──
  'sony-ericsson-k750i': { top: 'bg-gradient-to-b from-zinc-800 to-zinc-950', keypad: 'bg-gradient-to-b from-zinc-400 to-zinc-600', edge: 'border-zinc-950', keys: 'silver' },
  'sony-ericsson-k510i': { top: 'bg-gradient-to-b from-zinc-700 to-zinc-900', keypad: 'bg-gradient-to-b from-zinc-300 to-zinc-500', edge: 'border-zinc-900', keys: 'silver' },
  // Dòng Walkman: đen phối cam, chữ phím cũng ngả cam.
  'sony-ericsson-w810i': { top: 'bg-gradient-to-b from-neutral-900 to-black', keypad: 'bg-gradient-to-b from-neutral-700 to-neutral-900', edge: 'border-black', keys: 'dark', accent: 'text-orange-300/70' },
  'sony-ericsson-w200i': { top: 'bg-gradient-to-b from-orange-950 to-black', keypad: 'bg-gradient-to-b from-neutral-600 to-neutral-800', edge: 'border-black', keys: 'dark', accent: 'text-orange-300/70' },
  // Dòng Cyber-shot: đen tuyền.
  'sony-ericsson-k800i': { top: 'bg-gradient-to-b from-stone-900 to-black', keypad: 'bg-gradient-to-b from-stone-700 to-stone-900', edge: 'border-black', keys: 'dark' },
  'sony-ericsson-c902': { top: 'bg-gradient-to-b from-neutral-900 to-black', keypad: 'bg-gradient-to-b from-neutral-700 to-neutral-900', edge: 'border-black', keys: 'dark' },

  // ── Samsung ──
  'samsung-e250': { top: 'bg-gradient-to-b from-blue-950 to-slate-950', keypad: 'bg-gradient-to-b from-slate-300 to-slate-500', edge: 'border-slate-950', keys: 'silver' },
  'samsung-d900': { top: 'bg-gradient-to-b from-slate-900 to-black', keypad: 'bg-gradient-to-b from-slate-600 to-slate-800', edge: 'border-black', keys: 'dark' },
  'samsung-e900': { top: 'bg-gradient-to-b from-slate-900 to-black', keypad: 'bg-gradient-to-b from-slate-700 to-slate-900', edge: 'border-black', keys: 'dark' },

  // ── Motorola ──
  // RAZR V3: nhôm anod bạc, phím phẳng cắt laser.
  'motorola-v3': { top: 'bg-gradient-to-b from-neutral-800 to-neutral-950', keypad: 'bg-gradient-to-b from-neutral-400 to-neutral-600', edge: 'border-neutral-950', keys: 'silver' },
  'motorola-l7': { top: 'bg-gradient-to-b from-neutral-900 to-black', keypad: 'bg-gradient-to-b from-neutral-600 to-neutral-800', edge: 'border-black', keys: 'dark' },
  'motorola-e398': { top: 'bg-gradient-to-b from-neutral-800 to-black', keypad: 'bg-gradient-to-b from-neutral-500 to-neutral-700', edge: 'border-black', keys: 'silver' },

  // ── LG ──
  // Chocolate: đen bóng, phím cảm ứng đèn đỏ.
  'lg-kg800': { top: 'bg-gradient-to-b from-stone-950 to-black', keypad: 'bg-gradient-to-b from-stone-800 to-stone-950', edge: 'border-black', keys: 'dark', accent: 'text-red-400/70' },
  'lg-kp500': { top: 'bg-gradient-to-b from-stone-900 to-black', keypad: 'bg-gradient-to-b from-stone-600 to-stone-800', edge: 'border-black', keys: 'dark' },

  // ── Siemens ──
  'siemens-c65': { top: 'bg-gradient-to-b from-stone-800 to-stone-950', keypad: 'bg-gradient-to-b from-stone-400 to-stone-600', edge: 'border-stone-950', keys: 'silver' },
  'siemens-cx65': { top: 'bg-gradient-to-b from-stone-800 to-stone-950', keypad: 'bg-gradient-to-b from-stone-500 to-stone-700', edge: 'border-stone-950', keys: 'silver' },
};

/** Skin của máy: ưu tiên màu riêng của máy, không có thì lấy màu chung của hãng. */
export function chassisSkin(slug?: string | null, keyLayout?: string | null): ChassisSkin {
  return (slug ? BY_MODEL[slug] : undefined)
    ?? BY_VENDOR[keyLayout ?? 'generic']
    ?? GENERIC;
}
