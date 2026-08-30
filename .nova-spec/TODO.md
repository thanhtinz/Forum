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

**Nông trại: tên gốc, phân bón nhiều loại, trời chuyển sáng tối** — tên nông
sản sửa theo đúng bộ của bản gốc (Lúa · Cà chua · Cà rốt · Dứa · Dưa hấu · Nho
· Hoa hồng · Xoài · Thanh long · Hoa hướng dương · Hoa tulip); đợt trước tôi
nhìn ảnh đoán bừa nên sai ba tên. Phân bón thành năm loại (`FarmFert`), ô đất
lưu LOẠI phân đã bón chứ không phải cờ đúng/sai. Biển xếp hạng dùng `bxh.png`
của bản gốc (có sẵn chữ Việt), bảng đơn hàng vẽ lại theo đúng khuôn và bảng
màu của tấm ấy. Trời tính từ `doToiTroi` — số thực 0..1 theo ĐỒNG HỒ ĐANG
CHẠY, nên cảnh chuyển dần trong hai tiếng quanh 5–7h và 17–19h thay vì giật
một nhát, và đổi ngay trong lúc đang mở trang. Ba tầng mây thay cho hai.

**Nông trại: bảng đơn hàng thay lái buôn** — bỏ hẳn `banNongSan`. Khách đặt
1–2 món trên bảng ghi chú, gom trong kho ra giao; đơn thường ×1, đặc biệt ×2,
siêu tốc ×3 nhưng hạn 2 giờ. Thưởng = tổng giá bán × 1,5 × hệ số, CHỐT lúc tạo
đơn. Đơn thuộc về từng người (bảng chung thì ai vào trước nhận hết) và sinh
lười lúc mở trang, không cron. Phân bón thành vật tư mua ở cửa hàng, cất trong
kho; `bonPhan` ăn một bao thay vì trừ điểm. Cây khế lên map, hái vào kho thành
nông sản giao đơn được — khế là `FarmCrop` có `plantable: false` nên cửa hàng
giấu mà đơn hàng vẫn gọi tên. Bảng xếp hạng nông trại lên map, xếp theo SỐ ĐƠN
ĐÃ GIAO chứ không theo điểm — theo điểm thì nó chỉ là bảng xếp hạng diễn đàn
chép lại. Bỏ `GocTrai`. Thêm `44-bang-don-hang` (19 mục).

*Còn nợ:* bộ ảnh cũ không có quả khế rời nên khế đang mượn ảnh CÂY khế chín;
`nong-san/0.png` là một bao đất, dán vào thì kho thành ra chứa đất.

**Nông trại 40 ô, chia trang** — trần ô đất 12 → 40, mảnh ruộng chia trang 8 ô
(hai hàng bốn ô) nên khung cảnh luôn cao đúng bằng lúc mới chơi. Nút chuyển
trang có chấm xanh báo trang ấy có ô đã CHÍN và chấm vàng báo trang ấy còn đất
mở được — chia trang xong thì ô chín ở trang khác biến mất khỏi mắt người chơi,
mà cây chín để lâu là phí cả vụ. Máy tính ghép ĐÔI hàng nằm cạnh nhau thành
một dải tám ô (bệ trái bỏ nẹp phải, bệ phải bỏ nẹp trái, lề trong rút một nửa
nên khe chỗ nối rộng đúng bằng mọi khe khác) — trước đó bệ chỉ rộng 528px giữa
thửa ruộng 754px, thừa hai mảng đất trống hai bên. Thêm `42-nong-trai-o-dat`
(18 mục): trước đợt này nông trại KHÔNG có bài kiểm nào.

**Cửa hàng hạt giống vào trong cảnh, tách mua khỏi gieo** — căn cửa hàng nay
đứng ngay trong cảnh nông trại, bấm vào mở hộp thoại. Nhưng hộp thoại che kín
mảnh ruộng, mà che ruộng thì không còn ô nào để chọn gieo — nên hạt giống
thành món có trong TÚI (`FarmSeed`): ở cửa hàng chỉ mua, gieo thì làm ở thanh
việc dưới ruộng nơi vẫn nhìn thấy ô đất. Túi rỗng thì thanh việc mời đi mua
chứ không chỉ báo suông. `gieoHat` nay rút hạt TRƯỚC rồi mới xuống giống: đảo
thứ tự thì hai tab cùng gieo hạt cuối sẽ trồng được hai ô. Thêm
`43-tui-hat-giong` (15 mục).

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
