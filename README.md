# Forum AI Platform

Nền tảng forum tích hợp hidden content gate, gem marketplace và Live2D AI companion.
Tham khảo: chiasemanguon.com + tính năng ẩn nội dung kiểu XenForo.

## Stack
- **Backend**: NestJS + Prisma + PostgreSQL
- **Realtime**: Socket.IO (AI chat + notifications)
- **Queue**: BullMQ | **Cache**: Redis | **Search**: Meilisearch | **Storage**: MinIO
- **AI**: OpenAI / Gemini / Ollama (multi-provider, streaming)
- **Live2D**: PIXI.js + pixi-live2d-display
- **Payments**: SePay (QR/webhook) + PayPal

## Tính năng đã build

### ✅ Core Backend (compile-clean)
| Module | Trạng thái |
|---|---|
| Auth (JWT + OAuth Google/Discord/Zalo) | ✅ Hoàn chỉnh |
| Forum (thread/post/like/comment) | ✅ Hoàn chỉnh |
| **Hidden Content Gate** | ✅ Hoàn chỉnh — 7 loại điều kiện |
| Gem System (wallet/transaction) | ✅ Hoàn chỉnh |
| Payments (SePay + PayPal) | ✅ Hoàn chỉnh |
| AI Companion (WebSocket + emotion + Live2D) | ✅ Hoàn chỉnh |
| Notifications | ✅ Hoàn chỉnh |
| Users (profile) | ✅ Hoàn chỉnh |
| Marketplace (storefront + follow) | ✅ Hoàn chỉnh |
| Moderation + Nhà tù (prison) | ✅ Hoàn chỉnh |
| Media (presign S3/MinIO) / Search | ✅ Hoàn chỉnh |
| Game RPG (nhân vật/combat/guild/survival/shop) | ✅ Hoàn chỉnh |
| Nông trại + Câu cá + Wardrobe/Pet/Mount | ✅ Hoàn chỉnh |
| Minigame (11 game) + PvP room realtime | ✅ Hoàn chỉnh |
| Tools Collection (44 tool catalog) | ✅ Backend |

### ✅ Frontend Components
- `Live2DWidget.tsx` — widget AI nổi + trang chat riêng
- `HiddenContentBlock.tsx` — render nội dung ẩn với progress bar + nút unlock

## Hidden Content Gate — 7 loại điều kiện
| Gate Type | Điều kiện mở |
|---|---|
| `LIKE_REQUIRED` | Đủ N like |
| `COMMENT_REQUIRED` | Đủ N bình luận |
| `LIKE_AND_COMMENT` | Đủ CẢ HAI |
| `LIKE_OR_COMMENT` | Một trong hai |
| `GEM_PURCHASE` | Mua bằng gem |
| `LIKE_OR_GEM` | Like hoặc trả gem |
| `COMMENT_OR_GEM` | Comment hoặc trả gem |

Auto-unlock realtime khi like/comment qua Socket.IO. Mua bằng gem → tác giả nhận 70% (platform fee 30%).

## Chạy local

```bash
# 1. Cài dependencies
npm install

# 2. Setup env
cp .env.example .env
# Điền DATABASE_URL, JWT secrets, AI keys, SePay/PayPal...

# 3. Khởi động services hạ tầng
docker-compose up -d postgres redis meilisearch minio

# 4. Đồng bộ schema vào DB (repo chưa dùng migration files)
npx prisma generate
npx prisma db push

# 5. Chạy API
npm run start:dev
# → http://localhost:3001/api
```

> **Dữ liệu mẫu tự động**: cá/cây/phân/vật nuôi/công thức/đồ ăn/wardrobe/tools được
> `SeederService` tự upsert khi app khởi động (data nằm trong `src/seed/data/*`).
> Tắt bằng `AUTO_SEED=false`. Seed forum/gem gốc vẫn chạy `npm run prisma:seed`.

### Deploy chung (1 process: frontend + backend + API)
NestJS phục vụ luôn frontend (Next.js static export) cùng origin với API — **không tách build/deploy**.

```bash
docker-compose up -d   # service `app` build cả FE+BE, tự db push rồi start
# Mở http://localhost:3001  → giao diện forum
# API tại  http://localhost:3001/api
```

Build tay không Docker:
```bash
cd frontend && npm ci && npm run build   # -> frontend/out (static)
cd .. && npm ci && npm run build && npx prisma db push
node dist/main                            # serve cả frontend lẫn /api tại :3001
```

✅ Đã verify unified: `/` (frontend), `/thread`, `/tools`, `/api/tools`, `/game-assets/*` đều trả 200 từ **một process**.

### Dev (tách, hot-reload)
```bash
npm run start:dev          # backend :3001
cd frontend && npm run dev # frontend :3000 (proxy /api -> :3001)
```

## API Endpoints chính

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/oauth
GET    /api/auth/me

GET    /api/hidden-content/sections/post/:postId
POST   /api/hidden-content/sections          (tạo section ẩn)
POST   /api/hidden-content/unlock/gem        (mở bằng gem)

GET    /api/gem/balance
GET    /api/gem/packages
POST   /api/payments/sepay/topup
POST   /api/payments/sepay/webhook
POST   /api/payments/paypal/order
POST   /api/payments/paypal/capture/:orderId

POST   /api/ai/sessions
GET    /api/ai/personas
WS     /ai   (chat realtime + emotion → Live2D)
```

## Database
34 models, 14 enums, 52 indexes. Xem `prisma/schema.prisma`.

## Tiếp theo
- Marketplace module (product CRUD, file delivery)
- Reputation engine (auto badge)
- Meilisearch indexing
- MinIO upload service
- Next.js frontend đầy đủ

---

## ✅ Trạng thái (cập nhật 16/06/2026)

Đã verify end-to-end với PostgreSQL thật: boot OK, auto-seed 181 template, các endpoint chính trả 200.

**Backend (~256 route, deploy 1 process)**
- Forum đầy đủ (thread/post/react/category, đăng bài) + hidden content gate
- Game: nhân vật RPG/combat/guild/survival, Nông trại, Câu cá, Wardrobe/Pet/Mount
- Minigame 11 game (+ PvP realtime: Tiến Lên, Caro) — hệ phòng/pot/socket
- Chat realtime, AI Companion (streaming + cảm xúc), Bói toán (Bát Tự/Tarot/Mai Hoa + AI + thu phí)
- Tools (44 công cụ), Nhà tù (giam/chuộc/ân xá)
- **Marketplace + Seller Center (19 mục)**: sản phẩm/kho-giao-tự-động/đơn/escrow giam 3 ngày/coupon/quảng-bá-gem/ticket/đánh-giá/nhân-viên-phân-quyền/ví/rút-tiền/AI/2FA/thống-kê/nhật-ký
- Admin toàn diện: chợ (cửa hàng/đơn/rút tiền/danh mục/giá dịch vụ), bói toán, tools, dữ liệu game, kiểm duyệt, nhà tù, người dùng
- Thông báo realtime (gateway /notif) đẩy live + badge chưa đọc

**Frontend (48 trang, Next.js static export do NestJS phục vụ)**
- Forum, Chat, AI Companion, Game (+farm/fishing/wardrobe), Minigame (+bàn PvP), Bói toán, Tools, Marketplace (+sản phẩm/gian hàng), Đơn hàng, Profile, Seller Center, Admin
