import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Những danh sách dài phải có trần.
 *
 * Không kiểm "trang mở được" — kiểm rằng dữ liệu THỪA không đi xuống trình
 * duyệt. Cắt bằng CSS hay cắt sau khi đã lấy về thì trang vẫn nặng y như cũ,
 * chỉ là mắt thường không thấy.
 */
export default async function run(check) {
  const huy = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  // Bài này cần một chủ đề CÓ SẴN trả lời gốc để treo phản hồi cấp hai vào.
  // Trước đây chỉ hỏi `status: PUBLISHED` rồi lấy đại con đầu tiên, mà
  // `findFirst` không có `orderBy` thì Postgres trả về hàng nào tuỳ thứ tự vật
  // lý — chạy đủ lâu là bốc trúng chủ đề mẫu không có trả lời nào, và bài đỏ
  // oan ngay ở mục "có dữ liệu mẫu". Nói thẳng điều kiện ra trong `where`.
  const thread = await db.thread.findFirst({
    where: { status: 'PUBLISHED', replies: { some: { parentId: null } } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, forum: { select: { slug: true } } },
  });
  const parent = thread
    ? await db.reply.findFirst({
      where: { threadId: thread.id, parentId: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    : null;
  if (!huy || !thread || !parent) { check('có dữ liệu mẫu', false, 'thiếu chủ đề hoặc trả lời'); return; }

  const wipe = async () => {
    await db.reply.deleteMany({ where: { content: { startsWith: 'PHANHOI-' } } });
    await db.user.deleteMany({ where: { username: { startsWith: 'thanker' } } });
    await db.gameGenre.deleteMany({ where: { slug: { startsWith: 'tl-kiem-thu-' } } });
  };
  await wipe();

  const page = await openPage('minhdev');
  const url = `${BASE}/forum/${thread.forum.slug}/${thread.id}`;

  try {
    // 40 phản hồi con cho cùng một trả lời
    for (let i = 0; i < 40; i++) {
      await db.reply.create({
        data: { threadId: thread.id, parentId: parent.id, authorId: huy.id, content: `PHANHOI-${i}` },
        select: { id: true },
      });
    }
    // 60 người cảm ơn trả lời đó
    for (let i = 0; i < 60; i++) {
      const u = await db.user.create({
        data: { username: `thanker${i}`, name: `Thanker ${i}`, email: `thanker${i}@test.local` },
        select: { id: true },
      });
      await db.reaction.create({ data: { userId: u.id, replyId: parent.id, type: 'THANKS' }, select: { id: true } });
    }

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const html = await page.content();

    check('chỉ dựng 10 phản hồi con', (await page.locator('li:has-text("PHANHOI-")').count()) === 10);
    check('có lối xem tất cả phản hồi', (await page.locator('text=Xem tất cả 40 phản hồi').count()) > 0);
    // Đây mới là mục kiểm thật: phản hồi thứ 39 không được nằm trong mã nguồn.
    check('phản hồi ngoài mức hiển thị không đi xuống trình duyệt', !html.includes('PHANHOI-39'));

    const names = new Set(html.match(/Thanker \d+/g) ?? []);
    check('bảng cảm ơn chỉ gửi xuống tối đa 12 tên', names.size > 0 && names.size <= 12, `đang là ${names.size}`);
    check('nhưng vẫn đếm đủ 60 lượt cảm ơn', html.includes('60'));

    await page.locator('text=Xem tất cả 40 phản hồi').click();
    await page.waitForTimeout(2000);
    check('bấm xem tất cả thì mở đủ 40 phản hồi',
      (await page.locator('li:has-text("PHANHOI-")').count()) === 40);

    // ── Các trang có phân trang mới ──────────────────────────────────────
    for (const [ten, path] of [
      ['đã chặn', '/user/blocked'],
      ['bạn bè', '/user/friends'],
      ['đang theo dõi', '/user/following'],
    ]) {
      const r = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      check(`trang ${ten} mở được`, r.status() === 200, `trả về ${r.status()}`);
    }

    const admin = await openPage('admin@nova.local', 'admin123');
    for (const [ten, path] of [
      ['huy chương', '/admin/medals'],
      ['danh mục kho game', '/admin/games/danh-muc'],
    ]) {
      const r = await admin.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      check(`trang quản trị ${ten} mở được`, r.status() === 200, `trả về ${r.status()}`);
    }

    // ── Bốn nhóm danh mục kho game lật trang độc lập nhau ────────────────
    for (let i = 0; i < 30; i++) {
      await db.gameGenre.create({
        data: { slug: `tl-kiem-thu-${i}`, name: `TL kiểm thử ${i}`, order: 900 + i },
        select: { id: true },
      });
    }
    await admin.goto(`${BASE}/admin/games/danh-muc`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(800);
    check('nhóm thể loại có phân trang khi vượt một trang',
      (await admin.locator('a[href*="tl=2"]').count()) > 0);

    await admin.goto(`${BASE}/admin/games/danh-muc?tl=2`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(800);
    const html2 = await admin.content();
    check('trang 2 của nhóm thể loại hiện đúng phần còn lại', html2.includes('TL kiểm thử 29'));
    check('trang 2 không còn dựng hàng của trang 1', !html2.includes('TL kiểm thử 0<'));
    // Mọi liên kết lật trang phải mang theo tham số của hai nhóm còn lại,
    // nếu không lật nhóm này là hai nhóm kia nhảy về trang 1.
    const links = await admin.$$eval('a[href*="danh-muc?"]', (els) => els.map((e) => e.getAttribute('href') ?? ''));
    check('liên kết lật trang giữ tham số của các nhóm khác',
      links.length > 0 && links.every((h) => h.includes('dm=') && h.includes('pg=')),
      JSON.stringify(links));
  } finally {
    await wipe();
  }
}
