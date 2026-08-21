# Game Hub — kiến trúc & giao ước runtime

Tài liệu này mô tả phần Game Java ME của Nova: catalog, hệ thống tải, Play Online
và khu quản trị. Đọc kèm [`SPEC.md`](./SPEC.md).

## 1. Bố cục

```
src/
├── app/(site)/games/            # trang công khai
│   ├── page.tsx                 # trang chủ Game
│   ├── browse/                  # catalog + bộ lọc
│   ├── search/                  # tìm kiếm (autocomplete + fuzzy)
│   ├── collections/             # bộ sưu tập
│   ├── random/route.ts          # nhảy tới game ngẫu nhiên
│   ├── [slug]/page.tsx          # chi tiết game
│   └── [slug]/play/page.tsx     # Play Online
├── app/(admin)/admin/
│   ├── games/                   # CRUD game, version, file, ảnh, tương thích
│   └── emulator/                # profile, hạn mức, phiên đang chạy, log lỗi
├── app/api/games/…              # catalog, search, versions, screenshots, download, play
├── app/api/emulator/…           # session status/heartbeat/close, profile, keymap, save
├── lib/
│   ├── game.ts                  # nhãn, badge, card data, bộ lọc, fuzzy score
│   ├── game-search.ts           # tìm kiếm có fallback fuzzy
│   ├── game-files.ts            # signed URL, checksum, tên file tải
│   ├── game-stats.ts            # sự kiện, unique hit, trending, analytics
│   ├── emulator.ts              # Session Manager: tạo/heartbeat/đóng/dọn rác
│   └── emulator-keys.ts         # Java key code + keymap (dùng chung client/server)
└── components/game/             # GameCard, filter, gallery, EmulatorStage, keypad…
```

## 2. Dòng dữ liệu

| Luồng | Các bước |
|---|---|
| **Tải game** | Chọn game → version → JAR/JAD → `GET /api/games/{id}/download` kiểm tra file & trạng thái quét → cấp signed URL (HMAC, hết hạn 5 phút, gắn với người tải) → CDN hoặc `/api/games/files` phục vụ file → ghi `GameEvent(DOWNLOAD)` |
| **Play Online** | `POST /api/games/{id}/play` → chọn version + emulator profile theo ma trận tương thích → tạo `EmulatorSession` → trả signed URL của JAR/JAD → frontend nạp runtime trong iframe sandbox → heartbeat mỗi 20s → `close` hoặc hết hạn thì chốt thống kê |
| **Thống kê** | Mọi sự kiện ghi vào `GameEvent`; bộ đếm tổng nằm trên `Game`; `GameUniqueHit` (unique theo `gameId + type + actorKey`) đảm bảo tải lặp không làm phồng unique download |

Actor được xác định qua `lib/actor.ts`: người đăng nhập dùng `u:<userId>`, khách
dùng cookie `nova_gid` (fallback hash IP + user-agent).

## 3. Giao ước runtime emulator

Runtime J2ME **không** chạy chung process với web server. Mỗi
`EmulatorProfile.runtimeUrl` trỏ tới một dịch vụ riêng, được nhúng bằng
`<iframe sandbox="allow-scripts">`. Trang và runtime trao đổi bằng `postMessage`.

### Trang → runtime

| `type` | Payload | Ý nghĩa |
|---|---|---|
| `nova:init` | `{ jarUrl, jadUrl, checksum, profile }` | Nạp MIDlet với profile thiết bị |
| `nova:key` | `{ action: 'down' \| 'up', key, code }` | `code` là Java key code (MIDP `Canvas`) |
| `nova:control` | `{ action, payload? }` | `pause` · `resume` · `reset` · `mute` · `unmute` · `stop` · `saveState` · `loadState` |

### Runtime → trang

| `type` | Payload | Ý nghĩa |
|---|---|---|
| `nova:ready` | — | Runtime đã tải xong, sẵn sàng nhận `nova:init` |
| `nova:started` | — | MIDlet đang chạy |
| `nova:paused` | — | Runtime tự tạm dừng |
| `nova:error` | `{ message }` | Lỗi runtime — phiên chuyển `ERROR` |
| `nova:state` | `{ data }` (base64) | Kết quả `saveState`, trang tự lưu lên cloud hoặc localStorage |

Nếu profile chưa có `runtimeUrl`, trang Play vẫn hoạt động (tạo phiên, đếm giờ,
bàn phím ảo) nhưng hiển thị rõ là chưa gắn runtime và mời người dùng tải JAR về máy.

