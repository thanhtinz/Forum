# Nova Platform

**Diễn đàn + kho game**, dựng trên Next.js 15. Lấy cảm hứng từ các diễn đàn wap
Việt Nam thời JohnCMS (2005–2010): cảm ơn, uy tín, chữ ký, tâm trạng, màu nick,
huy hiệu, sổ lưu bút, phòng chat, câu lạc bộ, và mấy trò chơi nhỏ ăn điểm.

**Điểm là đơn vị duy nhất.** Không có tiền thật: mọi thứ mua bán, thưởng phạt,
cược, mở khoá đều tính bằng điểm kiếm được trên diễn đàn.

## Stack

- **Next.js 15** — App Router, Server Components, Server Actions
- **TypeScript**
- **PostgreSQL** + **Prisma**
- **Auth.js v5** — Credentials (+ OAuth nếu cấu hình)
- **Tailwind CSS** — không dùng thư viện component nào
- **Playwright** — bộ kiểm chạy thật trên trình duyệt

## Bắt đầu

```bash
npm install
cp .env.example .env          # điền DATABASE_URL, AUTH_SECRET…
npx prisma db push            # đồng bộ lược đồ
npm run seed                  # dữ liệu mẫu + tài khoản admin
npm run dev
```

Tài khoản admin mẫu: `admin@nova.local` / `admin123`.

Hai trò cần gieo dữ liệu riêng:

```bash
node scripts/seed-nong-trai.mjs      # 11 giống cây
node scripts/seed-trac-nghiem.mjs    # 5 thể loại + 10 câu hỏi (cần sẵn một ADMIN)
```

### Nâng cấp cơ sở dữ liệu đã có dữ liệu

Nếu cơ sở dữ liệu từng chạy bản **có tính năng máy ảo (Play Online)**, chạy bước
dọn **trước** khi `db push`:

```bash
npm run db:don-may-ao
npx prisma db push
```

Bỏ qua bước này thì `db push` dừng giữa chừng ở enum `GameEventType` (Postgres
không cho bỏ giá trị enum khi còn hàng dùng tới), nên cột `GameVersion.platform`
không được tạo và mọi trang game trả về lỗi 500.

Nếu từng chạy bản **có tiền thật và VIP**, hoặc bản **còn bán danh hiệu**:

```bash
node scripts/go-bo-tien-va-vip.mjs
node scripts/go-danh-hieu-ban.mjs    # hoàn điểm cho người đã mua rồi mới gỡ
```

## Cấu trúc

```
src/
├── app/
│   ├── (auth)/        # đăng nhập, đăng ký
│   ├── (site)/        # toàn bộ giao diện công khai (trang chủ = diễn đàn)
│   ├── admin/         # quản trị
│   └── api/           # route handlers (auth, upload, bau-cua, chat, mentions…)
├── lib/               # nghiệp vụ thuần: db, auth, points, level, forum, game…
└── components/        # dựng theo vùng: forum/, game/, club/, user/, giaitri/, farm/
```

Không có nhóm `(user)` hay `(admin)` — khu vực người dùng nằm trong
`(site)/user/`, còn quản trị là `app/admin/` không bọc nhóm.

## Có những gì

**Diễn đàn** — chuyên mục nhiều tầng, chủ đề, trả lời lồng một tầng, trích dẫn,
BBCode, thăm dò ý kiến, treo thưởng điểm, chọn lời giải, theo dõi chủ đề, "chưa
đọc", khối `[hide]` mở bằng điểm, tìm kiếm có lọc theo khu vực/tác giả/thời gian.

**Người dùng & xã hội** — trang cá nhân, album ảnh theo mức riêng tư, sổ lưu bút,
bạn bè, theo dõi, chặn, tin nhắn riêng (kèm cảm xúc, thu hồi, tự xoá, kho ảnh),
phòng chat, nhắc tên `@`, uy tín, cảm ơn, tặng điểm, mời bạn, huy chương, cấp độ.

**Câu lạc bộ** — lập nhóm có tên viết tắt hiện cạnh tên thành viên, bài đăng,
bình luận, duyệt thành viên.

**Kho game** — catalog Java ME, lọc và tìm kiếm bỏ dấu, chi tiết game, tải
JAR/JAD qua URL có chữ ký và hạn dùng, mở khoá game trả điểm, bình luận có phân
trang, yêu cầu game.

**Khu giải trí** — cửa vào của bốn thứ: nông trại (gieo, tưới, thu hoạch, bán,
mở đất, cây khế), Đảo Pokémon, Đảo Rồng và trắc nghiệm (thể loại, ra câu hỏi,
bình luận). Ba game đầu đứng riêng ở đường dẫn gốc của mình, `/giai-tri` chỉ
bày chúng cạnh nhau chứ không phải trang cha. Ảnh lấy từ chính các mã nguồn
JohnCMS cũ, giữ nguyên nét pixel.

**Đảo Rồng** — sáu trang: chuồng, ấp trứng, đấu trường (kể lại trận, ghép theo
cấp, sổ trận), sổ sưu tầm 54 con có mốc thưởng, cửa hàng vật phẩm, xếp hạng
theo mùa tính điểm Elo. Lai tạo hai con lấy một quả trứng.

**Cửa hàng điểm** — màu nick và huy hiệu. Danh hiệu **không bán**, nó là tên cấp
bậc theo cấp độ.

**Quản trị** — người dùng, khu vực, chủ đề, báo cáo, cấm, huy chương, cấp độ,
game, trắc nghiệm, câu lạc bộ, cửa hàng, giao diện, menu, nhật ký, sao lưu.

## Kiểm thử

```bash
npm run test          # chạy trên máy chủ dev đang bật (nhanh, lúc đang sửa mã)
npm run test:that     # dựng bản thật rồi chạy — dùng khi cần con số đáng tin
npm run test 17       # chỉ một bài
npm run scan          # soi truy vấn thừa, nút chết, danh sách không có trần
```

38 tệp kiểm, hơn 630 mục, chạy thật bằng Playwright.

**Nên dùng `test:that` khi cần kết luận.** Máy chủ dev biên dịch từng route lúc
chạy và phình tới gần 900MB, nên bộ kiểm mở nhiều tab dồn dập là nghẽn; đo thực
tế dev trả lời 180–1600ms còn bản dựng 35ms. Cùng một bộ mã, chạy trên dev từng
cho ra 555, 594, 613, 633, 634 mục đạt qua năm lượt — còn trên bản dựng thì hai
lượt liên tiếp đều 634/634.

## Quy ước trong mã

- Tên hàm, biến, chú thích và mọi chữ hiện ra màn hình đều **tiếng Việt**.
- Kiểm tra quyền nằm **trong mệnh đề `where` của Prisma**, không lọc lại sau khi
  đã lấy dữ liệu về.
- Mọi hàm `export` trong tệp `'use server'` là **một endpoint POST công khai** —
  hằng số và kiểu phải để ở tệp `*-const.ts` riêng.
- Chỗ có thể đua thì ghi có điều kiện (`updateMany` + `where`) hoặc khoá hàng
  (`src/lib/lock.ts`), không đọc-rồi-ghi.
- Bộ đếm đếm lại từ sự thật (`src/lib/forum-counters.ts`), không cộng trừ dồn.
- Mọi `findMany` phải có `take`; danh sách dài thì phải phân trang thật.

Chi tiết đặc tả: [`.nova-spec/SPEC.md`](.nova-spec/SPEC.md) · Kho game:
[`.nova-spec/GAME-HUB.md`](.nova-spec/GAME-HUB.md)
