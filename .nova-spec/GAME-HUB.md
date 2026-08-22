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
| `nova:init` | `{ jarUrl, jadUrl, checksum, profile, config }` | Nạp MIDlet với profile thiết bị + cấu hình game |
| `nova:config` | `{ config }` | Đổi cấu hình giữa chừng (tốc độ, FPS, cỡ chữ, âm thanh…) |
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
| `/games/[slug]/play` | dựng emulator **toàn màn hình** | màn hình hướng dẫn + nút tải game |

Trên điện thoại sân khấu emulator là một lớp `fixed inset-0` cao `100dvh`, che
hết header/footer và khung của trang, chừa safe-area cho tai thỏ
(`viewport-fit=cover`), khoá cuộn nền. Chế độ này bật theo **thiết bị** chứ không
theo bề ngang cửa sổ — xoay ngang máy vẫn toàn màn hình:

- **Cầm dọc**: dựng nguyên **skin thân máy candybar** bọc cả màn hình lẫn bàn
  phím, kiểu skin của các emulator máy cổ. Thân hai tông chia `56 : 44` theo
  skin thật (mặt trước máy chia màn hình ~57%, bàn phím ~40%):
  - **Nửa trên — mặt trước tối**: dải trên (tên game, đồng hồ phiên, menu ⋮, khe
    loa thoại) rồi kính màn hình. Kính **ôm sát** khung game chứ không phải mảng
    đen full chiều ngang; phần viền được trừ khỏi chỗ trống khi tính khung game
    (đọc `padding`/`border` từ computed style nên đổi class không phải sửa số).
  - **Nửa dưới — mặt phím sáng màu**, phím nhựa bạc chữ tối:
    1. phím gọi (xanh) và kết thúc (đỏ) là hai viên thuốc nhỏ ở hai vai;
    2. hai phím mềm ngay dưới, vòng xoay bạc kẹp giữa bốn phím đó — vành trơn,
       nút chọn vuông bo góc ở tâm, mũi tên để mờ vì máy thật không in mũi tên;
    3. bàn phím số 4×3 phím bè ngang: chữ số và chữ cái nằm cạnh nhau, cột phải
       đảo thứ tự (`DEF 3`, `MNO 6`) đúng như bàn phím Nokia đời sau.

  Màu thân máy khớp **từng đời máy** (`src/lib/emulator-skin.ts`), tra theo slug
  của máy, không có thì rơi về màu chung của hãng: 7210 vỏ xanh phím bạc, 6300
  thép không gỉ, RAZR V3 nhôm anod bạc, Chocolate đen bóng phím đỏ, Walkman
  W200i cam đen, Cyber-shot K800i đen tuyền… Máy vỏ sáng dùng **phím bạc chữ
  tối**, máy vỏ đen dùng **phím tối chữ sáng** (`keys: 'silver' | 'dark'`), nên
  chữ luôn đọc được. Vài máy có đèn phím màu riêng thì chữ cái phụ lấy đúng màu
  đó (`accent`).

  Đo thật ở khung 390×844: khung game 289×386 (tỉ lệ 0.749), không tràn.
- **Cầm ngang**: vẫn là thân máy, chỉ xoay thành **dáng máy chơi game cầm tay** —
  vòng xoay bên trái, khoang màn hình ở giữa (tối hơn thân máy, kính ôm sát khung
  game), bàn phím số bên phải, hàng phím chức năng chạy dưới đáy khoang màn hình.
  Dùng chung màu thân máy và tông phím với bản dọc; không có khe loa thoại vì
  dáng này không phải mặt trước máy. Phím số to hơn và in được cả chữ cái nhờ
  chỗ trống hai bên. Đo ở 844×390: khung game 199×266; ở 568×320 (máy cũ nhất
  còn gặp): 147×196, vẫn không tràn.

Bố cục bám `matchMedia('(orientation: landscape)')` — hướng cầm máy thật, không
phải suy từ chiều cao cửa sổ. Khung game thì giữ đúng hướng của máy ảo (game
Java gần như đều là game dọc), chỉ xoay khi người chơi bấm "Xoay ngang màn
hình"; xoay máy sẽ xoá lựa chọn thủ công đó nên không có cảnh cầm dọc mà khung
game cứ nằm ngang mãi.

Mọi nút điều khiển (tạm dừng, khởi động lại, tiếng, xoay, toàn màn hình, lưu /
nạp, chọn máy ảo, cấu hình, thoát) nằm trong menu **⋮** ở góc trên phải, có nhãn
chữ hẳn hoi — thay cho hàng nút biểu tượng ăn mất một dải chiều cao của khung game.

