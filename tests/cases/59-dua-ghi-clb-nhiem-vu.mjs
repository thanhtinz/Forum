import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Duyệt đơn vào câu lạc bộ: hai tab bấm cùng lúc không được cộng bộ đếm hai lần.
 *
 * `approveMember` trước đây đọc `status` rồi mới `update` không điều kiện, kèm
 * `memberCount: { increment: 1 }`. Chủ nhóm mở hai tab danh sách chờ rồi bấm
 * "Duyệt" cùng một đơn thì hàng `ClubMember` chỉ đổi một lần, nhưng bộ đếm cộng
 * hai — và sai VĨNH VIỄN vì không chỗ nào tính lại.
 *
 * Bấm thật hai lần cùng lúc từ hai trang đã mở sẵn, theo đúng lối của
 * `35-bo-dem-va-dua-tranh`: bấm nối tiếp thì lượt sau đọc thấy trạng thái mới
 * rồi, không dựng lại được ca hỏng.
 */
export default async function run(check) {
  const [chu, ai] = await Promise.all([
    db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } }),
    db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } }),
  ]);
  if (!chu || !ai) { check('có dữ liệu mẫu', false, 'thiếu minhdev hoặc huytran'); return; }

  const slug = `dua-ghi-${Date.now()}`;
  const club = await db.club.create({
    data: {
      slug, name: 'CLB Đua Ghi', shortName: 'DUA', ownerId: chu.id, memberCount: 1,
      members: { create: { userId: chu.id, role: 'OWNER', status: 'ACTIVE' } },
    },
  });

  try {
    await db.clubMember.create({ data: { clubId: club.id, userId: ai.id, status: 'PENDING' } });

    const a = await openPage('minhdev');
    const b = await openPage('minhdev');
    const url = `${BASE}/clb/${slug}`;
    await a.goto(url, { waitUntil: 'networkidle' });
    await b.goto(url, { waitUntil: 'networkidle' });
    await a.waitForTimeout(700);

    check('cả hai tab đều đang thấy đơn chờ',
      (await a.locator('button[title="Duyệt"]').count()) > 0
      && (await b.locator('button[title="Duyệt"]').count()) > 0);

    await Promise.all([
      a.locator('button[title="Duyệt"]').first().click().catch(() => {}),
      b.locator('button[title="Duyệt"]').first().click().catch(() => {}),
    ]);
    await doiToi(async () =>
      (await db.clubMember.count({ where: { clubId: club.id, status: 'ACTIVE' } })) === 2);
    await a.waitForTimeout(1500);

    const sau = await db.club.findUnique({ where: { id: club.id }, select: { memberCount: true } });
    const that = await db.clubMember.count({ where: { clubId: club.id, status: 'ACTIVE' } });
    check('đơn được duyệt đúng một lần', that === 2, `${that} thành viên đang hoạt động`);
    check('bộ đếm thành viên khớp với số thật, không cộng hai lần',
      sau.memberCount === that, `đếm ${sau.memberCount}, thật ${that}`);
  } finally {
    await db.club.deleteMany({ where: { id: club.id } });
  }
}
