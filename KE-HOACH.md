# Kế hoạch hoàn chỉnh SunnyStore

Trạng thái lúc lập: 58 trang, 83 bài kiểm, **1270 mục kiểm đạt hết**, không còn
`TODO` nào bỏ dở trong `src/`.

Dựng từ một đợt khảo sát bốn mặt (chạy thật · tính năng · độ chắc chắn · kiểm
kê thứ đã có), mỗi kết quả đi qua một lượt thẩm định có nhiệm vụ **bác bỏ**.
Mười sáu đề mục đã bị bác, phần lớn vì **thứ ấy đã có sẵn** — con số ấy là lý
do mọi mục dưới đây đều dẫn tệp cụ thể.

---

## Vì sao xếp thứ tự này

**Đợt 1 làm chắc chỗ đang có, trước khi thêm bất cứ thứ gì.** Phiên soát vừa
rồi cho một bài học rõ: **ba lỗi là bản sao của lỗi đã sửa ở chỗ khác** — đếm
trên danh sách đã `take`, ảnh lời đáp mất khi sửa, ô nhập trần trong biểu mẫu
`action`. Sửa đúng một chỗ gặp được rồi đi tiếp thì cùng cái lỗi ấy vẫn sống ở
ba chỗ khác. Thêm tính năng lên một nền như thế là nhân thêm chỗ hở.

**Đợt 2 đưa lên chạy thật, trước tính năng.** Đây là đợt duy nhất mà không làm
thì không ai dùng được. Thiếu tính năng chỉ làm cửa hàng nghèo đi; thiếu sao
lưu thì một sự cố là mất sạch tài khoản, đánh giá và bài diễn đàn của mọi
người. Và cả dự án hiện **không có một dòng nào ghi nhận lỗi lúc chạy thật** —
lỗi 404 làm sập toàn bộ cửa hàng sống được rất lâu mà không ai biết, đúng vì
không có chỗ nào báo.

**Đợt 3 thêm tính năng, sau cùng.** Đây là đợt duy nhất dừng lại lúc nào cũng
được mà cửa hàng vẫn dùng bình thường.

---

## Ràng buộc phải giữ, mọi đợt

Rút từ `CLAUDE.md` và từ chính mã nguồn. Đây là thứ bất cứ ai làm tiếp cũng
phải theo, không phải gợi ý.

- **Đẩy thẳng `main`.** Không nhánh mới, không pull request.
- **Mọi chữ trên giao diện, tên biến và chú thích đều bằng tiếng Việt.** Chú
  thích nói **vì sao** làm thế, không nói lại thứ mã đã tự nói.
- **Giọng cửa hàng, không phải giọng kho.** Không viết `kho`, `ban quản kho`,
  `đăng game ra kho`, `mới lên kho`. Viết `cửa hàng`, `SunnyStore` / `ban quản
  trị`, `bày game ra cửa hàng`, `mới lên kệ`. Riêng `kho` theo nghĩa "chỗ chứa
  tệp" thuần kỹ thuật thì vẫn dùng được.
- **Mỗi hàm export trong tệp `'use server'` là một địa chỉ POST công khai.** Nó
  phải tự kiểm quyền, và điều kiện phải nằm **trong `where` của Prisma**, không
  lọc sau khi đọc. Đua thì ghi có điều kiện (`updateMany` mang trạng thái cũ
  trong `where`, rồi xét `count === 0`).
- **Tệp `*-const.ts` không import gì cả** — bài kiểm `.mjs` nạp thẳng chúng.
- **Không có tác vụ nền.** Dự án cố ý không có cron. Thứ gì cần chạy định kỳ
  thì hoặc chốt lười lúc mở trang, hoặc là một kịch bản gọi tay trong
  `scripts/`. Đừng kéo hàng đợi vào.
- **React 19 xoá trắng biểu mẫu sau mỗi lượt `action`, kể cả lượt trả về lỗi.**
  Biểu mẫu nào có luật chỉ máy chủ biết thì phải dùng `ONhapGiu`/`OChuGiu`.
