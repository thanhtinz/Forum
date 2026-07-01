# 🌐 Forum AI Platform

> Nền tảng diễn đàn cộng đồng thế hệ mới — kết hợp **forum** mạnh mẽ kiểu Flarum/XenForo, **game hoá** (RPG, farm, minigame), **chợ số** (marketplace + ví Gem), **AI companion Live2D**, và hàng loạt tính năng giải trí — tất cả trong **một ứng dụng duy nhất**.

Một người dùng kiếm điểm khi tham gia diễn đàn → tiêu trong game → mua bán ở chợ → trò chuyện với AI → nhận huy hiệu, lên cấp. Mọi thứ liền mạch trong cùng một hệ sinh thái.

---

## ✨ Tính năng nổi bật

### 💬 Diễn đàn (kiểu Flarum + XenForo)
- Chuyên mục, thẻ (tag) + **theo dõi thẻ**, chủ đề/bài viết, **reactions** đa biểu cảm
- **Câu trả lời hay nhất** (tự chọn theo lượt reaction), **bình chọn (poll)**
- **Theo dõi / lưu (bookmark)**, **bản nháp**, **nhắc tên (@mention)**, **lọc từ cấm**
- **Hàng đợi duyệt bài** cho thành viên mới, **Di chuyển / Gộp / Tách** chủ đề (mod)
- **Tiến độ đọc** + đánh dấu bài mới, **donate Gem** cho tác giả, ước tính thời gian đọc

### 👥 Cộng đồng & Hồ sơ (XenForo)
- **Theo dõi người dùng** + **Bảng tin hoạt động**, **Tường nhà (profile posts)**
- **Chặn/phớt lờ** người dùng, **trường hồ sơ tuỳ chỉnh**, **danh bạ thành viên**
- **Trạng thái online** + "đang xem chủ đề", **BXH cảm xúc & đóng góp**
- **Thư viện ảnh (Media Gallery)** với album, bình luận, thích

### 🏅 Huy hiệu & Cấp độ
- Huy hiệu theo **vai trò / người bán / mục tiêu (tự trao theo cột mốc)**
- **Cấp độ (level/rank)** theo điểm hoạt động, **icon tự tải lên** cho từng huy hiệu
- **Tích xanh (verify)**: thành viên đạt ngưỡng tự đăng ký → **admin duyệt**

### 🎮 Giải trí
- **Điểm danh hằng ngày** (chuỗi streak thưởng coin)
- **Vòng quay may mắn** (gacha), **Giveaway / Lì xì** (rút thăm & bóc nhanh)
- **Đố vui** hằng ngày + **Dự đoán** sự kiện (chia thưởng pari-mutuel)

### 🕹️ Game hoá
- Nhân vật RPG, trang bị, kỹ năng, **PvP/PvE**, **guild**
- **Nông trại** (trồng trọt, vật nuôi, nấu ăn), minigame casino (chỉ dùng coin), nhà tù
- Hai loại tiền tệ: **coin** (trong game, không quy đổi) & **Gem** (chợ, rút được)

### 🛒 Chợ số (Marketplace)
- Gian hàng người bán, sản phẩm số, đơn hàng, đánh giá, mã giảm giá
- Nạp Gem (SePay QR / PayPal), **rút Gem về bank** (phí % cấu hình bởi admin)

### 🤖 AI Companion (Live2D)
- Nhân vật Live2D tương tác, hệ thống **thân thiết (bond)** mở khoá trang phục
- Chat AI streaming đa nhà cung cấp (OpenAI / Gemini / Ollama)

### 🔮 Khác
- Bói toán (Tử vi / Tarot / Mai Hoa), chat realtime (DM/nhóm), CMS trang & menu
- **Mã mời (invite code)**, hệ thống danh hiệu/trophy, bảng quản trị đầy đủ

---

## 🧱 Công nghệ

| Lớp | Công nghệ |
|-----|-----------|
| Backend | **NestJS 10** + **Prisma** + **PostgreSQL** |
| Realtime | Socket.IO (AI chat, thông báo) |
| Frontend | **Next.js 14** (App Router, static export) + Tailwind CSS |
| AI | OpenAI / Gemini / Ollama (đa nhà cung cấp, streaming) |
| Live2D | PIXI.js + pixi-live2d-display |
| Thanh toán | SePay (QR/webhook) + PayPal |
| Lưu trữ | Upload nội bộ hoặc S3/MinIO (tuỳ chọn) |
| Triển khai | Docker + Caddy (HTTPS tự động) |

**Kiến trúc gọn:** NestJS phục vụ luôn frontend (Next.js static export) **cùng một origin** với API — deploy **một process duy nhất**.

---

## 🚀 Chạy thử nhanh (local)

```bash
# Backend
cp .env.example .env            # điền DATABASE_URL, JWT secrets
npm install
npx prisma db push
npm run start:dev               # API tại http://localhost:3001/api

# Frontend (cửa sổ khác)
cd frontend && npm install && npm run dev   # http://localhost:3000
```

Hoặc chạy cả cụm bằng Docker:
```bash
docker compose up -d            # http://localhost:3001
```

## 🌍 Triển khai lên VPS (production, HTTPS)

Xem hướng dẫn chi tiết **A → Z cho người mới**: **[DEPLOY.md](./DEPLOY.md)**
(chọn VPS, trỏ domain, cài Docker, cấu hình, backup, CI/CD…).

```bash
cp .env.production.example .env.production && nano .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

---

## 📊 Quy mô dự án

- **40+ module** backend · **130+ model** dữ liệu · **440+ API endpoint**
- **86 trang** giao diện · biên dịch & build sạch (TypeScript strict)

---

## 📜 Giấy phép

Dự án thuộc sở hữu của **thanhtinz**. Được dùng cho mục đích **cá nhân, phi lợi nhuận**.
**Cấm kinh doanh dưới mọi hình thức, ngoại trừ chủ sở hữu mã nguồn.**
Chi tiết tại [LICENSE](./LICENSE). Liên hệ cấp phép thương mại: **thanhtinz23072003@gmail.com**.
