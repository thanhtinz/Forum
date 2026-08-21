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
│   ├── (site)/        # giao diện công khai (trang chủ, bài viết, diễn đàn, game…)
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
- [ ] **P4b** Chi tiết bài viết + paywall, danh mục, tìm kiếm, bình luận
- [ ] **P5** Điểm danh & VIP
- [ ] **P6** Thanh toán SePay
- [ ] **P7** Nội dung tải xuống
- [ ] **P8** Diễn đàn
- [ ] **P9** Người dùng & xã hội
- [ ] **P10** Quản trị
- [ ] **P11** Hoàn thiện (rate limit, SEO, dark mode, responsive)
- [x] **P12** Game Hub — catalog Java ME, tải JAR/JAD có signed URL, Play Online (emulator session), quản trị game & emulator

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
- **Play Online** — tạo phiên emulator, nạp JAR vào runtime J2ME chạy trong iframe
  sandbox, bàn phím ảo + D-pad + phím mềm, fullscreen/xoay/tắt tiếng/tạm dừng,
  save RMS (cloud cho thành viên, localStorage cho khách), heartbeat và hạn mức phiên.
- **Quản trị** — `/admin/games` (CRUD game, version, file, ảnh, ma trận tương thích)
  và `/admin/emulator` (profile thiết bị, hạn mức tài nguyên, phiên đang chạy, log lỗi).

Runtime J2ME chạy ở dịch vụ riêng — đặt `EmulatorProfile.runtimeUrl` (hoặc
`EMU_RUNTIME_URL` khi seed) để bật. Chưa gắn runtime thì trang Play vẫn hoạt động
và hướng người dùng sang tải file về máy. Giao ước `postMessage` giữa trang và
runtime nằm trong [`.nova-spec/GAME-HUB.md`](.nova-spec/GAME-HUB.md).

Chi tiết đặc tả: [`.nova-spec/SPEC.md`](.nova-spec/SPEC.md) · Game Hub:
[`.nova-spec/GAME-HUB.md`](.nova-spec/GAME-HUB.md) · Kế hoạch:
[`.nova-spec/TODO.md`](.nova-spec/TODO.md)
