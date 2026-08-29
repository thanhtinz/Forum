import { BASE, db, doiToi, openPage } from '../helpers.mjs';

const TITLE = 'Chủ đề kiểm thử tặng điểm';

/**
 * Tặng điểm kèm nút Cảm ơn.
 *
 * Đây là chỗ điểm đổi chủ nên phải chặt: không tặng quá số mình có, không tặng
 * cho chính mình, và hai vế trừ–cộng phải cùng thành công hoặc cùng không.
 */
export default async function run(check) {
  const lan = await db.user.findFirst({ where: { username: 'lanpham' }, select: { id: true, points: true } });
  const minh = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true, points: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL' }, select: { id: true, slug: true } });

  await db.thread.deleteMany({ where: { title: { startsWith: TITLE } } });
  const thread = await db.thread.create({
    data: { forumId: forum.id, authorId: lan.id, title: TITLE, content: '<p>Nội dung.</p>', status: 'PUBLISHED' },
    select: { id: true },
  });
  const own = await db.thread.create({
    data: { forumId: forum.id, authorId: minh.id, title: `${TITLE} (của chính mình)`, content: '<p>x</p>', status: 'PUBLISHED' },
    select: { id: true },
  });

  await db.user.update({ where: { id: minh.id }, data: { points: 500 }, select: { id: true } });
  await db.user.update({ where: { id: lan.id }, data: { points: 0 }, select: { id: true } });
  await db.notification.deleteMany({ where: { userId: lan.id, type: 'DONATE' } });

  const p = await openPage('minhdev');
  try {
    await p.goto(`${BASE}/forum/${forum.slug}/${thread.id}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    check('có nút Tặng điểm', (await p.locator('button:has-text("Tặng điểm")').count()) > 0);

    await p.locator('button:has-text("Tặng điểm")').first().click();
    await p.waitForTimeout(600);
    check('bảng tặng mở ra và nêu số điểm đang có', (await p.locator('text=bạn có 500 điểm').count()) > 0);

    await p.locator('button:has-text("20")').first().click();
    // Chờ tới THÔNG BÁO chứ không phải khoản điểm: điểm ghi trước, còn thông
    // báo và lượt cảm ơn ghi sau — chờ ở khoản điểm là quay lại quá sớm, hai
    // mục kiểm ngay dưới đọc đúng hai thứ ghi sau ấy.
    await doiToi(async () => (await db.notification.count({ where: { userId: lan.id, type: 'DONATE' } })) > 0);

    const donor = await db.user.findUnique({ where: { id: minh.id }, select: { points: true } });
    const author = await db.user.findUnique({ where: { id: lan.id }, select: { points: true } });
    check('trừ đúng điểm người tặng', donor?.points === 480, `còn ${donor?.points}`);
    check('cộng đúng điểm tác giả', author?.points === 20, `có ${author?.points}`);

    const row = await db.pointDonation.findFirst({ where: { threadId: thread.id }, select: { amount: true, fromId: true, toId: true } });
    check('ghi sổ tặng đúng người đúng số', row?.amount === 20 && row.fromId === minh.id && row.toId === lan.id);
    check('báo cho tác giả', (await db.notification.count({ where: { userId: lan.id, type: 'DONATE' } })) === 1);
    check('tặng tính luôn là đã cảm ơn',
      (await db.reaction.count({ where: { threadId: thread.id, type: 'THANKS', userId: minh.id } })) === 1);

    // ── Tặng quá số điểm đang có ─────────────────────────────────────────
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    await p.locator('button:has-text("Tặng điểm")').first().click();
    await p.waitForTimeout(500);
    await p.fill('input[placeholder="Số khác…"]', '999');
    await p.locator('form:has(input[placeholder="Số khác…"]) button[type="submit"]').click();
    await p.waitForTimeout(2500);
    const after = await db.user.findUnique({ where: { id: minh.id }, select: { points: true } });
    check('tặng quá số điểm đang có bị chặn', after?.points === 480, `còn ${after?.points}`);
    check('có nêu lý do', (await p.locator('text=không đủ điểm').count()) > 0);

    // ── Tặng cho chính mình ──────────────────────────────────────────────
    await p.goto(`${BASE}/forum/${forum.slug}/${own.id}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const btn = p.locator('button:has-text("Tặng điểm")').first();
    if (await btn.count()) {
      await btn.click();
      await p.waitForTimeout(500);
      const quick = p.locator('button:has-text("10")').first();
      if (await quick.count()) { await quick.click(); await p.waitForTimeout(2200); }
    }
    check('không tặng được cho bài của chính mình',
      (await db.pointDonation.count({ where: { threadId: own.id } })) === 0);
  } finally {
    await db.thread.deleteMany({ where: { title: { startsWith: TITLE } } });
    await db.user.update({ where: { id: minh.id }, data: { points: minh.points }, select: { id: true } });
    await db.user.update({ where: { id: lan.id }, data: { points: lan.points }, select: { id: true } });
  }
}
