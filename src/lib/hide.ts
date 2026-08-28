/**
 * Điều kiện mở khối `[hide]`.
 *
 * Trang đăng bài viết từ lâu đã có sẵn cả dãy mức khoá phần nội dung ẩn: cần
 * đăng nhập, thích để mở, bình luận để mở, đủ mốc thích, đủ mốc bình luận, trả
 * bằng điểm. Còn khối `[hide]` gõ tay trong chủ đề diễn đàn thì chỉ có đúng một
 * kiểu "trả lời mới xem được" — cùng một ý mà hai nơi làm hai kiểu, người quen
 * bên bài viết sang chủ đề là hụt.
 *
 * Nên `[hide]` nhận thêm tham số: `[hide=thich]`, `[hide=thich:20]`,
 * `[hide=traloi:10]`, `[hide=cap:3]`, `[hide=diem:50]`, `[hide=dangnhap]`.
 * Không tham số thì vẫn là "trả lời chủ đề" như cũ, nên mọi bài đã đăng giữ
 * nguyên nghĩa.
 *
 * Tệp này KHÔNG được đụng tới cơ sở dữ liệu: `bbcode.ts` gọi sang đây, mà
 * `bbcode.ts` thì chạy cả ở trình duyệt (ô soạn thảo xem trước).
 */

export type HideRule =
  /** Phải trả lời chủ đề — nếp cũ của forum wap, cũng là mặc định. */
  | { kind: 'REPLY' }
  /** Chỉ cần đăng nhập. */
  | { kind: 'LOGIN' }
  /** Phải thả thích cho chủ đề. */
  | { kind: 'LIKE' }
  /** Chủ đề phải đạt đủ số lượt thích. */
  | { kind: 'LIKE_GOAL'; n: number }
  /** Chủ đề phải đạt đủ số trả lời. */
  | { kind: 'REPLY_GOAL'; n: number }
  /** Người đọc phải từ cấp N trở lên. */
  | { kind: 'LEVEL'; n: number }
  /** Trả N điểm để mở. */
  | { kind: 'POINTS'; n: number };

export type HideKind = HideRule['kind'];

/** Mức trần của tham số, theo từng loại. */
const MAX: Record<string, number> = { LIKE_GOAL: 100_000, REPLY_GOAL: 100_000, LEVEL: 100, POINTS: 1_000_000 };

function clamp(kind: keyof typeof MAX, raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(n, MAX[kind]);
}

/**
 * Tên gọi trong BBCode → loại điều kiện. Nhận cả tiếng Việt không dấu lẫn tiếng
 * Anh: người dùng chép mẫu ở đâu về cũng chạy, khỏi phải nhớ đúng một cách gõ.
 */
const ALIAS: Record<string, HideKind> = {
  traloi: 'REPLY', reply: 'REPLY',
  dangnhap: 'LOGIN', login: 'LOGIN',
  thich: 'LIKE', like: 'LIKE',
  cap: 'LEVEL', level: 'LEVEL',
  diem: 'POINTS', points: 'POINTS', point: 'POINTS',
};

/**
 * Đọc tham số của `[hide=…]`.
 *
 * Không nhận ra thì trả về REPLY chứ không trả về "mở sẵn": gõ sai mã mà thành
 * ra khoe luôn phần đáng giấu thì hỏng chuyện, còn khoá nhầm chặt tay thì cùng
 * lắm người đăng sửa lại bài.
 */
export function parseHideParam(raw?: string | null): HideRule {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return { kind: 'REPLY' };

  const [namePart, numPart] = s.split(':', 2);
  const kind = ALIAS[namePart.trim()];
  if (!kind) return { kind: 'REPLY' };

  // Có số đi kèm thì "thích"/"trả lời" chuyển thành mốc đếm của cả chủ đề.
  if (numPart != null && numPart.trim()) {
    if (kind === 'LIKE') return { kind: 'LIKE_GOAL', n: clamp('LIKE_GOAL', numPart) };
    if (kind === 'REPLY') return { kind: 'REPLY_GOAL', n: clamp('REPLY_GOAL', numPart) };
    if (kind === 'LEVEL') return { kind: 'LEVEL', n: clamp('LEVEL', numPart) };
    if (kind === 'POINTS') return { kind: 'POINTS', n: clamp('POINTS', numPart) };
  }
  // Thiếu số thì hai mức bắt buộc có số không dựng được → về mặc định.
  if (kind === 'LEVEL' || kind === 'POINTS') return { kind: 'REPLY' };
  return { kind } as HideRule;
}

