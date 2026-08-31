# Nova Platform — Việc còn lại

Bản này ghi **hiện trạng thật**, đã đối chiếu với mã và dữ liệu. Kế hoạch dựng
ban đầu (P0–P16) đã xong và không còn ý nghĩa, nên gỡ đi — sản phẩm nay là diễn
đàn + kho game tính bằng điểm, không còn blog, tiền thật hay VIP.

Trạng thái: `tsc` sạch · `npm run scan` sạch · `npm run test:that` **1273/1273**.

---

## Nợ kỹ thuật

Xếp theo mức đáng làm. Không cái nào đang gây lỗi cho người dùng.

- [ ] **Những chỗ ngủ cứng còn lại trong bộ kiểm.** Số còn lại là những mục
      kiểm khẳng định KHÔNG có gì xảy ra, mà không chờ được một việc không xảy
      ra — ngủ cứng ở đó mới đúng. Đừng "dọn nốt cho đều".

- [ ] **`moTaConLaiNgan` vẫn chép lại phép chia của `moTaThoiLuong`**
      (`farm-const.ts`). Hai hàm `moTaConLai` đã gộp, riêng bản rút gọn còn
      lệch mỗi cái đuôi ("11h58" thay cho "11 giờ 58 phút") nên chưa gộp.

- [ ] **Đơn vị của `sizeBytes` nhập tay.** Biểu mẫu file game bắt admin gõ số
      byte; tiện hơn thì cho gõ "12 MB". Không phải lỗi.

## Đã xong trong đợt gần đây

Ghi lại để khỏi làm lại, và để biết chỗ nào vừa đụng vào.

**Gộp bảng xếp hạng Đảo Pokémon về một chỗ** — đảo bày xếp hạng ở ba nơi, hai
trong số đó chép lại nguyên xi: trang Đấu trường chép "Bảng điểm mùa này",
trang Lãnh Thổ chép "Bảng diệt quái". Cùng bảng dữ liệu, cùng `take: 10`, cùng
cách dựng dòng — mà ba bản còn lệch vặt nhau. Nay chỉ còn ở `/pokemon/xep-hang`;
hai trang kia giữ đúng chỉ số của riêng người chơi và KHÔNG thêm liên kết dẫn
sang, vì thanh tab của đảo đã có sẵn ô Xếp hạng. Trang xếp hạng dựng lại: năm
bảng chia tab (tab là liên kết `?bang=…`, không cần mã phía trình duyệt), thêm
phân trang `?trang=…` — trước cắt cứng top 10 nên ai hạng 11 trở đi vĩnh viễn
không thấy mình — kèm dòng "Bạn đang hạng N/M", và thứ tự có khoá phụ `id` để
hai người bằng điểm không làm phân trang nhảy dòng.

**Ba lỗi của chính bộ kiểm, tìm ra khi một lượt chạy bị giết giữa chừng** —
lượt ấy đỏ 51 mục ở khắp nơi trong khi hai lượt trước xanh hết:
- Bài 57 dựng một chuyên mục KHOÁ HUY HIỆU rồi dọn ở cuối hàm, không
  `try/finally`. Đứt giữa chừng là cái khu ấy nằm lại, mà mười bốn bài khác lấy
  chuyên mục bằng `findFirst({ postAccess: 'ALL' })` — trong khi `postAccess`
  chỉ nói về quyền ĐĂNG, khu khoá huy hiệu vẫn "ai cũng đăng được" và chỉ chặn
  XEM. Nay mười bốn bài nêu đúng điều kiện `requiredMedalId: null`, còn bài 57
  dọn trong `finally` cả chuyên mục lẫn quyền MODERATOR nó tạm nâng.
- Bài 15 hỏi `findFirst` chủ đề PUBLISHED rồi mới tìm trả lời gốc của nó, không
  `orderBy` nên bốc trúng chủ đề mẫu không trả lời nào là đỏ. Điều kiện "có trả
  lời gốc" nay nằm trong `where`.
- `next dev` và `npm run test:that` dùng CHUNG thư mục `.next`, nên chạy bộ
  kiểm xong là dev phục vụ bản dựng production và mấy bài giao diện đỏ oan.
  Ghi lại đây vì đây là cái bẫy môi trường, không sửa bằng mã được: chạy
  `test:that` xong thì `rm -rf .next` trước khi mở lại dev.

