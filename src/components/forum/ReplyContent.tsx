import { Fragment } from 'react';
import Link from 'next/link';
import { MENTION_PATTERN } from '@/lib/mention';

/** Chỉ cho phép ảnh nội bộ hoặc http(s) — chặn javascript:/data:. */
function safeSrc(url: string): string | null {
  const u = url.trim();
  if (u.startsWith('/uploads/') || u.startsWith('/stickers/')) return u;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

/** Sticker hiển thị nhỏ như emoji lớn; ảnh tải lên và GIF thì to hơn. */
function isSticker(src: string): boolean {
  return src.includes('/stickers/');
}

const IMG = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

/**
 * Khối trích dẫn do nút "Trích dẫn" sinh ra.
 *
 * Trả lời lưu dạng chữ thuần chứ không phải BBCode đã dựng, nên phải nhận diện
 * ngay ở đây — không thì người bấm trích dẫn gửi đi lại thấy nguyên mấy cái
 * ngoặc vuông. Chỉ đúng một mã này, không mở cửa cho cả bộ BBCode: ô trả lời
 * xưa nay là ô chữ thuần, đổi cả bộ là đổi nghĩa mọi bài đã đăng.
 */
const QUOTE = /\[quote(?:=([^\]\n]{1,60}))?\]([\s\S]*?)\[\/quote\]/g;

/**
 * Đổi @tên_đăng_nhập trong một đoạn văn thuần thành liên kết tới trang cá nhân.
 * Không kiểm tra người đó có thật hay không — bấm vào mà không có thì trang
 * cá nhân tự báo, đỡ phải truy vấn cả danh sách chỉ để hiển thị.
 */
function withMentions(text: string, keyPrefix: string): React.ReactNode[] {
  const re = new RegExp(MENTION_PATTERN, 'g');
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<Fragment key={`${keyPrefix}t${last}`}>{text.slice(last, m.index)}</Fragment>);
    out.push(
      <Link key={`${keyPrefix}m${m.index}`} href={`/u/${m[1]}`}
        className="font-medium text-brand-600 hover:underline dark:text-brand-400">
        @{m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last === 0) return [<Fragment key={`${keyPrefix}t0`}>{text}</Fragment>];
  if (last < text.length) out.push(<Fragment key={`${keyPrefix}t${last}`}>{text.slice(last)}</Fragment>);
  return out;
}

/**
 * Hiển thị nội dung trả lời: giữ nguyên xuống dòng, đổi cú pháp `![alt](url)`
 * thành ảnh. Dựng bằng React (không dùng dangerouslySetInnerHTML) nên nội dung
 * người dùng nhập không thể chèn HTML.
 */
/** Phần chữ thường (ảnh, sticker, nhắc tên) — dùng cho cả trong lẫn ngoài trích dẫn. */
function renderPlain(content: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  IMG.lastIndex = 0;

  while ((m = IMG.exec(content)) !== null) {
    const [full, alt, rawUrl] = m;
    const src = safeSrc(rawUrl);
    if (m.index > last) parts.push(...withMentions(content.slice(last, m.index), `${keyPrefix}a${last}`));
    if (src) {
      parts.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${keyPrefix}i${m.index}`} src={src} alt={alt}
          className={isSticker(src)
            ? 'my-1 inline-block h-20 w-20 align-middle'
            : 'my-2 block max-h-80 max-w-full rounded-lg border border-ink-100 object-contain dark:border-ink-800'}
        />,
      );
    } else {
      // URL không hợp lệ: hiển thị nguyên văn thay vì bỏ đi
      parts.push(<Fragment key={`${keyPrefix}r${m.index}`}>{full}</Fragment>);
    }
    last = m.index + full.length;
  }
  if (last < content.length) parts.push(...withMentions(content.slice(last), `${keyPrefix}b${last}`));
  return parts;
}

/**
 * Hiển thị nội dung trả lời: giữ nguyên xuống dòng, đổi `![alt](url)` thành
 * ảnh, và dựng khối `[quote=Tên]…[/quote]` thành ô trích dẫn. Dựng bằng React
 * (không dùng dangerouslySetInnerHTML) nên nội dung người dùng nhập không thể
 * chèn HTML.
 */
export function ReplyContent({ content, className, as: Tag = 'div' }: {
  content: string;
  className?: string;
  /**
   * Thẻ bọc ngoài. Mặc định `div`; nơi nào đặt nội dung này nằm trong một
   * đoạn văn (như từng dòng phòng chat) phải truyền `span`, vì `div` lồng
   * trong `p` là HTML sai và React sẽ báo lệch khi khớp lại trên trình duyệt.
   */
  as?: 'div' | 'span';
}) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  QUOTE.lastIndex = 0;

  while ((m = QUOTE.exec(content)) !== null) {
    const [full, who, body] = m;
    if (m.index > last) out.push(...renderPlain(content.slice(last, m.index), `p${last}`));
    // Ô trích dẫn là `span` khi thẻ bọc ngoài là `span`: giữ đúng luật lồng thẻ
    // như phần ghi chú của `as` ở trên.
    const Box = Tag === 'span' ? 'span' : 'blockquote';
    out.push(
      <Box key={`q${m.index}`}
        className="my-2 block rounded-lg border-l-4 border-ink-200 bg-ink-50 px-3 py-2 text-ink-600 dark:border-ink-700 dark:bg-ink-800/50 dark:text-ink-300">
        {who && <span className="mb-1 block text-xs font-semibold text-ink-400">{who}</span>}
        {renderPlain(body.trim(), `qi${m.index}`)}
      </Box>,
    );
    last = m.index + full.length;
  }
  if (last < content.length) out.push(...renderPlain(content.slice(last), `t${last}`));
  if (out.length === 0) out.push(...renderPlain(content, 'only'));

  return <Tag className={className ?? 'whitespace-pre-wrap text-sm leading-relaxed text-ink-700 dark:text-ink-200'}>{out}</Tag>;
}
