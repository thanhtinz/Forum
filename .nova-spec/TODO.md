# Nova Platform — TODO

Thứ tự thực hiện. Mỗi giai đoạn xong mới sang giai đoạn sau — các file lõi ở P1 quyết định toàn bộ phần còn lại.

---

## P0 — Khởi tạo (0.5 ngày)

- [ ] `npx create-next-app@latest nova --ts --tailwind --app --src-dir`
- [ ] `npm i @prisma/client @auth/prisma-adapter next-auth@beta bcryptjs zod`
- [ ] `npm i -D prisma @types/bcryptjs`
- [ ] Copy `prisma/schema.prisma` vào dự án
- [ ] Dựng PostgreSQL (Docker: `postgres:16-alpine`)
- [ ] Điền `.env` theo mục 6 của SPEC.md
- [ ] `npx prisma migrate dev --name init` — **xác nhận schema hợp lệ ở bước này**
- [ ] `npx prisma generate`
- [ ] `src/lib/db.ts` — Prisma singleton (tránh hot-reload tạo nhiều connection)
- [ ] Cài shadcn/ui: `npx shadcn@latest init`

## P1 — Lõi nghiệp vụ (2 ngày) ⚠️ LÀM TRƯỚC UI

- [ ] `lib/points.ts` — `grantPoints()` chạy trong `$transaction`, ghi `PointsLog` kèm số dư sau, chặn âm
- [ ] `lib/balance.ts` — tương tự cho `BalanceLog`, đơn vị VND
- [ ] `lib/access.ts` — `canAccess(user, post)` → `{ allowed, reason, price }`, phủ đủ 5 `AccessLevel`
- [ ] `lib/level.ts` — cộng EXP → tra `LevelRule` → nâng cấp + bắn notification
- [ ] `lib/notify.ts` — tạo `Notification`
- [ ] Unit test cho `points.ts` và `access.ts` (vitest) — hai file này sai là hỏng toàn hệ thống

## P2 — Auth (1 ngày)

- [ ] `lib/auth.ts` — Auth.js v5, PrismaAdapter, session strategy `database`
- [ ] Provider: Credentials (bcrypt) + Google + GitHub
- [ ] Callback `session` — nạp `role`, `points`, `balance`, `vipTier`, `level` vào session
- [ ] `middleware.ts` — chặn `/user/*` (đăng nhập), `/admin/*` (role ADMIN/MODERATOR)
- [ ] Trang `/login`, `/register`
- [ ] Sinh `inviteCode` khi tạo user; xử lý `?ref=` → gán `invitedById`
- [ ] Kiểm tra `UserStatus`/`Ban` khi đăng nhập

## P3 — Seed (0.5 ngày)

- [ ] `prisma/seed.ts`
- [ ] `LevelRule` cấp 1–10 (expRequired tăng dần)
- [ ] `VipPlan` 3 bậc: tháng / năm / vĩnh viễn
- [ ] `Medal` cơ bản (tân binh, chuỗi điểm danh 7/30/100, 10 bài viết)
- [ ] `SiteSetting` mặc định (tên site, điểm thưởng mỗi hành động)
- [ ] `Category` mẫu + tài khoản admin

## P4 — Blog + card layout (2 ngày)

- [ ] `components/post-card/` — 4 biến thể: `STANDARD`, `WIDE`, `TEXT_ONLY`, `GALLERY`
- [ ] Trang chủ: slider → hàng chuyên mục → lưới card 3/2/1 cột → sidebar
- [ ] `/posts/[slug]` — server component, **lọc `hiddenContent` ở server** khi chưa mở khoá
- [ ] `components/paywall/` — hiện giá, nút mua bằng điểm / số dư, badge VIP
- [ ] `/category/[slug]`, `/tag/[slug]`, `/search` + phân trang
- [ ] Bình luận phân cấp + reaction
- [ ] Đếm view qua Redis, flush định kỳ (tránh ghi DB mỗi request)

## P5 — Điểm & VIP (1.5 ngày)

- [ ] API `/api/checkin` — 1 lần/ngày theo `Asia/Ho_Chi_Minh`, tính streak, nhân `checkinMultiplier`
- [ ] `/user/points` — lịch sử `PointsLog` + phân trang
- [ ] `/vip` — bảng giá, so sánh quyền lợi
- [ ] Mua VIP: trừ `balance`, đặt `vipTier` / `vipExpiresAt` / `vipPermanent`
- [ ] Cron hạ cấp VIP hết hạn (hoặc kiểm tra lazy khi đọc)
- [ ] Trao huy chương tự động theo `conditionType` / `conditionValue`

## P6 — Thanh toán SePay (1.5 ngày)

- [ ] `lib/sepay.ts` — xác thực header `Authorization: Apikey <key>`
- [ ] `POST /api/webhooks/sepay` — **idempotent theo `sepayRefId` unique**
- [ ] Đối chiếu số tiền + `Order.code` trong nội dung chuyển khoản
- [ ] `/user/balance` — tạo đơn nạp, sinh QR VietQR kèm nội dung = `code`
- [ ] Polling trạng thái đơn ở client
- [ ] `Commission` cho người giới thiệu khi đơn PAID
- [ ] `/user/withdraw` — tạo yêu cầu rút, admin duyệt
- [ ] Áp `Coupon`: kiểm tra `perUserLimit`, `minAmount`, hạn dùng

