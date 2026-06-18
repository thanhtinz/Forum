# 🚂 Deploy Forum AI Platform lên Railway (A → Z cho người mới)

Tài liệu này giúp bạn đưa toàn bộ website lên **[Railway](https://railway.app)** — nền tảng deploy đơn giản, không cần thuê VPS hay cấu hình server thủ công. Railway tự build từ `Dockerfile`, tự cấp HTTPS và domain, tự gắn PostgreSQL.

> **Kiến trúc:** dự án chạy **1 process duy nhất** — NestJS vừa phục vụ API ở `/api`, vừa phục vụ giao diện Next.js (đã build static) ở cùng một tên miền. Vì vậy **chỉ cần 1 service** trên Railway + 1 database PostgreSQL.

---

## 0. Chuẩn bị

- Tài khoản GitHub (đã có sẵn repo này).
- Tài khoản Railway: đăng ký tại https://railway.app bằng GitHub (gói **Trial/Hobby** là đủ để bắt đầu, ~5 USD/tháng cho Hobby).
- Hai file cấu hình đã có sẵn trong repo:
  - `Dockerfile` — build cả frontend + backend thành 1 image.
  - `railway.json` — chỉ cho Railway dùng Dockerfile, bật health check + tự restart khi lỗi.

Không cần cài gì trên máy bạn.

---

## 1. Tạo project & gắn database

1. Vào https://railway.app → **New Project**.
2. Chọn **Deploy from GitHub repo** → chọn repo `Forum` (cho Railway quyền truy cập nếu được hỏi).
3. Railway tạo 1 **service** từ repo. Khoan deploy vội — thêm database trước:
   - Trong project, bấm **+ New** (hoặc **Create**) → **Database** → **Add PostgreSQL**.
   - Railway tạo service `Postgres` và tự sinh biến `DATABASE_URL`.

---

## 2. Khai báo biến môi trường (Variables)

Mở **service ứng dụng** (không phải Postgres) → tab **Variables** → thêm các biến sau.

### Bắt buộc

| Biến | Giá trị | Ghi chú |
|------|---------|---------|
| `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` | Tham chiếu sang service Postgres (xem mẹo bên dưới) |
| `JWT_ACCESS_SECRET` | chuỗi ngẫu nhiên dài | Tạo bằng `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | chuỗi ngẫu nhiên khác | Khác với cái trên |
| `JWT_ACCESS_EXPIRES` | `15m` | |
| `JWT_REFRESH_EXPIRES` | `7d` | |
| `FRONTEND_URL` | `https://<domain-railway-cua-ban>` | Điền sau khi có domain ở Bước 4 (để CORS đúng) |
| `AUTO_SEED` | `true` | Tự tạo dữ liệu mẫu lần đầu; đặt `false` sau khi đã có dữ liệu thật |

> **Mẹo gắn DATABASE_URL:** trong ô giá trị gõ `${{ Postgres.DATABASE_URL }}` để Railway tự tham chiếu (nếu service DB tên khác, đổi `Postgres` cho khớp). Như vậy đổi mật khẩu DB không cần sửa tay.

> **Không cần đặt `PORT`** — Railway tự tiêm biến `PORT`, và app đã đọc `process.env.PORT`.

### Tuỳ chọn (chỉ thêm khi dùng)

| Nhóm | Biến |
|------|------|
| AI | `GEMINI_API_KEY`, `OPENAI_API_KEY`, `OLLAMA_BASE_URL` |
| Thanh toán SePay | `SEPAY_BANK_ACCOUNT`, `SEPAY_BANK_NAME`, `SEPAY_ACCOUNT_NAME`, `SEPAY_WEBHOOK_API_KEY` |
| PayPal | `PAYPAL_MODE`, `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET` |
| Lưu media ngoài (S3/MinIO) | `MEDIA_ENDPOINT`, `MEDIA_REGION`, `MEDIA_BUCKET`, `MEDIA_ACCESS_KEY`, `MEDIA_SECRET_KEY`, `MEDIA_FORCE_PATH_STYLE`, `MEDIA_PUBLIC_URL` |

---

## 3. Lưu ảnh upload bền vững (Volume)

Mặc định, ảnh người dùng tải lên được lưu ở thư mục `/app/uploads` **bên trong container**. Mỗi lần deploy lại, container mới → **mất ảnh cũ**. Để giữ lại:

1. Mở service ứng dụng → tab **Settings** (hoặc chuột phải service) → **Add Volume**.
2. **Mount path:** `/app/uploads`.

> Nếu bạn dùng S3/MinIO (các biến `MEDIA_*` ở trên) thì không cần volume này.

---

## 4. Deploy & lấy domain

1. Railway thường tự deploy ngay sau khi cấu hình. Nếu chưa, bấm **Deploy** trong tab **Deployments**.
2. Quá trình build chạy theo `Dockerfile`:
   - build frontend Next.js → static export,
   - build backend NestJS,
   - khi khởi động: `prisma db push` đồng bộ schema vào DB rồi `node dist/main`.
3. Lấy domain công khai: service ứng dụng → **Settings** → **Networking** → **Generate Domain** (Railway cấp `*.up.railway.app` kèm HTTPS).
4. Copy domain đó, quay lại tab **Variables**, đặt `FRONTEND_URL = https://<domain-vừa-tạo>` rồi **Redeploy** để CORS nhận đúng origin.

Mở domain trên trình duyệt — website đã chạy 🎉

---

## 5. Dùng tên miền riêng (tuỳ chọn)

1. Service ứng dụng → **Settings** → **Networking** → **Custom Domain** → nhập `forum.tencuaban.com`.
2. Railway hiện 1 bản ghi **CNAME** — vào nhà cung cấp tên miền, thêm bản ghi CNAME trỏ về giá trị đó.
3. Đợi DNS lan truyền (vài phút–vài giờ); Railway tự cấp HTTPS.
4. Cập nhật lại `FRONTEND_URL` sang tên miền mới rồi redeploy.

---

## 6. Cập nhật code về sau

Railway theo dõi nhánh đã chọn (mặc định `main`). Mỗi lần bạn `git push` lên `main`, Railway **tự build & deploy lại**. Không cần thao tác gì thêm.

---

## 7. Migration dữ liệu

Dự án dùng `prisma db push` (đồng bộ schema trực tiếp, hợp với mô hình không tạo file migration). Lệnh này chạy tự động mỗi lần khởi động (xem `CMD` trong `Dockerfile`).

> ⚠️ `Dockerfile` đang dùng cờ `--accept-data-loss` cho `db push`. Với dữ liệu thật, hãy **backup DB** trước khi đổi schema lớn (xoá/đổi kiểu cột) để tránh mất dữ liệu. Railway có nút **Backups** ngay trong service Postgres.

---

## 8. Khắc phục sự cố thường gặp

| Triệu chứng | Nguyên nhân & cách xử lý |
|-------------|--------------------------|
| Build fail khi `npm ci` | Hết RAM khi build. Trong **Settings → Resources** tăng giới hạn, hoặc thử deploy lại. |
| App khởi động rồi tắt | Thiếu `DATABASE_URL` hoặc DB chưa sẵn sàng. Kiểm tra Variables và xem **Deploy Logs**. |
| Lỗi CORS / gọi API bị chặn | `FRONTEND_URL` chưa khớp domain thật. Cập nhật rồi redeploy. |
| 404 ở các trang | Frontend chưa build vào image — xem log build, đảm bảo bước `frontend` trong Dockerfile thành công. |
| Mất ảnh sau mỗi deploy | Chưa gắn **Volume** ở `/app/uploads` (Bước 3) hoặc chuyển sang S3/MinIO. |
| Health check timeout | Tăng `healthcheckTimeout` trong `railway.json`, hoặc kiểm tra app có lắng nghe đúng `$PORT` không. |

Xem log realtime: service → tab **Deployments** → **View Logs**.

---

## Tóm tắt nhanh (TL;DR)

```
1. New Project → Deploy from GitHub repo (Forum)
2. + New → Database → PostgreSQL
3. Variables: DATABASE_URL=${{ Postgres.DATABASE_URL }}, JWT_*, FRONTEND_URL, AUTO_SEED=true
4. Add Volume → /app/uploads
5. Generate Domain → cập nhật FRONTEND_URL → Redeploy
```

Railway tự lo build (Dockerfile), HTTPS và auto-deploy mỗi lần push `main`.
