import { BASE, db, openPage } from '../helpers.mjs';

const TITLE = 'Kiểm thử quyền đăng khu vực';

/**
 * Quyền đăng bài của khu vực phải chặn thật, không chỉ hiện nhãn.
 *
 * Kiểm cả hai tầng: trang đăng không cho gõ, và server action từ chối kể cả
 * khi biểu mẫu được gửi thẳng lên.
 */
export default async function run(check) {
  const forum = await db.forum.findFirst({
    where: { vipOnly: false },
    select: { id: true, slug: true, postAccess: true, minLevel: true },
  });
  const original = { postAccess: forum.postAccess, minLevel: forum.minLevel };
  await db.thread.deleteMany({ where: { title: { contains: TITLE } } });

  const member = await openPage('minhdev');
  const admin = await openPage('admin@nova.local', 'admin123');
  const NEW = `${BASE}/forum/${forum.slug}/new`;

  const attempt = async (page, suffix) => {
    await page.goto(NEW, { waitUntil: 'networkidle' });
    if (!(await page.locator('input[name="title"]').count())) return { blockedAtPage: true, created: 0 };
    await page.fill('input[name="title"]', `${TITLE} — ${suffix}`);
    await page.fill('textarea[name="content"]', 'Nội dung kiểm thử quyền đăng ở khu vực này.');
    await page.locator('button[type="submit"]:has-text("Đăng")').click();
    await page.waitForTimeout(3500);
    return { blockedAtPage: false, created: await db.thread.count({ where: { title: { contains: suffix } } }) };
  };

  try {
    // Khu chỉ dành cho điều hành viên
    await db.forum.update({ where: { id: forum.id }, data: { postAccess: 'MODERATORS' }, select: { id: true } });
    const r1 = await attempt(member, 'moderators-member');
    check('khu Điều hành viên: trang đăng chặn thành viên thường', r1.blockedAtPage);
    check('khu Điều hành viên: có nêu lý do', (await member.locator('text=chỉ điều hành viên').count()) > 0);
    check('khu Điều hành viên: không tạo được chủ đề', r1.created === 0);

    // Gửi biểu mẫu sau khi quyền đã đổi — mô phỏng gửi thẳng, không qua trang
    await db.forum.update({ where: { id: forum.id }, data: { postAccess: 'ALL' }, select: { id: true } });
    await member.goto(NEW, { waitUntil: 'networkidle' });
    await member.fill('input[name="title"]', `${TITLE} — bypass`);
    await member.fill('textarea[name="content"]', 'Mở biểu mẫu lúc còn được phép rồi mới đổi quyền.');
    await db.forum.update({ where: { id: forum.id }, data: { postAccess: 'MODERATORS' }, select: { id: true } });
    await member.locator('button[type="submit"]:has-text("Đăng")').click();
    await member.waitForTimeout(3500);
    check('gửi thẳng biểu mẫu vẫn bị máy chủ chặn',
      (await db.thread.count({ where: { title: { contains: 'bypass' } } })) === 0);

    // Quản trị vẫn đăng được
    const r2 = await attempt(admin, 'moderators-admin');
    check('quản trị đăng được ở khu Điều hành viên', r2.created > 0);

    // Khu VIP
    await db.forum.update({ where: { id: forum.id }, data: { postAccess: 'VIP' }, select: { id: true } });
    const r3 = await attempt(member, 'vip-member');
    check('khu VIP chặn thành viên thường', r3.blockedAtPage);

    // Cấp tối thiểu
    await db.forum.update({ where: { id: forum.id }, data: { postAccess: 'ALL', minLevel: 99 }, select: { id: true } });
    const r4 = await attempt(member, 'minlevel');
    check('cấp tối thiểu vẫn chặn', r4.blockedAtPage);
    check('cấp tối thiểu: nêu đúng cấp cần đạt', (await member.locator('text=cần đạt cấp 99').count()) > 0);
  } finally {
    await db.forum.update({ where: { id: forum.id }, data: original, select: { id: true } });
    await db.thread.deleteMany({ where: { title: { contains: TITLE } } });
    await member.context().close();
    await admin.context().close();
  }
}
