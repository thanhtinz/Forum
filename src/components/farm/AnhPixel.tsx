import type { CSSProperties } from 'react';

/**
 * Một tấm ảnh pixel art, phóng to mà không bị nhoè.
 *
 * Cả trang nông trại dùng chung bộ ảnh 32 pixel của bản cũ, chỗ nào cũng phải
 * kèm `imageRendering: pixelated` và một dòng tắt cảnh báo `no-img-element`
 * (ảnh nằm trong `public`, không qua `next/image` vì `next/image` mặc định
 * nội suy lại lúc tối ưu, đúng thứ phải tránh). Gói lại một chỗ để mỗi lần
 * dùng chỉ còn một thẻ, không rải hai dòng lặp đi lặp lại khắp nơi.
 *
 * `phong` phóng theo BỘI SỐ NGUYÊN bằng `transform: scale`, dùng cho những bộ
 * ảnh không cùng kích thước (nông sản có tấm 27, có tấm 32): ép chung một
 * chiều cao thì tấm 32 phải co theo tỉ lệ lẻ và vỡ nét, còn `scale` giữ đúng
 * bội số cho mọi tấm.
 */
interface Props {
  src: string;
  /** Để trống nghĩa là ảnh chỉ để nhìn — sẽ tự `aria-hidden`. */
  alt?: string;
  className?: string;
  style?: CSSProperties;
  phong?: number;
}

export function AnhPixel({ src, alt = '', className, style, phong }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      draggable={false}
      className={className}
      style={{
        imageRendering: 'pixelated',
        ...(phong ? { transform: `scale(${phong})` } : null),
        ...style,
      }}
    />
  );
}