Mọi máy đều dùng vòng xoay tròn. Nhãn phím mềm thì lấy theo hãng (Options/Back,
Menu/Back, Select/Back…).

Khung game được đo bằng JS (`ResizeObserver`) thay vì `aspect-ratio` của CSS: khi
`max-width` cắt bớt chiều ngang thì CSS không co chiều cao theo, ảnh game bị kéo méo.

Đây là cổng **giao diện**, không phải ranh giới bảo mật: `?force=1` trên trang
`/play` vẫn mở emulator, để máy thật bị nhận diện nhầm (trình duyệt bật chế độ
desktop) không bị khoá cứng. Việc bảo vệ tài nguyên do rate limit và giới hạn
phiên đồng thời đảm nhiệm.

## 5. Thư viện máy cổ

Seed dựng sẵn 35 `EmulatorProfile` theo đời máy Java ME thật, thông số bám máy gốc
(đời 2002–2003 chỉ có MIDP 1.0 nên không bật save state, RAM thấp hơn):

| Hãng | Máy |
|---|---|
| Nokia | 3510i 96×65 · 7210 128×128 · 6230 128×128 · 6070 128×160 · 6600 S60 176×208 · 7610 S60 176×208 · N70 S60 176×208 · 6300 S40 240×320 · N73 S60 240×320 · 6120 Classic S60 240×320 · N95 S60 240×320 · 2700 Classic 240×320 · **E71 S60 320×240 (ngang)** · 5800 XpressMusic 360×640 · **5230 360×640 (cảm ứng thuần)** |
| Sony Ericsson | K510i 128×160 · W200i 128×160 · K750i 176×220 · W810i 176×220 · K800i 240×320 · C902 240×320 |
| Samsung | E250 128×160 · D900 240×320 · E900 240×320 · **S5233 Star 240×400 (cảm ứng thuần)** |
| Motorola | RAZR V3 176×220 · SLVR L7 176×220 · E398 176×220 |
| LG | KG800 Chocolate 176×220 · KP500 Cookie 240×400 |
| Siemens | C65 132×176 · CX65 132×176 |
| Máy ảo chung | 240×320 · 320×240 (ngang) · 360×640 |

E71 là máy QWERTY màn nằm ngang — để thử game thiết kế cho khung ngang mà không
phải bấm nút xoay.

### Bố cục mặt phím theo dòng máy

Các dòng máy không chỉ khác màu vỏ mà **bày phím khác hẳn nhau**, nên mặt phím
chia thành các họ (`FaceLayout` trong `src/lib/emulator-skin.ts`):

| Họ | Máy | Mặt trước |
|---|---|---|
| `s40` | Nokia 6300, 2700, 6070, LG | vòng xoay tròn, nút OK ở tâm, phím mềm + gọi/kết thúc phía trên |
| `rocker` | Nokia 3510i · 7210 · 6230, Samsung, Siemens | phím bập bênh nằm ngang (đời chưa có vòng xoay) |
| `s60` | Nokia 6600 · 7610 · N70 · N73 · 6120 · N95 | phím bốn hướng vuông, **Menu** và **C** kẹp hai bên, gọi/kết thúc ngoài cùng |
| `se` | Sony Ericsson | bốn phím xếp **2×2** quanh joystick (hoạt động ‧ back bên trái, tin nhắn ‧ C bên phải), phím mềm hàng trên |
| `razr` | Motorola V3 · L7 · E398 | **đĩa điều hướng tròn**, ✉ và ↩ hai bên, hàng dưới gọi ‧ trình duyệt ‧ kết thúc, rồi lưới phím **phẳng khắc laser** ngăn nhau bằng đường gân |
| `qwerty` | Nokia E71 | hai phím tắt mỗi bên D-pad, phím gọi/kết thúc là hai **thanh cong** dưới chúng, rồi **bàn phím QWERTY**. Số in **phía trên chữ** đúng vị trí máy E-series: `1 2 3` trên T Y U, `4 5 6` trên F G H, `7 8 9 0` trên V B N M, `*` trên I, `#` trên J. Phím chữ không mang số để trơ vì game Java không đọc |
| `touch` | Nokia 5800, LG KP500 Cookie | mặt trước chỉ **ba thanh mảnh** sát đáy — gọi (xanh) ‧ menu ‧ kết thúc (đỏ); bàn phím số bật ra khi cần. Thân máy chia `78 : 22` |
| `touch-only` | Samsung S5233 Star, Nokia 5230 | **cảm ứng thuần, không phím cứng nào** — chơi bằng cách chạm thẳng lên màn hình. Thân máy chia `92 : 8`, chỉ chừa nút gọi bàn phím số cho game bắt buộc bấm phím |

