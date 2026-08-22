# Nova Platform

Nền tảng **blog + diễn đàn + nội dung trả phí**, xây mới trên Next.js 15.
Tham chiếu tính năng/bố cục từ Zibll 8.1 (không dùng WordPress, không tái sử dụng mã nguồn theme đó).

## Stack

- **Next.js 15** (App Router, Server Components) + TypeScript
- **PostgreSQL 16** + **Prisma**
- **Auth.js v5** (Credentials + Google/GitHub OAuth)
- **Tailwind CSS**
- **SePay** (webhook nạp tiền — đang triển khai)

## Bắt đầu

```bash
npm install
cp .env.example .env          # điền DATABASE_URL, AUTH_SECRET…
npx prisma db push            # đồng bộ schema
npm run seed                  # dữ liệu mẫu + tài khoản admin
npm run dev
```

Tài khoản admin mẫu: `admin@nova.local` / `admin123`.

## Cấu trúc

```
src/
├── app/
│   ├── (site)/        # giao diện công khai (trang chủ = diễn đàn, /blog, bài viết…)
│   ├── (site)/games/  # Game Hub: catalog, chi tiết, Play Online
│   ├── (user)/user/   # khu vực đăng nhập (dashboard, điểm, số dư…)
│   ├── (admin)/admin/ # quản trị (game, emulator)
│   └── api/           # route handlers (auth, webhooks, games, emulator…)
├── lib/               # db, auth, access, points, balance, level, notify, game, emulator
└── components/        # PostCard (4 biến thể), Header, Sidebar, game/…
```

## Tiến độ

- [x] **P0** Scaffold Next.js + Prisma + Tailwind
- [x] **P1** Lõi nghiệp vụ: `points` / `balance` (atomic), `access` (5 mức), `level`, `notify`
- [x] **P2** Auth.js (credentials + OAuth) + middleware bảo vệ route
- [x] **P3** Seed: LevelRule 1–10, VipPlan 3 bậc, Medal, Category, admin, bài mẫu
- [x] **P4a** Bộ PostCard 4 biến thể + trang chủ (slider, chuyên mục, lưới card, sidebar)
- [x] **P4b** Chi tiết bài viết + paywall, danh mục, tag, tìm kiếm, bình luận
- [x] **P5** Điểm danh & VIP + huy chương tự động
- [x] **P6** Thanh toán SePay (nạp qua QR, hoa hồng giới thiệu, rút tiền, mã giảm giá)
- [x] **P7** Cổng tải xuống có hạn mức/ngày + `/user/downloads` — còn upload S3 & CRUD file trong trình soạn
- [x] **P8** Diễn đàn (danh sách, chủ đề, trả lời, chọn lời giải, treo thưởng)
- [x] **P9** Người dùng & xã hội (trang cá nhân, theo dõi, đã lưu, thông báo, mời bạn, cài đặt tài khoản)
- [x] **P10** Quản trị (bài viết, người dùng, chuyên mục, diễn đàn, báo cáo, gói VIP, rút tiền, giao diện)
- [x] **P12** Giao diện chính chuyển sang dạng diễn đàn (board list, bài mới, đang online); blog dời sang `/blog`
- [x] **P13** Công cụ điều hành chủ đề, tìm kiếm hợp nhất (chủ đề/bài viết/thành viên), chế độ tối
- [x] **P14** Mã giảm giá (quản trị + áp khi mua VIP) và hạn mức chống spam khi đăng nội dung
- [x] **P15** Game Hub — catalog Java ME, tải JAR/JAD có signed URL, Play Online (emulator toàn màn hình trên đt, thư viện máy cổ), quản trị game & emulator
- [ ] **P11** Hoàn thiện (backup DB, upload S3) — đã có SEO/sitemap/robots/dark mode

## Game Hub

Khu game Java ME nằm ở `/games`:

