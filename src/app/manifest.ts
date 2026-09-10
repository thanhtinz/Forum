import type { MetadataRoute } from 'next';

/**
 * Bản kê khai để trình duyệt cài trang này thành ứng dụng trên máy.
 *
 * `display: 'standalone'` là thứ đáng nói nhất: cài xong thì trang chạy toàn
 * màn hình, không còn thanh địa chỉ của trình duyệt. Đó cũng chính là lý do
 * thanh tab đáy phải nổi lên và bo tròn — ở chế độ ấy một thanh dính sát mép
 * trông y hệt một trang web bị nhét vào khung ứng dụng.
 *
 * Viết bằng `manifest.ts` chứ không phải một tệp JSON tĩnh: Next tự đặt đúng
 * kiểu MIME và tự gắn thẻ <link rel="manifest">, khỏi phải nhớ làm hai việc ấy.
 */
export default function banKeKhai(): MetadataRoute.Manifest {
  return {
    name: 'SunnyStore — kho game Java, Android, iOS',
    short_name: 'SunnyStore',
    description: 'Tải game về máy, và bàn luận cùng người chơi khác ngay trong trang của từng game.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0074e5',
    lang: 'vi',
    orientation: 'portrait',
    categories: ['games', 'entertainment'],
    icons: [
      { src: '/bieu-tuong-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/bieu-tuong-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // `maskable`: Android tự cắt biểu tượng theo hình của máy (tròn, vuông
      // bo, giọt nước). Không khai báo thì nó bọc thêm một khung trắng quanh
      // biểu tượng, trông như dán nhãn lên màn hình chính.
      { src: '/bieu-tuong-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Tìm game', url: '/tim' },
      { name: 'Bảng xếp hạng', url: '/bxh' },
      { name: 'Thư viện của tôi', url: '/thu-vien' },
    ],
  };
}
