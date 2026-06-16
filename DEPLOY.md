# 🚀 Hướng dẫn triển khai Forum AI Platform lên VPS (A → Z cho người mới)

Tài liệu này dành cho người **chưa từng deploy bao giờ**. Làm theo đúng thứ tự, copy‑paste từng lệnh là chạy được. Toàn bộ chạy bằng **Docker** nên bạn không cần cài Node, PostgreSQL… thủ công.

Kết quả cuối cùng: website chạy tại `https://ten-mien-cua-ban.com` với HTTPS (ổ khoá xanh) tự động.

---

## 0. Hiểu nhanh hệ thống

Khi deploy, có **3 container** chạy cùng nhau:

| Container | Vai trò |
|-----------|---------|
| `postgres` | Cơ sở dữ liệu (lưu user, bài viết, …) |
| `app` | Ứng dụng NestJS — phục vụ **cả API lẫn giao diện** ở cổng 3001 (nội bộ) |
| `caddy` | Cổng vào internet (cổng 80/443), tự xin **HTTPS** và chuyển request vào `app` |

> 💡 Redis / Meilisearch **không cần thiết** (mã nguồn không dùng tới). MinIO chỉ cần nếu bạn muốn cho phép **upload file trực tiếp** — phần này là tuỳ chọn ở cuối tài liệu.

**Cấu hình VPS tối thiểu khuyến nghị:** 2 vCPU · **2 GB RAM** (nên 4 GB để build mượt) · 20–40 GB SSD · Ubuntu 22.04/24.04.

---

## 1. Chọn & mua máy chủ (VPS)

Chọn 1 trong các nhà cung cấp phổ biến (giá ~5–12 USD/tháng cho gói 2GB RAM):

