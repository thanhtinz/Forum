/**
 * BBCode → HTML an toàn.
 *
 * Quy tắc: escape TOÀN BỘ nội dung trước, rồi mới dựng thẻ HTML từ các mã
 * BBCode đã nhận diện. Nhờ vậy người dùng không thể chèn HTML thô, kể cả khi
 * gõ thẳng `<script>`.
 */

import { MENTION_PATTERN } from './mention';
import {
  canOpenHide, decodeHideRule, describeHideRule, encodeHideRule, parseHideParam,
  type HideRule, type HideViewer,
} from './hide';
import { plainText, truncate } from './utils';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Chỉ nhận liên kết http(s) hoặc đường dẫn nội bộ — chặn javascript:/data:. */
function safeUrl(raw: string): string | null {
  const u = raw.trim().replace(/^&quot;|&quot;$/g, '');
  if (!u) return null;
  // `//evil.com/x` cũng bắt đầu bằng dấu gạch nhưng là địa chỉ NGOÀI theo
  // giao thức hiện tại — để lọt thì cả phần chặn bên dưới thành vô nghĩa.
  if (u.startsWith('/') && !u.startsWith('//')) return u;
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
  { code: 'hide', label: 'Ẩn theo điều kiện', sample: '[hide=diem:50]nội dung ẩn[/hide]' },
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

/**
 * Mốc mở, kèm điều kiện: `<!--hide-->` (trả lời — dạng cũ, vẫn còn trong CSDL)
 * hoặc `<!--hide:points:50-->`. Điều kiện chỉ do `encodeHideRule` sinh ra nên
 * dạng chuỗi luôn nằm trong tầm kiểm soát; người dùng không gõ ra được vì mọi
 * ký tự `<` trong bài đã bị escape từ bước đầu.
 *
 * Dựng mới mỗi lần gọi, KHÔNG dùng chung một biến ở đầu tệp: biểu thức có cờ
 * `g` thì `test()` và `matchAll()` đọc và ghi `lastIndex` của chính nó. Dùng
 * chung một biến ở tầng mô-đun nghĩa là dùng chung con trỏ ấy giữa mọi lượt
 * dựng trang — `hasHidden` chạy trước để lại con trỏ sau mốc thứ nhất, lượt sau
 * `hideRules` bắt đầu dò từ đó nên KHÔNG thấy mốc nào, coi như bài không có
 * khối ẩn: điều kiện mở tính sai, nút mở khoá biến mất. Đã dính đúng lỗi này.
 */
const hideOpenRe = () => /<!--hide(?::([a-z]+(?::\d+)?))?-->/g;

/** Cả khối ẩn, kể cả hai mốc. */
const HIDE_BLOCK = /<!--hide(?::([a-z]+(?::\d+)?))?-->([\s\S]*?)<!--\/hide-->/g;

/** Mốc mở của một khối có điều kiện `rule`. */
export function hideOpenMarker(rule: HideRule): string {
  return rule.kind === 'REPLY' ? HIDE_OPEN : `<!--hide:${encodeHideRule(rule)}-->`;
}

/** Bài có phần nội dung ẩn không? */
export function hasHidden(html: string): boolean {
  return hideOpenRe().test(html);
}

/** Các điều kiện đang dùng trong bài — để trang chỉ hỏi CSDL đúng thứ cần hỏi. */
export function hideRules(html: string): HideRule[] {
  const out: HideRule[] = [];
  for (const m of html.matchAll(hideOpenRe())) out.push(decodeHideRule(m[1]));
  return out;
}

/**
 * Bỏ hẳn phần ẩn khỏi HTML — dùng cho mô tả trang, kết quả tìm kiếm, trích
 * ngắn: những chỗ nội dung đi ra ngoài mà không kèm nút mở khoá nào.
 */
export function stripHidden(html: string): string {
  return html.replace(HIDE_BLOCK, '');
}

/**
 * Trích ngắn của một chủ đề, dùng cho danh sách chủ đề và kết quả tìm kiếm.
 *
 * Bắt buộc đi qua `stripHidden` TRƯỚC khi bóc thẻ: `plainText` bóc mọi thứ
 * khớp `<...>` nên hai mốc `<!--hide-->` bị coi như thẻ thường và biến mất,
 * để lại đúng phần chữ đáng lẽ phải giấu nằm chình ình trong trích ngắn.
 * Gói lại thành một hàm vì đây là thao tác ba nơi cùng làm, mà quên ở một nơi
 * là lộ ở nơi đó — chẳng có gì báo cho biết.
 */
export function threadExcerpt(html: string, max = 90): string {
  return truncate(plainText(stripHidden(html)), max);
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
export function renderHidden(html: string, viewer: HideViewer | true): string {
  if (!hasHidden(html)) return html;
  return html.replace(HIDE_BLOCK, (_m, token: string | undefined, body: string) => {
    const rule = decodeHideRule(token);
    if (viewer === true || canOpenHide(rule, viewer)) {
      return `<span class="bb-hide-open"><b>Nội dung ẩn</b>${body}</span>`;
    }
    return `<span class="bb-hide">Nội dung này bị ẩn — ${describeHideRule(rule)}.</span>`;
  });
}

/**
 * Dựng phần ẩn ở những nơi KHÔNG có cơ chế mở khoá — bảng tin câu lạc bộ.
 *
 * Ô soạn bảng tin dùng chung `bbcodeToHtml` với chủ đề diễn đàn nên người đăng
 * gõ được `[hide]`, nhưng câu lạc bộ chẳng có nút trả lời/trả điểm nào để mở,
 * mà mốc ẩn lại là chú thích HTML — không cắt thì trình duyệt hiện nguyên phần
 * đáng lẽ giấu, người đăng tưởng đã giấu mà thực ra khoe hết.
 *
 * Nên ở đây phần ẩn bị THAY hẳn, và câu nhắc nói thẳng là chỗ này không mở
 * được — không mượn `describeHideRule` vì mọi điều kiện của nó ("trả lời chủ
 * đề", "trả 50 điểm") đều nói về chủ đề diễn đàn, hứa một cái nút không có
 * thật. Chỉ người đăng mới xem lại được ruột (gọi `renderHidden(html, true)`):
 * chữ do chính họ gõ ra, giấu của họ với họ thì vô nghĩa.
 */
export function renderHiddenClosed(html: string): string {
  if (!hasHidden(html)) return html;
  return html.replace(HIDE_BLOCK,
    '<span class="bb-hide">Nội dung này bị ẩn — bảng tin câu lạc bộ không mở khoá được.</span>');
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
  ];
  for (let pass = 0; pass < 4; pass++) {
    for (const [re, rep] of simple) s = s.replace(re, rep);
    // [hide] chỉ đánh mốc ở đây; cắt hay mở là việc của `renderHidden`, vì lúc
    // dựng HTML (khi đăng bài) chưa biết ai sẽ đọc. Điều kiện đi kèm được đọc
    // và dựng lại theo dạng chuẩn, không bê nguyên chữ người dùng gõ vào mốc.
    s = s.replace(/\[hide(?:=([^\]]{1,40}))?\]([\s\S]*?)\[\/hide\]/gi,
      (_m, param: string | undefined, body: string) =>
        `${hideOpenMarker(parseHideParam(param))}${body}${HIDE_CLOSE}`);
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
    .replace(/\[hide(?:=[^\]]{1,40})?\][\s\S]*?\[\/hide\]/gi, ' ')
    .replace(/\[\/?[a-z*]+(=[^\]]*)?\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Mã BBCode để trích dẫn một bài khi trả lời.
 *
 * Cắt ngắn có chủ đích: trích cả bài dài hai nghìn chữ thì trang chủ đề thành
 * ra đọc hai lần cùng một nội dung. Cắt xong thêm dấu lửng để người đọc biết là
 * còn nữa, và luôn chừa hai dòng trống bên dưới cho người trả lời gõ tiếp.
 */
export function quoteBBCode(author: string, html: string, max = 400): string {
  const text = truncate(plainText(stripHidden(html)), max);
  // Tên có thể chứa `]` làm hỏng thẻ mở; thay bằng khoảng trắng cho lành.
  const ten = author.replace(/[[\]]/g, ' ').trim() || 'Ẩn danh';
  return `[quote=${ten}]${text}[/quote]\n\n`;
}
