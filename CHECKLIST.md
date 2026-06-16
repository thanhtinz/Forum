# 📋 CHECKLIST — Forum AI Platform

> Cập nhật: 16/06/2026
> Backend NestJS + Prisma + PostgreSQL · **75 models · 27 enums · 17 modules · compile sạch (tsc exit 0)**

---

## ✅ ĐÃ HOÀN THÀNH

### 🔐 Nền tảng & Auth
- [x] **Auth module** — JWT access/refresh, OAuth (Google/Discord/Zalo), argon2 hash
- [x] **Users module** — profile, role (MEMBER/VIP/MODERATOR/ADMIN), status, ban
- [x] **Prisma schema** — 75 models, 27 enums, dùng `cuid()` cho ID
- [x] **Media module** — upload (cấu trúc sẵn cho MinIO/S3)

### 💬 Diễn đàn (Forum)
- [x] Category / Tag / Thread / Post / PostReaction
- [x] Forum EXP hook → game level (thread +10, post +5, like nhận +2)
- [x] Trophy auto-check sau mỗi action

### 🔒 Nội dung ẩn (Hidden Content) — kiểu XenForo
- [x] 7 loại gate: LIKE_REQUIRED, COMMENT_REQUIRED, LIKE_AND_COMMENT, LIKE_OR_COMMENT, GEM_PURCHASE, LIKE_OR_GEM, COMMENT_OR_GEM
- [x] Tự động mở khóa realtime (WebSocket) khi đủ điều kiện
- [x] Mở bằng gem: tác giả nhận 70%, nền tảng 30%

### 💎 Tiền tệ
- [x] **Gem** — nạp tiền thật (SePay/PayPal), CÓ THỂ rút
- [x] **Coin** — chỉ kiếm trong game, KHÔNG rút được
- [x] GemWallet / GemTransaction / CoinTransaction / PaymentTopup / GemPackage

### 🎮 RPG System
- [x] **Nhân vật pixel** — chọn giới tính + ngoại hình (da/tóc/mặt) lúc tạo
- [x] **Level** — forum EXP → lên cấp, +5 stat point mỗi level
- [x] **4 chỉ số** — strength/vitality/agility/intelligence (user tự phân bổ)
- [x] **Combat power** — tính từ stats + trang bị + cường hóa
- [x] **10 slot trang bị** — vũ khí/áo/áo choàng/quần/thắt lưng/găng/giày/dây chuyền/nhẫn/skin
- [x] **Cường hóa** — +0 → +15, tỷ lệ giảm dần, +10% stat mỗi cấp
- [x] **PvP** — auto (mô phỏng turn-based, elo) + manual (chọn skill)
- [x] **Matchmaking** — theo elo ±200
- [x] **Guild** — lập (5000 coin), role 4 cấp, quỹ chung, đóng góp, guild level

### 🍔 Survival Stats (kiểu The Sims)
- [x] 5 chỉ số: đói/khát/vệ sinh/năng lượng/sức khỏe (0-100)
- [x] Suy giảm theo thời gian thực
- [x] Sinh bệnh khi chỉ số thấp → mất máu
- [x] Hành động: ăn/uống/ngủ/vệ sinh/uống thuốc
- [x] Batch decay cho cron job

### 🛒 Shop động (quản lý qua Admin)
- [x] **Equipment** — vũ khí/trang bị/skin với chỉ số bonus
- [x] **Consumables** — thức ăn/nước/thuốc/vệ sinh với hiệu ứng hồi phục
- [x] **Special items** — thẻ đổi tên, nổi bật tên (glow/rainbow/màu), khung avatar, EXP boost
- [x] Mua bằng coin HOẶC gem (giá khác nhau)
- [x] CRUD đầy đủ: icon, mô tả, chỉ số, giá, stock

### 🏆 Danh hiệu (Trophy) — kiểu XenForo
- [x] Trophy có điều kiện đa dạng (post_count, reaction_received, days_registered, level, pvp_wins, products_sold...)
- [x] Award 1 lần, GIỮ VĨNH VIỄN
- [x] Trophy points → User Title Ladder (Thành viên → Kỳ cựu → Huyền thoại → Bậc thầy)
- [x] Auto-check + thông báo
- [x] Admin CRUD trophy + title

### 🎰 Minigame / Casino — CHỈ COIN (anti-gem)
- [x] **11 game**: Jackpot 777, Tài Xỉu, Bầu Cua, Blackjack, Poker, Tiến Lên, Caro, Đua Thú, Vòng Quay, Tung Xu, (Coin Flip)
- [x] **Jackpot 777** — slot 3x3, 5 payline, jackpot khi 777 dòng giữa
- [x] Engine riêng: dice-games, card-games (52 lá), caro-game (Gomoku 15x15), jackpot-game
- [x] House fee cấu hình được, settle bằng transaction
- [x] GambleLog chống gian lận
- [x] **Hệ thống tự động chặn Gem** trong mọi minigame

### 🎨 Game Assets (đã nhận diện & map)
- [x] **Jackpot 777** — 6 symbol: cherry, chanh, chuông, BAR, đồng xu, số 7
- [x] **Bầu Cua** — 6 con: cá, tôm, cua, gà, bầu, nai
- [x] **52 lá bài** — giải mã quy luật: 1-13 bích, 14-26 chuồng, 27-39 rô, 40-52 cơ (2→A)
- [x] Đặt tên chuẩn (2_spades.png, A_hearts.png...) + asset-config.json

