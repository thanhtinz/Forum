import { BASE, db, openPage } from '../helpers.mjs';

const TITLE = 'Bài kiểm thử chính sách bán nội dung';

/**
 * Hai loại tiền không được lẫn vào nhau.
 *
 *  · ĐIỂM — thành viên tự khoá nội dung ẩn của mình bằng điểm.
 *  · TIỀN NẠP / VIP — hàng của nền tảng, chỉ quản trị viên đăng qua bảng
 *    quản trị; cửa hàng và kho game cũng vậy.
 *
 * Phần đáng kiểm nhất là ranh giới phía máy chủ: sửa DOM cho `access` thành
 * PAID rồi gửi thì action phải từ chối, chứ không phải chỉ ẩn nút đi.
 */
export default async function run(check) {
  await db.post.deleteMany({ where: { title: { startsWith: TITLE } } });

  const member = await openPage('minhdev');
  const admin = await openPage('admin@nova.local', 'admin123');

  try {
    // ── Ô chọn quyền ─────────────────────────────────────────────────────
    await member.goto(`${BASE}/user/write`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    const memberForm = await member.content();
    check('thành viên khoá được nội dung bằng điểm', memberForm.includes('Mở khoá bằng điểm'));
    check('thành viên không đặt được giá bằng tiền', !memberForm.includes('Bán bằng tiền'));
    check('thành viên không khoá được theo hạng VIP', !memberForm.includes('Chỉ VIP'));

    await admin.goto(`${BASE}/admin/posts/new`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(700);
    const adminForm = await admin.content();
    check('bảng quản trị đặt được giá bằng tiền', adminForm.includes('Bán bằng tiền'));
    check('bảng quản trị khoá được theo hạng VIP', adminForm.includes('Chỉ VIP'));

    // ── Thành viên đăng bài khoá bằng điểm ───────────────────────────────
    const compose = async (page, title) => {
      await page.goto(`${BASE}/user/write`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      await page.fill('input[name="title"]', title);
      await page.fill('textarea[name="content"]', 'Nội dung công khai đủ dài để qua kiểm tra tối thiểu hai mươi ký tự.');
      const cat = page.locator('input[name="categories"]').first();
      if (await cat.count()) await cat.evaluate((el) => { if (!el.checked) el.click(); });
      await page.locator('input[name="access"][value="POINTS"]').evaluate((el) => el.click());
      await page.waitForTimeout(400);
      await page.fill('input[name="pricePoints"]', '50');
      await page.locator('textarea[name="hiddenContent"]').fill('Phần nội dung ẩn dành cho người đã mở khoá.');
    };

    await compose(member, `${TITLE} — điểm`);
    await member.locator('button[type="submit"]:has-text("Đăng")').first().click();
    await member.waitForTimeout(4000);
    const byPoints = await db.post.findFirst({
      where: { title: `${TITLE} — điểm` },
      select: { access: true, pricePoints: true, priceAmount: true },
    });
    check('đăng được bài khoá bằng điểm', byPoints?.access === 'POINTS' && byPoints.pricePoints === 50);
    check('bài khoá bằng điểm không dính giá tiền', byPoints?.priceAmount == null);

    // ── Sửa DOM thành PAID rồi gửi ───────────────────────────────────────
    // Phải chờ qua khoảng giãn cách chống spam, không thì lần gửi này bị chặn
    // vì "đăng quá nhanh" và ta tưởng nhầm là chính sách đã chặn được.
    await member.waitForTimeout(21_000);
    await compose(member, `${TITLE} — tiền lén`);
    await member.evaluate(() => {
      const r = document.querySelector('input[name="access"]:checked');
      r.value = 'PAID';
      const hidden = document.createElement('input');
      hidden.type = 'hidden'; hidden.name = 'priceAmount'; hidden.value = '99000';
      r.form.appendChild(hidden);
    });
    await member.locator('button[type="submit"]:has-text("Đăng")').first().click();
    await member.waitForTimeout(4000);

    check('gửi thẳng access=PAID vẫn bị máy chủ chặn',
      (await db.post.count({ where: { title: `${TITLE} — tiền lén` } })) === 0);
    check('có nêu lý do cho người dùng',
      (await member.locator('text=Chỉ quản trị viên mới đặt được giá bằng tiền').count()) > 0);

    // ── Cửa hàng chỉ bày hàng của ban quản trị ───────────────────────────
    await member.goto(`${BASE}/shop`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    check('bài khoá-điểm của thành viên không nằm trong cửa hàng',
      !(await member.content()).includes(`${TITLE} — điểm`));

    // ── Kho game chỉ quản trị viên ───────────────────────────────────────
    await member.goto(`${BASE}/admin/games`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(600);
    check('thành viên không vào được kho game', !member.url().includes('/admin/games'));

    await admin.goto(`${BASE}/admin/games`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(600);
    check('quản trị viên vẫn vào được kho game', admin.url().includes('/admin/games'));
  } finally {
    await db.post.deleteMany({ where: { title: { startsWith: TITLE } } });
  }
}