## 4. Play Online chỉ mở trên điện thoại

Game Java ME thiết kế cho màn hình dọc nhỏ và bàn phím số, nên emulator chỉ bật
trên điện thoại. Kho game (danh sách, tìm kiếm, chi tiết, tải JAR/JAD) vẫn dùng
được ở mọi thiết bị.

`src/lib/device.ts` đọc `user-agent` phía server và trả `mobile | tablet | desktop`;
cờ `mobile` được truyền xuống `GameCard` / `GameGrid` / `GameRow` /
`ContinuePlaying` / `DownloadPanel`.

| Nơi | Điện thoại | Máy tính |
|---|---|---|
| Nút trên thẻ game | “Chơi ngay” | “Chi tiết” (không có link `/play`) |
| Trang chi tiết | nút `PLAY ONLINE` | dòng nhắc mở bằng đt |
| Khung tải | nút `PLAY ONLINE` | dòng nhắc; hàng “Play Online” ghi *Chỉ trên điện thoại* |
| Mục “Tiếp tục chơi” | hiện | ẩn hẳn |
| `/games/[slug]/play` | dựng emulator | màn hình hướng dẫn + nút tải game |

Đây là cổng **giao diện**, không phải ranh giới bảo mật: `?force=1` trên trang
`/play` vẫn mở emulator, để máy thật bị nhận diện nhầm (trình duyệt bật chế độ
desktop) không bị khoá cứng. Việc bảo vệ tài nguyên do rate limit và giới hạn
phiên đồng thời đảm nhiệm.

## 5. Hạn mức & an toàn

- **Phiên**: `sessionMaxSec` (thời lượng tối đa), `idleTimeoutSec` (mất heartbeat),
  `gracePeriodSec` (thời gian ân hạn khi kết nối lại) — đặt trên từng profile.
- **Đồng thời**: `EMU_USER_MAX` cho mỗi người dùng/khách, `EMU_CLUSTER_MAX` cho
  toàn cụm; vượt ngưỡng cụm thì phiên vào hàng đợi (`QUEUED`) thay vì bị từ chối.
- **Circuit breaker**: quá `EMU_BREAKER_ERRORS` lỗi runtime trong 5 phút thì tạm
  ngừng nhận phiên mới.
- **Dọn rác**: `reapStaleSessions()` chạy trước mỗi lần tạo phiên — đóng phiên hết
  hạn, mất heartbeat và phiên tạo ra nhưng không bao giờ khởi động.
- **File**: `GameFile.scanStatus` (`PENDING` → `CLEAN` / `SUSPICIOUS` /
  `QUARANTINED`). File bị cách ly chặn cả Play Online lẫn Download.
- **Signed URL**: HMAC-SHA256 với `GAME_SIGN_SECRET` (mặc định dùng `AUTH_SECRET`),
  ràng buộc storage key + hạn dùng + actor. Route phục vụ file còn chặn path traversal.
- **Rate limit**: 10 phiên/5 phút và 30 lượt tải/phút cho mỗi actor.

## 6. Biến môi trường

| Biến | Mặc định | Vai trò |
|---|---|---|
| `NEXT_PUBLIC_GAME_CDN_URL` | rỗng | Gốc CDN cho file & ảnh game; rỗng thì phục vụ qua app |
| `GAME_SIGN_SECRET` | `AUTH_SECRET` | Khoá ký signed URL |
| `GAME_STORAGE_DIR` | `./storage/games` | Thư mục file game khi chưa gắn object storage |
| `GAME_SAVE_DIR` | `./storage/saves` | Sandbox filesystem cho RMS / save state |
| `EMU_CLUSTER_MAX` | `200` | Số phiên đồng thời toàn cụm |
| `EMU_USER_MAX` | `2` | Số phiên đồng thời mỗi người |
| `EMU_BREAKER_ERRORS` | `25` | Ngưỡng lỗi/5 phút để mở circuit breaker |
| `EMU_RUNTIME_URL` | rỗng | Runtime mặc định gán cho profile khi seed |

## 7. Việc còn lại

- Cắm runtime J2ME thật (hiện `runtimeUrl` để trống trong seed).
- Chuyển rate limit và bộ đếm phiên sang Redis khi chạy nhiều instance.
- Upload file JAR/JAD trực tiếp từ trang admin (hiện khai báo storage key thủ công).
- Trình quét JAR/JAD tự động để cập nhật `scanStatus`.
- Autoscale emulator worker + queue riêng thay cho hàng đợi trong DB.
