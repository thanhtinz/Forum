import type { MaHeMay } from '@/lib/he-may';

/*
 * HÌNH CỦA TỪNG HỆ MÁY.
 *
 * Bộ `lucide` không có hình cho Android hay iOS, nên trước đây phải mượn tạm:
 * Android lấy cái điện thoại chữ nhật, iOS lấy quả táo CÓ CUỐNG VÀ LÁ của bộ
 * ấy — tức là một quả táo thật, không phải dấu hiệu của hãng. Người dùng quét
 * mắt qua hàng tab chọn hệ máy thì hai hình ấy đọc ra "điện thoại" và "trái
 * cây", chứ không đọc ra "Android" và "iOS".
 *
 * Nên vẽ tay đúng ba hình mà bộ kia thiếu: đầu robot Android, dấu táo khuyết
 * của Apple, và bốn ô cửa sổ của Windows. Đây là hình NHẬN DIỆN NỀN TẢNG —
 * cùng loại với cái người ta thấy ở mọi chợ ứng dụng — chứ không phải ảnh
 * game, nên không dính luật "đừng vẽ ảnh game giả" của cửa hàng này.
 *
 * Vẽ theo lối `currentColor` và cỡ truyền vào, y hệt `lucide`, để đặt lẫn vào
 * giữa mấy hình của bộ ấy mà không lệch một nhịp nào.
 */

/** Đầu robot: vòm tròn, hai râu, hai mắt — dáng ai cũng nhận ra là Android. */
function Android({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.2 7.6 4.9 5.4a.5.5 0 0 1 .87-.5l1.33 2.3a8.6 8.6 0 0 1 3.9-.86c1.42 0 2.74.3 3.9.86l1.33-2.3a.5.5 0 1 1 .87.5l-1.3 2.2A6.6 6.6 0 0 1 19 13H5a6.6 6.6 0 0 1 1.2-5.4Zm2.3 2.15a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Zm7 0a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Z" />
      <path d="M5 14h14v4.5A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5V14Z" />
      <rect x="1.5" y="13.5" width="2.4" height="6.2" rx="1.2" />
      <rect x="20.1" y="13.5" width="2.4" height="6.2" rx="1.2" />
    </svg>
  );
}

/** Dấu táo khuyết — thứ người ta đọc ra "máy Apple", không phải quả táo. */
function Tao({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.4 12.5c0-2.1 1.6-3.2 1.7-3.3-.9-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.4 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2 1-.04 1.4-.65 2.6-.65 1.2 0 1.55.65 2.6.63 1.07-.02 1.75-1 2.4-2a9 9 0 0 0 1.1-2.2c-.03-.01-2.1-.8-2.1-3.18Z" />
      <path d="M14.5 6.2c.55-.67.92-1.6.82-2.53-.79.03-1.75.53-2.32 1.2-.51.58-.96 1.53-.84 2.43.88.07 1.79-.45 2.34-1.1Z" />
    </svg>
  );
}

/** Bốn ô cửa sổ. */
function CuaSo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 5.6 11 4.4v7.1H3V5.6Zm9-1.35L21 3v8.5h-9V4.25ZM3 12.5h8v7.1L3 18.4v-5.9Zm9 0h9V21l-9-1.25V12.5Z" />
    </svg>
  );
}

export function HinhHeMay({ he, co = 16 }: { he: MaHeMay; co?: number }) {
  switch (he) {
    case 'ANDROID': return <Android size={co} />;
    case 'IOS':
    case 'MAC': return <Tao size={co} />;
    case 'WINDOWS': return <CuaSo size={co} />;
    default:
      // Java ME: cốc cà phê bốc khói — dấu hiệu của Java từ thời nó ra đời, và
      // đúng thứ người chơi game Java đời đầu nhận ra ngay.
      return (
        <svg width={co} height={co} viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M17 8h1a3 3 0 0 1 0 6h-1" />
          <path d="M3 8h14v5a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Z" />
          <path d="M7 2.5c.6.8.6 1.7 0 2.5M11 2.5c.6.8.6 1.7 0 2.5" />
        </svg>
      );
  }
}
