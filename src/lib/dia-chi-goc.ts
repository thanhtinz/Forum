/**
 * Địa chỉ gốc của trang, dùng cho sitemap, robots và ảnh chia sẻ.
 *
 * Lấy từ biến môi trường vì cùng một mã chạy ở ba nơi khác nhau — máy người
 * viết, bản thử, bản thật — và mỗi nơi một tên miền. Viết cứng một địa chỉ vào
 * mã thì sitemap ở bản thật sẽ trỏ về `localhost`, mà lỗi ấy không có gì báo:
 * trang vẫn chạy, chỉ có máy tìm kiếm là đọc ra một danh sách đường dẫn không
 * tồn tại.
 *
 * Thiếu biến thì rơi về localhost — đúng cho máy người viết, và ở bản thật thì
 * biến ấy phải có, không có là cấu hình sai.
 */
export const DIA_CHI_GOC = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '');

/**
 * Tấm ảnh hiện ra khi dán liên kết CỬA HÀNG vào Zalo, Messenger, Facebook.
 *
 * Để riêng một hằng số vì nay có hai chỗ cần nó: bố cục gốc đặt bản mặc định
 * cho cả trang, và trang game phải TỰ LẶP LẠI nó khi game chưa có ảnh riêng.
 *
 * Phải lặp lại vì Next ghép thẻ meta theo lối THAY CẢ CỤM: trang con khai
 * `openGraph` là cụm ấy đè hẳn lên cụm của bố cục gốc, chứ không trộn từng
 * trường. Đặt `openGraph` mà quên `images` là game nào chưa có ảnh riêng sẽ
 * mất luôn ô xem trước — chính là lỗi bài kiểm 02 vừa bắt được.
 */
export const ANH_CHIA_SE = { url: '/anh-chia-se.png', width: 1200, height: 630 };
