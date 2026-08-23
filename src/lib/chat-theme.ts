/**
 * Ảnh nền và kiểu bong bóng cho khung chat.
 *
 * Tất cả đều dựng bằng CSS (gradient / hoa văn SVG inline) nên không tải
 * ảnh ngoài, không phụ thuộc mạng và tự hợp với chế độ tối.
 */

export interface ChatTheme {
  value: string;
  label: string;
  /** Lớp nền cho khung tin nhắn. */
  className: string;
  /** Style bổ sung khi cần hoa văn. */
  style?: React.CSSProperties;
  /** Màu chấm xem trước trong bảng chọn. */
  swatch: string;
  /** Nền tối: vạch chia ngày và chữ phụ phải sáng lên mới đọc được. */
  dark?: boolean;
}

/** Hoa văn lặp dựng bằng SVG inline — nhẹ hơn ảnh và đổi màu được. */
function dots(color: string, opacity = 0.35): React.CSSProperties {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="3" cy="3" r="1.6" fill="${color}" opacity="${opacity}"/></svg>`;
  return { backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")` };
}

function hearts(color: string, opacity = 0.5): React.CSSProperties {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path d="M20 27s-7-4.6-7-9a3.6 3.6 0 0 1 7-1.6A3.6 3.6 0 0 1 27 18c0 4.4-7 9-7 9z" fill="${color}" opacity="${opacity}"/></svg>`;
  return { backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")` };
}


export const CHAT_THEMES: ChatTheme[] = [
  { value: 'default', label: 'Mặc định', className: 'bg-ink-50/60 dark:bg-ink-950/40', swatch: '#f1f5f9' },
  { value: 'sky', label: 'Trời xanh', className: 'bg-gradient-to-b from-sky-100 to-sky-50 dark:from-sky-950/40 dark:to-ink-950', swatch: '#7dd3fc' },
  { value: 'sunset', label: 'Hoàng hôn', className: 'bg-gradient-to-b from-orange-100 via-rose-100 to-amber-50 dark:from-orange-950/40 dark:via-rose-950/30 dark:to-ink-950', swatch: '#fb923c' },
  { value: 'mint', label: 'Bạc hà', className: 'bg-gradient-to-b from-emerald-100 to-teal-50 dark:from-emerald-950/40 dark:to-ink-950', swatch: '#34d399' },
  { value: 'lavender', label: 'Oải hương', className: 'bg-gradient-to-b from-violet-100 to-fuchsia-50 dark:from-violet-950/40 dark:to-ink-950', swatch: '#a78bfa' },
  { value: 'night', label: 'Đêm', className: 'bg-gradient-to-b from-slate-800 to-slate-900 text-white', swatch: '#334155', dark: true },
  { value: 'dots', label: 'Chấm bi', className: 'bg-ink-50 dark:bg-ink-950', style: dots('#94a3b8'), swatch: '#cbd5e1' },
  { value: 'hearts', label: 'Trái tim', className: 'bg-rose-50 dark:bg-rose-950/30', style: hearts('#fb7185', 0.45), swatch: '#fb7185' },

];

export interface ChatBubble {
  value: string;
  label: string;
  /** Lớp cho bong bóng của mình. */
  mine: string;
  /** Lớp cho bong bóng người kia. */
  theirs: string;
  /** Độ bo góc chung. */
  radius: string;
  /** Màu chữ phụ (giờ, dấu đã xem) trên bong bóng của mình. */
  mineMuted: string;
  swatch: string;
}

export const CHAT_BUBBLES: ChatBubble[] = [
  {
    value: 'default', label: 'Mặc định',
    mine: 'bg-brand-500 text-white',
    theirs: 'border border-ink-200 bg-white text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100',
    radius: 'rounded-2xl', mineMuted: 'text-white/70', swatch: '#3b82f6',
  },
  {
    value: 'rose', label: 'Hồng đào',
    mine: 'bg-rose-500 text-white',
    theirs: 'border border-rose-200 bg-white text-ink-800 dark:border-rose-900 dark:bg-ink-900 dark:text-ink-100',
    radius: 'rounded-2xl', mineMuted: 'text-white/70', swatch: '#f43f5e',
  },
  {
    value: 'emerald', label: 'Ngọc lục',
    mine: 'bg-emerald-600 text-white',
    theirs: 'border border-emerald-200 bg-white text-ink-800 dark:border-emerald-900 dark:bg-ink-900 dark:text-ink-100',
    radius: 'rounded-2xl', mineMuted: 'text-white/70', swatch: '#059669',
  },
  {
    value: 'gradient', label: 'Chuyển sắc',
    mine: 'bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white',
    theirs: 'border border-ink-200 bg-white text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100',
    radius: 'rounded-2xl', mineMuted: 'text-white/75', swatch: '#c026d3',
  },
  {
    value: 'square', label: 'Góc vuông',
    mine: 'bg-ink-800 text-white dark:bg-ink-700',
    theirs: 'border border-ink-200 bg-white text-ink-800 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100',
    radius: 'rounded-md', mineMuted: 'text-white/70', swatch: '#1f2937',
  },
  {
    value: 'outline', label: 'Viền mỏng',
    mine: 'border border-brand-400 bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-100',
    theirs: 'border border-ink-200 bg-transparent text-ink-800 dark:border-ink-700 dark:text-ink-100',
    radius: 'rounded-2xl', mineMuted: 'text-brand-500/80', swatch: '#93c5fd',
  },
];

