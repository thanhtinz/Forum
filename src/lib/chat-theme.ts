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
  /** Nền phong cảnh — vẽ kín khung, không lặp hoa văn. */
  scenery?: boolean;
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


/**
 * Phong cảnh vẽ bằng SVG, nhúng thẳng vào CSS.
 *
 * Tự vẽ thay vì tải ảnh ngoài: không phụ thuộc mạng, không lo bản quyền,
 * và co giãn theo khung mà không vỡ nét.
 */
function scene(svg: string): React.CSSProperties {
  return {
    backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center bottom',
    backgroundRepeat: 'no-repeat',
  };
}

const W = 1200;
const H = 700;
const frame = (defs: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice"><defs>${defs}</defs>${body}</svg>`;

/** Vài ngôi sao rải rác, vị trí cố định để ảnh nền không nhấp nháy mỗi lần vẽ lại. */
function stars(n: number, seedX = 7919, seedY = 104729): string {
  let out = '';
  for (let i = 1; i <= n; i++) {
    const x = (i * seedX) % W;
    const y = (i * seedY) % 260;
    const r = (i % 3) * 0.5 + 0.6;
    out += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.35 + (i % 4) * 0.15}"/>`;
  }
  return out;
}

const SCENE_MOUNTAIN = frame(
  `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bae6fd"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient>`,
  `<rect width="${W}" height="${H}" fill="url(#s)"/>
   <circle cx="960" cy="150" r="54" fill="#fde68a" opacity="0.9"/>
   <path d="M0 700V430l180-150 150 120 120-90 210 180 180-130 360 250v90z" fill="#94a3b8" opacity="0.55"/>
   <path d="M0 700V500l220-170 190 150 160-110 230 200 400-140v270z" fill="#64748b" opacity="0.75"/>
   <path d="M220 330l70 55-40 20-35-25-30 22-35-27z" fill="#f8fafc"/>
   <path d="M800 370l80 70-46 16-40-28-34 24-40-30z" fill="#f8fafc"/>
   <path d="M0 700V620l180-40 220 30 260-45 260 40 280-30v125z" fill="#334155" opacity="0.65"/>`,
);

const SCENE_BEACH = frame(
  `<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fed7aa"/><stop offset="0.45" stop-color="#fecaca"/><stop offset="1" stop-color="#fef3c7"/></linearGradient>
   <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#0369a1"/></linearGradient>`,
  `<rect width="${W}" height="${H}" fill="url(#b)"/>
   <circle cx="620" cy="330" r="70" fill="#fb923c" opacity="0.95"/>
   <rect y="400" width="${W}" height="200" fill="url(#w)" opacity="0.85"/>
   <path d="M560 400h120l-60 200z" fill="#fdba74" opacity="0.55"/>
   <path d="M0 470q150 18 300 0t300 0 300 0 300 0v20q-150 18-300 0t-300 0-300 0-300 0z" fill="#e0f2fe" opacity="0.5"/>
   <path d="M0 540q150 20 300 0t300 0 300 0 300 0v18q-150 20-300 0t-300 0-300 0-300 0z" fill="#e0f2fe" opacity="0.45"/>
   <path d="M0 600h${W}v100H0z" fill="#fde68a"/>
   <path d="M0 600q200 26 400 0t400 0 400 0v18q-200 26-400 0t-400 0-400 0z" fill="#fffbeb" opacity="0.8"/>`,
);

const SCENE_FOREST = frame(
  `<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d1fae5"/><stop offset="1" stop-color="#ecfdf5"/></linearGradient>`,
  `<rect width="${W}" height="${H}" fill="url(#f)"/>
   <circle cx="240" cy="140" r="46" fill="#fef9c3" opacity="0.9"/>
   <g fill="#065f46" opacity="0.35">
     <path d="M120 640l60-190 60 190z"/><path d="M260 640l70-230 70 230z"/><path d="M430 640l55-175 55 175z"/>
     <path d="M600 640l75-245 75 245z"/><path d="M790 640l60-195 60 195z"/><path d="M950 640l80-250 80 250z"/>
   </g>
   <g fill="#047857" opacity="0.75">
     <path d="M60 700l80-235 80 235z"/><path d="M330 700l95-275 95 275z"/><path d="M700 700l85-250 85 250z"/>
     <path d="M980 700l100-285 100 285z"/>
   </g>
   <rect y="660" width="${W}" height="40" fill="#064e3b" opacity="0.55"/>`,
);

