/** Gộp className có điều kiện (thay cho clsx nhẹ). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Số trang của một danh sách phân trang — luôn ít nhất một trang.
 *
 * `Math.ceil(0 / 20)` là 0, mà "trang 1 / 0" thì vô nghĩa; thanh phân trang có
 * tự ẩn khi ≤ 1 trang nên chưa nổ ở đâu, nhưng con số vẫn sai và mỗi chỗ tính
 * lại tự bọc `Math.max` một kiểu.
 */
export function tinhSoTrang(tong: number, moiTrang: number): number {
  return Math.max(1, Math.ceil(tong / Math.max(1, moiTrang)));
}

/**
 * Định dạng số gọn: 1.2K, 3.4M — dùng cho TRANG CÔNG KHAI.
 *
 * Đừng dùng ở bảng quản trị: 1.500 và 1.549 đều ra "1.5K", mà admin sửa điểm
 * hay đối soát lượt tải thì cần đúng con số. Chỗ đó dùng `soDay`.
 */
export function fmtCount(n?: number | null): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  return String(v);
}

/** Số đầy đủ có dấu phân nhóm kiểu Việt: 1.549.203. Dùng ở bảng quản trị. */
export function soDay(n?: number | null): string {
  return (n ?? 0).toLocaleString('vi-VN');
}

/**
 * Mô tả một khoảng thời gian còn lại cho người đọc: "2 giờ 5 phút", "45 phút",
 * "30 giây".
 *
 * Nông trại và Đảo Rồng trước đây mỗi bên chép một bản `moTaConLai` riêng với
 * cùng phép tính, chỉ khác chữ báo hết giờ và việc có đếm giây hay không — sửa
 * cách viết ở một bên là hai màn hình lệch nhau. Nay phần tính nằm ở đây, mỗi
 * bên chỉ còn khai báo chữ của mình.
 *
 * @param xong Chữ hiện khi đã hết giờ ("đã chín", "xong rồi"…).
 * @param giay Có đếm tới từng giây khi còn dưới một phút hay không.
 */
export function moTaThoiLuong(ms: number, xong: string, giay = false): string {
  if (ms <= 0) return xong;
  const soGiay = Math.ceil(ms / 1000);
  if (giay && soGiay < 60) return `${soGiay} giây`;
  const phut = Math.max(1, Math.ceil(soGiay / 60));
  if (phut < 60) return `${phut} phút`;
  const gio = Math.floor(phut / 60);
  const du = phut % 60;
  return du === 0 ? `${gio} giờ` : `${gio} giờ ${du} phút`;
}


/** Thời gian tương đối kiểu diễn đàn: "vừa xong", "5 phút", "3 giờ", "2 ngày", cũ hơn thì dd/MM/yy */
export function fmtAgo(date?: Date | string | null, now = new Date()): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return 'vừa xong';
  if (sec < 3600) return `${Math.floor(sec / 60)} phút`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} giờ`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)} ngày`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${String(d.getFullYear()).slice(2)}`;
}

/** Bỏ thẻ HTML, gom khoảng trắng — dùng cho trích đoạn nội dung. */
export function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Cắt chuỗi kèm dấu … */
export function truncate(s: string, max = 160): string {
  return s.length > max ? s.slice(0, max).trimEnd() + '…' : s;
}

/** Định dạng dung lượng file: 1.5 MB, 48.2 MB, 2.1 GB */
export function fmtBytes(bytes?: number | bigint | null): string {
  const n = typeof bytes === 'bigint' ? Number(bytes) : bytes ?? 0;
  if (!n) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const v = n / 1024 ** i;
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Màu tên hiển thị theo vai trò — nếp "nick màu" của forum Việt thời 2010:
 * nhìn màu là biết ai quản trị, ai điều hành.
 */
export function nickClass(role?: string | null): string {
  if (role === 'ADMIN') return 'text-red-600 dark:text-red-400';
  if (role === 'MODERATOR') return 'text-emerald-600 dark:text-emerald-400';
  return 'text-brand-700 dark:text-brand-300';
}
