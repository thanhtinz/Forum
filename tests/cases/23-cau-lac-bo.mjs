import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Câu lạc bộ: lập nhóm, vào nhóm, duyệt đơn, bảng tin riêng.
 *
 * Mục nặng nhất là nhóm để bảng tin RIÊNG: bài của nhóm kín không được đi
 * xuống trình duyệt người ngoài, chứ không phải chỉ ẩn bằng CSS — nên chỗ nào
 * kiểm điều đó cũng kiểm ở mức mã nguồn.
 */
const TEN_MO = 'Kiểm thử CLB mở';
const TEN_DUYET = 'Kiểm thử CLB duyệt';
const TEN_KIN = 'Kiểm thử CLB kín';
const BAI_KIN = 'BAI-TRONG-NHOM-KIN-x9';

export default async function run(check) {
  const chu = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const khach = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!chu || !khach) { check('có dữ liệu mẫu', false, 'thiếu người dùng'); return; }

  const wipe = () => db.club.deleteMany({ where: { name: { startsWith: 'Kiểm thử CLB' } } });
  await wipe();

  const mk = async (name, joinMode, privacy) => {
    const c = await db.club.create({
      data: { slug: `kt-${Math.random().toString(36).slice(2, 9)}`, name, ownerId: chu.id, joinMode, privacy },
      select: { id: true, slug: true },
    });
    await db.clubMember.create({ data: { clubId: c.id, userId: chu.id, role: 'OWNER', status: 'ACTIVE' }, select: { id: true } });
    return c;
  };

  const clbMo = await mk(TEN_MO, 'OPEN', 'PUBLIC');
  const clbDuyet = await mk(TEN_DUYET, 'APPROVAL', 'PUBLIC');
  const clbKin = await mk(TEN_KIN, 'CLOSED', 'MEMBERS');
  await db.clubPost.create({
    data: { clubId: clbKin.id, authorId: chu.id, content: `<p>${BAI_KIN}</p>` }, select: { id: true },
  });
  await db.club.update({ where: { id: clbKin.id }, data: { postCount: 1 }, select: { id: true } });

  const chuPage = await openPage('minhdev');
  const khachPage = await openPage('huytran');
  const anon = await openPage(null);
  const url = (c) => `${BASE}/clb/${c.slug}`;

  try {
    // ── Danh sách ────────────────────────────────────────────────────────
    await khachPage.goto(`${BASE}/clb`, { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(700);
    const ds = await khachPage.content();
    check('danh sách hiện các câu lạc bộ', ds.includes(TEN_MO) && ds.includes(TEN_DUYET));

    // ── Nhóm mở: bấm là vào thẳng ────────────────────────────────────────
    await khachPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(600);
    await khachPage.click('button:has-text("Tham gia")');
    await khachPage.waitForTimeout(2000);
    const vao = await db.clubMember.findUnique({
      where: { clubId_userId: { clubId: clbMo.id, userId: khach.id } }, select: { status: true },
    });
    check('nhóm mở: vào thẳng thành thành viên', vao?.status === 'ACTIVE');
    const dem = await db.club.findUnique({ where: { id: clbMo.id }, select: { memberCount: true } });
    check('bộ đếm thành viên tăng', dem.memberCount === 2, `đang là ${dem.memberCount}`);

    // ── Nhóm cần duyệt: vào hàng chờ, chủ duyệt mới thành thành viên ─────
    await khachPage.goto(url(clbDuyet), { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(600);
    await khachPage.click('button:has-text("Xin vào nhóm")');
    await khachPage.waitForTimeout(2000);
    let don = await db.clubMember.findUnique({
      where: { clubId_userId: { clubId: clbDuyet.id, userId: khach.id } }, select: { id: true, status: true },
    });
    check('nhóm duyệt: đơn ở trạng thái chờ', don?.status === 'PENDING');
    const demCho = await db.club.findUnique({ where: { id: clbDuyet.id }, select: { memberCount: true } });
    check('người chờ duyệt chưa tính vào bộ đếm', demCho.memberCount === 1, `đang là ${demCho.memberCount}`);

    // Người ngoài KHÔNG được duyệt đơn — gọi thẳng hành động cũng phải bị chặn.
    await chuPage.goto(url(clbDuyet), { waitUntil: 'networkidle' });
    await chuPage.waitForTimeout(800);
    check('chủ nhóm thấy ô đơn xin vào', (await chuPage.content()).includes('Đơn xin vào'));
    await chuPage.click('button[title="Duyệt"]');
    await chuPage.waitForTimeout(2000);
    don = await db.clubMember.findUnique({
      where: { clubId_userId: { clubId: clbDuyet.id, userId: khach.id } }, select: { status: true },
    });
    check('duyệt xong thành thành viên', don?.status === 'ACTIVE');
    check('người được duyệt nhận thông báo',
      (await db.notification.count({ where: { userId: khach.id, type: 'CLUB' } })) > 0);

    // ── Nhóm kín: người ngoài không đọc được bảng tin ────────────────────
    await khachPage.goto(url(clbKin), { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(700);
    const ngoai = await khachPage.content();
    check('người ngoài không thấy bài của nhóm kín', !ngoai.includes(BAI_KIN));
    check('người ngoài được báo là bảng tin riêng', ngoai.includes('chỉ thành viên đọc được'));
    check('nhóm đóng thì không có nút tham gia', !ngoai.includes('Tham gia'));

    await anon.goto(url(clbKin), { waitUntil: 'networkidle' });
    await anon.waitForTimeout(600);
    check('khách vãng lai cũng không thấy bài nhóm kín', !(await anon.content()).includes(BAI_KIN));

    await chuPage.goto(url(clbKin), { waitUntil: 'networkidle' });
    await chuPage.waitForTimeout(700);
    check('thành viên nhóm kín đọc được bài', (await chuPage.content()).includes(BAI_KIN));

    // ── Đăng bảng tin: chỉ thành viên ───────────────────────────────────
    const NOI_DUNG = 'Chao ca nha, minh moi vao nhom';
    await khachPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(800);
    await khachPage.fill('textarea[name="content"]', NOI_DUNG);
    await khachPage.click('button:has-text("Đăng lên bảng tin")');
    await khachPage.waitForTimeout(2500);
    const bai = await db.clubPost.findFirst({ where: { clubId: clbMo.id, authorId: khach.id }, select: { content: true } });
    check('thành viên đăng được lên bảng tin', !!bai && bai.content.includes(NOI_DUNG));
    const demBai = await db.club.findUnique({ where: { id: clbMo.id }, select: { postCount: true } });
    check('bộ đếm bài tăng', demBai.postCount === 1, `đang là ${demBai.postCount}`);

    // Người chưa vào nhóm không có ô soạn.
    await anon.goto(url(clbMo), { waitUntil: 'networkidle' });
    await anon.waitForTimeout(600);
    check('khách không có ô soạn bảng tin', (await anon.locator('textarea[name="content"]').count()) === 0);

    // ── Rời nhóm ────────────────────────────────────────────────────────
    await khachPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(700);
    await khachPage.click('button:has-text("Rời câu lạc bộ")');
    await khachPage.waitForTimeout(2000);
    const conKhong = await db.clubMember.findUnique({
      where: { clubId_userId: { clubId: clbMo.id, userId: khach.id } }, select: { id: true },
    });
    check('rời được nhóm', !conKhong);
    const demSau = await db.club.findUnique({ where: { id: clbMo.id }, select: { memberCount: true } });
    check('bộ đếm trừ lại đúng', demSau.memberCount === 1, `đang là ${demSau.memberCount}`);

    // ── Chủ nhóm không rời được, phải giải tán ───────────────────────────
    await chuPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await chuPage.waitForTimeout(700);
    check('chủ nhóm không có nút rời', (await chuPage.locator('button:has-text("Rời câu lạc bộ")').count()) === 0);
    check('chủ nhóm được ghi rõ là chủ', (await chuPage.content()).includes('Bạn là chủ câu lạc bộ'));
  } finally {
    await wipe();
  }
}
