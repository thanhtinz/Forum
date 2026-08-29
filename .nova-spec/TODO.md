# Nova Platform — Việc còn lại

Bản này ghi **hiện trạng thật**, đã đối chiếu với mã và dữ liệu. Kế hoạch dựng
ban đầu (P0–P16) đã xong và không còn ý nghĩa, nên gỡ đi — sản phẩm nay là diễn
đàn + kho game tính bằng điểm, không còn blog, tiền thật hay VIP.

Trạng thái: `tsc` sạch · `npm run scan` sạch · `npm run test:that` 634/634.

---

## Cần bạn quyết, không phải việc kỹ thuật

- [ ] **Nhãn đếm ngược ở nông trại bị cắt trên điện thoại** ("2 giờ 10…"). Muốn
      hết thì phải rút cách viết thời gian (kiểu "2h10"), mà đổi cách viết là
      đổi thứ người dùng đọc quen.

---

## Nợ kỹ thuật

Xếp theo mức đáng làm. Không cái nào đang gây lỗi cho người dùng.

- [ ] **38 chỗ ngủ cứng còn lại trong bộ kiểm.** Đã đổi 34 chỗ sang `doiToi`;
      số còn lại là những mục kiểm khẳng định KHÔNG có gì xảy ra, mà không chờ
      được một việc không xảy ra — ngủ cứng ở đó mới đúng. Đừng "dọn nốt cho
      đều".

- [ ] **35 chỗ `Math.ceil(total / SIZE)` thiếu `Math.max(1, …)`.** Hiện KHÔNG
      gây lỗi — `Pagination` đã tự ẩn khi `totalPages <= 1` — nên đây là chuyện
      gọn gàng, không phải lỗi. Ghi lại để khỏi ai đó "phát hiện" lại lần nữa.

- [ ] **`ThreadOwnerMenu` tự dựng bảng thả xuống** thay vì dùng `Popover`. Ba
      chỗ cùng kiểu đã chuyển rồi (menu điều hành, @nhắc tên, cảm xúc chat) vì
      bị khối cha `overflow-hidden` cắt; chỗ này chưa thấy bị cắt nhưng vẫn nên
      gom về một mối.

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

**Trợ năng** — 24 nút chỉ có biểu tượng nay có `aria-label`; sáu lớp phủ nay
khoá cuộn nền qua hook `useKhoaCuon`; `/online` vào được từ điện thoại.
