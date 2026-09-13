/**
 * Bảng tra về các hệ máy.
 *
 * Không import gì — bài kiểm `.mjs` nạp thẳng tệp này, mà Node thì không hiểu
 * bí danh `@/` lẫn đường dẫn thiếu đuôi tệp.
 *
 * MỘT GAME CÓ THỂ CÓ CẢ NĂM HỆ cùng lúc, mỗi hệ một dãy số hiệu riêng. Đó là
 * lý do `BanTai` tách theo hệ chứ không gộp: bản Android 2.1 và bản Java 1.4
 * không nằm chung một dãy nào cả.
 */

export const HE_MAY = ['JAVA', 'ANDROID', 'IOS', 'WINDOWS', 'MAC'] as const;
export type MaHeMay = (typeof HE_MAY)[number];

export const LOAI_TEP = ['JAR', 'JAD', 'APK', 'IPA', 'ZIP', 'EXE', 'DMG', 'PKG'] as const;
export type MaLoaiTep = (typeof LOAI_TEP)[number];

export interface MoTaHeMay {
  ten: string;
  /** Đuôi tệp người ta quen gọi hệ này bằng nó. */
  duoi: string;
  /** Những loại tệp hệ này nhận. Thứ tự = thứ tự bày ra nút tải. */
  loaiTep: readonly MaLoaiTep[];
  /** Tên biểu tượng, tra ở bảng `ICON` của mỗi thành phần vẽ ra nó. */
  icon: 'coffee' | 'smartphone' | 'apple' | 'monitor' | 'laptop';
  /**
   * Màu đại diện, dùng ở biểu đồ số liệu.
   *
   * Năm màu KHÁC HẲN NHAU về sắc độ chứ không chỉ khác sáng tối: cột chồng
   * trong biểu đồ mỏng chừng tám điểm ảnh, mà người mù màu đỏ–lục thì chiếm
   * chừng một phần hai mươi đàn ông — hai sắc gần nhau là hai khúc cột dính
   * làm một.
   *
   * Chọn cỡ giữa (không quá nhạt, không quá sẫm) để đọc được trên cả nền sáng
   * lẫn nền tối mà không phải giữ hai bảng màu.
   */
  mau: string;
}

export const MO_TA_HE: Record<MaHeMay, MoTaHeMay> = {
  JAVA: { ten: 'Java ME', duoi: 'JAR', loaiTep: ['JAR', 'JAD'], icon: 'coffee', mau: '#c2761b' },
  ANDROID: { ten: 'Android', duoi: 'APK', loaiTep: ['APK', 'ZIP'], icon: 'smartphone', mau: '#1d8f6d' },
  IOS: { ten: 'iOS', duoi: 'IPA', loaiTep: ['IPA'], icon: 'apple', mau: '#64748b' },
  WINDOWS: { ten: 'Windows', duoi: 'EXE', loaiTep: ['EXE', 'ZIP'], icon: 'monitor', mau: '#2f6fe4' },
  MAC: { ten: 'macOS', duoi: 'DMG', loaiTep: ['DMG', 'PKG', 'ZIP'], icon: 'laptop', mau: '#7c3aed' },
};

/** Có phải mã hệ máy hợp lệ không — dùng để lọc tham số trên URL. */
export function laHeMay(v: string | undefined | null): v is MaHeMay {
  return !!v && (HE_MAY as readonly string[]).includes(v);
}

export function laLoaiTep(v: string | undefined | null): v is MaLoaiTep {
  return !!v && (LOAI_TEP as readonly string[]).includes(v);
}

/**
 * Câu nhắc riêng của từng hệ, hiện ngay dưới nút tải.
 *
 * MỌI hệ đều tải thẳng tệp về máy, kể cả iOS. Nhưng mỗi hệ có đúng một chỗ hay
 * làm người ta khựng lại lúc cài, và nói trước ở đây rẻ hơn nhiều so với việc
 * nhận một chủ đề "tải về không chạy" ở khu cộng đồng.
 *
 * Câu của iOS dài hơn cả vì chỗ khựng của nó cũng lớn hơn cả: bấm vào tệp IPA
 * trên iPhone thường thì máy không làm gì hết. Nói thẳng ra cần công cụ gì thì
 * người tải còn biết đường, chứ giấu đi không làm tệp cài được.
 */
export const NHAC_KHI_CAI: Partial<Record<MaHeMay, string>> = {
  JAVA: 'Chép tệp JAR vào thẻ nhớ rồi mở bằng trình quản lý tệp của máy. Tệp JAD chỉ là phần mô tả đi kèm, một mình nó không cài được.',
  ANDROID: 'Android sẽ hỏi có cho cài từ nguồn ngoài không — bật riêng cho trình duyệt bạn đang dùng, cài xong nên tắt lại.',
  IOS: 'Tệp IPA cần một công cụ ký để cài, như AltStore hoặc Sideloadly trên máy tính. Máy đã bẻ khoá hoặc chợ ứng dụng thay thế ở châu Âu thì cài thẳng được.',
  WINDOWS: 'Windows SmartScreen có thể chặn tệp chưa ký: bấm “Thông tin thêm” rồi “Vẫn chạy”.',
  MAC: 'Tệp chưa ký thì macOS báo không mở được: vào Cài đặt hệ thống › Quyền riêng tư & Bảo mật, bấm “Mở bằng mọi cách”.',
};

export const NGON_NGU: Record<string, string> = {
  en: 'Tiếng Anh',
  vi: 'Tiếng Việt',
  'da-ngon-ngu': 'Nhiều thứ tiếng',
};