**Nâng cấp Đảo Pokémon (sáu đợt)** — đảo đã có đủ mười bốn màn hình và 34
server action, nhưng phần *sâu* thì mỏng và có ba chỗ hỏng thật.

1. *Tên loài và chủ Gym.* Bản gốc đặt "s" cho 39 mã ảnh khác nhau và "sâu
   xanh" cho 20 mã nữa; đợt trước đã tách ra cho mỗi mã một tên nhưng tên tách
   ra là tên máy sinh ("Nước #47", "Bọ #12"), còn sáu mã mang tên viết thường
   không dấu ("ran da", "picachu"). Đo lại thì 223 dòng thiếu tên chỉ quy về
   **46 mã ảnh** — mở từng tệp .gif ra nhìn rồi đặt. Hai chỗ tên gốc sai hẳn so
   với hình. Mười bốn Gym trước chỉ đánh số, nay mỗi Gym một chủ Gym kèm hệ.
   Bộ nạp vốn dựng lại tên Gym từ số hiệu nên sửa dữ liệu không có tác dụng;
   và `PokeDoGiam` chép tên lúc gặp nên phải quét lại sổ theo mã ảnh.

2. *Mỗi chiêu có hệ riêng.* Bốn chiêu của thú người chơi LUÔN bằng nhau về sát
   thương (khởi đầu 10 cả bốn, mỗi viên đá cộng 100 vào cả bốn) — suốt cả game
   chọn chiêu nào cũng y hệt, và mười bảy hệ chỉ ăn thua ở hệ của CON, thứ
   người chơi không đổi được. Nay hệ đọc từ tên chiêu (bảng 153 tên, kể cả mấy
   tên bản gốc gõ nhầm). Hai hệ số của `tinhSatThuong` tách ra: phần gây theo
   hệ chiêu, phần chịu theo hệ con. Không thêm cột nào.

3. *Chí mạng, trượt, trạng thái, đổi thú giữa trận.* Bản gốc không có thứ nào
   trong bốn thứ ấy. Chí mạng 1/16 ×1,5; trượt 6%; bốn trạng thái gắn bốn hệ
   chiêu. Đổi thú giữa trận mất một lượt. Phần ngẫu nhiên vẫn kiểm được vì máy
   chủ ghi kết quả bốc vào `lanChiMang`/`lanTruot`, và mọi hàm luật nhận số bốc
   từ ngoài vào chứ không tự gọi `Math.random`.

4. *Chỉ số bang hết là số chết.* Trang bang hiện "công 10, thủ 10" mà không
   trận nào cộng vào đâu, và không có đường nào tăng; cột `ngoc` của quỹ cũng
   chưa từng được đụng tới. Nay cộng thật, nâng qua năm bậc bằng quỹ, và quỹ
   góp/rút được cả ngọc.

5. *Thưởng Đồ Giám và việc hằng ngày.* Sổ 468 loài trước chỉ là hai thanh tiến
   độ, không có thưởng; chuỗi nhiệm vụ có đúng bốn bước rồi hết. Thêm tám mốc
   sổ và ba việc làm lại mỗi ngày. Tiến độ ngày không có cột đếm riêng: dòng
   của hôm nay chép bộ đếm tổng lúc sinh ra, tiến độ là hiệu số.

6. *Đấu trường.* Trước không có xếp hạng — chỉ cột `thangDau` cộng dồn vĩnh
   viễn nên người vào sau không bao giờ đuổi kịp — và những dòng `PokeDau` đã
   kết thúc nằm chết trong bảng. Nay có điểm Elo, mùa giải theo tháng (chốt
   lười, thưởng theo điểm của chính mình chứ không theo hạng vì chốt lười thì
   không có thời điểm nào bảng xếp hạng là đúng), lịch sử trận và ghép kèo
   nhanh.

Bài kiểm mới: `62-he-cua-chieu` (16), `63-tran-danh-sau` (31),
`64-chi-so-bang` (18), `65-thuong-do-giam-viec-ngay` (20),
`66-xep-hang-dau-truong` (26).

**Vá lỗi tồn đọng toàn hệ thống (bảy đợt)** — dừng thêm tính năng, rà lại ba
hướng: nợ kỹ thuật, phân quyền/tính đúng của lớp máy chủ, chỗ dở dang ở giao
diện. Không có lỗ hổng phân quyền hay tiền tệ nghiêm trọng nào; thứ thật sự
hỏng nằm chỗ khác.

