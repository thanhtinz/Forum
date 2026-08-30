import { cn } from '@/lib/utils';

/**
 * Icon pixel lấy từ bộ `pixelarticons` (1306 icon), dựng bằng CSS.
 *
 * Không phải ảnh mà là một khối được `mask` theo hình icon, nên:
 *  • Ăn theo `currentColor` — tự đổi màu theo chữ xung quanh, nền sáng hay nền
 *    tối đều đúng. Ảnh GIF thì màu chết cứng, sang nền tối là chỏi hẳn.
 *  • Nhúng thẳng vào CSS lúc build, không tốn thêm lượt tải và không bao giờ
 *    có chuyện vỡ ảnh.
 *
 * VÌ SAO PHẢI CÓ BẢNG `ICON` DƯỚI ĐÂY thay vì ghép chuỗi tên:
 * Tailwind tìm lớp bằng cách QUÉT VĂN BẢN mã nguồn. Ghép tên lớp từ biến —
 * `icon-[pixelarticons--` + tên + `]` — thì nó không thấy lớp nào để sinh CSS,
 * và icon lặng lẽ mất tăm. Nên mọi tên lớp phải nằm nguyên vẹn trong tệp này.
 *
 * Chính vì quét văn bản, ngay cả CHÚ THÍCH cũng bị quét: viết dạng ghép chuỗi
 * liền một mạch ở đây thôi là plugin iconify đã kêu "Invalid icon name" mỗi
 * lần biên dịch, nên ví dụ trên phải để rời ra như vậy.
 */
const ICON = {
  // Thanh soạn thảo
  mau: 'icon-[pixelarticons--colors-swatch]',
  canhGiua: 'icon-[pixelarticons--align-center]',
  lienKet: 'icon-[pixelarticons--link]',
  anh: 'icon-[pixelarticons--image]',
  trichDan: 'icon-[pixelarticons--quote-text-inline]',
  maNguon: 'icon-[pixelarticons--code]',
  danhSach: 'icon-[pixelarticons--bulletlist]',
  an: 'icon-[pixelarticons--eye-closed]',
  khoa: 'icon-[pixelarticons--lock]',

  // Diễn đàn
  chuDe: 'icon-[pixelarticons--message-text]',
  baiViet: 'icon-[pixelarticons--file-text]',
  thanhVien: 'icon-[pixelarticons--users]',
  /**
   * Ba mục người ở trang cá nhân đứng cạnh nhau nên phải khác hình hẳn, và
   * dùng đúng thứ dấu mà các nút bên trên đang dùng:
   *  • người theo dõi — 👤＋ dấu cộng, vì họ là người đã bấm "Theo dõi" mình;
   *  • đang theo dõi — 👤✓ dấu tích, khớp với nút "Đang theo dõi";
   *  • bạn bè — 👥 hai người, quan hệ hai chiều.
   *
   * Hai lần chọn hụt, ghi lại để khỏi lặp:
   *  • `group` nhìn tưởng là nhóm người, hoá ra là lưới ô vuông của nhóm BỐ CỤC.
   *  • `handshake` phóng to thì đẹp nhưng ở đúng cỡ 16px chỉ còn một vệt nhoè.
   *    Chọn icon phải soi ở CỠ THẬT, không phải cỡ phóng to.
   */
  nguoiTheoDoi: 'icon-[pixelarticons--user-plus]',
  theoDoi: 'icon-[pixel--user-check]',
  banBe: 'icon-[pixelarticons--users]',
  /** `album` của bộ này là quyển SÁCH, không phải album ảnh — đừng lẫn. */
  album: 'icon-[pixelarticons--image-multiple]',
  /**
   * Chồng xu, KHÔNG dùng icon có ký hiệu `$`: trang này chỉ tính điểm, không
   * có tiền thật, nên một cái đô la ở đây là nói sai bản chất.
   */
  diem: 'icon-[pixel--coins]',
  uyTin: 'icon-[pixelarticons--heart]',
  binhChon: 'icon-[pixelarticons--chart-bar]',
  soLuuBut: 'icon-[pixelarticons--book-open]',
  /**
   * Dùng cho CON SỐ "đang trực tuyến", không dùng làm dấu trên avatar — chỗ ấy
   * một chấm tròn thường vẫn rõ hơn mọi icon. `avatar` trước đây là khung chân
   * dung, chẳng nói lên chuyện đang kết nối.
   */
  trucTuyen: 'icon-[pixel--wifi-solid]',

  // Tin nhắn
  thuDaDoc: 'icon-[pixelarticons--mail-open]',
  thuChuaDoc: 'icon-[pixelarticons--mail-unread]',

  // Đánh giá — lấy từ bộ `pixel` chứ không phải `pixelarticons`, vì bộ kia
  // chỉ có sao viền. Sao đánh giá cần cả bản ĐẶC mới phân biệt được "đã đạt"
  // với "chưa đạt"; hai bản viền chỉ khác màu thì nhìn không ra mấy sao.
  sao: 'icon-[pixel--star]',
  saoDay: 'icon-[pixel--star-solid]',
} as const;

export type PixelIconName = keyof typeof ICON;

export function PixelIcon({
  name, alt, className,
}: {
  name: PixelIconName;
  /** Có chữ thay thế thì icon mang nghĩa; bỏ trống là icon trang trí. */
  alt?: string;
  className?: string;
}) {
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
      className={cn(ICON[name], 'inline-block size-4 shrink-0 align-[-0.15em]', className)}
    />
  );
}
