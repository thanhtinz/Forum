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
│   ├── (site)/        # giao diện công khai (trang chủ, bài viết, diễn đàn…)
│   ├── (user)/user/   # khu vực đăng nhập (dashboard, điểm, số dư…)
│   ├── (admin)/admin/ # quản trị
│   └── api/           # route handlers (auth, webhooks, …)
├── lib/               # db, auth, access, points, balance, level, notify
└── components/        # PostCard (4 biến thể), Header, Sidebar…
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

Chi tiết đặc tả: [`.nova-spec/SPEC.md`](.nova-spec/SPEC.md) · Kế hoạch: [`.nova-spec/TODO.md`](.nova-spec/TODO.md)
