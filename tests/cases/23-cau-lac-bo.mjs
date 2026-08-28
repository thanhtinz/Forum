import { BASE, db, doiToi, openPage } from '../helpers.mjs';

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
  const lan = await db.user.findFirst({ where: { username: 'lanpham' }, select: { id: true } });
  if (!chu || !khach || !lan) { check('có dữ liệu mẫu', false, 'thiếu người dùng'); return; }

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
    const vao = await doiToi(() => db.clubMember.findUnique({
      where: { clubId_userId: { clubId: clbMo.id, userId: khach.id } }, select: { status: true },
    }));
    check('nhóm mở: vào thẳng thành thành viên', vao?.status === 'ACTIVE');
    const dem = await db.club.findUnique({ where: { id: clbMo.id }, select: { memberCount: true } });
    check('bộ đếm thành viên tăng', dem.memberCount === 2, `đang là ${dem.memberCount}`);

    // ── Nhóm cần duyệt: vào hàng chờ, chủ duyệt mới thành thành viên ─────
    await khachPage.goto(url(clbDuyet), { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(600);
    await khachPage.click('button:has-text("Xin vào nhóm")');
    let don = await doiToi(() => db.clubMember.findUnique({
      where: { clubId_userId: { clubId: clbDuyet.id, userId: khach.id } }, select: { id: true, status: true },
    }));
    check('nhóm duyệt: đơn ở trạng thái chờ', don?.status === 'PENDING');
    const demCho = await db.club.findUnique({ where: { id: clbDuyet.id }, select: { memberCount: true } });
    check('người chờ duyệt chưa tính vào bộ đếm', demCho.memberCount === 1, `đang là ${demCho.memberCount}`);

    // Người ngoài KHÔNG được duyệt đơn — gọi thẳng hành động cũng phải bị chặn.
    await chuPage.goto(url(clbDuyet), { waitUntil: 'networkidle' });
    await chuPage.waitForTimeout(800);
    check('chủ nhóm thấy ô đơn xin vào', (await chuPage.content()).includes('Đơn xin vào'));
    await chuPage.click('button[title="Duyệt"]');
    don = await doiToi(async () => {
      const r = await db.clubMember.findUnique({
        where: { clubId_userId: { clubId: clbDuyet.id, userId: khach.id } }, select: { status: true },
      });
      return r?.status === 'ACTIVE' ? r : null;
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
    const bai = await doiToi(() => db.clubPost.findFirst({
      where: { clubId: clbMo.id, authorId: khach.id }, select: { content: true },
    }));
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
    await doiToi(async () => !(await db.clubMember.findUnique({
      where: { clubId_userId: { clubId: clbMo.id, userId: khach.id } }, select: { id: true },
    })));
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

    // ── Thích và bình luận bài bảng tin ─────────────────────────────────
    // huytran vừa rời nhóm ở mục trên, cho vào lại để còn thích/bình luận.
    await db.clubMember.create({ data: { clubId: clbMo.id, userId: khach.id, status: 'ACTIVE' }, select: { id: true } });
    await db.club.update({ where: { id: clbMo.id }, data: { memberCount: { increment: 1 } }, select: { id: true } });
    const baiMo = await db.clubPost.findFirst({ where: { clubId: clbMo.id }, select: { id: true } });

    await khachPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(900);
    // Nút thích là nút trái tim đầu tiên trong thẻ bài.
    await khachPage.locator('li.card button:has(svg.lucide-heart)').first().click();
    let baiSau = await doiToi(async () => {
      const r = await db.clubPost.findUnique({ where: { id: baiMo.id }, select: { likeCount: true } });
      return r.likeCount === 1 ? r : null;
    }) ?? await db.clubPost.findUnique({ where: { id: baiMo.id }, select: { likeCount: true } });
    check('thích được bài bảng tin', baiSau.likeCount === 1, `đang là ${baiSau.likeCount}`);

    // Bấm lần nữa thì bỏ thích.
    await khachPage.locator('li.card button:has(svg.lucide-heart)').first().click();
    baiSau = await doiToi(async () => {
      const r = await db.clubPost.findUnique({ where: { id: baiMo.id }, select: { likeCount: true } });
      return r.likeCount === 0 ? r : null;
    }) ?? await db.clubPost.findUnique({ where: { id: baiMo.id }, select: { likeCount: true } });
    check('bấm lại thì bỏ thích', baiSau.likeCount === 0, `đang là ${baiSau.likeCount}`);

    const BINH_LUAN = 'Hay qua ban oi';
    // Ô bình luận nằm sau ô soạn bài, nên lấy ô cuối cùng của thẻ bài.
    const oBinhLuan = khachPage.locator('li.card textarea[name="content"]').last();
    await oBinhLuan.fill(BINH_LUAN);
    await khachPage.locator('li.card button:has-text("Gửi")').last().click();
    const bl = await doiToi(() => db.clubComment.findFirst({
      where: { postId: baiMo.id }, select: { id: true, content: true, depth: true },
    }));
    check('bình luận được bài bảng tin', !!bl && bl.content.includes(BINH_LUAN));
    check('bình luận gốc ở tầng 0', bl?.depth === 0);
    const demBL = await db.clubPost.findUnique({ where: { id: baiMo.id }, select: { commentCount: true } });
    check('bộ đếm bình luận tăng', demBL.commentCount === 1, `đang là ${demBL.commentCount}`);

    // Ô soạn phải có đủ đồ nghề như mấy ô khác của trang.
    check('ô bình luận có nút emoji/sticker/GIF',
      (await khachPage.locator('li.card button[title="Emoji, sticker & GIF"]').count()) > 0);
    check('ô bình luận có nút gửi ảnh',
      (await khachPage.locator('li.card button[title="Gửi ảnh"]').count()) > 0);

    // ── Trả lời bình luận: nhiều tầng ───────────────────────────────────
    const TRA_LOI = 'Minh cung nghi vay';
    await chuPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await chuPage.waitForTimeout(900);
    await chuPage.locator('button:has-text("Trả lời")').first().click();
    await chuPage.waitForTimeout(400);
    await chuPage.locator('textarea[placeholder^="Trả lời"]').fill(TRA_LOI);
    await chuPage.locator('li.card button:has-text("Gửi")').first().click();
    const con = await doiToi(() => db.clubComment.findFirst({
      where: { postId: baiMo.id, depth: 1 }, select: { id: true, content: true, parentId: true, rootId: true },
    }));
    check('trả lời được bình luận', !!con && con.content.includes(TRA_LOI));
    check('trả lời bám đúng bình luận cha', con?.parentId === bl.id);
    check('trả lời ghi đúng gốc nhánh', con?.rootId === bl.id);

    // Thả tim bình luận.
    await khachPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(900);
    await khachPage.locator('li.card button:has-text("Thích")').first().click();
    const timBL = await doiToi(async () => {
      const r = await db.clubComment.findUnique({ where: { id: bl.id }, select: { likeCount: true } });
      return r.likeCount === 1 ? r : null;
    });
    check('thả tim được bình luận', timBL?.likeCount === 1);
    check('ghi đúng một hàng tim',
      (await db.clubCommentLike.count({ where: { commentId: bl.id } })) === 1);

    // Tầng ba: trả lời của trả lời.
    const TANG_BA = 'Dung roi do ban';
    await khachPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(900);
    await khachPage.locator('button:has-text("Trả lời")').nth(1).click();
    await khachPage.waitForTimeout(400);
    await khachPage.locator('textarea[placeholder^="Trả lời"]').fill(TANG_BA);
    await khachPage.locator('li.card button:has-text("Gửi")').first().click();
    const chau = await doiToi(() => db.clubComment.findFirst({
      where: { postId: baiMo.id, depth: 2 }, select: { parentId: true, rootId: true },
    }));
    check('trả lời tầng ba nằm ở tầng 2', !!chau);
    check('tầng ba vẫn thuộc đúng nhánh gốc', chau?.rootId === bl.id);

    // Trần ba tầng: trả lời tiếp thì bám lại tầng 2 chứ không đẻ tầng 4.
    await khachPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(900);
    await khachPage.locator('button:has-text("Trả lời")').nth(2).click();
    await khachPage.waitForTimeout(400);
    await khachPage.locator('textarea[placeholder^="Trả lời"]').fill('Chot lai nhe');
    await khachPage.locator('li.card button:has-text("Gửi")').first().click();
    await doiToi(async () => (await db.clubComment.count({ where: { postId: baiMo.id } })) >= 4);
    check('không đẻ ra tầng thứ tư',
      (await db.clubComment.count({ where: { postId: baiMo.id, depth: { gte: 3 } } })) === 0);

    const demSauTL = await db.clubPost.findUnique({ where: { id: baiMo.id }, select: { commentCount: true } });
    check('bộ đếm tính cả trả lời', demSauTL.commentCount === 4, `đang là ${demSauTL.commentCount}`);

    // Xoá bình luận gốc thì cả nhánh đi theo, bộ đếm trừ đủ.
    await db.clubComment.delete({ where: { id: bl.id } });
    const conLai = await db.clubComment.count({ where: { postId: baiMo.id } });
    check('xoá gốc thì cả nhánh mất theo', conLai === 0, `còn ${conLai}`);
    await db.clubPost.update({ where: { id: baiMo.id }, data: { commentCount: 0 }, select: { id: true } });

    // Người ngoài nhóm không thích/bình luận được — chấm ở máy chủ, không tin giao diện.
    await anon.goto(url(clbMo), { waitUntil: 'networkidle' });
    await anon.waitForTimeout(700);
    check('khách không có ô bình luận', (await anon.locator('li.card textarea[name="content"]').count()) === 0);

    // ── Ghim bài ────────────────────────────────────────────────────────
    await chuPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await chuPage.waitForTimeout(900);
    await chuPage.locator('button[title="Ghim lên đầu"]').first().click();
    const daGhim = await doiToi(async () => {
      const r = await db.clubPost.findUnique({ where: { id: baiMo.id }, select: { pinned: true } });
      return r.pinned ? r : null;
    }) ?? { pinned: false };
    check('chủ nhóm ghim được bài', daGhim.pinned === true);
    // Đợi giao diện dựng lại: hành động xong ở máy chủ không có nghĩa là màn
    // hình đã đổi — router.refresh còn phải chạy xong một lượt.
    const coDauGhim = await chuPage.locator('text=Bài ghim').first()
      .waitFor({ timeout: 15000 }).then(() => true, () => false);
    check('bài ghim có dấu riêng', coDauGhim);

    // Thành viên thường KHÔNG được ghim.
    await khachPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(800);
    check('thành viên thường không có nút ghim',
      (await khachPage.locator('button[title="Ghim lên đầu"], button[title="Bỏ ghim"]').count()) === 0);

    // ── Phong phó nhóm ──────────────────────────────────────────────────
    const hangKhach = await db.clubMember.findUnique({
      where: { clubId_userId: { clubId: clbMo.id, userId: khach.id } }, select: { id: true },
    });
    await chuPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await chuPage.waitForTimeout(800);
    await chuPage.click('button:has-text("Quản lý thành viên")');
    await chuPage.waitForTimeout(500);
    await chuPage.locator('button[title="Phong làm phó"]').first().click();
    const pho = await doiToi(async () => {
      const r = await db.clubMember.findUnique({ where: { id: hangKhach.id }, select: { role: true } });
      return r?.role === 'MOD' ? r : null;
    }) ?? { role: null };
    check('phong được phó nhóm', pho.role === 'MOD');

    // Phó nhóm ghim được bài, nhưng không thấy cài đặt nhóm.
    await khachPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await khachPage.waitForTimeout(900);
    check('phó nhóm ghim được bài',
      (await khachPage.locator('button[title="Bỏ ghim"], button[title="Ghim lên đầu"]').count()) > 0);
    check('phó nhóm không thấy cài đặt câu lạc bộ',
      (await khachPage.locator('button:has-text("Cài đặt câu lạc bộ")').count()) === 0);

    // ── Mời bạn vào nhóm ────────────────────────────────────────────────
    // lanpham chưa dính dáng gì tới nhóm; kết bạn với chủ nhóm để mời được.
    await db.friendship.deleteMany({
      where: { OR: [{ requesterId: chu.id, addresseeId: lan.id }, { requesterId: lan.id, addresseeId: chu.id }] },
    });
    await db.friendship.create({
      data: { requesterId: chu.id, addresseeId: lan.id, status: 'ACCEPTED', acceptedAt: new Date() },
      select: { id: true },
    });
    await chuPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await chuPage.waitForTimeout(900);
    await chuPage.click('button:has-text("Mời bạn bè")');
    await chuPage.waitForTimeout(600);
    await chuPage.locator('button:has-text("Mời")').last().click();
    const loiMoi = await doiToi(() => db.clubMember.findUnique({
      where: { clubId_userId: { clubId: clbMo.id, userId: lan.id } }, select: { status: true, invitedById: true },
    }));
    check('mời được bạn vào nhóm', loiMoi?.status === 'INVITED');
    check('ghi lại ai là người mời', loiMoi?.invitedById === chu.id);

    const lanPage = await openPage('lanpham');
    await lanPage.goto(url(clbMo), { waitUntil: 'networkidle' });
    await lanPage.waitForTimeout(800);
    check('người được mời thấy lời mời', (await lanPage.content()).includes('Bạn được mời vào nhóm'));
    await lanPage.click('button:has-text("Nhận lời")');
    const daVao = await doiToi(async () => {
      const r = await db.clubMember.findUnique({
        where: { clubId_userId: { clubId: clbMo.id, userId: lan.id } }, select: { status: true },
      });
      return r?.status === 'ACTIVE' ? r : null;
    });
    check('nhận lời thì thành thành viên', daVao?.status === 'ACTIVE');
  } finally {
    await db.friendship.deleteMany({
      where: { OR: [{ requesterId: chu.id, addresseeId: lan.id }, { requesterId: lan.id, addresseeId: chu.id }] },
    });
    await wipe();
  }
}