- **Bộ đếm sẵn phải khớp lại trong cùng giao dịch với lần ghi**, và đếm lại từ
  bảng chứ không cộng trừ dần.
- **Bài kiểm mở trình duyệt thật, bấm nút thật, rồi soi lại CSDL.** Không bài
  nào chỉ kiểm mã trạng thái HTTP.

### Nhịp làm việc mỗi mốc

1. Đọc mã ở chỗ định sửa **trước khi** tin vào mô tả trong tệp này.
2. Sửa → `npx tsc --noEmit` → `npm run build`.
3. **Tự mở trình duyệt xem tận mắt** nếu có đổi giao diện — `tsc` sạch không
   nói được gì về cái nhìn thấy.
4. Viết hoặc nới bài kiểm. Với mỗi bài kiểm mới canh một lỗi: **tạm bỏ bản sửa
   ra để chắc bài đỏ đúng chỗ cần đỏ**, rồi mới trả lại.
5. Chạy mấy bài kiểm lân cận.
6. Commit tiếng Việt, đẩy thẳng `main`.
7. Hết mỗi đợt: `npm run kiem:that` **hai lượt cho ra cùng một con số**.

### Bẫy đã dính, đừng dính lại

- `pkill -f next-server` **giết luôn cái shell đang gọi nó**. Dùng
  `pgrep -f 'next[-]server' | xargs -r kill -9`.
- `next dev` và `npm run build` **dùng chung thư mục `.next`**. Sửa mã trong
  lúc `kiem:that` đang dựng thì nó bắt phải trạng thái nửa chừng rồi báo đỏ oan.
- Postgres ở **cổng 5433**, hay chết. Khởi động lại bằng
  `su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/nova-data -o '-p 5433' -l /tmp/pg.log start"`.
- Bài kiểm 07 và 59 **hỏng khi chạy ngoài bộ kiểm**: `scripts/kiem-tren-ban-dung.mjs`
  tự bơm biến môi trường thư (`THU_MAY_CHU: '127.0.0.1'`) lúc dựng `next start`,
  còn `next dev` trần thì không. Không phải lỗi.
- Bài kiểm đừng dò theo **tên thẻ**. Bài 27 dò `aside` nên đổi sang `header` là
  nó mù — mà mù thì im lặng chứ không đỏ. Gắn mốc `data-*` rồi dò theo mốc.

---

# ĐỢT 1 — Làm chắc chỗ đang có

Không thêm tính năng nào. Xong đợt này thì nền đủ chắc để xây tiếp.

### 1.1 Nhịp nghỉ cho diễn đàn — **làm trước nhất**

`dangChuDe` và `traLoi` trong
`src/app/(cua-hang)/game/[duongDan]/dien-dan/viec.ts` chỉ xét độ dài chữ, game
đang hiện và chủ đề chưa khoá — **không có một phép đếm nhịp nào**. Trong khi
`chat.ts:127` đã có `NGHI_GIAY`. Đây là lối ghi vào CSDL dễ nhất mà người lạ
chạm tới, và mỗi bài còn kéo theo `guiThongBao` → `baoQuaThu`: rải bài là rải
thư đi kèm.

Chép đúng mẫu của `chat.ts`. Bài kiểm: gửi hai bài liền nhau, bài thứ hai phải
bị máy chủ chối — **và phát lại yêu cầu vẫn phải trượt**, vì cửa nằm ở máy chủ
chứ không phải một cái nút bị làm mờ.

### 1.2 Gỡ khối `images` chết trong `next.config.mjs`

Khối ấy mở `hostname: '**'`, mà `grep` cả `src/` ra **không một chỗ nào dùng
`next/image`** — `NguoiDung.tsx:31` còn ghi rõ là cố ý không dùng. Nghĩa là nó
không phục vụ thứ gì đang chạy, chỉ còn để `/_next/image` mở cho người ngoài
mượn máy chủ cửa hàng làm chỗ đổi cỡ ảnh của họ. Gỡ một dòng.