const SCENE_CITY = frame(
  `<linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="0.6" stop-color="#1e293b"/><stop offset="1" stop-color="#334155"/></linearGradient>`,
  `<rect width="${W}" height="${H}" fill="url(#c)"/>
   ${stars(70)}
   <circle cx="1010" cy="120" r="44" fill="#fef3c7" opacity="0.95"/>
   <circle cx="992" cy="110" r="40" fill="#1e293b"/>
   <g fill="#0f172a" opacity="0.9">
     <rect x="40" y="430" width="110" height="270"/><rect x="180" y="360" width="90" height="340"/>
     <rect x="300" y="470" width="130" height="230"/><rect x="460" y="330" width="100" height="370"/>
     <rect x="590" y="440" width="120" height="260"/><rect x="740" y="390" width="95" height="310"/>
     <rect x="865" y="480" width="140" height="220"/><rect x="1035" y="410" width="120" height="290"/>
   </g>
   <g fill="#fde68a" opacity="0.75">
     <rect x="60" y="455" width="14" height="18"/><rect x="96" y="455" width="14" height="18"/><rect x="60" y="500" width="14" height="18"/>
     <rect x="200" y="390" width="14" height="18"/><rect x="236" y="390" width="14" height="18"/><rect x="200" y="440" width="14" height="18"/>
     <rect x="330" y="500" width="14" height="18"/><rect x="380" y="500" width="14" height="18"/>
     <rect x="480" y="360" width="14" height="18"/><rect x="516" y="360" width="14" height="18"/><rect x="480" y="410" width="14" height="18"/>
     <rect x="620" y="470" width="14" height="18"/><rect x="670" y="470" width="14" height="18"/>
     <rect x="760" y="420" width="14" height="18"/><rect x="796" y="420" width="14" height="18"/>
     <rect x="900" y="510" width="14" height="18"/><rect x="950" y="510" width="14" height="18"/>
     <rect x="1060" y="440" width="14" height="18"/><rect x="1100" y="440" width="14" height="18"/>
   </g>`,
);

const SCENE_SAKURA = frame(
  `<linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fce7f3"/><stop offset="1" stop-color="#fff1f2"/></linearGradient>`,
  `<rect width="${W}" height="${H}" fill="url(#k)"/>
   <path d="M0 700V640q140-30 250 10t260-20 250 30 300-40 140 20v60z" fill="#a3e635" opacity="0.35"/>
   <g stroke="#7c2d12" stroke-width="14" stroke-linecap="round" fill="none" opacity="0.65">
     <path d="M-20 700q120-180 300-230"/><path d="M120 600q60-90 170-130"/>
     <path d="M1220 700q-130-190-320-240"/><path d="M1080 590q-70-90-180-130"/>
   </g>
   <g fill="#fb7185" opacity="0.85">
     <circle cx="230" cy="430" r="34"/><circle cx="290" cy="400" r="28"/><circle cx="180" cy="395" r="26"/>
     <circle cx="255" cy="365" r="24"/><circle cx="330" cy="440" r="22"/>
     <circle cx="900" cy="410" r="34"/><circle cx="960" cy="382" r="28"/><circle cx="852" cy="378" r="26"/>
     <circle cx="925" cy="346" r="24"/><circle cx="1000" cy="425" r="22"/>
   </g>
   <g fill="#fda4af" opacity="0.9">
     <circle cx="480" cy="180" r="6"/><circle cx="560" cy="260" r="5"/><circle cx="640" cy="140" r="5"/>
     <circle cx="700" cy="300" r="6"/><circle cx="420" cy="330" r="5"/><circle cx="760" cy="200" r="5"/>
     <circle cx="540" cy="450" r="5"/><circle cx="660" cy="500" r="6"/>
   </g>`,
);

const SCENE_STARRY = frame(
  `<linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="0.55" stop-color="#312e81"/><stop offset="1" stop-color="#4c1d95"/></linearGradient>`,
  `<rect width="${W}" height="${H}" fill="url(#n)"/>
   ${stars(90, 6301, 65537)}
   <circle cx="200" cy="140" r="52" fill="#fef9c3" opacity="0.92"/>
   <circle cx="178" cy="128" r="46" fill="#312e81"/>
   <path d="M0 700V560q160-70 300-20t300-40 300 30 300-60v230z" fill="#1e1b4b" opacity="0.85"/>
   <path d="M0 700V630q180-50 320-10t300-30 280 30 300-40v120z" fill="#0f0a2e" opacity="0.9"/>`,
);

