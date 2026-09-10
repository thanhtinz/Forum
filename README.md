<img src="public/bieu-tuong-192.png" width="72" align="left" alt="" hspace="12" />

# SunnyStore — kho game

Trang tải game Java ME, Android, iOS và Windows. Mỗi game có trang riêng kèm
bản tải theo từng hệ máy, mã kiểm tra tệp, đánh giá của người chơi, và một khu
thảo luận nằm ngay trong game ấy.

## Chạy thử

```bash
npm install
cp .env.example .env      # rồi điền DATABASE_URL
npm run day-luoc-do       # prisma db push + generate
npm run seed              # 12 game mẫu, kèm tệp tải thật để thử
npm run dev
```

Tài khoản mẫu sau khi seed:

| Vai trò | Đăng nhập | Mật khẩu |
|---|---|---|
| Quản trị | `admin@sunnystore.local` | `admin123` |
| Thành viên | `minhdev` | `thanhvien123` |

## Bài kiểm

```bash
npm run kiem:that         # dựng sạch → next start ở cổng 3100 → kiểm → tắt
npm run kiem              # chạy vào máy chủ đang mở ở cổng 3000
npm run kiem -- 03        # chỉ chạy bài có "03" trong tên
```

Dùng `kiem:that` là chính. Máy chủ dev và `npm run build` dùng chung thư mục
`.next`, chạy xen kẽ nhau là có lúc thiếu một mẩu chunk rồi cả trang trắng —
mà lỗi ấy trông y hệt lỗi thật: trang trả về 200 nhưng rỗng ruột.

Bài kiểm mở trình duyệt thật, bấm nút thật, rồi soi lại CSDL — không có bài nào
chỉ kiểm mỗi mã trạng thái HTTP.

## Bộ nhận diện

| Tệp | Dùng ở đâu |
|---|---|
| `public/logo-goc.png` | Bản gốc do chủ trang đưa, giữ nguyên để còn cắt lại khi cần |
| `public/bieu-tuong-{192,512}.png` | Biểu tượng ứng dụng, thanh bên, thanh đầu trang |
| `public/bieu-tuong-maskable-512.png` | Android cắt theo hình của máy — nền liền màu, nội dung thu vào 80% giữa |
| `src/app/icon.png`, `src/app/apple-icon.png` | Next tự gắn làm favicon và biểu tượng màn hình chính iPhone |
| `public/anh-chia-se.png` | Ảnh hiện ra khi dán liên kết vào Zalo, Messenger |

Chữ "SunnyStore" trên giao diện dựng bằng **chữ thật**, không dùng ảnh chữ
trong logo: ảnh chữ mờ trên màn hình mật độ cao, bộ đọc màn hình không đọc
được, và nền tối thì không đổi màu theo được.

Màu nhấn `#0074E5` — xanh của chữ "Store", đậm thêm một nấc so với `#007EF9`
trong logo. Lý do trong `globals.css`: xanh gốc chỉ đạt 3,92:1 với chữ trắng,
dưới mức 4,5:1 mà chữ thường cần.

## Vài quyết định đáng nói

- **Tải là tải.** Không có điểm, không có mức thành viên, không có gì phải tích
  luỹ trước khi tải. Cửa hàng nào cũng thế.
- **Diễn đàn nằm trong game** như một tab bên cạnh Thông tin, không có bảng
  chuyên mục riêng: người ta bàn về một game cụ thể.
- **Tab "Hôm nay" xoay game theo ngày mà không lặp lại.** Coi cả kho là một cỗ
  bài: đầu mỗi vòng xáo một lần rồi mỗi ngày chia ra bốn lá. Trong một vòng,
  mỗi game đi qua đúng một lần — "không trùng" là điều không thể sai, chứ
  không phải một điều kiện phải đi kiểm sau. Xem `src/lib/hom-nay-const.ts`,
  và `npx tsx scripts/soat-vong-hom-nay.ts` để duyệt lịch chia qua nhiều ngày.
- **Mọi hệ máy tải thẳng tệp về máy**, kể cả iOS: JAR/JAD, APK, IPA, EXE, DMG/PKG.
  Đường dẫn cửa hàng chính chủ là một nút PHỤ đứng sau nút tải, không thay nó.
  Riêng IPA thì kèm một dòng nhắc: iPhone chưa bẻ khoá cần công cụ ký như
  AltStore hoặc Sideloadly mới cài được. Xem `src/lib/he-may.ts`.
- **Phiên đăng nhập giữ ở CSDL**, cookie chỉ mang một mã ngẫu nhiên. Khoá một
  tài khoản là đá được người ấy ra ngay.
- **Mỗi hàm trong tệp `'use server'` tự kiểm quyền lấy** — nó là một địa chỉ POST
  công khai, khung `/quan-tri` không chặn hộ được. Bài kiểm `06-quyen` gọi thẳng
  vào để canh đúng chỗ này.
