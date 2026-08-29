# Nova Platform — Việc còn lại

Bản này ghi **hiện trạng thật**, đã đối chiếu với mã và dữ liệu. Kế hoạch dựng
ban đầu (P0–P16) đã xong và không còn ý nghĩa, nên gỡ đi — sản phẩm nay là diễn
đàn + kho game tính bằng điểm, không còn blog, tiền thật hay VIP.

Trạng thái: `tsc` sạch · `npm run scan` sạch · `npm run test:that` **677/677**.

---

## Nợ kỹ thuật

Xếp theo mức đáng làm. Không cái nào đang gây lỗi cho người dùng.

- [ ] **38 chỗ ngủ cứng còn lại trong bộ kiểm.** Đã đổi 34 chỗ sang `doiToi`;
      số còn lại là những mục kiểm khẳng định KHÔNG có gì xảy ra, mà không chờ
      được một việc không xảy ra — ngủ cứng ở đó mới đúng. Đừng "dọn nốt cho
      đều".

- [ ] **Hai hàm `moTaConLai` giống hệt nhau** ở `farm-const.ts` và
      `rong-const.ts`, khác mỗi câu trả về khi hết giờ ("đã chín" / "xong
      rồi"). Gộp lại thì phải truyền câu ấy vào, mà lúc đó hàm chung cũng chỉ
      còn là chỗ chứa một phép chia — chưa chắc đáng.

- [ ] **35 chỗ `Math.ceil(total / SIZE)` thiếu `Math.max(1, …)`.** Hiện KHÔNG
      gây lỗi — `Pagination` đã tự ẩn khi `totalPages <= 1` — nên đây là chuyện
      gọn gàng, không phải lỗi. Ghi lại để khỏi ai đó "phát hiện" lại lần nữa.

---

## Đã xong trong đợt gần đây

Ghi lại để khỏi làm lại, và để biết chỗ nào vừa đụng vào.

**Bảo mật** — vá bốn lỗ hổng nặng: `purgeExpiredMessages` là endpoint công khai
không kiểm gì; link tải game không ràng buộc vào người tải; khoá ký có giá trị
dự phòng nằm sẵn trong mã; người chưa đăng nhập gỡ được lệnh cấm của người khác.

**Toàn vẹn số liệu** — gom bộ đếm về `forum-counters.ts`, vá bốn điều kiện đua
(chọn lời giải, điểm danh, uy tín, kết bạn), thêm `scripts/soat-bo-dem.mjs`.

**Tính năng** — khu giải trí (bầu cua bàn chung, oẳn tù tì, trắc nghiệm bám bản
`quiz.php` gốc, nông trại), câu lạc bộ có tên viết tắt, danh hiệu theo cấp bậc
thay cho rank và thôi bán.

**Giao diện điện thoại** — vá hai chỗ tràn ngang, rút chiều dài các trang dài
nhất (kho game 3799→2143px, game 4416→3327px, trang chủ 3019→2252px), thêm
`GopTrenDienThoai` cho khối tra cứu.

**Phân trang** — bốn danh sách trước đây cắt trần rồi thôi, dữ liệu vượt trần
mất hẳn lối vào: bình luận game, tin nhắn, bạn bè đã mời, kho ảnh hội thoại.

**Bộ kiểm** — tìm ra bốn nguồn đỏ oan và xử hết; thêm `npm run test:that` chạy
trên bản dựng thật; 34 chỗ chờ theo đồng hồ đổi sang chờ theo trạng thái.

**Đảo rồng** — trò cuối của bộ trò JohnCMS: ấp trứng, nuôi lớn, đấu trường,
sưu tầm 9 loài × 6 màu.

**Slide trang chủ** — nối `Slide` vào trang chủ (trước đây quản trị lập được mà
chẳng hiện ở đâu), kèm vá chỗ `saveSlide` không kiểm định dạng ảnh.

**Đăng bài một lối** — trước có năm chỗ mở khung đăng chủ đề, bốn trong số đó
là lối toàn cục tự đoán hộ chuyên mục (tệ nhất là nút ở trang chủ, nó lấy
`forums[0]`). Gỡ cả bốn, xoá trang `/dang-chu-de`; nay chỉ đăng bài từ trong
chuyên mục.

**Nhãn đếm ngược ở nông trại** — ô đất chỉ cho nhãn 77px ở khổ 390px mà "11 giờ
58 phút" cần 102px nên bị cắt. Thêm `moTaConLaiNgan` dùng RIÊNG cho nhãn dưới
chân ô ("11h58"); cách viết đầy đủ giữ nguyên ở mọi chỗ khác, kể cả thanh việc
ngay bên dưới mảnh đất.

**Trợ năng** — 24 nút chỉ có biểu tượng nay có `aria-label`; sáu lớp phủ nay
khoá cuộn nền qua hook `useKhoaCuon`; `/online` vào được từ điện thoại.
`ThreadOwnerMenu` chuyển sang `Popover` — nay không còn bảng thả xuống nào tự
dựng bằng `absolute` nữa.
