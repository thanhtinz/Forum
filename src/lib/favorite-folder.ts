/**
 * Thư mục cho mục đã lưu.
 *
 * Cột `Favorite.folder` có sẵn trong schema từ đầu (mặc định "default") nhưng
 * chưa chỗ nào đọc hay ghi — tính năng làm dở. Không cần bảng riêng: danh sách
 * thư mục chính là tập các giá trị đang có trong cột đó, nên tạo thư mục = đặt
 * tên khi chuyển mục đầu tiên vào, và thư mục rỗng thì tự biến mất.
 */

/** Thư mục mặc định của mọi mục vừa lưu. */
export const DEFAULT_FOLDER = 'default';

/** Tên hiện cho người dùng thấy. */
export const DEFAULT_FOLDER_LABEL = 'Chưa phân loại';

export const FOLDER_MAX_LEN = 30;
/** Nhiều hơn nữa thì hàng thẻ chọn dài hơn cả danh sách bên dưới. */
export const FOLDER_LIMIT = 20;

export function folderLabel(name: string): string {
  return name === DEFAULT_FOLDER ? DEFAULT_FOLDER_LABEL : name;
}

/**
 * Chuẩn hoá tên thư mục người dùng nhập.
 * Trả về null nếu không dùng được, kèm lý do ở `folderError`.
 */
export function normalizeFolder(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name || name.length > FOLDER_MAX_LEN) return null;
  // Tên trùng khoá kỹ thuật thì quy về đúng thư mục mặc định.
  if (name.toLowerCase() === DEFAULT_FOLDER) return DEFAULT_FOLDER;
  return name;
}

export function folderError(raw: string): string | null {
  const name = raw.trim();
  if (!name) return 'Chưa nhập tên thư mục.';
  if (name.length > FOLDER_MAX_LEN) return `Tên thư mục tối đa ${FOLDER_MAX_LEN} ký tự.`;
  return null;
}
