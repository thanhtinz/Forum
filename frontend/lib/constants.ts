export const GATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'LIKE_REQUIRED', label: 'Cần Like' },
  { value: 'COMMENT_REQUIRED', label: 'Cần Bình luận' },
  { value: 'LIKE_AND_COMMENT', label: 'Cần Like & Bình luận' },
  { value: 'LIKE_OR_COMMENT', label: 'Like hoặc Bình luận' },
  { value: 'GEM_PURCHASE', label: 'Mua bằng Gem' },
  { value: 'LIKE_OR_GEM', label: 'Like hoặc Gem' },
  { value: 'COMMENT_OR_GEM', label: 'Bình luận hoặc Gem' },
];

export const needLike = (g: string) =>
  ['LIKE_REQUIRED', 'LIKE_AND_COMMENT', 'LIKE_OR_COMMENT', 'LIKE_OR_GEM'].includes(g);
export const needComment = (g: string) =>
  ['COMMENT_REQUIRED', 'LIKE_AND_COMMENT', 'LIKE_OR_COMMENT', 'COMMENT_OR_GEM'].includes(g);
export const needGem = (g: string) =>
  ['GEM_PURCHASE', 'LIKE_OR_GEM', 'COMMENT_OR_GEM'].includes(g);

export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

export const REPORT_TYPES: { value: string; label: string }[] = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Quấy rối / Đe dọa' },
  { value: 'INAPPROPRIATE', label: 'Nội dung không phù hợp' },
  { value: 'COPYRIGHT', label: 'Vi phạm bản quyền' },
  { value: 'MISINFORMATION', label: 'Thông tin sai lệch' },
  { value: 'OTHER', label: 'Khác' },
];
