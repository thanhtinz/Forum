import { BASE, db, openPage } from '../helpers.mjs';

const TITLE = 'Chủ đề kiểm thử nút cảm ơn';

/**
 * Nút "Cảm ơn", tâm trạng và màu nick — bộ mod quen thuộc của forum wap Việt.
 *
 * Phần đáng kiểm là ranh giới phía máy chủ: không ai tự cảm ơn bài mình được,
 * khách không tạo được bản ghi, và tâm trạng quá dài bị chặn ở action chứ
 * không chỉ bằng thuộc tính maxlength của ô nhập.
 */
export default async function run(check) {
  const lan = await db.user.findFirst({ where: { username: 'lanpham' }, select: { id: true } });
  const minh = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true, level: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL' }, select: { id: true, slug: true } });

  await db.thread.deleteMany({ where: { title: TITLE } });
  const thread = await db.thread.create({
    data: {
      forumId: forum.id, authorId: lan.id, title: TITLE,
      content: '<p>Nội dung để kiểm nút cảm ơn.</p>', status: 'PUBLISHED',
    },
    select: { id: true },
  });
  const own = await db.thread.create({
    data: {
      forumId: forum.id, authorId: minh.id, title: `${TITLE} (bài của chính mình)`,
      content: '<p>Bài của chính người bấm.</p>', status: 'PUBLISHED',
    },
    select: { id: true },
  });
  await db.reaction.deleteMany({ where: { type: 'THANKS', threadId: { in: [thread.id, own.id] } } });
  await db.user.update({ where: { id: minh.id }, data: { mood: null }, select: { id: true } });

  const url = `${BASE}/forum/${forum.slug}/${thread.id}`;
  const p = await openPage('minhdev');
  const guest = await openPage(null);

  try {
    // ── Cảm ơn bài của người khác ────────────────────────────────────────
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    await p.locator('button:has-text("Cảm ơn")').first().click();
    await p.waitForTimeout(2200);

    check('cảm ơn được bài của người khác',
      (await db.reaction.count({ where: { type: 'THANKS', threadId: thread.id } })) === 1);
    check('có dòng liệt kê người đã cảm ơn',
      (await p.locator('text=thành viên đã cảm ơn bài này').count()) > 0);
    check('tác giả nhận được thông báo',
      (await db.notification.count({ where: { userId: lan.id, title: { contains: 'cảm ơn' } } })) > 0);

    // Bấm lại là bỏ
    await p.locator('button:has-text("Đã cảm ơn")').first().click();
    await p.waitForTimeout(2200);
    check('bấm lại thì bỏ cảm ơn',
      (await db.reaction.count({ where: { type: 'THANKS', threadId: thread.id } })) === 0);

    // ── Không tự cảm ơn bài mình ─────────────────────────────────────────
    await p.goto(`${BASE}/forum/${forum.slug}/${own.id}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const ownBtn = p.locator('button:has-text("Cảm ơn")').first();
    if (await ownBtn.count()) { await ownBtn.click(); await p.waitForTimeout(2000); }
    check('không cảm ơn được bài của chính mình',
      (await db.reaction.count({ where: { type: 'THANKS', threadId: own.id } })) === 0);

    // ── Khách ────────────────────────────────────────────────────────────
    await guest.goto(url, { waitUntil: 'networkidle' });
    await guest.waitForTimeout(600);
    const gb = guest.locator('button:has-text("Cảm ơn")').first();
    if (await gb.count()) { await gb.click(); await guest.waitForTimeout(2200); }
    check('khách bấm thì bị đưa sang trang đăng nhập', guest.url().includes('/login'));
    check('khách không tạo được bản ghi cảm ơn',
      (await db.reaction.count({ where: { type: 'THANKS', threadId: thread.id } })) === 0);

    // ── Tâm trạng ────────────────────────────────────────────────────────
    await p.goto(`${BASE}/user/settings`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    check('cài đặt có ô tâm trạng', (await p.locator('input[name="mood"]').count()) > 0);

    await p.fill('input[name="mood"]', 'Nhớ wap ngày xưa');
    await p.locator('form:has(input[name="mood"]) button[type="submit"]').click();
    await p.waitForTimeout(2200);
    check('lưu được tâm trạng',
      (await db.user.findUnique({ where: { id: minh.id }, select: { mood: true } }))?.mood === 'Nhớ wap ngày xưa');

    // Vượt trần thì action phải từ chối, không phụ thuộc maxlength của ô nhập
    await p.evaluate(() => {
      const el = document.querySelector('input[name="mood"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, 'z'.repeat(90));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await p.locator('form:has(input[name="mood"]) button[type="submit"]').click();
    await p.waitForTimeout(2000);
    const after = await db.user.findUnique({ where: { id: minh.id }, select: { mood: true } });
    check('tâm trạng 90 ký tự bị máy chủ từ chối', !after?.mood?.startsWith('zzz'), `đang là "${after?.mood}"`);

    // ── Màu nick theo cấp ────────────────────────────────────────────────
    await db.levelRule.upsert({
      where: { level: minh.level },
      create: { level: minh.level, name: 'Quen thuộc', expRequired: 0, color: '#e11d48' },
      update: { color: '#e11d48' },
      select: { level: true },
    });
    await db.reply.deleteMany({ where: { threadId: thread.id, authorId: minh.id } });
    await db.reply.create({
      data: { threadId: thread.id, authorId: minh.id, content: 'Trả lời để kiểm màu nick.' },
      select: { id: true },
    });
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    const colors = await p.evaluate(() =>
      [...document.querySelectorAll('aside a[href^="/u/"]')]
        .map((a) => getComputedStyle(a).color));
    check('nick của cấp đã đặt màu hiện đúng màu', colors.includes('rgb(225, 29, 72)'), colors.join(' | '));
    check('tâm trạng hiện cạnh tên trong chủ đề', (await p.content()).includes('Nhớ wap ngày xưa'));
  } finally {
    await db.thread.deleteMany({ where: { title: { startsWith: TITLE } } });
  }
}