Máy thật có vài phím cứng không mang mã Java riêng (Menu của S60, phím back của
Sony Ericsson). Những phím đó gán về phím gần nghĩa nhất — Menu về phím mềm
trái, back về phím mềm phải — đúng như cách dùng trên máy.

Mỗi bố cục phím còn có nhãn phím mềm riêng (`SOFT_KEY_LABEL`): Nokia
*Options/Back*, Sony Ericsson *Select/Back*, Motorola *Menu/Back*, Siemens
*Menu/Clear*…

**Người chơi tự chọn máy**: nút “Chọn máy ảo” trong emulator mở bảng gom theo hãng,
kèm độ phân giải, CLDC/MIDP và mức tương thích lấy từ ma trận
(`Chạy tốt` / `Beta` / `Không chạy`; máy chưa ai thử thì không có nhãn). Chọn máy
khác sẽ mở phiên mới qua `?profile=<id>`.

Seed tự dựng ma trận tương thích: máy trùng độ phân giải gốc của game → `FULL`,
máy cùng hãng nhưng khác độ phân giải → `BETA`.

`resolveProfile()` ưu tiên máy biên tập chỉ định cho game (`Game.emulatorProfileId`),
chỉ rơi xuống ma trận khi máy đó bị tắt hoặc bị đánh dấu `NONE` — nếu không, game
hay khởi động nhầm vào một máy “chạy tốt” bất kỳ thay vì máy gốc.

## 6. Cấu hình theo từng game

Lấy ý từ J2ME Loader nhưng bỏ bước import: bấm vào game nào là chơi game đó, cấu
hình gắn theo game và tự nạp lại lần sau. Kiểu dữ liệu ở `src/lib/emulator-config.ts`:

| Trường | Giá trị | Ai xử lý |
|---|---|---|
| `screenWidth` / `screenHeight` | 13 mức dựng sẵn (96×65 → 480×800) + nhập tay, `null` = theo máy đã chọn | trang |
| `scaling` | `fit` giữ tỉ lệ · `stretch` kéo đầy · `original` giữ 1:1 pixel | trang |
| `filter` | `sharp` (pixel vuông) · `smooth` | trang |
| `speed` | 0.5× → 3× — game Java hay chạy chậm, kéo lên cho mượt | runtime |
| `fps` | 15/20/25/30/45/60 hoặc bỏ giới hạn | runtime |
| `fontSize` · `sound` | cỡ chữ trong game, âm thanh | runtime |
| `vibrate` | rung nhẹ 12 ms khi **chạm phím ảo** — gõ bàn phím PC thì không rung | trang |

Bốn trường trang tự áp được ngay (đo khung bằng `ResizeObserver`, đặt
`image-rendering`, gọi `navigator.vibrate`), nên đổi là thấy hiệu lực tức thì.
Các trường còn lại được đẩy xuống runtime qua `nova:config` và phụ thuộc runtime
có hỗ trợ hay không. Máy không có API rung (iOS Safari) thì `vibrate` trả về
`false` chứ không ném lỗi.

Lưu ở đâu: đã đăng nhập → bảng `UserGameConfig` (`userId + gameId`), mở ở máy khác
vẫn giữ; khách → `localStorage` theo khoá `nova:games:config:<slug>`. Mọi giá trị
đọc vào đều qua `parseConfig()` nên dữ liệu hỏng chỉ rơi về mặc định, không vỡ trang.

Bảng cấu hình gộp luôn phần **gán phím bàn phím** — trong J2ME Loader nó cũng là
một phần cấu hình của từng game.

## 7. Hạn mức & an toàn

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

## 8. Biến môi trường

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

## 9. Việc còn lại

- Cắm runtime J2ME thật (hiện `runtimeUrl` để trống trong seed).
- Chuyển rate limit và bộ đếm phiên sang Redis khi chạy nhiều instance.
- Upload file JAR/JAD trực tiếp từ trang admin (hiện khai báo storage key thủ công).
- Trình quét JAR/JAD tự động để cập nhật `scanStatus`.
- Autoscale emulator worker + queue riêng thay cho hàng đợi trong DB.
