/**
 * Nhắc tên bằng @tên_đăng_nhập.
 *
 * Chặn theo ký tự đứng ngay trước @ thay vì liệt kê ký tự được phép: chữ, số,
 * dấu chấm, gạch chéo, @ và = thì bỏ qua — nhờ vậy địa chỉ thư (toi@abc.vn),
 * đường dẫn (x.com/@ai) và tham số BBCode ([url=@x]) không bị hiểu nhầm, còn
 * mọi dấu câu khác kể cả [b]@ten[/b] vẫn nhận đúng.
 */
export const MENTION_PATTERN = '(?<![A-Za-z0-9_./@=-])@([A-Za-z0-9_]{3,30})';

/** Mỗi bài chỉ báo cho tối đa ngần này người, tránh spam gọi cả diễn đàn. */
export const MENTION_LIMIT = 10;

/**
 * Lấy danh sách tên đăng nhập được nhắc, không trùng, giữ nguyên thứ tự xuất hiện.
 *
 * Bỏ qua phần trong [code] — chỗ đó khi hiển thị cũng không thành liên kết, gọi
 * người ta chỉ vì tên trùng một biến trong đoạn mã thì phiền.
 */
export function extractMentions(content: string): string[] {
  const re = new RegExp(MENTION_PATTERN, 'g');
  content = content.replace(/\[code\][\s\S]*?\[\/code\]/gi, ' ');
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const key = m[1].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m[1]);
    if (out.length >= MENTION_LIMIT) break;
  }
  return out;
}
