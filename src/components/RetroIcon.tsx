import { RETRO_ICONS, type RetroIconName } from '@/lib/retro-icons';

/**
 * Icon pixel của forum wap ngày trước (bộ icon JohnCMS).
 *
 * Hai điều quyết định icon nét hay mờ, và cả hai đều dễ làm sai:
 *
 *  1. **Vẽ đúng kích thước gốc, hoặc bội số NGUYÊN của nó.** Bộ icon này có
 *     tới 15 kích thước khác nhau (16×16, 20×16, 65×12, 18×9…). Ép hết vào
 *     một ô vuông chung là co giãn lẻ: điểm ảnh gốc rơi vào ranh giới giữa hai
 *     điểm ảnh màn hình nên chỗ to chỗ nhỏ, nhìn mờ và răng cưa lệch. Kích
 *     thước lấy từ bảng sinh tự động `retro-icons.ts`, không đoán.
 *
 *  2. **`image-rendering: pixelated`.** Không có nó thì trình duyệt làm mịn
 *     khi phóng to, mất sạch nét vẽ từng điểm.
 *
 * Dùng `<img>` thường chứ không phải `next/image`: ảnh 16×16 còn nhỏ hơn cả
 * phần mã mà bộ tối ưu ảnh sinh ra để phục vụ chúng.
 */
export function RetroIcon({
  name, alt = '', scale = 1, className,
}: {
  /** Tên trong `public/retro`, không kèm đuôi — vd `bb/bold` hay `award`. */
  name: RetroIconName;
  alt?: string;
  /**
   * Bội số phóng to. CHỈ nhận số nguyên — 1.5 lần là mờ ngay.
   * Kiểu ở đây chặn luôn cho khỏi lỡ tay.
   */
  scale?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const { w, h, ext } = RETRO_ICONS[name];
  const rong = w * scale;
  const cao = h * scale;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/retro/${name}.${ext}`}
      alt={alt}
      width={rong}
      height={cao}
      aria-hidden={alt ? undefined : true}
      className={className}
      // Đặt cả `width`/`height` lẫn style: thuộc tính giữ chỗ trước khi ảnh về
      // (khỏi giật bố cục), style chặn CSS ngoài kéo giãn mất tỷ lệ.
      style={{ imageRendering: 'pixelated', width: rong, height: cao }}
    />
  );
}
