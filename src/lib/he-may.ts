/**
 * Bảng tra về các hệ máy.
 *
 * Không import gì — bài kiểm `.mjs` nạp thẳng tệp này, mà Node thì không hiểu
 * bí danh `@/` lẫn đường dẫn thiếu đuôi tệp.
 */

export const HE_MAY = ['JAVA', 'ANDROID', 'IOS', 'WINDOWS'] as const;
export type MaHeMay = (typeof HE_MAY)[number];

export interface MoTaHeMay {
  ten: string;
  /** Đuôi tệp người ta quen gọi hệ này bằng nó. */
  duoi: string;
  /** Những loại tệp hệ này nhận. Thứ tự = thứ tự bày ra nút tải. */
  loaiTep: readonly string[];
  /** Tên biểu tượng trong `lucide-react`, tra ở `BieuTuongHe`. */
  icon: 'coffee' | 'smartphone' | 'apple' | 'monitor';
}

export const MO_TA_HE: Record<MaHeMay, MoTaHeMay> = {
  JAVA: { ten: 'Java ME', duoi: 'JAR', loaiTep: ['JAR', 'JAD'], icon: 'coffee' },
  ANDROID: { ten: 'Android', duoi: 'APK', loaiTep: ['APK', 'ZIP'], icon: 'smartphone' },
  IOS: { ten: 'iOS', duoi: 'IPA', loaiTep: ['IPA'], icon: 'apple' },
  WINDOWS: { ten: 'Windows', duoi: 'EXE', loaiTep: ['EXE', 'ZIP'], icon: 'monitor' },
};

/** Có phải mã hệ máy hợp lệ không — dùng để lọc tham số trên URL. */
export function laHeMay(v: string | undefined | null): v is MaHeMay {
  return !!v && (HE_MAY as readonly string[]).includes(v);
}

/**
 * iOS là hệ DUY NHẤT không tải thẳng được.
 *
 * iPhone chưa bẻ khoá không cài nổi tệp IPA lấy từ web — Apple chỉ mở đúng bốn
 * lối: App Store, TestFlight, hệ quản lý thiết bị của doanh nghiệp, và chợ ứng
 * dụng thay thế ở châu Âu. Nên chỗ nào dựng nút tải cho iOS cũng phải hỏi hàm
 * này trước, rồi đưa người dùng sang App Store thay vì hứa một tệp họ không
 * dùng được.
 */
export function caiThangDuoc(he: MaHeMay): boolean {
  return he !== 'IOS';
}

export const NGON_NGU: Record<string, string> = {
  en: 'Tiếng Anh',
  vi: 'Tiếng Việt',
  'da-ngon-ngu': 'Nhiều thứ tiếng',
};
