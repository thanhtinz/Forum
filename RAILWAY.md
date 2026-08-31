# Triển khai lên Railway

## Các bước

1. Tạo project mới trên Railway, nối repo GitHub này.
2. Thêm plugin **PostgreSQL** trong cùng project — Railway tự cấp biến
   `DATABASE_URL`, gán nó cho service của app (Variables → Add Reference).
3. Nạp các biến môi trường bắt buộc ở tab Variables của service (xem
   `.env.example` — tối thiểu cần `DATABASE_URL`, `AUTH_SECRET`,
   `AUTH_TRUST_HOST=true`, `NEXT_PUBLIC_SITE_URL`).
4. Deploy. Railway đọc `railway.json` + `nixpacks.toml`:
   - build: `npm ci` rồi `npm run build` (chạy `prisma generate` trước
     `next build`).
   - start: `npm run start:railway` — chạy `prisma db push` để đồng bộ lược
     đồ rồi mới `next start`. Repo này không dùng thư mục `migrations/`, nên
     `db push` chính là cách đồng bộ CSDL, giống hệt lúc phát triển ở máy.
5. Healthcheck: `GET /api/health`, kiểm cả kết nối Postgres chứ không chỉ
   HTTP 200 suông.

## Lưu ý về file lưu trữ

`GAME_STORAGE_DIR` / `GAME_SAVE_DIR` mặc định trỏ vào thư mục cục bộ
(`./storage/...`). Ổ đĩa của Railway **không bền vững** giữa các lần deploy —
mỗi lần build lại là một container mới, dữ liệu ghi cục bộ sẽ mất. Chọn một
trong hai:

- Gắn một **Railway Volume** vào đường dẫn `GAME_STORAGE_DIR`/`GAME_SAVE_DIR`
  (Settings → Volumes) — dữ liệu sống qua các lần deploy nhưng KHÔNG chia sẻ
  được nếu sau này chạy nhiều instance song song.
- Hoặc điền `R2_*` để chuyển ảnh người dùng tải lên sang Cloudflare R2 (đã hỗ
  trợ sẵn), và `NEXT_PUBLIC_GAME_CDN_URL` để phục vụ file game từ một CDN/S3
  ngoài thay vì đĩa cục bộ — cách này mới thật sự an toàn khi scale nhiều
  instance.

## `--accept-data-loss`

`start:railway` chạy `prisma db push --accept-data-loss`. Cờ này cho phép
`db push` tự làm những việc có thể MẤT DỮ LIỆU (xoá cột, đổi kiểu không tương
thích...) mà không dừng lại hỏi. Cần vậy vì lệnh chạy tự động ở bước start,
không có ai ngồi đó gõ "y". Trước khi đổi lược đồ theo hướng xoá cột hay đổi
kiểu, kiểm tra kỹ ở máy phát triển bằng `npx prisma db push` (không có cờ
này) để tự thấy Prisma cảnh báo mất gì trước khi đẩy lên.