### 🤖 AI Companion Live2D
- [x] Multi-provider streaming (OpenAI/Gemini/Ollama)
- [x] Emotion tagger → Live2D expression (9 emotion → motion)
- [x] **Outfit & Bonding** — chat tăng thiện cảm → mở outfit → đổi qua lại
- [x] 5 outfit Minori (normal/cloth002/culture/parttime/priestess), unlock theo bond level 0/2/4/6/8

### 💬 Chat System
- [x] **4 loại kênh**: GLOBAL (tổng), PRIVATE (1-1), GROUP (nhóm), GUILD
- [x] **9 loại tin nhắn**: text, emoji, sticker, GIF, ảnh, video, file, voice (mic), music
- [x] Music tự nhận diện: YouTube, Spotify, SoundCloud, MP3
- [x] WebSocket realtime (join, broadcast, typing)
- [x] **Sticker pack** — upload zip, admin đặt tên, có thể premium

### ⚙️ Admin Panel
- [x] **Config động** — 10 nhóm, 60+ setting (cache, validation, mask secret, audit log, batch save)
- [x] **Dashboard** — stats, biểu đồ tăng trưởng, quản lý user (ban/role/gem adjust)
- [x] **Moderation queue** — duyệt báo cáo
- [x] **Audit log viewer**
- [x] **Shop manager** — CRUD equipment/consumable/special/trophy/title
- [x] **Game asset manager** — cấu hình minigame + asset, sticker pack CRUD
- [x] **Hướng dẫn cấu hình** — guide chi tiết 9 tính năng

### 🌱 Seed Files
- [x] seed.ts (categories, gem packages, AI persona, badges)
- [x] seed-game.ts (level curve 1-50, item templates, skills)
- [x] seed-shop-trophy.ts (consumables, special items, trophies, titles)
- [x] seed-minigame.ts (11 games + asset config + sticker pack)
- [x] seed-ai-character.ts (Minori + 5 outfits)

### 🖥️ UI Preview (React artifacts)
- [x] admin-panel.jsx — control panel XenForo-style
- [x] admin-shop-manager.jsx — CRUD UI item/trophy
- [x] admin-guide.jsx — hướng dẫn cấu hình
- [x] pixel-rpg.jsx — nhân vật pixel canvas + equipment + stats + shop + PvP + guild
- [x] survival-panel.jsx — thanh đói/khát/vệ sinh/ngủ
- [x] minigame-casino.jsx — tài xỉu/bầu cua/vòng quay chơi được
- [x] jackpot-777.jsx — máy quay slot dùng asset thật

---

## ⏳ CHƯA HOÀN THÀNH

### 🏪 Marketplace Storefront
- [ ] Dashboard gian hàng riêng cho từng user
- [ ] Trang storefront chuyên nghiệp (banner, logo, mô tả, chính sách)
- [ ] Theo dõi gian hàng (follow), rating/review
- [ ] Thống kê doanh thu cho seller
- [ ] (Schema Storefront + StorefrontFollow đã có, cần service + UI)

### 🛠️ Tools Collection (~50 tools)
- [ ] Framework tools (ToolCategory + Tool schema đã có)
- [ ] 50 tool từ tools-collection.net: formatters, validators, encoders, generators, converters, calculators
- [ ] UI trang tools + admin quản lý tools

### 🎮 Game engines chi tiết còn thiếu
- [ ] **Đua Thú** — engine mô phỏng đua (mới có config, chưa có engine)
- [ ] **Tiến Lên** — logic đánh bài đầy đủ (mới có chia bài)
- [ ] **Poker** — vòng cược đầy đủ (mới có đánh giá bài)
- [ ] Combat animation replay (đã lưu rounds, chưa có UI replay)

### 🎨 Frontend hoàn chỉnh (Next.js 14)
- [ ] Ghép toàn bộ app Next.js (mới có component lẻ)
- [ ] **Pixel character thay avatar** ở mọi nơi hiển thị
- [ ] **Chat UI đầy đủ** — 4 kênh + popup sticker/gif/emoji tách tab + media player
- [ ] Live2D widget tích hợp với outfit switcher UI
- [ ] Forum UI (danh sách thread, post editor, hidden content block)
- [ ] Marketplace UI
- [ ] Trang cá nhân (profile + trophy showcase + pixel character)

### 🔧 Hạ tầng triển khai
- [ ] Docker Compose hoàn chỉnh (Postgres/Redis/MinIO/Meilisearch)
- [ ] BullMQ workers (survival decay cron, notification queue)
- [ ] Nginx config
- [ ] CI/CD

---

## 📊 TIẾN ĐỘ TỔNG QUAN

| Hạng mục | Trạng thái |
|----------|-----------|
| Backend core (auth, forum, gem) | ✅ Xong |
| RPG system (character, combat, guild) | ✅ Xong |
| Survival stats | ✅ Xong |
| Shop động + admin | ✅ Xong |
| Trophy/danh hiệu | ✅ Xong |
| Minigame casino (11 game) | ✅ Xong |
| Game assets nhận diện | ✅ Xong |
| AI Live2D + bonding | ✅ Xong |
| Chat system (backend) | ✅ Xong |
| Admin panel + guide | ✅ Xong |
| Marketplace storefront | ⏳ Chưa |
| Tools collection (50) | ⏳ Chưa |
| Frontend Next.js hoàn chỉnh | ⏳ Chưa |
| Hạ tầng deploy | ⏳ Chưa |

**Backend ~85% · Frontend ~20% (component lẻ)**

---

## 🔒 LƯU Ý BẢO MẬT
- Token GitHub đã chia sẻ qua chat cần **revoke ngay** tại https://github.com/settings/tokens
- Dùng Working Copy (iOS) hoặc github.dev để push code an toàn