Tự kiểm trước khi gỡ: chạy `npm run build` rồi soi xem có trang nào gãy không.

### 1.3 Nốt ~30 phát hiện mức thấp còn tồn

Từ đợt soát trước. Đọc lại từng cái **trong mã** trước khi sửa — lần trước tôi
bác 2 trong số đó vì chúng sai.

### 1.4 Phủ bài kiểm cho trang chưa ai chạm tới

Gộp `/quan-ly/ho-so` và `/quan-ly/game/moi` vào bài 38. Rà lại toàn bộ danh
sách trang đối chiếu tên bài để tìm chỗ hở khác.

### 1.5 Soát bảo mật toàn bộ hàm `'use server'`

Một lượt rà có hệ thống, không phải gặp đâu sửa đó: mọi hàm export trong mọi
tệp `viec.ts` và mọi route trong `src/app/api/`. Canh đúng một câu hỏi: **điều
kiện quyền có nằm trong `where` không, hay lọc sau khi đọc?**

Thêm một bài kiểm cho nhóm hàm phá huỷ: tác giả A gọi thẳng vào game của tác
giả B thì phải trượt.

### 1.6 Cửa chặn lượt cho cổng nhận tệp game và phim

`api/tai-len-tep/route.ts` và `api/tai-len-phim/route.ts` không đụng tới
`chan-do-mat-khau.ts`, trong khi `api/tai-anh/route.ts` đã có. Mẫu sẵn, chép
sang. Mức vừa thôi: cửa đã hẹp sẵn vì phải là tác giả của đúng game ấy.

### 1.7 Bộ đếm ký tự phòng chat dùng sai màu

`text-cam` trái luật màu mà dự án tự ghi. Nhỏ, nhưng là loại lỗi tự mình đặt
luật rồi tự phá.

**Nghiệm thu đợt 1:** `kiem:that` hai lượt cùng con số; không hàm `'use server'`
nào lọc quyền sau khi đọc; mọi trang có ít nhất một bài kiểm chạm tới.

---

# ĐỢT 2 — Đưa lên chạy thật

### 2.1 Sao lưu, và **thử phục hồi ít nhất một lần**

Cả dự án không có chữ `pg_dump` nào. Viết `scripts/sao-luu.mjs` gọi tay, đúng
lối mấy kịch bản sẵn có trong `scripts/`.

Phần quan trọng hơn cái kịch bản: **phải phục hồi thử một lần vào CSDL trống
rồi chạy bộ kiểm trên đó.** Một bản sao lưu chưa ai phục hồi bao giờ thì chưa
phải bản sao lưu — nó chỉ là một tệp.

### 2.2 Một chỗ ghi nhận lỗi

Cả `src/` có **đúng một** dòng `console.*` (`gui-thu.ts:98`), và
`global-error.tsx` chỉ bày `CoLoi` kèm `digest`. Viết một hàm `ghiLoi()` chung
cho mấy chỗ đáng biết: kho từ chối, CSDL đổ, gửi thư hỏng.

Đừng kéo Sentry vào — quá tay cho một cửa hàng tải game miễn phí. Và **đừng đi
sửa 115 khối `catch {}`**: phần lớn là nuốt lỗi có chủ ý và đã có chú thích
giải thích (`xoaAnh`, `xoaTepGame`, `guiThongBao`).

### 2.3 Kiểm biến môi trường lúc khởi động

Chưa có `instrumentation.ts`. Ba việc gộp vào một chỗ:

- Thiếu biến bắt buộc thì **hỏng ngay lúc khởi động**, không hỏng lúc có người
  dùng thật bấm nút.
- `dungR2()` thiếu một trong năm ô thì cửa hàng lặng lẽ ghi tệp xuống đĩa —
  phải kêu lên một tiếng.
