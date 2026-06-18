# 📐 Kế hoạch: Tích hợp game (VPS) + Giftcode + Nạp thẻ

> Tài liệu **thiết kế / khả thi**, chưa code. Mục tiêu: web đóng vai trò **tài khoản trung tâm + ví Gem**, các game chạy trên VPS riêng gọi API web để xác thực và trao thưởng. Bổ sung tính năng **nhập giftcode (thưởng vật phẩm game)** và **nạp thẻ** trên web.

---

## 1. Tổng quan & kết luận khả thi

| Hạng mục | Khả thi | Ghi chú |
|----------|---------|---------|
| Game VPS gọi API web (SSO + ví chung) | ✅ Rất khả thi | Web đã có account + ví Gem (`credit`/`debit`). Cần thêm lớp **API key cho game**. |
| Giftcode thưởng **vật phẩm game** | ✅ Khả thi | Vật phẩm nằm ở game ngoài → cần cơ chế **giao quà xuyên hệ thống** (mailbox/claim). |
| Nạp thẻ telco qua cổng trung gian | ✅ Khả thi (có điều kiện) | Phụ thuộc bên thứ ba + pháp lý + chiết khấu. Xem mục 5. |
| Nạp thẻ/voucher tự phát hành | ✅ Rất khả thi | Không cần bên thứ ba; gần như giftcode quy mệnh giá. |

**Nền tảng đã có sẵn (tái sử dụng được ngay):**
- Tài khoản + JWT (`auth`), ví Gem (`gem.service`: `credit/debit` an toàn bằng transaction), lịch sử `PaymentTopup`, cổng SePay/PayPal.
- Hệ thống vật phẩm **nội bộ** (`ItemTemplate`, `InventoryItem`, `WarehouseItem`…) cho game pixel built-in.
- Admin Config động (`ConfigSetting`) + AuditLog + mask secret.

**Phần còn thiếu cần dựng:** lớp API cho game ngoài, model giftcode, kho quà (mailbox), và (tuỳ chọn) tích hợp cổng thẻ.

---

## 2. Kiến trúc tích hợp game ngoài

```
                    ┌─────────────────────────────┐
   Trình duyệt ───▶ │   WEB (NestJS + Next.js)     │
   (user)           │   • Tài khoản trung tâm      │
   nhập giftcode    │   • Ví Gem (credit/debit)    │
   nạp thẻ          │   • Giftcode / Mailbox quà   │
                    │   • Public Game API (HMAC)   │
                    └──────────┬──────────────────┘
                               │ server-to-server (API key + HMAC)
                ┌──────────────┼───────────────┐
                ▼              ▼                ▼
          Game A (VPS)   Game B (VPS)     Game C (VPS)
```

**Nguyên tắc:**
1. **Một nguồn sự thật cho tài khoản & ví** = web. Game không tự giữ số dư gem — luôn hỏi/ghi qua API web.
2. **Game ↔ web là server-to-server**, xác thực bằng **API key + chữ ký HMAC** (không dùng JWT user cho call nội bộ nhạy cảm như trừ tiền).
3. **User ↔ game**: khi user đăng nhập game, game lấy **token liên kết** từ web (SSO nhẹ) để biết user là ai.

### 2.1. Hệ thống API Key cho game (cần làm trước)
- Model `GameApp`: `id, name, slug, apiKey (public), apiSecret (bí mật, hash), webhookUrl, isActive, scopes[], createdAt`.
- Mỗi request từ game gửi: `X-Game-Key`, `X-Timestamp`, `X-Signature = HMAC_SHA256(secret, method+path+timestamp+body)`.
- Web verify: key tồn tại + active, timestamp trong ±5 phút (chống replay), chữ ký khớp.
- Quản lý trong Admin: tạo/thu hồi key, gán quyền (`wallet.read`, `wallet.debit`, `reward.grant`…), xem log.

