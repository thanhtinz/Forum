import { BASE, db, openPage } from '../helpers.mjs';

const TITLE = 'Bài kiểm thử khoá nội dung bằng điểm';

/**
 * Hệ thống chỉ còn MỘT loại tiền là điểm, và chỉ còn diễn đàn với kho game.
 *
 * Kiểm rằng cửa hàng, VIP, nạp/rút tiền đã biến mất thật — không còn trang,
 * không còn mục menu, không còn mức truy cập nào đòi tiền — và thành viên vẫn
 * khoá được nội dung ẩn của mình bằng điểm.
 */
export default async function run(check) {
  await db.post.deleteMany({ where: { title: { startsWith: TITLE } } });

  const member = await openPage('minhdev');
  const admin = await openPage('admin@nova.local', 'admin123');

  try {
    // ── Những trang đã bỏ phải không còn ─────────────────────────────────
    for (const [ten, url] of [
      ['cửa hàng', '/shop'],
      ['VIP', '/vip'],
      ['nạp tiền', '/user/balance'],
      ['rút tiền', '/user/withdraw'],
      ['gói VIP (quản trị)', '/admin/vip-plans'],
      ['đơn hàng (quản trị)', '/admin/orders'],
      ['rút tiền (quản trị)', '/admin/withdrawals'],
    ]) {
      const r = await admin.goto(BASE + url, { waitUntil: 'domcontentloaded' });
      check(`trang ${ten} đã bỏ`, r.status() === 404, `trả về ${r.status()}`);
    }

    // ── Menu không còn lối vào ───────────────────────────────────────────
    await member.goto(BASE, { waitUntil: 'networkidle' });
    await member.waitForTimeout(600);
    check('menu không còn mục Cửa hàng', (await member.locator('a[href="/shop"]').count()) === 0);
    check('menu không còn mục VIP', (await member.locator('a[href="/vip"]').count()) === 0);
    check('menu vẫn còn Game', (await member.locator('header a[href="/games"]').count()) > 0);

    // ── Ô chọn quyền chỉ còn cách khoá bằng điểm ─────────────────────────
    await member.goto(`${BASE}/user/write`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(600);
    const form = await member.content();
    check('thành viên khoá được nội dung bằng điểm', form.includes('Mở khoá bằng điểm'));
    check('không còn mục bán bằng tiền', !form.includes('Bán bằng tiền'));
    check('không còn mục chỉ VIP', !form.includes('Chỉ VIP'));

    // ── Đăng bài khoá bằng điểm ──────────────────────────────────────────
    await member.fill('input[name="title"]', `${TITLE} — điểm`);
    await member.fill('textarea[name="content"]', 'Nội dung công khai đủ dài để qua kiểm tra tối thiểu hai mươi ký tự.');
    const cat = member.locator('input[name="categories"]').first();
    if (await cat.count()) await cat.evaluate((el) => { if (!el.checked) el.click(); });
    await member.locator('input[name="access"][value="POINTS"]').evaluate((el) => el.click());
    await member.waitForTimeout(400);
    await member.fill('input[name="pricePoints"]', '50');
    await member.locator('textarea[name="hiddenContent"]').fill('Phần nội dung ẩn dành cho người đã mở khoá.');
    await member.locator('button[type="submit"]:has-text("Đăng")').first().click();
    await member.waitForTimeout(4000);

    const post = await db.post.findFirst({
      where: { title: `${TITLE} — điểm` },
      select: { access: true, pricePoints: true },
    });
    check('đăng được bài khoá bằng điểm', post?.access === 'POINTS' && post.pricePoints === 50);

    // ── Kho game vẫn chỉ quản trị viên ───────────────────────────────────
    await member.goto(`${BASE}/admin/games`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(500);
    check('thành viên không vào được kho game', !member.url().includes('/admin/games'));

    await admin.goto(`${BASE}/admin/games`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(500);
    check('quản trị viên vẫn vào được kho game', admin.url().includes('/admin/games'));
  } finally {
    await db.post.deleteMany({ where: { title: { startsWith: TITLE } } });
  }
}