export function getTheme(value?: string | null): ChatTheme {
  return CHAT_THEMES.find((t) => t.value === value) ?? CHAT_THEMES[0];
}

export function getBubble(value?: string | null): ChatBubble {
  return CHAT_BUBBLES.find((b) => b.value === value) ?? CHAT_BUBBLES[0];
}

/** Cảm xúc thả lên tin nhắn — bấm đúp là thả tim, giữ để chọn cái khác. */
export const MESSAGE_REACTIONS = ['❤️', '😆', '😮', '😢', '😡', '👍'] as const;

/** Mốc tự xoá tin. 0 nghĩa là tắt. */
export const AUTO_DELETE_OPTIONS = [
  { hours: 0, label: 'Không tự xoá' },
  { hours: 1, label: 'Sau 1 giờ' },
  { hours: 24, label: 'Sau 24 giờ' },
  { hours: 24 * 7, label: 'Sau 7 ngày' },
  { hours: 24 * 30, label: 'Sau 30 ngày' },
] as const;

export const NICKNAME_MAX = 30;

// ─────────────── Nền & bong bóng do admin tải lên ───────────────

/** Ảnh nền admin tải lên; id dùng luôn làm giá trị lưu trong Conversation.theme. */
export interface CustomBackground {
  id: string; name: string; image: string; dark: boolean;
}

/** Bong bóng admin tải lên: màu nền + ảnh trang trí gắn phía trên (chibi…). */
export interface CustomBubble {
  id: string; name: string; decor: string | null;
  colorMine: string; colorTheirs: string; darkText: boolean;
}

/** Nền đã giải xong, dùng thẳng khi vẽ khung chat. */
export interface ResolvedTheme {
  className: string;
  style?: React.CSSProperties;
  dark: boolean;
}

/** Bong bóng đã giải xong. */
export interface ResolvedBubble {
  mine: string; theirs: string; radius: string; mineMuted: string;
  styleMine?: React.CSSProperties;
  styleTheirs?: React.CSSProperties;
  decor?: string | null;
}

/**
 * Giá trị lưu trong Conversation là slug của mẫu có sẵn HOẶC id bản ghi do
 * admin tải lên — tra mẫu có sẵn trước, không thấy mới tìm trong danh sách tải lên.
 */
export function resolveTheme(value: string | null | undefined, uploaded: CustomBackground[]): ResolvedTheme {
  const custom = uploaded.find((b) => b.id === value);
  if (custom) {
    return {
      className: 'bg-ink-100 dark:bg-ink-900',
      style: {
        backgroundImage: `url("${custom.image}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      },
      dark: custom.dark,
    };
  }
  const builtin = getTheme(value);
  return { className: builtin.className, style: builtin.style, dark: !!builtin.dark };
}

export function resolveBubble(value: string | null | undefined, uploaded: CustomBubble[]): ResolvedBubble {
  const custom = uploaded.find((b) => b.id === value);
  if (custom) {
    const text = custom.darkText ? 'text-ink-900' : 'text-white';
    const muted = custom.darkText ? 'text-ink-900/60' : 'text-white/70';
    return {
      mine: text, theirs: text, radius: 'rounded-2xl', mineMuted: muted,
      styleMine: { backgroundColor: custom.colorMine },
      styleTheirs: { backgroundColor: custom.colorTheirs },
      decor: custom.decor,
    };
  }
  const b = getBubble(value);
  return { mine: b.mine, theirs: b.theirs, radius: b.radius, mineMuted: b.mineMuted };
}
