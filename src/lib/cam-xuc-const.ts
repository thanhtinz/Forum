/*
 * BẢNG MẶT CƯỜI — danh sách emoji chép sẵn, không gọi thư viện ngoài.
 *
 * Mọi bộ chọn emoji có sẵn trên mạng đều kéo theo một bảng dữ liệu vài trăm
 * kilobyte (tên, từ khoá, mã da, bảng tương thích) để phục vụ một ô bấm trong
 * khung chat. Chỗ này cần đúng hai thứ: mấy hình người ta hay dùng, chia theo
 * nhóm. Chép tay thì nhẹ bằng một phần trăm, và không phụ thuộc vào ai.
 *
 * KHÔNG lấy hết một nghìn tám trăm emoji: quá nửa trong số ấy chẳng ai gõ bao
 * giờ, mà chúng làm lưới dài ra tới mức phải cuộn — cuộn để tìm mặt cười thì
 * thà gõ chữ.
 *
 * Tệp này KHÔNG import gì, để bài kiểm `.mjs` nạp thẳng được.
 */

export interface NhomCamXuc {
  ma: string;
  ten: string;
  hinh: string[];
}

export const NHOM_CAM_XUC: NhomCamXuc[] = [
  {
    ma: 'mat',
    ten: 'Mặt cười',
    hinh: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉',
      '😊', '😇', '🥰', '😍', '😘', '😗', '😋', '😛', '😜', '🤪',
      '🤨', '🧐', '🤓', '😎', '🥳', '😏', '😒', '😞', '😔', '😟',
      '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤',
      '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
      '😥', '😓', '🤗', '🤔', '🤭', '🤫', '😐', '😑', '😶', '😬',
      '🙄', '😯', '😦', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵',
      '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠',
    ],
  },
  {
    ma: 'tay',
    ten: 'Cử chỉ',
    hinh: [
      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
      '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏',
      '✍️', '💪', '🦾', '👏', '🙌', '👐', '🤲', '🤜', '🤛', '✊',
      '👊', '🫶', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💯',
    ],
  },
  {
    ma: 'game',
    ten: 'Game',
    hinh: [
      '🎮', '🕹️', '👾', '🎯', '🎲', '🃏', '🀄', '♟️', '🎰', '🧩',
      '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '⚔️', '🛡️', '🗡️', '🏹',
      '🔫', '💣', '🧨', '⚡', '🔥', '💥', '✨', '🌟', '⭐', '💫',
      '🚀', '🛸', '🐉', '🦖', '👻', '💀', '☠️', '🤖', '👽', '🎃',
    ],
  },
  {
    ma: 'vat',
    ten: 'Đồ vật',
    hinh: [
      '📱', '💻', '🖥️', '⌨️', '🖱️', '💾', '💿', '📀', '🔌', '🔋',
      '📷', '🎧', '🎤', '📺', '📻', '⏰', '⏳', '🔍', '🔎', '🔑',
      '🔒', '🔓', '📦', '📥', '📤', '📝', '📌', '📎', '✂️', '🗑️',
      '💰', '💳', '🎁', '🎉', '🎊', '🔔', '📣', '💬', '💭', '🗯️',
    ],
  },
  {
    ma: 'khac',
    ten: 'Khác',
    hinh: [
      '✅', '❌', '⭕', '❗', '❓', '⚠️', '🚫', '♻️', '🆗', '🆕',
      '🔝', '🔜', '⬆️', '⬇️', '⬅️', '➡️', '🔄', '▶️', '⏸️', '⏹️',
      '☀️', '🌙', '⛅', '🌧️', '❄️', '🌈', '🍀', '🌸', '🍎', '🍕',
      '☕', '🍺', '🎵', '🎶', '🐱', '🐶', '🐢', '🦊', '🐼', '🦄',
    ],
  },
];

/** Ba tab của bảng cảm xúc. */
export const TAB_CAM_XUC = [
  { ma: 'emoji', ten: 'Emoji' },
  { ma: 'sticker', ten: 'Sticker' },
  { ma: 'gif', ten: 'GIF' },
] as const;

export type MaTabCamXuc = (typeof TAB_CAM_XUC)[number]['ma'];

/** Tên gói sticker dài nhất bấy nhiêu chữ. */
export const TEN_GOI_TOI_DA = 50;

/** Một gói chứa nhiều nhất bấy nhiêu hình. */
export const STICKER_MOI_GOI = 60;

/** Mỗi lượt tìm ảnh động lấy về bấy nhiêu tấm. */
export const GIF_MOI_LAN = 24;
