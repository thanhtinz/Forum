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
| Marketplace / Reputation / Moderation / Media / Search | 🔲 Stub (làm tiếp) |

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

# 3. Khởi động services
docker-compose up -d postgres redis meilisearch minio

# 4. Migrate + seed
npx prisma migrate dev
npm run prisma:seed

# 5. Chạy API
npm run start:dev
# → http://localhost:3001/api
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
