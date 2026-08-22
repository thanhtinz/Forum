import { Fragment } from 'react';

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
 * Hiển thị nội dung trả lời: giữ nguyên xuống dòng, đổi cú pháp `![alt](url)`
 * thành ảnh. Dựng bằng React (không dùng dangerouslySetInnerHTML) nên nội dung
 * người dùng nhập không thể chèn HTML.
 */
export function ReplyContent({ content, className }: { content: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  IMG.lastIndex = 0;

  while ((m = IMG.exec(content)) !== null) {
    const [full, alt, rawUrl] = m;
    const src = safeSrc(rawUrl);
    if (m.index > last) parts.push(<Fragment key={`t${last}`}>{content.slice(last, m.index)}</Fragment>);
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
  if (last < content.length) parts.push(<Fragment key={`t${last}`}>{content.slice(last)}</Fragment>);

  return <div className={className ?? 'whitespace-pre-wrap text-sm leading-relaxed text-ink-700 dark:text-ink-200'}>{parts}</div>;
}
