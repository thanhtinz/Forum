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
