/**
 * BBCode → HTML an toàn.
 *
 * Quy tắc: escape TOÀN BỘ nội dung trước, rồi mới dựng thẻ HTML từ các mã
 * BBCode đã nhận diện. Nhờ vậy người dùng không thể chèn HTML thô, kể cả khi
 * gõ thẳng `<script>`.
 */

import { MENTION_PATTERN } from './mention';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Chỉ nhận liên kết http(s) hoặc đường dẫn nội bộ — chặn javascript:/data:. */
function safeUrl(raw: string): string | null {
  const u = raw.trim().replace(/^&quot;|&quot;$/g, '');
  if (!u) return null;
  if (u.startsWith('/')) return u;
  try {
    const p = new URL(u);
    return p.protocol === 'http:' || p.protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
}

/** Mã màu hợp lệ: #abc, #aabbcc hoặc tên màu chữ cái. */
function safeColor(raw: string): string | null {
  const c = raw.trim().toLowerCase();
  return /^#[0-9a-f]{3,8}$/.test(c) || /^[a-z]{3,20}$/.test(c) ? c : null;
}

export interface BBCodeTag {
  code: string;
  label: string;
  /** Cách chèn: bọc vùng chọn, hoặc chèn có tham số. */
  sample?: string;
}

/** Danh sách mã hỗ trợ — dùng cho cả trợ giúp lẫn thanh công cụ. */
export const BBCODE_TAGS: BBCodeTag[] = [
  { code: 'b', label: 'Đậm' },
  { code: 'i', label: 'Nghiêng' },
  { code: 'u', label: 'Gạch chân' },
  { code: 's', label: 'Gạch ngang' },
  { code: 'quote', label: 'Trích dẫn' },
  { code: 'code', label: 'Mã nguồn' },
  { code: 'spoiler', label: 'Ẩn nội dung' },
  { code: 'hide', label: 'Ẩn tới khi trả lời' },
  { code: 'list', label: 'Danh sách' },
  { code: 'url', label: 'Liên kết', sample: '[url=https://…]chữ hiển thị[/url]' },
  { code: 'img', label: 'Ảnh', sample: '[img]https://…[/img]' },
  { code: 'color', label: 'Màu chữ', sample: '[color=#e5484d]chữ[/color]' },
  { code: 'center', label: 'Căn giữa' },
];

/**
 * Mốc bọc khối `[hide]` trong HTML đã dựng.
 *
 * Dùng chú thích HTML chứ không phải một thẻ thật, vì phần nội dung ẩn phải
 * CẮT ĐƯỢC ở máy chủ trước khi gửi đi. Nếu bọc bằng `<div>` thì lúc cắt phải
 * dò cho đúng thẻ đóng của nó giữa một mớ `<div>` lồng nhau (`[center]` cũng
 * sinh ra `<div>`), sai một nhịp là lộ nguyên phần đáng lẽ giấu. Chú thích thì
 * không lồng vào nhau được và người dùng cũng không gõ ra nổi: mọi ký tự `<`
 * trong bài đã bị escape từ bước đầu.
 */
export const HIDE_OPEN = '<!--hide-->';
export const HIDE_CLOSE = '<!--/hide-->';

/** Cả khối ẩn, kể cả hai mốc. */
const HIDE_BLOCK = /<!--hide-->[\s\S]*?<!--\/hide-->/g;

/** Bài có phần nội dung ẩn không? */
export function hasHidden(html: string): boolean {
  return html.includes(HIDE_OPEN);
}

/**
 * Bỏ hẳn phần ẩn khỏi HTML — dùng cho mô tả trang, kết quả tìm kiếm, trích
 * ngắn: những chỗ nội dung đi ra ngoài mà không kèm nút mở khoá nào.
 */
export function stripHidden(html: string): string {
  return html.replace(HIDE_BLOCK, '');
}

/**
 * Dựng phần ẩn để hiển thị.
 *
 * `unlocked` là đã đủ điều kiện xem (đã trả lời chủ đề, hoặc là chủ chủ đề /
 * ban điều hành). Chưa đủ thì phần nội dung bị THAY, không phải bị che bằng
 * CSS — có che thì bấm "xem nguồn trang" là đọc được hết.
 *
 * Chỗ thay dùng `<span>` chứ không dùng `<div>`: khối ẩn hay nằm giữa một
 * đoạn văn (`<p>Link tải: …</p>`), mà `<div>` nằm trong `<p>` là HTML sai.
 */
export function renderHidden(html: string, unlocked: boolean): string {
  if (!hasHidden(html)) return html;
  if (unlocked) {
    return html
      .replaceAll(HIDE_OPEN, '<span class="bb-hide-open"><b>Nội dung ẩn</b>')
      .replaceAll(HIDE_CLOSE, '</span>');
  }
  return html.replace(
    HIDE_BLOCK,
    '<span class="bb-hide">Nội dung này bị ẩn — hãy trả lời chủ đề để xem.</span>',
  );
}

/**
 * Chuyển BBCode thành HTML. `[code]` được xử lý trước và giữ nguyên nội dung
 * bên trong (không diễn giải BBCode lồng bên trong).
 */
/** Ký hiệu tạm thay cho khối [code] trong lúc xử lý (ký tự điều khiển hiếm gặp). */
const CODE_MARKER = /\u241ECODE(\d+)\u241E/g;
const CODE_MARKER_ONLY = /^\u241ECODE\d+\u241E$/;

export function bbcodeToHtml(input: string): string {
  if (!input) return '';

  // 1) Escape trước — từ đây trở đi chuỗi không còn HTML thô
  let s = escapeHtml(input.replace(/\r\n?/g, '\n'));

  // 2) Tách [code]…[/code] ra giữ nguyên, tránh bị các bước sau đụng vào
  const codeBlocks: string[] = [];
  s = s.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, (_m, body: string) => {
    codeBlocks.push(body.replace(/^\n+|\n+$/g, ''));
    return `\n\n\u241ECODE${codeBlocks.length - 1}\u241E\n\n`;
  });

  // 2b) Nhắc tên @thanh_vien → liên kết trang cá nhân. Làm trước các thẻ khác
  // nhưng sau khi tách [code], để tên trong khối mã không bị đổi. Tên chỉ gồm
  // chữ, số và gạch dưới nên ghép thẳng vào href là an toàn.
  s = s.replace(new RegExp(MENTION_PATTERN, 'g'), (_m, name: string) =>
    `<a href="/u/${name}" class="mention">@${name}</a>`);

  // 3) Các thẻ đơn giản (lặp để hỗ trợ lồng nhau)
  const simple: [RegExp, string][] = [
    [/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>'],
    [/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>'],
    [/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>'],
    [/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>'],
    [/\[center\]([\s\S]*?)\[\/center\]/gi, '<div style="text-align:center">$1</div>'],
    [/\[quote\]([\s\S]*?)\[\/quote\]/gi, '<blockquote>$1</blockquote>'],
    [/\[quote=([^\]]{1,60})\]([\s\S]*?)\[\/quote\]/gi, '<blockquote><cite>$1</cite>$2</blockquote>'],
    [/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, '<details><summary>Nội dung ẩn</summary>$1</details>'],
    // [hide] chỉ đánh mốc ở đây; cắt hay mở là việc của `renderHidden`, vì lúc
    // dựng HTML (khi đăng bài) chưa biết ai sẽ đọc.
    [/\[hide\]([\s\S]*?)\[\/hide\]/gi, `${HIDE_OPEN}$1${HIDE_CLOSE}`],
  ];
  for (let pass = 0; pass < 4; pass++) {
    for (const [re, rep] of simple) s = s.replace(re, rep);
  }

  // 4) Thẻ có tham số cần kiểm tra giá trị
  s = s.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, (m, href: string, text: string) => {
    const u = safeUrl(href);
    return u ? `<a href="${u}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>` : m;
  });
  s = s.replace(/\[url\]([^\[]+)\[\/url\]/gi, (m, href: string) => {
    const u = safeUrl(href);
    return u ? `<a href="${u}" target="_blank" rel="noopener noreferrer nofollow">${u}</a>` : m;
  });
  s = s.replace(/\[img\]([^\[]+)\[\/img\]/gi, (m, src: string) => {
    const u = safeUrl(src);
    return u ? `<img src="${u}" alt="" loading="lazy" />` : m;
  });
  s = s.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, (m, c: string, text: string) => {
    const col = safeColor(c);
    return col ? `<span style="color:${col}">${text}</span>` : m;
  });

  // 5) Danh sách
  s = s.replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (_m, body: string) => {
    const items = body
      .split(/\[\*\]/)
      .map((x: string) => x.trim())
      .filter(Boolean)
      .map((x: string) => `<li>${x}</li>`)
      .join('');
    return `<ul>${items}</ul>`;
  });

  // 6) Xuống dòng → đoạn văn (bỏ qua chỗ đã là khối)
  s = s
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) =>
      /^<(blockquote|ul|div|details)/.test(block) || CODE_MARKER_ONLY.test(block)
        ? block
        : `<p>${block.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  // 7) Trả lại các khối mã
  s = s.replace(CODE_MARKER, (_m, i: string) => `<pre><code>${codeBlocks[Number(i)]}</code></pre>`);

  return s;
}

/** Rút gọn BBCode thành văn bản thuần (dùng cho mô tả, trích dẫn ngắn). */
export function bbcodeToText(input: string): string {
  return input
    // Phần ẩn bỏ luôn cả ruột: văn bản thuần đi vào mô tả trang, thẻ meta,
    // kết quả tìm kiếm — toàn những chỗ không ai phải trả lời mới đọc được.
    .replace(/\[hide\][\s\S]*?\[\/hide\]/gi, ' ')
    .replace(/\[\/?[a-z*]+(=[^\]]*)?\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
