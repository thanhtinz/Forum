import { BASE, openPage } from '../helpers.mjs';

/**
 * Trang chỉ còn diễn đàn và kho game, và chỉ còn MỘT loại tiền là điểm.
 *
 * Kiểm rằng cửa hàng, VIP, nạp/rút tiền và cả mục bài viết đã biến mất thật —
 * không còn trang, không còn mục menu. Cách khoá nội dung bằng điểm nay nằm ở
 * mã [hide=diem:N] trong chủ đề, có bộ kiểm riêng.
 */
export default async function run(check) {
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
      ['danh sách bài viết', '/blog'],
      ['soạn bài viết', '/user/write'],
      ['bài viết của tôi', '/user/posts'],
      ['bài viết (quản trị)', '/admin/posts'],
      ['chuyên mục (quản trị)', '/admin/categories'],
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

    // ── Menu không còn lối vào mục bài viết ──────────────────────────────
    check('menu không còn mục Bài viết', (await member.locator('a[href="/blog"]').count()) === 0);
    check('không còn nút Đăng bài viết', (await member.locator('a[href="/user/write"]').count()) === 0);

    // ── Kho game vẫn chỉ quản trị viên ───────────────────────────────────
    await member.goto(`${BASE}/admin/games`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(500);
    check('thành viên không vào được kho game', !member.url().includes('/admin/games'));

    await admin.goto(`${BASE}/admin/games`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(500);
    check('quản trị viên vẫn vào được kho game', admin.url().includes('/admin/games'));
  } finally {
    // Không có gì phải dọn: bài kiểm này chỉ đọc.
  }
}
