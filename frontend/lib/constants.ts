export const GATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'LIKE_AND_COMMENT', label: 'Bắt buộc Like & Bình luận (mặc định)' },
  { value: 'LIKE_REQUIRED', label: 'Tổng lượt thích' },
  { value: 'COMMENT_REQUIRED', label: 'Tổng bình luận' },
  { value: 'GEM_PURCHASE', label: 'Mua bằng Gem' },
];

// Loại có áp dụng điều kiện like / bình luận (hiển thị mô tả tiến độ)
export const needLike = (g: string) => g === 'LIKE_AND_COMMENT' || g === 'LIKE_REQUIRED';
export const needComment = (g: string) => g === 'LIKE_AND_COMMENT' || g === 'COMMENT_REQUIRED';
export const needGem = (g: string) => g === 'GEM_PURCHASE';

// Chỉ 2 loại này cần tác giả tự nhập ngưỡng số liệu; mặc định Like & Bình luận cố định 1/1.
export const needLikeInput = (g: string) => g === 'LIKE_REQUIRED';
export const needCommentInput = (g: string) => g === 'COMMENT_REQUIRED';

export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export const REPORT_TYPES: { value: string; label: string }[] = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Quấy rối / Đe dọa' },
  { value: 'INAPPROPRIATE', label: 'Nội dung không phù hợp' },
  { value: 'COPYRIGHT', label: 'Vi phạm bản quyền' },
  { value: 'MISINFORMATION', label: 'Thông tin sai lệch' },
  { value: 'OTHER', label: 'Khác' },
];
