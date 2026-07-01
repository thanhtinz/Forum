export const GATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'LIKE_AND_COMMENT', label: 'Bắt buộc Like & Bình luận (mặc định)' },
  { value: 'GEM_PURCHASE', label: 'Mua bằng Gem' },
];

export const needLike = (g: string) => g === 'LIKE_AND_COMMENT';
export const needComment = (g: string) => g === 'LIKE_AND_COMMENT';
export const needGem = (g: string) => g === 'GEM_PURCHASE';

export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export const REPORT_TYPES: { value: string; label: string }[] = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Quấy rối / Đe dọa' },
  { value: 'INAPPROPRIATE', label: 'Nội dung không phù hợp' },
  { value: 'COPYRIGHT', label: 'Vi phạm bản quyền' },
  { value: 'MISINFORMATION', label: 'Thông tin sai lệch' },
  { value: 'OTHER', label: 'Khác' },
];
