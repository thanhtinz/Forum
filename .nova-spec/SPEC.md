# Nova Platform — Đặc tả kỹ thuật

Nền tảng blog + diễn đàn + nội dung trả phí, xây mới hoàn toàn trên Next.js.
Tham chiếu tính năng/bố cục từ Zibll 8.1, **không** dùng WordPress và không tái sử dụng mã nguồn của theme đó.

---

## 1. Stack

| Lớp | Công nghệ |
|---|---|
| Framework | Next.js 15 (App Router, Server Components) |
| Ngôn ngữ | TypeScript |
| DB | PostgreSQL 16 |
| ORM | Prisma |
| Auth | Auth.js v5 (Credentials + OAuth: Google, GitHub) |
| Thanh toán | SePay (webhook chuyển khoản VN) |
| UI | Tailwind CSS + shadcn/ui |
| Cache/queue | Redis (rate limit, view counter, session tuỳ chọn) |
| Lưu file | S3-compatible (R2/MinIO) |

---

## 2. Sơ đồ module

```
src/
├── app/
│   ├── (site)/                  # Giao diện công khai
│   │   ├── page.tsx             # Trang chủ — slider + lưới card
│   │   ├── posts/[slug]/        # Chi tiết bài viết + paywall
│   │   ├── category/[slug]/
│   │   ├── tag/[slug]/
│   │   ├── forum/               # Danh sách chuyên mục diễn đàn
│   │   │   ├── [forum]/         # Danh sách chủ đề
│   │   │   └── t/[thread]/      # Chi tiết chủ đề + trả lời
│   │   ├── u/[username]/        # Trang cá nhân công khai
│   │   ├── vip/                 # Bảng giá VIP
│   │   └── search/
│   ├── (user)/user/             # Khu vực đăng nhập
│   │   ├── dashboard/
│   │   ├── posts/               # Bài viết của tôi
│   │   ├── orders/
│   │   ├── points/              # Lịch sử điểm
│   │   ├── balance/             # Nạp / lịch sử số dư
│   │   ├── downloads/
│   │   ├── favorites/
│   │   ├── medals/
│   │   ├── invite/
│   │   ├── withdraw/
│   │   └── settings/
│   ├── (admin)/admin/           # Quản trị
│   │   ├── posts/ users/ forums/ orders/
│   │   ├── vip/ coupons/ medals/ levels/
│   │   ├── reports/ withdrawals/
│   │   └── settings/            # SiteSetting, slider, nav, friend links
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── webhooks/sepay/      # Xác thực chữ ký → cộng số dư
│       ├── posts/ forum/ comments/
│       ├── orders/ checkin/ upload/
│       └── admin/
├── lib/
│   ├── db.ts                    # Prisma singleton
│   ├── auth.ts                  # Cấu hình Auth.js
│   ├── access.ts                # Kiểm tra quyền xem nội dung
│   ├── points.ts                # Giao dịch điểm (atomic)
│   ├── balance.ts               # Giao dịch số dư
│   ├── sepay.ts                 # Ký/xác thực webhook
│   ├── level.ts                 # Tính EXP → cấp độ
│   ├── medals.ts                # Trao huy chương tự động
│   └── notify.ts
└── components/
    ├── post-card/               # 4 biến thể: STANDARD/WIDE/TEXT_ONLY/GALLERY
    ├── paywall/
    ├── forum/
    ├── user/
    └── ui/                      # shadcn
```

---

## 3. Quy tắc nghiệp vụ

### 3.1 Kiểm soát truy cập nội dung (`lib/access.ts`)

Hàm `canAccess(user, post)` trả về `{ allowed, reason, price }`:

| `post.access` | Điều kiện mở khoá |
|---|---|
| `FREE` | Luôn cho phép |
| `LOGIN_REQUIRED` | Đã đăng nhập |
| `POINTS` | Có `Order` PAID, hoặc trừ `pricePoints` |
| `PAID` | Có `Order` PAID với `priceAmount` |
| `VIP_ONLY` | `user.vipTier >= post.vipTierFree` và VIP còn hạn |

VIP có `freeContent = true` bỏ qua paywall. VIP có `discountPercent` được giảm giá khi mua.

Nội dung ẩn nằm ở `post.hiddenContent`, **không bao giờ** gửi xuống client khi chưa mở khoá — lọc ở tầng server component.

