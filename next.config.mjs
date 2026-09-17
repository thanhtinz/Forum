/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
   * KHÔNG khai `images.remotePatterns`, và đó là chủ ý.
   *
   * Chỗ này từng mở `hostname: '**'` với chú thích "ảnh game do quản trị dán
   * vào bằng địa chỉ ngoài, nên không khoá tên miền". Nhưng cả `src/` KHÔNG có
   * một chỗ nào dùng `next/image` — `NguoiDung.tsx` còn ghi rõ là cố ý không
   * dùng, và mọi ảnh trong cửa hàng đều là thẻ `img` trần. Nghĩa là khối cấu
   * hình ấy không phục vụ thứ gì đang chạy.
   *
   * Cái nó phục vụ là người ngoài: `/_next/image?url=…` mở cho bất kỳ ai nhờ
   * máy chủ cửa hàng tải ảnh từ tên miền tuỳ ý rồi đổi cỡ giúp — tốn băng
   * thông và CPU của cửa hàng cho ảnh của họ. Gỡ đi thì Next tự chối mọi địa
   * chỉ ngoài, và không có trang nào trong cửa hàng mất thứ gì.
   *
   * Ngày nào thật sự cần `next/image` cho ảnh ngoài thì khai lại — nhưng khai
   * đúng mấy tên miền cần, đừng khai `**`.
   */
};
export default nextConfig;
