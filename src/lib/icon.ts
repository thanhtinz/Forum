/**
 * Biểu tượng (cấp độ, huy chương, chuyên mục, diễn đàn) lưu chung một cột chuỗi:
 * hoặc là emoji/chữ ngắn, hoặc là đường dẫn ảnh admin tải lên.
 */
export function isImageIcon(icon: string | null | undefined): icon is string {
  return !!icon && (icon.startsWith('/') || icon.startsWith('http://') || icon.startsWith('https://'));
}

/** Giới hạn độ dài khi lưu: đủ cho emoji lẫn URL ảnh. */
export const ICON_MAX_LENGTH = 500;

export function normalizeIcon(raw: FormDataEntryValue | null): string | null {
  return String(raw ?? '').trim().slice(0, ICON_MAX_LENGTH) || null;
}

/**
 * Ảnh hợp lệ để lưu: URL http(s) hoặc đường dẫn nội bộ do /api/upload trả về
 * (khi chưa bật R2 thì tệp nằm trong public/ nên đường dẫn bắt đầu bằng "/").
 */
export function isPublicImageRef(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value) || /^\/[^\s]*$/.test(value);
}
