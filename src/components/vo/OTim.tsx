'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

/**
 * Ô tìm trên thanh đầu trang.
 *
 * Là <form> thật với `action`, không phải một cái ô nghe phím: bấm Enter trên
 * bàn phím điện thoại phải đi tìm được, mà bàn phím ảo chỉ gửi phím "tìm" cho
 * biểu mẫu chứ không gửi sự kiện phím cho ô nhập.
 */
export function OTim({ giaTriDau = '' }: { giaTriDau?: string }) {
  const router = useRouter();
  const [chu, datChu] = useState(giaTriDau);

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
        className="o-nhap !pl-11"
      />
    </form>
  );
}
