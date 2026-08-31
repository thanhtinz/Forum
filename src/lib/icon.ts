/**
 * Biểu tượng (cấp độ, huy chương, chuyên mục, diễn đàn) lưu chung một cột chuỗi:
 * hoặc là emoji/chữ ngắn, hoặc là đường dẫn ảnh admin tải lên.
 */
export function isImageIcon(icon: string | null | undefined): icon is string {
  if (!icon) return false;
  // `//evil.com/a.png` bắt đầu bằng dấu gạch nhưng trỏ ra ngoài, nên phải
  // loại riêng — cùng lý do với `nhanAnhVaoKho`.
  return (icon.startsWith('/') && !icon.startsWith('//'))
    || icon.startsWith('http://') || icon.startsWith('https://');
}

/** Giới hạn độ dài khi lưu: đủ cho emoji lẫn URL ảnh. */
export const ICON_MAX_LENGTH = 500;

export function normalizeIcon(raw: FormDataEntryValue | null): string | null {
  return String(raw ?? '').trim().slice(0, ICON_MAX_LENGTH) || null;
}
