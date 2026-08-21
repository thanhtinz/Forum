/**
 * Bản đồ phím Java ME dùng chung cho server và client.
 *
 * Runtime J2ME nhận key code chuẩn MIDP (`Canvas.KEY_NUM0`…, mã âm cho phím
 * mềm / D-pad theo quy ước Nokia). Frontend chỉ dịch input của người dùng
 * (bàn phím PC, chạm, gamepad) sang các mã này rồi gửi cho runtime.
 */

/** Mã phím Java ME (MIDP `Canvas`). Mã âm là mã riêng của nhà sản xuất. */
export const JAVA_KEY: Record<string, number> = {
  NUM0: 48, NUM1: 49, NUM2: 50, NUM3: 51, NUM4: 52,
  NUM5: 53, NUM6: 54, NUM7: 55, NUM8: 56, NUM9: 57,
  STAR: 42, POUND: 35,
  UP: -1, DOWN: -2, LEFT: -3, RIGHT: -4, FIRE: -5,
  SOFT_LEFT: -6, SOFT_RIGHT: -7, CLEAR: -8,
  SEND: -10, END: -11,
};

/** Tên phím ảo mà UI hiển thị / người dùng gán lại được. */
export type EmuKey = keyof typeof JAVA_KEY;

export const EMU_KEYS = Object.keys(JAVA_KEY) as EmuKey[];

export const EMU_KEY_LABEL: Record<EmuKey, string> = {
  NUM0: '0', NUM1: '1', NUM2: '2', NUM3: '3', NUM4: '4',
  NUM5: '5', NUM6: '6', NUM7: '7', NUM8: '8', NUM9: '9',
  STAR: '*', POUND: '#',
  UP: 'Lên', DOWN: 'Xuống', LEFT: 'Trái', RIGHT: 'Phải', FIRE: 'OK / Bắn',
  SOFT_LEFT: 'Phím mềm trái', SOFT_RIGHT: 'Phím mềm phải', CLEAR: 'Xoá',
  SEND: 'Gọi', END: 'Kết thúc',
};

/** Ánh xạ mặc định: `KeyboardEvent.code` của PC → phím Java. */
export const DEFAULT_KEYMAP: Record<string, EmuKey> = {
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
  Enter: 'FIRE', Space: 'FIRE',
  KeyW: 'UP', KeyS: 'DOWN', KeyA: 'LEFT', KeyD: 'RIGHT',
  KeyQ: 'SOFT_LEFT', KeyE: 'SOFT_RIGHT',
  Backspace: 'CLEAR',
  Digit0: 'NUM0', Digit1: 'NUM1', Digit2: 'NUM2', Digit3: 'NUM3', Digit4: 'NUM4',
  Digit5: 'NUM5', Digit6: 'NUM6', Digit7: 'NUM7', Digit8: 'NUM8', Digit9: 'NUM9',
  Numpad0: 'NUM0', Numpad1: 'NUM1', Numpad2: 'NUM2', Numpad3: 'NUM3', Numpad4: 'NUM4',
  Numpad5: 'NUM5', Numpad6: 'NUM6', Numpad7: 'NUM7', Numpad8: 'NUM8', Numpad9: 'NUM9',
  NumpadMultiply: 'STAR', BracketLeft: 'STAR', BracketRight: 'POUND',
};

/** Ánh xạ nút gamepad (chỉ số theo Gamepad API standard layout) → phím Java. */
export const DEFAULT_GAMEPAD_MAP: Record<number, EmuKey> = {
  0: 'FIRE',       // A
  1: 'CLEAR',      // B
  2: 'STAR',       // X
  3: 'POUND',      // Y
  8: 'SOFT_RIGHT', // Select
  9: 'SOFT_LEFT',  // Start
  12: 'UP', 13: 'DOWN', 14: 'LEFT', 15: 'RIGHT',
};

/** Thứ tự phím số trên bàn phím ảo 3×4. */
export const NUMPAD_ROWS: EmuKey[][] = [
  ['NUM1', 'NUM2', 'NUM3'],
  ['NUM4', 'NUM5', 'NUM6'],
  ['NUM7', 'NUM8', 'NUM9'],
  ['STAR', 'NUM0', 'POUND'],
];

/** Nhãn phím mềm theo layout thiết bị. */
export const SOFT_KEY_LABEL: Record<string, { left: string; right: string }> = {
  nokia: { left: 'Options', right: 'Back' },
  sonyericsson: { left: 'Select', right: 'Back' },
  samsung: { left: 'OK', right: 'Back' },
  motorola: { left: 'Menu', right: 'Back' },
  lg: { left: 'OK', right: 'Back' },
  siemens: { left: 'Menu', right: 'Clear' },
  generic: { left: 'Left', right: 'Right' },
};

/** Các bố cục phím được hỗ trợ — dùng cho ô chọn trong khu quản trị. */
export const KEY_LAYOUTS = Object.keys(SOFT_KEY_LABEL);

export function javaKeyCode(key: EmuKey): number {
  return JAVA_KEY[key] ?? 0;
}

/** Gộp keymap tuỳ biến của người dùng lên trên keymap mặc định của profile. */
export function mergeKeymap(
  base: Record<string, string> | null | undefined,
  user: Record<string, string> | null | undefined,
): Record<string, EmuKey> {
  const out: Record<string, EmuKey> = { ...DEFAULT_KEYMAP };
  for (const src of [base, user]) {
    if (!src) continue;
    for (const [code, key] of Object.entries(src)) {
      if (key in JAVA_KEY) out[code] = key as EmuKey;
    }
  }
  return out;
}

/** Kiểm tra một object có phải keymap hợp lệ không (dùng khi lưu từ client). */
export function isValidKeymap(v: unknown): v is Record<string, EmuKey> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  return Object.entries(v as Record<string, unknown>).every(
    ([code, key]) => typeof code === 'string' && code.length <= 32 && typeof key === 'string' && key in JAVA_KEY,
  );
}
