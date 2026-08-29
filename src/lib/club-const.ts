/**
 * Câu lạc bộ — hằng số và kiểu dùng chung.
 *
 * Tách khỏi `club.ts` vì tệp kia đụng tới cơ sở dữ liệu, mà mấy hằng số này thì
 * các thành phần chạy ở trình duyệt cũng cần. Kéo cả Prisma xuống trình duyệt
 * chỉ để lấy một con số là hỏng gói tải.
 */

/** Số câu lạc bộ hiện mỗi trang ở danh sách. */
export const CLUBS_PER_PAGE = 12;
/** Số thành viên hiện mỗi trang trong trang câu lạc bộ. */
export const CLUB_MEMBERS_PER_PAGE = 24;
/** Số bài trên bảng tin câu lạc bộ mỗi trang. */
export const CLUB_POSTS_PER_PAGE = 15;

/** Trần một người được lập, để một người không ôm hết tên đẹp. */
export const CLUBS_OWNED_MAX = 3;

export const CLUB_NAME_MIN = 3;
export const CLUB_NAME_MAX = 40;

/**
 * Tên viết tắt — cái thẻ nhỏ đeo cạnh tên mọi thành viên.
 *
 * Ngắn và chỉ chữ hoa với số: nó nằm chen giữa một hàng đã đông đúc (tên, cấp,
 * danh hiệu, huy hiệu), dài ra một chút là cả hàng vỡ trên màn hình điện thoại.
 */
export const CLUB_SHORT_MIN = 2;
export const CLUB_SHORT_MAX = 6;

/** Viết tắt hợp lệ chưa — nhận vào chuỗi ĐÃ chuẩn hoá. */
export function isClubShortName(v: string): boolean {
  return new RegExp(`^[A-Z0-9]{${CLUB_SHORT_MIN},${CLUB_SHORT_MAX}}$`).test(v);
}

/** Chuẩn hoá về chữ hoa, bỏ mọi thứ không phải chữ cái không dấu hoặc số. */
export function normClubShortName(v: string): string {
  return v.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CLUB_SHORT_MAX);
}

/**
 * Đoán viết tắt từ tên nhóm, để ô nhập có sẵn thứ gì đó thay vì trống trơn.
 *
 * Lấy chữ đầu mỗi từ ("Hội mê game Java" → "HMGJ"); tên một từ thì lấy mấy chữ
 * đầu. Bỏ dấu tiếng Việt trước, không thì "Đội" ra chữ không dùng được.
 */
export function suggestClubShortName(name: string): string {
  const khongDau = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  const tu = khongDau.split(/\s+/).filter(Boolean);
  const raw = tu.length > 1 ? tu.map((t) => t[0]).join('') : (tu[0] ?? '');
  return normClubShortName(raw);
}
export const CLUB_DESC_MAX = 500;
export const CLUB_POST_MIN = 2;
export const CLUB_POST_MAX = 2000;
export const CLUB_COMMENT_MAX = 500;

/**
 * Số bình luận hiện sẵn dưới mỗi bài trên bảng tin.
 *
 * Bài nào nhiều hơn thì phải bấm mở — mười lăm bài mỗi trang mà bài nào cũng
 * kéo hết bình luận về thì một trang bảng tin gánh cả nghìn hàng chỉ để in ra
 * vài dòng đầu.
 */
export const CLUB_COMMENTS_SHOWN = 3;
/** Trần khi người đọc bấm "xem tất cả bình luận" của MỘT bài. */
export const CLUB_COMMENTS_EXPANDED = 200;

/**
 * Số tầng bình luận, tính cả tầng gốc.
 *
 * Ba tầng là đủ để đối đáp qua lại mà vẫn còn chỗ thụt lề trên màn hình điện
 * thoại. Trả lời ở tầng cuối thì bám vào chính tầng ấy chứ không đẻ thêm tầng
 * — giống cách Facebook làm, và nhờ vậy không có nhánh nào dài vô tận.
 */
export const CLUB_COMMENT_DEPTH_MAX = 3;

/** Trần số bình luận con lấy kèm mỗi nhánh gốc. */
export const CLUB_REPLIES_PER_ROOT = 50;

/** Cách vào câu lạc bộ. */
export const CLUB_JOIN_MODES = [
  { value: 'OPEN', label: 'Ai bấm cũng vào được' },
  { value: 'APPROVAL', label: 'Chủ câu lạc bộ duyệt' },
  { value: 'CLOSED', label: 'Đóng, không nhận thêm' },
] as const;

export type ClubJoinMode = (typeof CLUB_JOIN_MODES)[number]['value'];

/** Ai đọc được bảng tin. */
export const CLUB_PRIVACY = [
  { value: 'PUBLIC', label: 'Ai cũng đọc được bảng tin' },
  { value: 'MEMBERS', label: 'Chỉ thành viên đọc được bảng tin' },
] as const;

export type ClubPrivacy = (typeof CLUB_PRIVACY)[number]['value'];

/** Vai trò trong nhóm, để in ra cho gọn. */
export const CLUB_ROLE_LABELS: Record<string, string> = {
  OWNER: 'Chủ câu lạc bộ',
  MOD: 'Phó câu lạc bộ',
  MEMBER: 'Thành viên',
};

export interface ClubActionState {
  ok?: boolean;
  error?: string;
}
