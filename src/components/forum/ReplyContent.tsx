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
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  IMG.lastIndex = 0;

  while ((m = IMG.exec(content)) !== null) {
    const [full, alt, rawUrl] = m;
    const src = safeSrc(rawUrl);
    if (m.index > last) parts.push(...withMentions(content.slice(last, m.index), `a${last}`));
    if (src) {
      parts.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`i${m.index}`} src={src} alt={alt}
          className={isSticker(src)
            ? 'my-1 inline-block h-20 w-20 align-middle'
            : 'my-2 block max-h-80 max-w-full rounded-lg border border-ink-100 object-contain dark:border-ink-800'}
        />,
      );
    } else {
      // URL không hợp lệ: hiển thị nguyên văn thay vì bỏ đi
      parts.push(<Fragment key={`r${m.index}`}>{full}</Fragment>);
    }
    last = m.index + full.length;
  }
  if (last < content.length) parts.push(...withMentions(content.slice(last), `b${last}`));

  return <Tag className={className ?? 'whitespace-pre-wrap text-sm leading-relaxed text-ink-700 dark:text-ink-200'}>{parts}</Tag>;
}
