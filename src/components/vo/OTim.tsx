'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

/**
 * Ô tìm trên thanh đầu trang.
 *
 * Là <form> thật với `action`, không phải một cái ô nghe phím: bấm Enter trên
 * bàn phím điện thoại phải đi tìm được, mà bàn phím ảo chỉ gửi phím "tìm" cho
 * biểu mẫu chứ không gửi sự kiện phím cho ô nhập.
 *
 * TỰ ĐỌC TỪ KHOÁ TRÊN ĐỊA CHỈ, không đợi ai truyền xuống.
 *
 * Ô này nằm trong bố cục gốc — một thành phần máy chủ, mà thành phần máy chủ
 * thì không đọc được `searchParams`. Nên trước đây nó LUÔN RỖNG, kể cả khi
 * đang đứng ở trang kết quả tìm: gõ "bounce", bấm Enter, ra trang kết quả, mà
 * ô trên thanh trắng trơn như chưa tìm gì.
 *
 * Trang tìm chữa tạm bằng cách dựng thêm một ô THỨ HAI trong thân trang, có
 * điền sẵn từ khoá. Kết quả là trên điện thoại có hai ô tìm y hệt nhau xếp
 * chồng — App Store chỉ có đúng một. Đọc thẳng từ địa chỉ thì hết cả hai
 * chuyện cùng lúc.
 */
export function OTim({ giaTriDau = '' }: { giaTriDau?: string }) {
  const router = useRouter();
  const thamSo = useSearchParams();
  const tuDiaChi = thamSo.get('q') ?? '';
  const [chu, datChu] = useState(giaTriDau || tuDiaChi);

  /*
   * Địa chỉ đổi thì ô đổi theo — nhưng chỉ theo ĐỊA CHỈ, không theo từng phím.
   *
   * Bấm nút lùi của trình duyệt về một lượt tìm trước, hay bấm một gợi ý dẫn
   * sang từ khoá khác, thì ô phải nói đúng thứ đang bày ra. Không có nó thì ô
   * đứng lại ở chữ gõ lần cuối, và người ta đọc ra là trang hỏng.
   */
  useEffect(() => { datChu(tuDiaChi); }, [tuDiaChi]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = chu.trim();
        router.push(q ? `/tim?q=${encodeURIComponent(q)}` : '/tim');
      }}
      className="relative min-w-0 flex-1"
    >
      <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mo" />
      <input
        name="q"
        value={chu}
        onChange={(e) => datChu(e.target.value)}
        placeholder="Tìm game, nhà phát triển…"
        aria-label="Tìm game"
        className="o-nhap o-nhap-kinh !pl-11"
      />
    </form>
  );
}