export const CHAT_THEMES: ChatTheme[] = [
  { value: 'default', label: 'Mặc định', className: 'bg-ink-50/60 dark:bg-ink-950/40', swatch: '#f1f5f9' },
  { value: 'sky', label: 'Trời xanh', className: 'bg-gradient-to-b from-sky-100 to-sky-50 dark:from-sky-950/40 dark:to-ink-950', swatch: '#7dd3fc' },
  { value: 'sunset', label: 'Hoàng hôn', className: 'bg-gradient-to-b from-orange-100 via-rose-100 to-amber-50 dark:from-orange-950/40 dark:via-rose-950/30 dark:to-ink-950', swatch: '#fb923c' },
  { value: 'mint', label: 'Bạc hà', className: 'bg-gradient-to-b from-emerald-100 to-teal-50 dark:from-emerald-950/40 dark:to-ink-950', swatch: '#34d399' },
  { value: 'lavender', label: 'Oải hương', className: 'bg-gradient-to-b from-violet-100 to-fuchsia-50 dark:from-violet-950/40 dark:to-ink-950', swatch: '#a78bfa' },
  { value: 'night', label: 'Đêm', className: 'bg-gradient-to-b from-slate-800 to-slate-900 text-white', swatch: '#334155' },
  { value: 'dots', label: 'Chấm bi', className: 'bg-ink-50 dark:bg-ink-950', style: dots('#94a3b8'), swatch: '#cbd5e1' },
  { value: 'hearts', label: 'Trái tim', className: 'bg-rose-50 dark:bg-rose-950/30', style: hearts('#fb7185', 0.45), swatch: '#fb7185' },

  // ── Phong cảnh ──
  { value: 'mountain', label: 'Núi tuyết', className: 'bg-sky-100', style: scene(SCENE_MOUNTAIN), swatch: '#7dd3fc', scenery: true },
  { value: 'beach', label: 'Biển chiều', className: 'bg-amber-100', style: scene(SCENE_BEACH), swatch: '#fb923c', scenery: true },
  { value: 'forest', label: 'Rừng thông', className: 'bg-emerald-50', style: scene(SCENE_FOREST), swatch: '#10b981', scenery: true },
  { value: 'city', label: 'Phố đêm', className: 'bg-slate-900', style: scene(SCENE_CITY), swatch: '#1e293b', scenery: true, dark: true },
  { value: 'sakura', label: 'Hoa anh đào', className: 'bg-pink-50', style: scene(SCENE_SAKURA), swatch: '#f9a8d4', scenery: true },
  { value: 'starry', label: 'Trời sao', className: 'bg-indigo-950', style: scene(SCENE_STARRY), swatch: '#4c1d95', scenery: true, dark: true },
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
  /** Kiểu tai chibi gắn trên bong bóng. */
  ears?: 'cat' | 'bear' | 'bunny';
  /** Màu tai — phải khớp nền bong bóng thì tai mới liền khối. */
  earMine?: string;
  earTheirs?: string;
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
  // ── Chibi: bong bóng bo tròn kèm đôi tai nhỏ ──
  {
    value: 'chibi-cat', label: 'Mèo chibi',
    mine: 'bg-amber-400 text-amber-950',
    theirs: 'border border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100',
    radius: 'rounded-[1.6rem]', mineMuted: 'text-amber-800/70', swatch: '#fbbf24',
    ears: 'cat', earMine: '#fbbf24', earTheirs: '#fef3c7',
  },
  {
    value: 'chibi-bear', label: 'Gấu chibi',
    mine: 'bg-orange-300 text-orange-950',
    theirs: 'border border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-100',
    radius: 'rounded-[1.6rem]', mineMuted: 'text-orange-900/70', swatch: '#fdba74',
    ears: 'bear', earMine: '#fdba74', earTheirs: '#ffedd5',
  },
  {
    value: 'chibi-bunny', label: 'Thỏ chibi',
    mine: 'bg-pink-300 text-pink-950',
    theirs: 'border border-pink-200 bg-pink-50 text-pink-950 dark:border-pink-900 dark:bg-pink-950/50 dark:text-pink-100',
    radius: 'rounded-[1.6rem]', mineMuted: 'text-pink-900/70', swatch: '#f9a8d4',
    ears: 'bunny', earMine: '#f9a8d4', earTheirs: '#fce7f3',
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
