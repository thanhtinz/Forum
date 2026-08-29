# Nova Platform — Việc còn lại

Bản này ghi **hiện trạng thật**, đã đối chiếu với mã và dữ liệu. Kế hoạch dựng
ban đầu (P0–P16) đã xong và không còn ý nghĩa, nên gỡ đi — sản phẩm nay là diễn
đàn + kho game tính bằng điểm, không còn blog, tiền thật hay VIP.

Trạng thái: `tsc` sạch · `npm run scan` sạch · `npm run test:that` 634/634.

---

## Còn thiếu tính năng

- [ ] **Dragon City** — trò cuối chưa dựng trong bộ trò JohnCMS. Ảnh đã có sẵn:
      9 con rồng × 6 khung tiến hoá trong `public/hoai-niem/rong/`. Bản gốc có
      ấp trứng 12 giờ, cho ăn, đấu trường.

- [ ] **`/online` không vào được từ điện thoại.** Trang này chỉ có lối vào ở cột
      bên, mà cột bên nằm trong `hidden lg:block`. Thêm vào `MobileNav`.

---

## Cần bạn quyết, không phải việc kỹ thuật

- [ ] **Cụm `/admin/slides`.** Quản trị lập được slide, bảng `Slide` có dữ liệu,
      nhưng **trang chủ không dựng slide nào** — tức là đang quản một thứ chẳng
      hiện ở đâu. Hai đường: nối slide vào trang chủ cho nó có tác dụng, hoặc gỡ
      hẳn cụm này (trang + action + `SlideManager` + model + mục nav). Gỡ là
      không lùi được nên phải hỏi trước.

- [ ] **Nhãn đếm ngược ở nông trại bị cắt trên điện thoại** ("2 giờ 10…"). Muốn
      hết thì phải rút cách viết thời gian (kiểu "2h10"), mà đổi cách viết là
      đổi thứ người dùng đọc quen.

---

## Nợ kỹ thuật

Xếp theo mức đáng làm. Không cái nào đang gây lỗi cho người dùng.

- [ ] **~70 chỗ trong bộ kiểm ngủ cứng rồi đọc thẳng cơ sở dữ liệu**, rải ở 20
      tệp. Ba chỗ từng đỏ oan đã đổi sang `doiToi`; số còn lại chưa đỏ lần nào
      nên để nguyên — viết lại mù quáng cả bảy chục chỗ thì rủi ro làm hỏng bài
      đang chạy tốt còn cao hơn cái được. Chỗ nào đỏ oan thì sửa chỗ đó, đã có
      sẵn mẫu ở `39-ban-bau-cua`, `30-chua-doc`, `34-thu-tu-canh-ten`.

- [ ] **40 nút đóng thiếu `aria-label`** — trình đọc màn hình chỉ nghe thấy "nút".

- [ ] **7 hộp thoại tự dựng bằng `fixed inset-0`** thay vì dùng `Modal.tsx` sẵn
      có, nên không khoá cuộn nền: mở hộp thoại rồi lăn chuột là trang phía sau
      trôi theo.

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
trên bản dựng thật.
