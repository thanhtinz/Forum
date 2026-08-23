# Bộ kiểm tự động

Kiểm những chỗ mà lỗi âm thầm gây thiệt hại thật: nội dung đã trả tiền bị lộ,
quyền đăng bài không được thực thi, truy vấn lấy về nhiều cột hơn cần thiết.

## Chạy trên máy

```bash
npm run seed                       # dữ liệu mẫu (chỉ cần lần đầu)
npm run dev                        # máy chủ ở cổng 3000
npm test                           # chạy tất cả
npm test paid                      # chỉ chạy tệp có "paid" trong tên
```

Cần một máy chủ đang chạy ở `BASE_URL` (mặc định `http://localhost:3000`) và
CSDL đã có dữ liệu mẫu. Riêng `npm test overfetch` là quét tĩnh, chạy được
ngay không cần máy chủ.

**Lưu ý:** `npm run build` ghi đè thư mục `.next`, làm máy chủ `dev` đang chạy
mất các tệp JavaScript. Biểu hiện là biểu mẫu đăng nhập gửi đi mà không có
JavaScript rồi bộ kiểm treo. Khởi động lại `npm run dev` là xong.

## Thêm mục kiểm

Tạo tệp mới trong `tests/cases/`, xuất mặc định một hàm nhận `check`:

```js
export default async function run(check) {
  check('tên mục kiểm', điềuKiện, 'chi tiết khi hỏng');
}
```

Sai một mục thì tiến trình thoát với mã khác 0, CI báo đỏ. Mỗi tệp tự dọn dữ
liệu nó tạo ra trong khối `finally` — bộ kiểm chạy trên CSDL thật nên không
được để lại rác.

## Đã cố tình kiểm ngược

Bộ kiểm này từng được thử bằng cách tái tạo lại đúng lỗi cũ (thêm
`hiddenSource` vào `postCardSelect`) — kết quả báo hỏng 4 mục và thoát mã 1.
Bộ kiểm không bắt được lỗi thì không đáng tin.