### 3.2 Giao dịch điểm (`lib/points.ts`)

Mọi thay đổi điểm đi qua một hàm duy nhất, chạy trong `prisma.$transaction`:

```ts
await grantPoints({ userId, amount, reason, refId, note })
```

- Cập nhật `User.points` bằng `increment`, đồng thời ghi `PointsLog` với số dư sau giao dịch.
- Từ chối nếu kết quả âm (trừ khi `allowNegative`).
- Nguồn cộng điểm: điểm danh, đăng bài, bình luận, được thích, mời bạn.

### 3.3 Điểm danh

- Một lần/ngày theo múi giờ `Asia/Ho_Chi_Minh`.
- Chuỗi liên tục tăng nếu lần trước là hôm qua, ngược lại reset về 1.
- Điểm thưởng = `base + min(streak, 7) * step`, nhân `vipPlan.checkinMultiplier`.

### 3.4 Cấp độ

- EXP cộng cùng lúc với hành động tạo nội dung.
- `LevelRule` là bảng cấu hình, không hardcode. Sau mỗi lần cộng EXP, so với `expRequired` để nâng cấp và bắn `Notification`.

### 3.5 SePay

Luồng nạp tiền:

1. Người dùng tạo `Order` type `TOPUP`, hệ thống sinh `code` duy nhất.
2. Hiển thị QR VietQR kèm nội dung chuyển khoản = `code`.
3. SePay gọi webhook `POST /api/webhooks/sepay`.
4. Webhook xác thực `Authorization: Apikey <SEPAY_API_KEY>`, đối chiếu số tiền và `code` trong nội dung.
5. Idempotent theo `sepayRefId` (unique) — trùng thì bỏ qua.
6. Cộng `User.balance` + ghi `BalanceLog`, đặt `Order.status = PAID`.
7. Nếu người mua có `invitedBy`, tạo `Commission`.

Mua nội dung/VIP thì trừ thẳng từ `balance`, không qua SePay.

### 3.6 Diễn đàn

- `Forum` phân cấp cha–con, giới hạn theo `postAccess` / `minLevel` / `vipOnly`.
- Chủ đề có thể treo thưởng (`bountyPoints`): điểm bị giữ lúc tạo, trả cho người có `Reply` được đánh dấu `isSolution`.
- `lastReplyAt` cập nhật mỗi khi có trả lời — dùng để sắp xếp danh sách.
- Đếm `replyCount`/`threadCount` là denormalized, cập nhật trong cùng transaction.

---

## 4. Bố cục giao diện

**Trang chủ:** slider (`Slide`) → hàng chuyên mục → lưới card 3 cột (2 tablet, 1 mobile) → sidebar (thẻ người dùng, bài nổi bật, tag cloud).

**Biến thể card** khớp `CardStyle`:
- `STANDARD` — ảnh 16:9 trên, tiêu đề + trích đoạn + meta dưới
- `WIDE` — ảnh trái, nội dung phải, chiếm 2 cột
- `TEXT_ONLY` — không ảnh, nền màu nhạt theo chuyên mục
- `GALLERY` — lưới ảnh nhỏ, dùng cho bài nhiều hình

**Chi tiết bài:** cover → meta tác giả → nội dung → khối paywall (nếu khoá) → khối tải xuống → phản ứng → bình luận phân cấp.

**Chủ đề diễn đàn:** bài gốc nổi bật, trả lời dạng danh sách, trả lời được chọn làm giải pháp ghim lên đầu.

---

## 5. Việc cần làm tiếp

1. `npx prisma migrate dev --name init` (chạy ở máy bạn — sandbox chặn binaries.prisma.sh)
2. Seed: `LevelRule` 1–10, `VipPlan` 3 bậc, `Medal` cơ bản, tài khoản admin
3. Cấu hình Auth.js + middleware bảo vệ route
4. `lib/access.ts` + `lib/points.ts` — hai file lõi, làm trước UI
5. Webhook SePay + trang nạp tiền
6. Bộ component card + trang chủ
7. Module diễn đàn
8. Khu vực quản trị

---

## 6. Biến môi trường

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/nova"
AUTH_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""
SEPAY_API_KEY=""
SEPAY_ACCOUNT_NUMBER=""
SEPAY_BANK_CODE=""
REDIS_URL=""
S3_ENDPOINT=""
S3_BUCKET=""
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
```
