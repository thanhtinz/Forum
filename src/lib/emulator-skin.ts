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

/**
 * Họ bố cục mặt phím — **bốn** kiểu, mỗi kiểu một máy đại diện trong thư viện:
 * - `s40`    vòng xoay tròn, nút OK ở tâm (Nokia 6300).
 * - `s60`    phím bốn hướng vuông, bốn cánh tách theo góc phần tư (Nokia N70).
 * - `rocker` phím bập bênh nằm ngang: hai thanh trên–dưới, hai cánh trái–phải
 *            kẹp nút OK (Nokia 7210).
 * - `razr`   vòng xoay tròn nhưng bàn phím số phẳng khắc laser, chỉ ngăn nhau
 *            bằng đường gân (Motorola RAZR V3).
 *
 * Các họ `se` · `qwerty` · `touch` · `touch-only` đã bỏ: sau khi mặt phím rút
 * còn mũi tên · phím số · Options · Back thì chúng dựng ra đúng cùng một thứ
 * với `s40`, chỉ khác màu vỏ.
 */
export type FaceLayout = 's40' | 'rocker' | 's60' | 'razr';

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
  // Thư viện giữ đúng một máy cho mỗi bố cục mặt phím, nên bảng màu vỏ cũng chỉ
  // còn đúng bấy nhiêu. Máy nào không có ở đây thì rơi về màu chung của hãng.

  // 7210: bản màu nổi bật nhất là xanh dương.
  'nokia-7210': { top: 'bg-gradient-to-b from-blue-800 to-blue-950', keypad: 'bg-gradient-to-b from-slate-300 to-slate-500', edge: 'border-blue-950', keys: 'silver' },
  // N70: đen phối viền bạc.
  'nokia-n70': { top: 'bg-gradient-to-b from-neutral-800 to-black', keypad: 'bg-gradient-to-b from-neutral-400 to-neutral-600', edge: 'border-black', keys: 'silver' },
  // 6300: mặt trước đen, vỏ thép không gỉ.
  'nokia-6300': { top: 'bg-gradient-to-b from-slate-800 to-slate-950', keypad: 'bg-gradient-to-b from-slate-400 to-slate-600', edge: 'border-slate-950', keys: 'silver' },
  // RAZR V3: nhôm anod bạc, phím phẳng cắt laser.
  'motorola-v3': { top: 'bg-gradient-to-b from-neutral-800 to-neutral-950', keypad: 'bg-gradient-to-b from-neutral-400 to-neutral-600', edge: 'border-neutral-950', keys: 'silver' },
};

/** Bố cục mặt phím theo hãng, dùng khi máy chưa khai báo riêng. */
const FACE_BY_VENDOR: Record<string, FaceLayout> = {
  nokia: 's40',
  sonyericsson: 's40',
  samsung: 'rocker',
  motorola: 'razr',
  lg: 's40',
  siemens: 'rocker',
  generic: 's40',
};

/** Bố cục mặt phím theo từng máy. */
const FACE_BY_MODEL: Record<string, FaceLayout> = {
  // 7210 là máy đời đầu, còn dùng phím bập bênh chứ chưa có vòng xoay.
  'nokia-7210': 'rocker',
  // N70 thuộc dòng S60, dùng phím bốn hướng vuông.
  'nokia-n70': 's60',
};

/** Bố cục mặt phím của máy. */
export function faceLayout(slug?: string | null, keyLayout?: string | null): FaceLayout {
  return (slug ? FACE_BY_MODEL[slug] : undefined)
    ?? FACE_BY_VENDOR[keyLayout ?? 'generic']
    ?? 's40';
}

/** Skin của máy: ưu tiên màu riêng của máy, không có thì lấy màu chung của hãng. */
export function chassisSkin(slug?: string | null, keyLayout?: string | null): ChassisSkin {
  return (slug ? BY_MODEL[slug] : undefined)
    ?? BY_VENDOR[keyLayout ?? 'generic']
    ?? GENERIC;
}
