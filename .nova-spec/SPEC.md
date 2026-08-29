# Nova Platform — Đặc tả kỹ thuật

Diễn đàn + kho game, dựng mới trên Next.js 15. Lấy cảm hứng từ các diễn đàn wap
Việt Nam thời JohnCMS (2005–2010).

**Điểm là đơn vị duy nhất.** Không có tiền thật, không có VIP, không có nội dung
trả phí bằng tiền. Mọi thứ mua bán, thưởng phạt, cược, mở khoá đều tính bằng
điểm kiếm được trên diễn đàn.

---

## 1. Stack

| Lớp | Công nghệ |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Ngôn ngữ | TypeScript |
| CSDL | PostgreSQL |
| ORM | Prisma |
| Auth | Auth.js v5 — Credentials, thêm OAuth nếu cấu hình |
| Giao diện | Tailwind CSS thuần, **không** dùng thư viện component nào |
| Kiểm thử | Playwright, chạy thật trên trình duyệt |

Không dùng Redis, không dùng shadcn/ui, không có hàng đợi. Hạn mức chống spam
nằm trong bộ nhớ tiến trình (`src/lib/rate-limit-memory.ts`) — mất khi khởi động
lại và không dùng chung giữa nhiều máy chủ; đó là lớp chặn tiện tay, lớp thật
luôn nằm ở cơ sở dữ liệu.

---

## 2. Sơ đồ module

```
src/
├── app/
│   ├── (auth)/                  # đăng nhập, đăng ký
│   ├── (site)/                  # toàn bộ giao diện công khai
│   │   ├── page.tsx             # trang chủ = diễn đàn
│   │   ├── forum/[slug]/[id]/   # chuyên mục → chủ đề
│   │   │                        # đăng bài CHỈ từ trong chuyên mục: /forum/<slug>/new
│   │   ├── chua-doc/            # chủ đề chưa đọc
│   │   ├── games/               # kho game
│   │   ├── giai-tri/            # bầu cua, oẳn tù tì, trắc nghiệm
│   │   ├── nong-trai/           # nông trại
│   │   ├── clb/                 # câu lạc bộ
│   │   ├── cua-hang/            # cửa hàng điểm
│   │   ├── chat/  online/  ranking/  thanh-vien/  search/  tag/
│   │   ├── u/[username]/        # trang cá nhân
│   │   └── user/                # khu vực đăng nhập
│   ├── admin/                   # quản trị (không bọc nhóm route)
│   └── api/                     # auth, upload, bau-cua, chat, mentions, gifs…
├── lib/                         # nghiệp vụ thuần, không dựng JSX
└── components/                  # forum/ game/ club/ user/ giaitri/ farm/ comment/
```

---

## 3. Luật bất di bất dịch

Những điều dưới đây đã đổi bằng lỗi thật, đừng phá.

### 3.1 `'use server'`

Mọi hàm `export` trong tệp `'use server'` là **một endpoint POST công khai**.
Người lạ gọi thẳng được, không qua giao diện. Vì vậy:

- Mỗi hàm **tự kiểm quyền của chính nó**, không tin trang gọi nó đã kiểm.
- Hằng số, kiểu, hàm đồng bộ phải để ở tệp `*-const.ts` riêng — tệp
  `'use server'` chỉ được export hàm async.

*Đã từng dính:* `purgeExpiredMessages` được export từ tệp `'use server'` mà không
kiểm gì, gọi thẳng là xoá sạch tin nhắn của hội thoại bất kỳ.

### 3.2 Quyền nằm trong `where`

Điều kiện phân quyền phải nằm **trong mệnh đề `where` của Prisma**, không được
lấy dữ liệu về rồi mới lọc. Lọc sau nghĩa là dữ liệu đã rời cơ sở dữ liệu, và
chỉ cần một đường rẽ quên lọc là rò.

Áp cho: album theo mức riêng tư, bài câu lạc bộ theo tư cách thành viên, bình
luận bị ẩn, đáp án trắc nghiệm, khối `[hide]`.

### 3.3 Giấu ở máy chủ, không giấu ở giao diện

Thứ người xem chưa được thấy thì **không được rời máy chủ**. Giấu bằng CSS hay
bằng điều kiện dựng hình là không giấu — xem mã trang là ra.

Ví dụ đang làm đúng: đáp án và lời giải trắc nghiệm lấy bằng một truy vấn thứ
hai, chỉ chạy khi người xem đã trả lời / là tác giả / là quản trị. Kết quả bầu
cua giữ ở máy chủ tới đúng mốc `revealAt`.

### 3.4 Điều kiện đua

Đọc-rồi-ghi là sai ở mọi chỗ có thể gọi hai lần cùng lúc. Dùng:

- ghi có điều kiện: `updateMany` + `where` rồi xem `count`, hoặc
- khoá hàng theo thứ tự id đã sắp: `src/lib/lock.ts`.

*Đã từng dính:* chọn lời giải song song trả thưởng hai lần; điểm danh hai lần ăn
hai lần điểm; kết bạn hai chiều tạo hai hàng nên huỷ kết bạn chỉ xoá một, album
mức "bạn bè" vẫn mở cho người đã huỷ.