## P7 — Nội dung tải xuống (1 ngày)

- [ ] `DownloadItem` CRUD trong trình soạn bài
- [ ] API tải: kiểm tra `canAccess` → ghi `DownloadLog` → trả signed URL (hết hạn ngắn)
- [ ] Giới hạn lượt tải/ngày theo `LevelRule.dailyDownloadLimit`
- [ ] `/user/downloads` — lịch sử tải
- [ ] Upload S3-compatible (presigned PUT)

## P8 — Diễn đàn (2.5 ngày)

- [ ] `/forum` — danh sách chuyên mục phân cấp
- [ ] `/forum/[forum]` — danh sách chủ đề, sắp xếp theo `lastReplyAt`, ghim lên đầu
- [ ] `/forum/t/[thread]` — bài gốc + trả lời lồng nhau
- [ ] Kiểm tra quyền đăng: `postAccess` / `minLevel` / `vipOnly`
- [ ] Treo thưởng: giữ điểm lúc tạo → trả khi đánh dấu `isSolution`
- [ ] Cập nhật `replyCount` / `threadCount` / `lastReplyAt` trong cùng transaction
- [ ] Công cụ mod: ghim, khoá, ẩn, di chuyển chủ đề

## P9 — Người dùng & xã hội (1 ngày)

- [ ] `/u/[username]` — trang cá nhân công khai: bài viết, chủ đề, huy chương, cấp độ
- [ ] `/user/dashboard` — tổng quan điểm, số dư, VIP, streak
- [ ] Theo dõi (`Follow`) + feed người đang theo dõi
- [ ] `/user/favorites` — có phân thư mục
- [ ] Trung tâm thông báo + đánh dấu đã đọc
- [ ] `/user/invite` — link mời + thống kê hoa hồng

## P10 — Quản trị (2 ngày)

- [ ] `/admin` — dashboard số liệu
- [ ] CRUD: bài viết, người dùng, chuyên mục, diễn đàn
- [ ] Duyệt đơn hàng, duyệt rút tiền
- [ ] Quản lý `VipPlan`, `Coupon`, `Medal`, `LevelRule`
- [ ] Xử lý `Report`, cấm người dùng (`Ban` theo `BanScope`)
- [ ] `SiteSetting`, `Slide`, `NavLink`, `FriendLink`
- [x] Audit log cho hành động admin — `lib/audit.ts` + `/admin/logs`

## P11 — Hoàn thiện (1 ngày)

- [ ] Rate limit qua Redis (đăng bài, bình luận, đăng nhập)
- [ ] Chống spam nội dung
- [ ] SEO: metadata động, `sitemap.xml`, `robots.txt`, JSON-LD
- [ ] OG image động
- [ ] Chế độ tối
- [ ] Kiểm tra responsive
- [x] Backup DB tự động — `/admin/backup` + `GET /api/admin/backup` (cron gọi kèm `BACKUP_TOKEN`)

## P12 — Game Hub (đã làm)

- [x] Schema: `Game`, `GameVersion`, `GameFile`, `GameImage`, `GameGenre`, `GamePlatform`,
      `GameResolution`, `GameCollection`, `GameEvent`, `GameUniqueHit`, `GameRating`
- [x] `lib/game.ts` · `lib/game-search.ts` · `lib/game-files.ts` · `lib/game-stats.ts`
- [x] Trang chủ Game, catalog + bộ lọc, tìm kiếm fuzzy, bộ sưu tập, game ngẫu nhiên
- [x] Chi tiết game: thông tin, gallery, changelog, controls, thống kê
- [x] Tải game: signed URL có hạn, checksum, chống trùng unique download
- [x] Admin: quản lý game (version/file/ảnh)
- [x] Seed: 10 thể loại, 6 dòng máy, 7 độ phân giải, 8 game mẫu, 3 bộ sưu tập
- [x] Bỏ toàn bộ Play Online / emulator — kho game chỉ còn xem thông tin và tải file

Việc còn lại: upload file từ admin, quét JAR/JAD tự động, chuyển rate limit sang Redis.

---

## Rủi ro cần chú ý

| Vấn đề | Cách xử lý |
|---|---|
| Rò rỉ nội dung trả phí | Lọc `hiddenContent` ở **server component**, không bao giờ gửi xuống client rồi ẩn bằng CSS |
| Webhook SePay gọi trùng | `sepayRefId` unique + kiểm tra `Order.status` trước khi cộng tiền |
| Race condition khi trừ điểm | Luôn dùng `$transaction` + `increment`, không đọc-rồi-ghi |
| Đếm view làm nghẽn DB | Redis counter, flush theo batch |
| Số dư lệch với log | `BalanceLog.balance` ghi số dư sau mỗi giao dịch để đối soát |
| VIP hết hạn vẫn còn quyền | Kiểm tra `vipExpiresAt` mỗi lần đọc, không tin cột `vipTier` đơn lẻ |
| Rò rỉ file game qua link chia sẻ | Signed URL HMAC gắn actor + hạn 5 phút, không lộ storage key |
| Unique download bị thổi phồng | `GameUniqueHit` khoá theo `gameId + type + actorKey` |

---

## Ước tính

Khoảng **16–17 ngày công** cho bản chạy được đầy đủ.
Muốn ra bản dùng thử sớm: làm P0 → P1 → P2 → P3 → P4 (khoảng 6 ngày) là đã có blog + paywall hoạt động.