/** Điều kiện → chuỗi gọn nằm trong mốc HTML. Chỉ mã của ta sinh ra chuỗi này. */
export function encodeHideRule(rule: HideRule): string {
  switch (rule.kind) {
    case 'REPLY': return 'reply';
    case 'LOGIN': return 'login';
    case 'LIKE': return 'like';
    case 'LIKE_GOAL': return `likegoal:${rule.n}`;
    case 'REPLY_GOAL': return `replygoal:${rule.n}`;
    case 'LEVEL': return `level:${rule.n}`;
    case 'POINTS': return `points:${rule.n}`;
  }
}

/** Ngược lại của `encodeHideRule`. Chuỗi lạ → REPLY (xem ghi chú ở `parseHideParam`). */
export function decodeHideRule(token: string | undefined): HideRule {
  const s = (token ?? '').trim().toLowerCase();
  const [name, num] = s.split(':', 2);
  const n = num ? Math.max(1, parseInt(num, 10) || 1) : 0;
  switch (name) {
    case 'login': return { kind: 'LOGIN' };
    case 'like': return { kind: 'LIKE' };
    case 'likegoal': return { kind: 'LIKE_GOAL', n };
    case 'replygoal': return { kind: 'REPLY_GOAL', n };
    case 'level': return { kind: 'LEVEL', n };
    case 'points': return { kind: 'POINTS', n };
    default: return { kind: 'REPLY' };
  }
}

/** Câu nhắc hiện ra chỗ phần bị ẩn. */
export function describeHideRule(rule: HideRule): string {
  switch (rule.kind) {
    case 'REPLY': return 'hãy trả lời chủ đề để xem';
    case 'LOGIN': return 'hãy đăng nhập để xem';
    case 'LIKE': return 'hãy thích chủ đề để xem';
    case 'LIKE_GOAL': return `chủ đề đủ ${rule.n} lượt thích sẽ mở`;
    case 'REPLY_GOAL': return `chủ đề đủ ${rule.n} trả lời sẽ mở`;
    case 'LEVEL': return `cần từ cấp ${rule.n} trở lên`;
    case 'POINTS': return `mở khoá bằng ${rule.n} điểm`;
  }
}

/** Những gì cần biết về người đọc để chấm một điều kiện. */
export interface HideViewer {
  loggedIn: boolean;
  /** Đã thả thích cho chủ đề chưa. */
  liked: boolean;
  /** Đã trả lời chủ đề chưa. */
  replied: boolean;
  level: number;
  /** Đã trả điểm mở phần ẩn của chủ đề này chưa. */
  paid: boolean;
  /** Số lượt thích / trả lời hiện có của chủ đề. */
  likeCount: number;
  replyCount: number;
}

/** Người đọc này đã đủ điều kiện chưa. Chủ chủ đề và ban điều hành xét riêng. */
export function canOpenHide(rule: HideRule, v: HideViewer): boolean {
  switch (rule.kind) {
    case 'REPLY': return v.replied;
    case 'LOGIN': return v.loggedIn;
    case 'LIKE': return v.liked;
    case 'LIKE_GOAL': return v.likeCount >= rule.n;
    case 'REPLY_GOAL': return v.replyCount >= rule.n;
    case 'LEVEL': return v.loggedIn && v.level >= rule.n;
    case 'POINTS': return v.paid;
  }
}

/** Mẫu cú pháp để in ra bảng trợ giúp của ô soạn thảo. */
export const HIDE_SAMPLES: { code: string; label: string }[] = [
  { code: '[hide]…[/hide]', label: 'trả lời mới xem được' },
  { code: '[hide=dangnhap]…[/hide]', label: 'cần đăng nhập' },
  { code: '[hide=thich]…[/hide]', label: 'thích chủ đề để mở' },
  { code: '[hide=thich:20]…[/hide]', label: 'đủ 20 lượt thích thì mở' },
  { code: '[hide=traloi:10]…[/hide]', label: 'đủ 10 trả lời thì mở' },
  { code: '[hide=cap:3]…[/hide]', label: 'từ cấp 3 trở lên' },
  { code: '[hide=diem:50]…[/hide]', label: 'trả 50 điểm để mở' },
];