- `dia-chi-goc.ts` lùi về `http://localhost:3000` không kêu tiếng nào, mà `.env`
  đang đặt `3005`. Đúng thứ sẽ đi thẳng vào thư xác minh nếu ai quên sửa.

Nhân tiện xoá ba dòng thừa trong `.env`: `AUTH_SECRET`, `NEXTAUTH_SECRET`,
`AUTH_TRUST_HOST` — không chỗ nào trong `src/`, `prisma/`, `scripts/` đọc tới.

### 2.4 Giờ chờ cho lượt gửi thư

`layXe()` không đặt `connectionTimeout`, `greetingTimeout`, `socketTimeout`, nên
rơi về mặc định của nodemailer (hàng phút), mà `thong-bao.ts` lại `await` ngay
trong lượt yêu cầu. Ba dòng.

Không làm hàng đợi — nó đòi một tác vụ nền, mà dự án cố ý không có.

### 2.5 Chuyển sang bản di trú lược đồ

Hiện `prisma/` chỉ có `schema.prisma` và `seed.ts`, không có `migrations/`.
Chuyển sang `prisma migrate` để có chỗ đặt SQL viết tay — mục 2.7 cần nó.

Nói cho đúng: `prisma db push` **không** lặng lẽ xoá cột, nó dừng lại hỏi. Đây
là dọn đường, không phải chữa tai nạn.

### 2.6 Một mục README về triển khai

Không `Dockerfile`, không `.github/`, và **đừng đẻ ra chúng** — dự án đẩy thẳng
`main`, không có nơi nào chạy chúng. Chỉ cần một mục README.

Thứ đáng viết nhất là **`SO_PROXY_TIN`**: `chan-do-mat-khau.ts` đọc nó để lấy
đúng mẩu trong `x-forwarded-for`. Đặt sai thì **mọi cửa chặn theo IP coi như
không chặn gì** — `.env.example` đã ghi mà README thì im.

### 2.7 Chỉ mục cho ô tìm kiếm *(để cuối, mức thấp)*

`danh-muc.ts:80` và `:167` dựng `{ timKiem: { contains: t } }`, mà `LIKE '%…%'`
thì btree không đỡ được. Cần chỉ mục GIN `pg_trgm`, tức là cần SQL viết tay,
tức là **phải sau mục 2.5**.

Để cuối vì cửa hàng đang có 12 game mẫu. Làm khi số liệu thật đủ lớn, không làm
vì một con số tưởng tượng.

**Nghiệm thu đợt 2:** phục hồi được một bản sao lưu vào CSDL trống rồi chạy bộ
kiểm xanh trên đó; xoá một biến môi trường bắt buộc thì cửa hàng từ chối khởi
động và nói rõ thiếu cái gì.

---

# ĐỢT 3 — Thêm tính năng

Xếp theo **lợi trên công**. Dừng ở bất cứ mốc nào cũng được.

### Nhóm A — nhỏ, lợi ngay

| Việc | Vì sao |
|---|---|
| Trang giới thiệu, điều khoản, liên hệ | Cửa hàng cho người lạ tải tệp về máy mà không có một dòng nào nói mình là ai |
| Lọc theo độ tuổi, năm phát hành, dung lượng | Dữ liệu đã có sẵn trong bảng, chỉ thiếu ô lọc |
| Cấm phát ngôn có thời hạn | Nay chỉ có công tắc khoá/không khoá — cãi nhau một lần mà khoá vĩnh viễn thì quá tay |

### Nhóm B — vừa

| Việc | Vì sao |
|---|---|
| Nhật ký thao tác của ban quản trị | Nay gỡ một bài, khoá một người, phong một vai trò đều **không để lại dấu vết nào**. Nhiều quản trị viên thì không ai biết ai đã làm gì |
| Theo dõi tác giả | Đã có theo dõi chủ đề và đã lưu game; thiếu đúng mắt xích này |
| Bộ sưu tập do ban quản trị tự xếp | Tab "Hôm nay" xáo tự động; chưa có cách nào để người bán hàng tự xếp một kệ |
| Khu thảo luận chung | Mọi chủ đề đều phải thuộc về một game. Không có chỗ nào hỏi "máy này chạy được game gì" |

