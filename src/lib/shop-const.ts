/**
 * Hằng số và quy ước của cửa hàng, tách khỏi phần đụng Prisma để giao diện
 * chạy trên trình duyệt dùng chung được.
 */

export const SHOP_NAME_MAX = 60;
export const SHOP_DESC_MAX = 200;
export const SHOP_PRICE_MAX = 1_000_000;
export const SHOP_PAGE_SIZE = 24;

/**
 * Cửa hàng CỐ Ý không bán avatar lẫn ảnh bìa — hai thứ ấy người dùng tự tải
 * lên ở trang cài đặt. Ảnh bìa bán được thì món mua sẽ đè lên ảnh người ta tự
 * chọn, tức là cướp mất chỗ của chính chủ; còn avatar thì càng không có lý do
 * gì phải mua. Chỉ bán những thứ TÔ ĐIỂM THÊM: màu tên, huy hiệu, danh hiệu.
 */
export const SHOP_KINDS = ['NAME_COLOR', 'BADGE', 'TITLE'] as const;
export type ShopKind = (typeof SHOP_KINDS)[number];

export const KIND_LABELS: Record<ShopKind, {
  label: string; one: string; hint: string; valueLabel: string; valueHint: string;
}> = {
  NAME_COLOR: {
    label: 'Màu tên', one: 'màu tên',
    hint: 'Đổi màu tên bạn ở mọi chỗ trên diễn đàn.',
    valueLabel: 'Giá trị màu CSS',
    valueHint: 'Ví dụ #e11d48, rgb(225 29 72), hoặc linear-gradient(90deg,#f43f5e,#f59e0b) cho nick chuyển sắc.',
  },
  BADGE: {
    label: 'Huy hiệu', one: 'huy hiệu',
    hint: 'Icon nhỏ hiện cạnh tên, ngay sau huy hiệu cấp bậc.',
    valueLabel: 'Ảnh icon',
    valueHint: 'Ảnh nhỏ nền trong suốt, cỡ 16–24px là vừa. To hơn cũng được nhưng sẽ bị thu lại, nét vẽ pixel dễ nhoè.',
  },
  TITLE: {
    label: 'Danh hiệu', one: 'danh hiệu',
    hint: 'Dòng chữ nhỏ hiện ngay cạnh tên bạn ở mọi chỗ trên diễn đàn.',
    valueLabel: 'Chữ danh hiệu',
    valueHint: 'Ngắn thôi — ví dụ “Cao thủ Java”, “Thợ săn game”. Tối đa 24 ký tự.',
  },
};

export function isShopKind(v: string): v is ShopKind {
  return (SHOP_KINDS as readonly string[]).includes(v);
}

/**
 * Kiểm giá trị màu do quản trị viên nhập.
 *
 * React đặt `style` qua CSSOM nên chuỗi lạ chỉ thành thuộc tính không hợp lệ
 * chứ không chèn được luật CSS khác. Nhưng vẫn phải chặn ở đây: gõ nhầm một
 * chữ là cả diễn đàn hiện tên không màu mà chẳng ai biết vì sao.
 */
export function isCssColor(v: string): boolean {
  const s = v.trim();
  if (!s || s.length > 200) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return true;
  if (/^(rgb|rgba|hsl|hsla)\([^;{}]*\)$/i.test(s)) return true;
  if (/^[a-z]+$/i.test(s)) return true; // tên màu CSS: red, tomato…
  if (isGradient(s)) return true;
  return false;
}

/** Màu chuyển sắc cần cách hiển thị khác hẳn (tô nền rồi cắt theo chữ). */
export function isGradient(v: string): boolean {
  return /^(linear|radial|conic)-gradient\([^;{}]*\)$/i.test(v.trim());
}

/** Ảnh nội bộ hoặc http(s) — chặn javascript:/data:. */
export function safeImageUrl(raw: string): string | null {
  const u = raw.trim();
  if (!u) return null;
  if (u.startsWith('/uploads/') || u.startsWith('/stickers/')) return u;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

export interface ShopItemView {
  id: string;
  slug: string;
  kind: ShopKind;
  name: string;
  description: string | null;
  value: string;
  pricePoints: number;
  active: boolean;
  order: number;
  /** Người đang xem đã mua món này chưa. */
  owned: boolean;
  /** Đang đeo món này. */
  equipped: boolean;
}

/**
 * Bộ trang trí của một người, đã rút gọn để truyền xuống giao diện.
 * Trường nào null nghĩa là không đeo gì.
 */
/**
 * Mọi thứ đứng cạnh tên một người, gói vào một chỗ.
 *
 * Huy hiệu có hai đường tới: MUA ở cửa hàng (`badge`) hoặc NHẬN được nhờ hoạt
 * động (`medal`, do quản trị đặt điều kiện). Hai thứ đó hiện cạnh nhau chứ
 * không thay nhau — huy hiệu tự kiếm được thì không nên bị món mua che mất.
 */
export interface Cosmetics {
  nameColor: string | null;
  /** Huy hiệu MUA ở cửa hàng. */
  badge: string | null;
  badgeName: string | null;
  /** Huy hiệu NHẬN được (huy chương), chỉ lấy cái đang bật hiển thị. */
  medal: string | null;
  medalName: string | null;
  /** Danh hiệu chữ mua ở cửa hàng, hiện cạnh tên. */
  title: string | null;
}

export const NO_COSMETICS: Cosmetics = {
  nameColor: null, badge: null, badgeName: null, medal: null, medalName: null, title: null,
};

/** Trần độ dài chữ danh hiệu — dài quá thì vỡ mọi dòng có tên người. */
export const TITLE_MAX = 24;

/**
 * Chữ danh hiệu có dùng được không.
 *
 * Chỉ chặn thứ làm hỏng dòng: rỗng, quá dài, hoặc có ký tự xuống dòng. Không
 * cần lọc HTML — React in ra dạng chữ chứ không dựng thẻ.
 */
export function isTitleText(v: string): boolean {
  const t = v.trim();
  return t.length > 0 && t.length <= TITLE_MAX && !/[\r\n\t]/.test(t);
}