- **Quốc tế:** [DigitalOcean](https://www.digitalocean.com), [Vultr](https://www.vultr.com), [Linode](https://www.linode.com), [Hetzner](https://www.hetzner.com) (rẻ nhất).
- **Việt Nam (ping thấp, thanh toán nội địa):** Vietnix, AZDIGI, BizFly Cloud, Viettel IDC, VNG Cloud.

Khi tạo VPS, chọn:
- **Hệ điều hành:** Ubuntu 24.04 LTS (hoặc 22.04 LTS).
- **Gói:** ≥ 2 GB RAM.
- **Vùng (region):** gần người dùng của bạn (vd: Singapore cho VN).
- **Xác thực:** nên chọn **SSH key**. Nếu chưa biết, chọn **Password** cho đơn giản, nhà cung cấp sẽ gửi IP + mật khẩu `root` qua email.

Sau bước này bạn có: **IP máy chủ** (vd `123.45.67.89`) và **mật khẩu root**.

---

## 2. Mua tên miền & trỏ về VPS

1. Mua domain ở [Namecheap](https://www.namecheap.com), [Cloudflare](https://dash.cloudflare.com), GoDaddy, Tenten, Mắt Bão…
2. Vào trang quản lý DNS của domain, tạo **2 bản ghi A** trỏ về IP VPS:

| Type | Name (Host) | Value (IP) | TTL |
|------|-------------|-----------|-----|
| A | `@` | `123.45.67.89` | Auto |
| A | `www` | `123.45.67.89` | Auto |

> Nếu chỉ dùng subdomain (vd `forum.example.com`): tạo 1 bản ghi A với Name = `forum`.

3. Đợi DNS lan truyền (vài phút → tối đa 24h). Kiểm tra bằng máy của bạn:
   ```bash
   ping forum.example.com
   ```
   Thấy đúng IP VPS là được.

> ⚠️ Nếu dùng **Cloudflare**: ở bước đầu hãy để icon đám mây màu **xám (DNS only)**, không bật proxy (màu cam), để Caddy xin chứng chỉ HTTPS thành công. Bật proxy sau cũng được.

---

## 3. Kết nối vào VPS bằng SSH

Trên máy tính của bạn mở Terminal (Windows: dùng PowerShell hoặc [Windows Terminal]):

```bash
ssh root@123.45.67.89
```

Nhập mật khẩu khi được hỏi. Lần đầu gõ `yes` để xác nhận.

> 🔒 **Nên làm (tuỳ chọn nhưng khuyến khích):** tạo user thường + bật firewall thay vì dùng `root`. Để đơn giản, tài liệu này dùng `root`.

---

## 4. Cài Docker lên VPS

Copy‑paste nguyên khối sau (cài Docker + Docker Compose chính thức):

```bash
# Cập nhật hệ thống
apt update && apt upgrade -y

# Cài Docker bằng script chính thức
curl -fsSL https://get.docker.com | sh

# Kiểm tra
docker --version
docker compose version
```

Mở firewall cho web (nếu VPS dùng `ufw`):

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## 5. Tải mã nguồn về VPS

```bash
# Cài git nếu chưa có
apt install -y git

# Tải code (đổi URL thành repo của bạn)
cd /opt
git clone https://github.com/thanhtinz/Forum.git forum
cd forum
```

> Nếu repo **private**, dùng Personal Access Token:
> `git clone https://<TOKEN>@github.com/thanhtinz/Forum.git forum`

---

## 6. Cấu hình biến môi trường

```bash
cp .env.production.example .env.production
nano .env.production
```

Sửa **tối thiểu** các dòng sau:

```env
DOMAIN=forum.example.com
FRONTEND_URL=https://forum.example.com
POSTGRES_PASSWORD=<mật khẩu mạnh>
JWT_ACCESS_SECRET=<chuỗi ngẫu nhiên>
JWT_REFRESH_SECRET=<chuỗi ngẫu nhiên khác>
```

Tạo nhanh các chuỗi bí mật (chạy trên VPS rồi dán vào):

```bash
openssl rand -base64 24   # cho POSTGRES_PASSWORD
openssl rand -base64 48   # cho JWT_ACCESS_SECRET
openssl rand -base64 48   # cho JWT_REFRESH_SECRET
```

Lưu file trong `nano`: nhấn **Ctrl+O** → **Enter** → **Ctrl+X**.

---

## 7. Khởi chạy! 🎉

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Lần đầu sẽ mất 3–8 phút để build (tải thư viện, build frontend + backend). Theo dõi log:

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

Khi thấy dòng `🚀 Forum API running ...` là backend đã chạy. Caddy sẽ tự xin HTTPS sau vài giây.

Mở trình duyệt: **https://forum.example.com** → web hiện ra với ổ khoá xanh. Xong!

> Lần sau muốn deploy/cập nhật chỉ cần chạy: `./scripts/deploy.sh`

---

## 8. Cơ sở dữ liệu hoạt động thế nào?

- Container `postgres` **tự lưu dữ liệu** vào volume `pgdata` (không mất khi restart container).
- Khi `app` khởi động, nó **tự đồng bộ cấu trúc bảng** (`prisma db push`) — bạn **không cần tạo bảng thủ công**.
- Nếu `AUTO_SEED=true`, lần đầu sẽ tự nạp dữ liệu mẫu (chuyên mục, AI, vật phẩm game…).

Truy cập DB trực tiếp khi cần:

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U forum -d forum
```

---

## 9. Tạo tài khoản Admin

Hệ thống **không tạo sẵn admin**. Cách làm:

1. Vào website → **Đăng ký** một tài khoản bình thường (nhớ username, vd `boss`).
2. Trên VPS, nâng tài khoản đó lên ADMIN bằng 1 lệnh:

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U forum -d forum -c "UPDATE \"User\" SET role='ADMIN' WHERE username='boss';"
```

3. Đăng xuất / đăng nhập lại → vào `/admin` để quản trị.

---

## 10. Cập nhật khi có code mới

```bash
cd /opt/forum
./scripts/deploy.sh
```

Script sẽ tự: `git pull` → build lại → khởi động lại → dọn image cũ. Dữ liệu trong DB **không bị mất**.

---

## 11. Sao lưu & phục hồi dữ liệu

**Sao lưu** (xuất ra file `.sql`):

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U forum forum > backup_$(date +%F).sql
```

**Phục hồi** từ file backup:

```bash
cat backup_2026-06-16.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U forum -d forum
```

**Tự động sao lưu hằng ngày** (lúc 3h sáng) bằng cron:

```bash
crontab -e
# Thêm dòng:
0 3 * * * cd /opt/forum && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U forum forum > /opt/forum/backup_$(date +\%F).sql
```

> 💾 Nên copy file backup ra nơi khác (Google Drive, S3, máy khác) để an toàn.

---

## 12. Các lệnh quản trị thường dùng

```bash
# Xem trạng thái container
docker compose -f docker-compose.prod.yml ps

# Xem log realtime
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f caddy

# Khởi động lại app
docker compose -f docker-compose.prod.yml restart app

# Dừng tất cả
docker compose -f docker-compose.prod.yml down

# Dừng VÀ XOÁ DB (cẩn thận! mất hết dữ liệu)
docker compose -f docker-compose.prod.yml down -v
```

---

## 13. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân & cách sửa |
|-------------|------------------------|
| Web không lên HTTPS / lỗi chứng chỉ | DNS chưa trỏ đúng IP, hoặc Cloudflare đang bật proxy (cam). Kiểm tra `ping domain`, tắt proxy Cloudflare. Xem log: `logs -f caddy`. |
| `Phai dat POSTGRES_PASSWORD...` khi `up` | Chưa điền `.env.production` hoặc quên `--env-file .env.production`. |
| Build báo hết RAM / bị `Killed` | VPS RAM thấp. Tạo swap: xem mục dưới. |
| Cổng 80/443 bị chiếm | Có Nginx/Apache đang chạy. Tắt: `systemctl stop nginx apache2 && systemctl disable nginx apache2`. |
| Đổi `.env.production` xong không thấy hiệu lực | Chạy lại: `docker compose -f docker-compose.prod.yml up -d`. |

**Tạo swap 2GB** (giúp build trên VPS RAM nhỏ):

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 14. (Tuỳ chọn) Bật upload file qua MinIO

Mặc định ảnh dùng **URL bên ngoài** nên bạn **không cần** phần này. Nếu muốn người dùng upload file trực tiếp:

1. Thêm service MinIO vào compose (hoặc dùng dịch vụ S3 như AWS S3, Cloudflare R2, Backblaze B2).
2. Điền các biến `MEDIA_*` trong `.env.production` (endpoint, bucket, access key, secret key, public URL).
3. Tạo bucket công khai tên trùng `MEDIA_BUCKET`.
4. Deploy lại.

---

## ✅ Tóm tắt 8 bước nhanh

```bash
# 1. SSH vào VPS
ssh root@IP_VPS
# 2. Cài Docker
curl -fsSL https://get.docker.com | sh
# 3. Mở firewall
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
# 4. Tải code
apt install -y git && cd /opt && git clone <REPO_URL> forum && cd forum
# 5. Cấu hình
cp .env.production.example .env.production && nano .env.production
# 6. Chạy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
# 7. Tạo admin (sau khi đăng ký tài khoản trên web)
docker compose -f docker-compose.prod.yml exec postgres psql -U forum -d forum -c "UPDATE \"User\" SET role='ADMIN' WHERE username='TEN_CUA_BAN';"
# 8. Xong → mở https://domain-cua-ban
```