### 2.2. Các endpoint Public Game API (đề xuất)
| Method | Endpoint | Mục đích |
|--------|----------|----------|
| `POST` | `/game-api/auth/verify` | Game đổi token liên kết → thông tin user (SSO) |
| `GET`  | `/game-api/wallet/:userId` | Đọc số dư Gem |
| `POST` | `/game-api/wallet/debit` | Trừ Gem (mua vật phẩm trong game) — idempotent theo `refId` |
| `POST` | `/game-api/wallet/credit` | Cộng Gem (thưởng từ game) — idempotent |
| `GET`  | `/game-api/mailbox/:userId` | Lấy danh sách quà chờ nhận (giftcode/nạp thẻ) |
| `POST` | `/game-api/mailbox/claim` | Đánh dấu đã giao quà vào game |

> **Idempotency** bắt buộc: mọi giao dịch tiền/quà kèm `refId` duy nhất để retry không bị cộng/trừ 2 lần.

---

## 3. Giftcode thưởng vật phẩm game

Vì vật phẩm nằm ở **game ngoài**, web không thể tự "bỏ item vào túi". Giải pháp tốt nhất là mô hình **Kho quà (Mailbox)**: web ghi quà vào hòm thư của user; game **kéo về** và phát item khi user vào game.

### 3.1. Mô hình dữ liệu (đề xuất)
```
GiftCode
  code            (unique, in hoa)        — VD: TET2026
  type            single | multi          — dùng 1 lần / nhiều lần
  rewards         Json[]  — [{ gameSlug, itemId, qty } | { type:'GEM', amount }]
  maxUses         Int?    — tổng lượt (null = vô hạn)
  usedCount       Int
  perUserLimit    Int     — mỗi user nhập tối đa mấy lần (thường 1)
  startsAt/expiresAt
  isActive

GiftCodeRedemption
  giftCodeId, userId, createdAt           — chống nhập trùng (unique [code,user])

RewardMailbox  (kho quà chờ giao vào game)
  userId, gameSlug, payload Json, status (pending|claimed), source (giftcode|card|admin)
  refId (idempotency), createdAt, claimedAt
```

### 3.2. Luồng nhập giftcode trên web
1. User nhập code ở trang `/giftcode`.
2. Web kiểm tra: tồn tại, còn hạn, còn lượt, user chưa vượt `perUserLimit`.
3. Với mỗi phần thưởng:
   - Nếu là **Gem** → `gem.credit()` ngay.
   - Nếu là **vật phẩm game** → tạo bản ghi `RewardMailbox` (pending) cho đúng `gameSlug`.
4. Ghi `GiftCodeRedemption` + tăng `usedCount` (transaction, có khoá chống race).
5. Khi user vào game, game gọi `GET /game-api/mailbox/:userId` → nhận item → phát trong game → gọi `POST /game-api/mailbox/claim` để đánh dấu đã giao.

### 3.3. Admin
- Tạo code lẻ hoặc **sinh hàng loạt** (VD 1000 code ngẫu nhiên cho sự kiện).
- Chọn phần thưởng (gem / item theo game), số lượt, hạn dùng.
- Thống kê: đã dùng / còn lại, ai đã nhập (AuditLog).

> Ưu điểm mailbox: **không phụ thuộc game online lúc nhập code**, hỗ trợ nhiều game, retry an toàn, dễ đối soát.

---

## 4. Nạp thẻ trên web

Hai hướng, **chọn 1 hoặc kết hợp**. Số dư sau khi nạp vẫn quy về **Gem** (đơn vị trung tâm), rồi mới tiêu trong web/game.

### Hướng A — Thẻ cào telco qua cổng trung gian
**Cách hoạt động:** user nhập *mệnh giá + seri + mã thẻ* → web gọi API cổng (card2k / thesieure / gachthe1s / Trinity…) → cổng gạch thẻ với nhà mạng → callback kết quả → web cộng gem.

### Hướng B — Thẻ/voucher tự phát hành
**Cách hoạt động:** admin sinh sẵn mã thẻ có **mệnh giá gem**; user nhập mã → cộng gem. Bản chất = giftcode chuyên cho gem. Dùng để bán buôn cho đại lý, làm sự kiện, hoặc quy đổi nội bộ.