1. *Trang quản trị game xoá trắng dữ liệu.* `VersionForm` không nạp giá trị cũ
   mà `upsertVersion` vẫn `update` bằng cả biểu mẫu trống — sửa một dòng version
   là `pricePoints` về `null`, một bản game đang bán tự thành miễn phí.
   `FileForm` còn tệ hơn: `upsert` theo khoá `versionId_type` nên chọn trùng cặp
   là âm thầm đè bản ghi cũ, và ô `scanStatus` không có mục rỗng nên tệp đang
   `QUARANTINED` bị đá về `PENDING` — vô tình cho tải lại. Nay mọi ô đều
   *controlled*, và chỉ ghi trường nào biểu mẫu thật sự gửi lên. Bốn nút xoá
   thêm bước hỏi lại. Thêm `58-sua-version-file-game` (18 mục).

2. *Ba chỗ đua ghi.* `approveMember` / `respondInvite` đọc trạng thái rồi ghi
   không điều kiện: hai tab cùng duyệt một đơn thì `memberCount` cộng hai lần,
   sai vĩnh viễn. Nhận thưởng nhiệm vụ Pokémon ghi `exp` TUYỆT ĐỐI nên nuốt mất
   exp của trận vừa thắng ở tab kia. Thêm `59-dua-ghi-clb-nhiem-vu`.

3. *Sáu đường ghi không có trần nào.* `recordShare` / `recordGameView` là điểm
   POST công khai mà `recomputeTrending` cân VIEW=1 SHARE=2 — một vòng lặp là
   đẩy được game bất kỳ lên trang chủ. Cộng thêm tải ảnh, bài và bình luận câu
   lạc bộ, bình luận trắc nghiệm, báo cáo.

4. *Gỡ hẳn bộ sưu tập game.* Không một dòng mã nào ghi vào `GamesOnCollections`;
   admin lập được, trang kho game quảng cáo "Xem tất cả", mà mọi bộ sưu tập
   rỗng vĩnh viễn.

5. *Cân bằng lại Đảo Pokémon.* Lãnh Thổ (bậc 7, mở ở cấp 18) là bản sao nguyên
   xi bảng Núi Đá (bậc 3, cấp 6) nên lên được chiến trường thì gặp thú yếu hơn
   cả khu bậc 4 và trả 2 vàng; Hang Huyền Thoại có thú 25.000 máu mà trả 7 vàng.
   Giãn 15 khu gốc thành một đường tăng đều nối liền vào năm khu mới. Kèm gán bộ
   chiêu theo hệ cho 150 con bậc 9–13 (trước đó cả 150 dùng chung MỘT bộ). Thêm
   `60-can-bang-dao-pokemon` (11 mục).

6. *Ba chỗ đúng/sai lẻ.* `authorize()` kéo cả hàng kể cả `passwordHash`; năm chỗ
   nhận `//evil.com` làm đường dẫn nội bộ — một trong số đó là chuyển hướng mở
   thật sự ở trang đăng nhập/đăng ký; `minRating` lọc SAU phân trang nên trang 2
   trả mảng rỗng kèm `hasMore: true`.

7. *Dọn nốt.* `fmtCount` rút gọn cả ở bảng quản trị (admin sửa điểm mà thấy
   "1.5M"); hoa hồng 30% là hằng số cứng kèm dòng TODO, nay chỉnh được ở Cài đặt
   chung; 43 chỗ tự tính số trang gom về `tinhSoTrang`; hai bản `moTaConLai` gộp
   thành `moTaThoiLuong`; `isSafeNavUrl` nhận cả `//evil.com`; menu mặc định
   thiếu Đảo Rồng. Thêm `61-hoa-hong-cau-hinh` (15 mục).

**Kho game khoá theo phiên bản** — trước chỉ khoá được cả game; nay mỗi
`GameVersion` có `pricePoints` riêng, mở độc lập qua `GameVersionUnlock`.

**Khu vực diễn đàn cần huy hiệu** — chuyên mục đặt được điều kiện huy hiệu cho
cả XEM lẫn ĐĂNG. Quyền nằm trong `where` chứ không lọc sau, và đã rà chín bề
mặt có thể lộ tên bài (tìm kiếm, thẻ, hoạt động, chủ đề mới, sitemap…).

**Triển khai Railway** — `railway.json`, `Dockerfile`, `.dockerignore` và tài
liệu biến môi trường.

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