### Nhóm C — lớn, cân nhắc kỹ

**Tin nhắn riêng giữa thành viên.** Thêm bảng, thêm trang, thêm thông báo, và
thêm cả một mặt trận kiểm duyệt mới — tin nhắn riêng thì ban quản trị không
nhìn thấy, nên phải có lối báo xấu và lối chặn người. Chỉ làm nếu diễn đàn thật
sự đông lên.

### Đã bác — **đừng đề xuất lại**

Tám mục bị bác ở khâu thẩm định, kèm lý do:

- **Gửi thông báo hàng loạt** — đòi tác vụ nền.
- **Bản thử nghiệm cho người thử trước** — cột `moiNhat` và luồng duyệt hiện có
  đã gánh được việc này.
- **Game liên quan ở cuối trang game** — 12 game thì "liên quan" là vô nghĩa.
- **Danh tiếng và huy hiệu** — diễn đàn chưa đủ đông để một con số danh tiếng
  nói lên điều gì.
- **Lịch sử tải đầy đủ** — `LuotTai` cố ý giữ mỗi người mỗi game một hàng.
- **So sánh các bản cạnh nhau** — `TamTai` đã bày đủ thông tin ấy rồi.
- **Lọc chữ bẩn và hàng chờ kiểm duyệt** — đã có báo xấu và gỡ bài; duyệt trước
  khi hiện thì giết luôn nhịp trò chuyện.
- **Tải về dữ liệu của chính mình** — chưa có ràng buộc pháp lý nào đòi.

Và ba mục ở mặt "độ chắc chắn" cũng bị bác: `xemThuChuDam` (không phải lỗ
hổng), tách nhỏ `quan-tri/viec.ts` (2157 dòng nhưng chia theo chức năng rõ
ràng), gộp ba bản chép của phép bỏ phiếu (ba bảng khác nhau, gộp lại là dựng
một tầng trừu tượng cho ba chỗ chỉ **trông** giống nhau).

---

## Đợt 1 còn dở — nợ phải trả

Tạm gác để làm đợt 3 (tính năng + giao diện) theo yêu cầu, KHÔNG được quên.

Năm phát hiện bảo mật sống sót qua hai lượt phản biện, chưa sửa:

| Hàm | Lỗi |
|---|---|
| `boPhieu` | Rút phiếu cũ đọc-rồi-ghi: hai lượt song song trừ `soPhieu` hai lần cho một hàng phiếu. Dìm được con số của ô đối thủ xuống sàn |
| `xoaLanHong` | Đăng nhập đúng xoá luôn bộ đếm theo IP, tự mở lại cửa cho kiểu quét hàng loạt |
| `dangKy` | Nói thẳng email nào đã có tài khoản, phá luôn công chống dò của lối đăng nhập |
| `traMa` | Trần năm lần gõ sai mã sáu số không xét `count`, bắn song song vẫn đoán thoải mái |
| `xoaTaiKhoan` | Chốt "quản trị viên cuối cùng" đếm ngoài giao dịch: hai người xoá cùng lúc là cửa hàng hết quản trị |

Và hai mục chưa làm: 1.3 (~30 phát hiện mức thấp cũ), 1.6 (chặn lượt cho
`api/tai-len-tep` và `api/tai-len-phim`).

---

## Nợ còn treo, không thuộc đợt nào

**Năm lỗ hổng `npm audit` không vá được** — một ở `postcss` mà Next ghim sẵn,
bốn ở CLI `prisma`. Đều là công cụ lúc dựng, không chạy ở bản thật. Theo dõi
mỗi lần nâng Next hoặc Prisma, không làm gì thêm.