- **Catalog** — game nổi bật / mới cập nhật / phổ biến / chơi nhiều / tải nhiều /
  Việt hóa, gom theo thể loại, dòng máy, độ phân giải và bộ sưu tập; có
  “Tiếp tục chơi” và game ngẫu nhiên.
- **Bộ lọc & tìm kiếm** — lọc theo thể loại, platform, resolution, ngôn ngữ, năm,
  rating, dung lượng, lượt chơi/tải, ngày cập nhật; tìm kiếm có autocomplete và
  fuzzy (bỏ dấu + Levenshtein) nên gõ “kontra” vẫn ra “Contra 4”.
- **Chi tiết game** — thông tin phát hành, ảnh chụp màn hình, lịch sử version,
  thiết bị tương thích, hướng dẫn phím, lưu ý và thống kê.
- **Tải game** — chọn version → JAR/JAD → backend kiểm tra file rồi cấp signed URL
  có hạn; checksum hiển thị để đối chiếu; tải lặp không làm phồng unique download.
- **Play Online (chỉ trên điện thoại, toàn màn hình)** — tạo phiên emulator, nạp
  JAR vào runtime J2ME chạy trong iframe sandbox; trên đt emulator chiếm trọn màn
  hình (không header/footer, chừa safe-area, khoá cuộn), cầm dọc thì bàn phím nằm
  dưới, cầm ngang thì D-pad và bàn phím số dạt ra hai bên màn hình. Có phím mềm,
  xoay/tắt tiếng/tạm dừng, save RMS (cloud cho thành viên, localStorage cho khách),
  heartbeat và hạn mức phiên. Trên máy tính, mọi nút chơi online đều ẩn và trang
  `/play` hiện hướng dẫn mở bằng đt — kho game vẫn xem/tải bình thường.
- **Cấu hình riêng từng game** — kiểu J2ME Loader nhưng không có bước import: bấm
  game nào là chơi game đó với cấu hình của nó. Chọn kích thước màn hình (13 mức
  dựng sẵn + nhập tay), cách phóng (vừa khung / kéo đầy / gốc 1:1), lọc ảnh sắc nét
  hay mượt, **tốc độ chạy 0.5×–3×** (game Java hay chậm), giới hạn FPS, cỡ chữ, âm
  thanh, rung phím và gán phím bàn phím. Lưu theo tài khoản, khách thì theo trình duyệt.
- **Thư viện máy ảo** — mỗi bố cục mặt phím giữ đúng một máy đại diện: Nokia 7210
  và Nokia N70 (bốn hướng vuông), Nokia 6300 (vòng xoay), Motorola RAZR V3
  (vòng xoay + phím số phẳng khắc laser), cộng hai máy ảo chung phủ `320×240` nằm ngang
  và `360×640`. Người chơi bấm “Chọn máy ảo” để đổi máy ngay trong emulator, có nhãn
  tương thích cho từng máy. Skin thân máy khớp đúng đời máy: 7210 vỏ xanh, 6300 thép
  không gỉ, RAZR V3 nhôm anod.
- **Quản trị** — `/admin/games` (CRUD game, version, file, ảnh, ma trận tương thích)
  và `/admin/emulator` (profile thiết bị, hạn mức tài nguyên, phiên đang chạy, log lỗi).

Runtime J2ME chạy ở dịch vụ riêng — đặt `EmulatorProfile.runtimeUrl` (hoặc
`EMU_RUNTIME_URL` khi seed) để bật. Chưa gắn runtime thì trang Play vẫn hoạt động
và hướng người dùng sang tải file về máy. Giao ước `postMessage` giữa trang và
runtime nằm trong [`.nova-spec/GAME-HUB.md`](.nova-spec/GAME-HUB.md).

Chi tiết đặc tả: [`.nova-spec/SPEC.md`](.nova-spec/SPEC.md) · Game Hub:
[`.nova-spec/GAME-HUB.md`](.nova-spec/GAME-HUB.md) · Kế hoạch:
[`.nova-spec/TODO.md`](.nova-spec/TODO.md)
