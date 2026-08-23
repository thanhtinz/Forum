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

### Nâng cấp cơ sở dữ liệu đã có dữ liệu

Nếu cơ sở dữ liệu của bạn từng chạy bản **có tính năng máy ảo (Play Online)**,
chạy thêm một bước dọn **trước** khi `db push`:

```bash
npm run db:don-may-ao         # dọn dữ liệu máy ảo còn sót
npx prisma db push
```

Bỏ qua bước này thì `db push` dừng giữa chừng ở enum `GameEventType` (Postgres
không cho bỏ giá trị enum khi còn hàng dùng tới), nên cột `GameVersion.platform`
không được tạo và mọi trang game trả về lỗi 500.

## Cấu trúc

```
src/
├── app/
│   ├── (site)/        # giao diện công khai (trang chủ = diễn đàn, /blog, bài viết…)
│   ├── (site)/games/  # Game Hub: catalog, chi tiết, tải file
│   ├── (user)/user/   # khu vực đăng nhập (dashboard, điểm, số dư…)
│   ├── (admin)/admin/ # quản trị (bài viết, diễn đàn, game…)
│   └── api/           # route handlers (auth, webhooks, games…)
├── lib/               # db, auth, access, points, balance, level, notify, game
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
- [x] **P11** Hoàn thiện: SEO/sitemap/robots, chế độ tối, upload R2, nhật ký quản trị, sao lưu dữ liệu
- [x] **P15** Nhật ký quản trị (`/admin/logs`) và sao lưu dữ liệu thủ công/tự động (`/admin/backup`)
- [x] **P16** Game Hub — catalog Java ME, tải JAR/JAD có signed URL, quản trị game

## Game Hub

Khu game Java ME nằm ở `/games`:

- **Catalog** — game nổi bật / mới cập nhật / phổ biến / xem nhiều / tải nhiều /
  Việt hóa, gom theo thể loại, dòng máy, độ phân giải và bộ sưu tập; có cả
  game ngẫu nhiên.
- **Bộ lọc & tìm kiếm** — lọc theo thể loại, platform, resolution, ngôn ngữ, năm,
  rating, dung lượng, lượt tải, ngày cập nhật; tìm kiếm có autocomplete và
  fuzzy (bỏ dấu + Levenshtein) nên gõ “kontra” vẫn ra “Contra 4”.
- **Chi tiết game** — thông tin phát hành, ảnh chụp màn hình, lịch sử version,
  hướng dẫn phím, lưu ý và thống kê.
- **Tải game** — chọn version → JAR/JAD → backend kiểm tra file rồi cấp signed URL
  có hạn; checksum hiển thị để đối chiếu; tải lặp không làm phồng unique download.
- **Quản trị** — `/admin/games`: CRUD game, version, file, ảnh.

Kho game chỉ phục vụ xem thông tin và tải file về máy thật — không có emulator,
không chơi online.

Chi tiết đặc tả: [`.nova-spec/SPEC.md`](.nova-spec/SPEC.md) · Game Hub:
[`.nova-spec/GAME-HUB.md`](.nova-spec/GAME-HUB.md) · Kế hoạch:
[`.nova-spec/TODO.md`](.nova-spec/TODO.md)