### 3.5 Bộ đếm đếm lại từ sự thật

`Forum.threadCount`, `Forum.replyCount`, `Thread.replyCount` **đếm lại** bằng
`src/lib/forum-counters.ts`, không cộng trừ dồn. Cộng trừ dồn thì mỗi đường đi
quên một nhịp là lệch vĩnh viễn, và không có cách nào biết đã lệch.

`scripts/soat-bo-dem.mjs` đối soát lại toàn bộ khi cần.

### 3.6 Cột chép sẵn

`User.levelTitle` chép từ `LevelRule.name`. Cột chép sẵn thì lệch được, nên có
đúng **hai nơi ghi** — `addExp` khi lên cấp, và `saveLevelRule`/`deleteLevelRule`
khi quản trị đổi tên bậc — cùng một mục đối soát trong `soat-bo-dem.mjs`.

### 3.7 Danh sách phải có trần và phải phân trang

Mọi `findMany` phải có `take` (`npm run scan` chặn). Nhưng có `take` mà không có
phân trang thì dữ liệu vượt trần **mất hẳn lối vào** — vẫn nằm trong cơ sở dữ
liệu mà người dùng không có cách nào xem. Danh sách dài theo thời gian thì phải
phân trang thật, không chỉ cắt trần.

---

## 4. Bẫy đã gặp

**Prisma `NOT` không khớp NULL.** `NOT: { col: x }` bỏ qua đúng những hàng
`col IS NULL`. Muốn phủ cả NULL phải viết
`OR: [{ col: null }, { NOT: { col: x } }]`.

**`as const` làm `orderBy` thành readonly**, Prisma từ chối. Tách ra một biến
riêng kèm `satisfies Prisma.X$argsType`.

**Máy chủ dev giữ bản Prisma cũ** sau `prisma generate` — phải khởi động lại,
không thì lỗi "không có trường này" dù lược đồ đã đúng.

**Neo phải đứng cuối địa chỉ.** Gắn `#neo` vào `basePath` của `Pagination` sẽ ra
`/trang#neo?page=2`, lúc ấy `?page=2` nằm trong phần neo nên máy chủ không đọc
thấy. Dùng prop `neo` riêng.

**`<details>` gấp nội dung theo `::details-content`.** Chrome đời mới giấu bằng
`content-visibility: hidden` trên pseudo ấy, không phải `display: none` trên thẻ
con — muốn ép mở phải mở khoá ở cả hai chỗ. Và thẻ `<style>` đặt trước
`<summary>` sẽ làm `<details>` thôi gấp.

**Bộ kiểm chờ theo đồng hồ là bộ kiểm chập chờn.** Lượt `goto` hay lượt bấm trả
về không có nghĩa là giao dịch ở máy chủ đã ghi xong. Dùng `doiToi` trong
`tests/helpers.mjs` để chờ đúng trạng thái.

---

## 5. Điểm

`src/lib/points.ts::grantPoints` là đường duy nhất đổi điểm: ghi `PointsLog` và
đổi `User.points` trong cùng một giao dịch, có khoá chống trùng theo
`reason` + `refId`.

**Lịch sử điểm không được mất.** Enum `PointsReason` giữ cả những lý do không còn
chỗ nào ghi nữa (`POST_CREATE` còn 37 hàng lịch sử) — bỏ giá trị enum là xoá
luôn phần lịch sử ấy.

Số dư điểm **chỉ hiện trên thanh đầu trang**, không in lại trong trang chơi: hai
con số thì phải giữ cho khớp nhau, mà chúng sẽ lệch. Giá cả (giá hạt, giá ô đất,
cọc câu hỏi) thì vẫn hiện — đó là thông tin của trò, không phải ví người chơi.

---

## 6. Trò chơi

Vòng chơi tính theo **đồng hồ**, không có cron. Bầu cua: mã phiên là
`floor(now / 60000)`, chia ba pha đặt → xóc → mở bát. Việc chốt sổ chạy **lười**
— chính lượt có người mở trang là lượt chốt phiên cũ, bằng
`updateMany where rolledAt: null` nên chỉ chốt được một lần dù bao nhiêu người
cùng vào.

`closeAt` đọc từ **hàng đã lưu**, không tính lại từ đồng hồ. Hai nguồn sự thật
thì có lúc lệch nhau, và đã từng cho đặt cửa vào phiên đã xóc — cược ấy không
bao giờ được trả.

Ảnh lấy từ chính các mã nguồn JohnCMS cũ trong `public/hoai-niem/`. Giữ nét
pixel: `image-rendering: pixelated`, phóng theo **bội số nguyên**.

---

## 7. Chữ nghĩa

Tên hàm, biến, chú thích và mọi chữ hiện ra màn hình đều **tiếng Việt**.

Gọi một thứ bằng một tên: **"chuyên mục"** (không dùng "mục", "khu vực", "box").
Tham số trên URL dùng `tab` và `sort`.

Chú thích giải thích **vì sao**, nhất là ở chỗ trông như thừa hoặc trông như
sai — không kể lại mã đang làm gì.