---

## 5. Tư vấn tính khả thi phần "Nạp thẻ"

| Tiêu chí | Hướng A (thẻ cào telco) | Hướng B (tự phát hành) |
|----------|-------------------------|------------------------|
| Độ phức tạp kỹ thuật | Trung bình (tích hợp API + callback cổng) | Thấp (gần như giftcode) |
| Phụ thuộc bên thứ ba | **Có** — phải đăng ký tài khoản cổng | Không |
| Chi phí / chiết khấu | **Mất 12–30%** mệnh giá (phí gạch thẻ) | 0% (nhưng phải tự bán được mã) |
| Dòng tiền | User trả bằng thẻ → cổng trả tiền về ví của bạn | Bạn thu tiền trực tiếp khi bán mã |
| Rủi ro gian lận | Thẻ sai/đã dùng → cổng từ chối (an toàn nếu chỉ cộng khi callback OK) | Lộ mã / sinh trùng (kiểm soát bằng hash + 1 lần dùng) |
| Pháp lý | Nhạy cảm: gạch thẻ telco đổi giá trị ảo có thể vướng quy định; nên có pháp nhân + hợp đồng với cổng | Đơn giản hơn, vẫn cần minh bạch điều khoản |
| Trải nghiệm user | Quen thuộc với game thủ VN | Cần có kênh phân phối mã |

**Khuyến nghị:**
1. **Giai đoạn đầu**: chỉ cần **SePay (chuyển khoản/QR)** đã có sẵn — chi phí thấp nhất, không phụ thuộc ai, dòng tiền trực tiếp. Nạp thẻ telco **chưa cần vội**.
2. Khi cần thẻ cào: chọn **1 cổng uy tín**, tích hợp ở chế độ **chỉ cộng gem khi có callback "thành công"** (không tin client), lưu mọi giao dịch + chiết khấu để đối soát.
3. Cân nhắc **Hướng B** nếu muốn bán mã qua đại lý/sự kiện mà không mất phí cổng — tái dùng gần như toàn bộ hệ thống giftcode.

> ⚠️ Trước khi mở nạp thẻ telco thật, nên xác nhận **điều kiện pháp lý** (pháp nhân, hợp đồng cổng, điều khoản hoàn tiền) — đây là rủi ro lớn hơn rủi ro kỹ thuật.

---

## 6. Lộ trình triển khai đề xuất

| Giai đoạn | Hạng mục | Phụ thuộc |
|-----------|----------|-----------|
| **1. Nền tảng** | `GameApp` + API key/HMAC + Public Game API (wallet read/debit/credit, idempotent) + quản lý key trong Admin | — |
| **2. Kho quà** | `RewardMailbox` + endpoint mailbox/claim | GĐ 1 |
| **3. Giftcode** | `GiftCode` + `GiftCodeRedemption` + trang `/giftcode` + Admin tạo/sinh code | GĐ 2 (để thưởng item game) |
| **4. Nạp thẻ (B)** | Thẻ/voucher tự phát hành quy ra gem | Tái dùng GĐ 3 |
| **5. Nạp thẻ (A)** | Tích hợp cổng thẻ telco + callback | Pháp lý + tài khoản cổng |

> Có thể làm **Giftcode thưởng Gem** trước (không cần GĐ 1–2), rồi mới mở rộng sang vật phẩm game khi đã có lớp API + mailbox.

---

## 7. Tóm tắt

- **Có làm được toàn bộ.** Web đã có sẵn account + ví Gem để làm trục trung tâm.
- Việc **bắt buộc dựng trước** khi game ngoài tham gia: **lớp API key/HMAC + Public Game API + kho quà (mailbox)**.
- **Giftcode** thưởng vật phẩm game → đi qua mailbox (game tự kéo về), an toàn và không phụ thuộc game online lúc nhập.
- **Nạp thẻ**: trước mắt dùng SePay là đủ; thẻ cào telco khả thi nhưng vướng phí + pháp lý → cân nhắc; thẻ tự phát hành là phương án nhẹ nhàng nhất.
