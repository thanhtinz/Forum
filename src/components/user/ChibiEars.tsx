/**
 * Đôi tai chibi gắn trên bong bóng chat.
 *
 * Vẽ bằng SVG thay vì dùng ảnh: đổi màu theo bong bóng được, nét không vỡ
 * ở màn hình mật độ cao, và không phải tải thêm tệp nào.
 */
export function ChibiEars({ kind, color, mine }: {
  kind: 'cat' | 'bear' | 'bunny';
  color: string;
  /** Bong bóng của mình nằm bên phải nên tai lệch sang phải cho cân. */
  mine: boolean;
}) {
  const common = {
    className: `pointer-events-none absolute -top-2.5 ${mine ? 'right-4' : 'left-4'}`,
    'aria-hidden': true as const,
  };

  if (kind === 'cat') {
    return (
      <svg {...common} width="46" height="16" viewBox="0 0 46 16">
        <path d="M2 16 6 2l14 14z" fill={color} />
        <path d="M44 16 40 2 26 16z" fill={color} />
        <path d="M7 15 9 6l7 9z" fill="#fda4af" opacity="0.75" />
        <path d="M39 15 37 6l-7 9z" fill="#fda4af" opacity="0.75" />
      </svg>
    );
  }

  if (kind === 'bear') {
    return (
      <svg {...common} width="52" height="16" viewBox="0 0 52 16">
        <circle cx="12" cy="12" r="11" fill={color} />
        <circle cx="40" cy="12" r="11" fill={color} />
        <circle cx="12" cy="13" r="5" fill="#fda4af" opacity="0.7" />
        <circle cx="40" cy="13" r="5" fill="#fda4af" opacity="0.7" />
      </svg>
    );
  }

  // Thỏ: tai dài, hơi nghiêng ra hai bên
  return (
    <svg {...common} width="40" height="22" viewBox="0 0 40 22">
      <ellipse cx="12" cy="12" rx="5" ry="11" transform="rotate(-14 12 12)" fill={color} />
      <ellipse cx="28" cy="12" rx="5" ry="11" transform="rotate(14 28 12)" fill={color} />
      <ellipse cx="12" cy="13" rx="2.2" ry="6.5" transform="rotate(-14 12 13)" fill="#fda4af" opacity="0.7" />
      <ellipse cx="28" cy="13" rx="2.2" ry="6.5" transform="rotate(14 28 13)" fill="#fda4af" opacity="0.7" />
    </svg>
  );
}
