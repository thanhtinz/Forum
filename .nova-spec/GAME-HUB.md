# Game Hub — kiến trúc kho game Java ME

Tài liệu này mô tả phần Game Java ME của Nova: catalog, hệ thống tải file và khu
quản trị. Đọc kèm [`SPEC.md`](./SPEC.md).

Kho game **chỉ phục vụ xem thông tin và tải JAR/JAD về máy thật** — không có
emulator, không chơi online. Người chơi tải file về rồi tự chạy trên máy hoặc
trên trình giả lập của riêng họ.

## 1. Bố cục

```
src/
├── app/(site)/games/            # trang công khai
│   ├── page.tsx                 # trang chủ Game
│   ├── browse/                  # catalog + bộ lọc
│   ├── search/                  # tìm kiếm (autocomplete + fuzzy)
│   ├── collections/             # bộ sưu tập
│   ├── random/route.ts          # nhảy tới game ngẫu nhiên
│   └── [slug]/page.tsx          # chi tiết game
├── app/admin/games/             # CRUD game, version, file, ảnh
├── app/api/games/…              # catalog, search, versions, screenshots, download
├── lib/
│   ├── game.ts                  # nhãn, badge, card data, bộ lọc, fuzzy score
│   ├── game-search.ts           # tìm kiếm có fallback fuzzy
│   ├── game-files.ts            # signed URL, checksum, tên file tải
│   └── game-stats.ts            # sự kiện, unique hit, trending, analytics
└── components/game/             # GameCard, filter, gallery, DownloadPanel…
```

## 2. Dòng dữ liệu

| Luồng | Các bước |
|---|---|
| **Tải game** | Chọn game → version → JAR/JAD → `GET /api/games/{id}/download` kiểm tra file & trạng thái quét → cấp signed URL (HMAC, hết hạn 5 phút, gắn với người tải) → CDN hoặc `/api/games/files` phục vụ file → ghi `GameEvent(DOWNLOAD)` |
| **Thống kê** | Mọi sự kiện ghi vào `GameEvent`; bộ đếm tổng nằm trên `Game`; `GameUniqueHit` (unique theo `gameId + type + actorKey`) đảm bảo tải lặp không làm phồng unique download |

Actor được xác định qua `lib/actor.ts`: người đăng nhập dùng `u:<userId>`, khách
dùng cookie `nova_gid` (fallback hash IP + user-agent).

## 3. Catalog & tìm kiếm

- **Sắp xếp**: liên quan, mới nhất, mới cập nhật, phổ biến (trending), tải nhiều,
  đánh giá, tên A–Z.
- **Bộ lọc**: thể loại, dòng máy, độ phân giải, ngôn ngữ, bản Việt hóa, năm phát
  hành, rating tối thiểu, dung lượng tối đa, lượt tải tối thiểu, ngày cập nhật,
  bộ sưu tập.
- **Fuzzy search**: bỏ dấu tiếng Việt + Levenshtein, chỉ chạy khi truy vấn chính
  xác không ra kết quả nào (`lib/game-search.ts`).
- **Trending**: `recomputeTrending()` chấm điểm hoạt động 7 ngày gần nhất
  (view 1 · download 4 · favorite 3 · share 2 · rate 2), giảm dần theo tuổi bài
  kiểu Hacker News.

## 4. Hạn mức & an toàn

- **File**: `GameFile.scanStatus` (`PENDING` → `CLEAN` / `SUSPICIOUS` /
  `QUARANTINED`). File bị cách ly thì link tải bị chặn ngay.
- **Signed URL**: HMAC-SHA256 với `GAME_SIGN_SECRET` (mặc định dùng `AUTH_SECRET`),
  ràng buộc storage key + hạn dùng + actor. Route phục vụ file còn chặn path traversal.
- **Rate limit**: 30 lượt tải/phút cho mỗi actor.

## 5. Biến môi trường

| Biến | Mặc định | Vai trò |
|---|---|---|
| `NEXT_PUBLIC_GAME_CDN_URL` | rỗng | Gốc CDN cho file & ảnh game; rỗng thì phục vụ qua app |
| `GAME_SIGN_SECRET` | `AUTH_SECRET` | Khoá ký signed URL |
| `GAME_STORAGE_DIR` | `./storage/games` | Thư mục file game khi chưa gắn object storage |

## 6. Việc còn lại

- Upload file JAR/JAD trực tiếp từ trang admin (hiện khai báo storage key thủ công).
- Trình quét JAR/JAD tự động để cập nhật `scanStatus`.
- Chuyển rate limit sang Redis khi chạy nhiều instance.
