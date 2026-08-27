import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Mã [hide]: phải trả lời chủ đề mới đọc được phần ẩn.
 *
 * Chỗ đáng kiểm nhất: phần ẩn phải bị CẮT ở máy chủ. Che bằng CSS thì ai bấm
 * "xem nguồn trang" cũng đọc được, mà nội dung hay được giấu ở đây lại đúng
 * là thứ người ta muốn giấu nhất — liên kết tải về.
 */
const BIMAT = 'LINK-TAI-BI-AN-9x7';

export default async function run(check) {
  const author = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const reader = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL' }, select: { id: true, slug: true } });
  if (!author || !reader || !forum) { check('có dữ liệu mẫu', false, 'thiếu người dùng hoặc chuyên mục'); return; }

  await db.thread.deleteMany({ where: { title: { startsWith: 'Kiểm thử nội dung ẩn' } } });

  const poster = await openPage('minhdev');
  const guest = await openPage('huytran');
  const anon = await openPage(null);
  let threadUrl = '';

  try {
    // ── Đăng chủ đề có phần ẩn ───────────────────────────────────────────
    await poster.goto(`${BASE}/forum/${forum.slug}/new`, { waitUntil: 'networkidle' });
    await poster.waitForTimeout(800);
    await poster.fill('input[name="title"]', 'Kiểm thử nội dung ẩn cho anh em');
    await poster.fill('textarea[name="content"]',
      `Bản mới đây nhé, tải về dùng thử:\n[hide]${BIMAT}[/hide]`);
    await poster.locator('button[type="submit"]:has-text("Đăng chủ đề")').click();
    await poster.waitForURL((u) => /\/forum\/[^/]+\/[^/]+$/.test(u.pathname), { timeout: 20000 });
    threadUrl = poster.url();

    const thread = await db.thread.findFirst({
      where: { title: 'Kiểm thử nội dung ẩn cho anh em' },
      select: { id: true, content: true },
    });
    check('đăng được chủ đề có [hide]', !!thread);
    check('phần ẩn được đánh mốc trong nội dung đã dựng',
      !!thread?.content.includes('<!--hide-->'), thread?.content?.slice(0, 120));

    // ── Người chưa trả lời: không được thấy, kể cả trong mã nguồn ─────────
    await guest.goto(threadUrl, { waitUntil: 'networkidle' });
    await guest.waitForTimeout(800);
    const guestHtml = await guest.content();
    check('người chưa trả lời không thấy phần ẩn', !guestHtml.includes(BIMAT));
    check('người chưa trả lời được nhắc phải trả lời', guestHtml.includes('trả lời chủ đề để xem'));
    check('phần không ẩn vẫn đọc được', guestHtml.includes('Bản mới đây nhé'));

    await anon.goto(threadUrl, { waitUntil: 'networkidle' });
    await anon.waitForTimeout(800);
    check('khách vãng lai không thấy phần ẩn', !(await anon.content()).includes(BIMAT));

    // ── Chủ chủ đề luôn thấy bài của chính mình ──────────────────────────
    check('chủ chủ đề vẫn đọc được phần ẩn của mình', (await poster.content()).includes(BIMAT));

    // ── Trả lời xong thì mở ra ───────────────────────────────────────────
    await guest.fill('textarea[name="content"]', 'Cảm ơn bạn, mình lấy về thử xem sao');
    await guest.locator('button[type="submit"]:has-text("Gửi")').click();
    await guest.waitForTimeout(2500);
    await guest.reload({ waitUntil: 'networkidle' });
    await guest.waitForTimeout(800);
    check('trả lời xong thì thấy phần ẩn', (await guest.content()).includes(BIMAT));
  } finally {
    await db.thread.deleteMany({ where: { title: { startsWith: 'Kiểm thử nội dung ẩn' } } });
  }
}
