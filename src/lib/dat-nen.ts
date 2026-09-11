/**
 * Đoạn mã đặt nền, chạy TRƯỚC khi trang vẽ ra.
 *
 * Để React đặt nền sau khi tải xong thì người chọn nền tối sẽ thấy một nháy
 * trắng giữa mặt mỗi lần mở trang. Đoạn này đồng bộ, nằm ngay đầu `<head>`,
 * nên nền đúng ngay từ khung hình đầu tiên.
 *
 * Ở ĐÂY, KHÔNG chép vào từng bố cục. Dự án có HAI bố cục gốc — cửa hàng và
 * quản trị — và đã dính đúng chuyện chép: lúc tách ra, đoạn này ở lại bên cửa
 * hàng, còn khu quản trị thì không có bản nào. Kết quả là người chọn nền tối
 * mở khu quản trị ra bị loá cả mắt, mà lỗi ấy không có gì báo: cả hai trang
 * đều chạy, chỉ là một trang không nghe lời cài đặt.
 */
export const MA_DAT_NEN =
  `try{if(localStorage.getItem('sunny:nen')==='toi')document.documentElement.dataset.nen='toi'}catch(e){}`;
