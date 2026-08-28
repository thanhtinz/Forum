import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Dòng hoạt động trên trang cá nhân.
 *
 * Mục nặng nhất là RIÊNG TƯ: dòng hoạt động gộp bốn nguồn, trong đó album và
 * bảng tin câu lạc bộ đều có mức kín. Gộp mà quên chặn thì đúng những thứ người
 * ta cố tình giấu lại chui ra ở một chỗ chẳng ai ngờ tới.
 */
const DAU = 'kiemthu-hoatdong';
/** Phải khớp ACTIVITY_PER_PAGE trong src/lib/activity.ts. */
const MOI_TRANG = 12;

export default async function run(check) {
  const chu = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true, username: true } });
  const nguoiLa = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL' }, select: { id: true, slug: true } });
  if (!chu || !nguoiLa || !forum) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const wipe = async () => {
    await db.thread.deleteMany({ where: { title: { startsWith: DAU } } });
    await db.club.deleteMany({ where: { name: { startsWith: DAU } } });
    await db.photoAlbum.deleteMany({ where: { name: { startsWith: DAU } } });
  };
  await wipe();

  try {
    // ── Bốn nguồn, mỗi nguồn một dấu riêng để tìm trên trang ─────────────
    const chuDe = await db.thread.create({
      data: {
        forumId: forum.id, authorId: chu.id, status: 'PUBLISHED',
        title: `${DAU} chủ đề tự lập`, content: '<p>Nội dung chủ đề.</p>', lastReplyAt: new Date(),
      },
      select: { id: true },
    });

    const cuaNguoiKhac = await db.thread.create({
      data: {
        forumId: forum.id, authorId: nguoiLa.id, status: 'PUBLISHED',
        title: `${DAU} chủ đề của người khác`, content: '<p>Chỗ để đi trả lời.</p>', lastReplyAt: new Date(),
      },
      select: { id: true },
    });
    await db.reply.create({
      data: { threadId: cuaNguoiKhac.id, authorId: chu.id, content: 'TRALOI-KIEMTHU-abc' },
      select: { id: true },
    });

    const clbMo = await db.club.create({
      data: { slug: `hd-mo-${Math.random().toString(36).slice(2, 8)}`, name: `${DAU} CLB mở`, ownerId: chu.id, privacy: 'PUBLIC' },
      select: { id: true },
    });
    await db.clubMember.create({ data: { clubId: clbMo.id, userId: chu.id, role: 'OWNER', status: 'ACTIVE' }, select: { id: true } });
    await db.clubPost.create({ data: { clubId: clbMo.id, authorId: chu.id, content: '<p>BAIMO-KIEMTHU-abc</p>' }, select: { id: true } });

    const clbKin = await db.club.create({
      data: { slug: `hd-kin-${Math.random().toString(36).slice(2, 8)}`, name: `${DAU} CLB kín`, ownerId: chu.id, privacy: 'MEMBERS' },
      select: { id: true },
    });
    await db.clubMember.create({ data: { clubId: clbKin.id, userId: chu.id, role: 'OWNER', status: 'ACTIVE' }, select: { id: true } });
    await db.clubPost.create({ data: { clubId: clbKin.id, authorId: chu.id, content: '<p>BAIKIN-KIEMTHU-xyz</p>' }, select: { id: true } });

    const albumMo = await db.photoAlbum.create({
      data: { ownerId: chu.id, name: `${DAU} album mở`, privacy: 'PUBLIC', photoCount: 1 }, select: { id: true },
    });
    await db.photo.create({
      data: { album: { connect: { id: albumMo.id } }, owner: { connect: { id: chu.id } }, url: '/uploads/anh-mo-kiemthu.png', caption: 'ANHMO-KIEMTHU' },
      select: { id: true },
    });

    const albumKin = await db.photoAlbum.create({
      data: { ownerId: chu.id, name: `${DAU} album kín`, privacy: 'PRIVATE', photoCount: 1 }, select: { id: true },
    });
    await db.photo.create({
      data: { album: { connect: { id: albumKin.id } }, owner: { connect: { id: chu.id } }, url: '/uploads/anh-kin-kiemthu.png', caption: 'ANHKIN-KIEMTHU' },
      select: { id: true },
    });

    const hoSo = `${BASE}/u/${chu.username}`;
    const nguoiNgoai = await openPage('huytran');
    const khach = await openPage(null);
    const chinhChu = await openPage('minhdev');

    const xem = async (page) => {
      await page.goto(hoSo, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      return page.content();
    };

    // ── Người ngoài: thấy phần công khai, không thấy phần kín ────────────
    let html = await xem(nguoiNgoai);
    check('có khối hoạt động gần đây', html.includes('Hoạt động gần đây'));
    check('thấy chủ đề đã lập', html.includes(`${DAU} chủ đề tự lập`));
    check('thấy trả lời ở chủ đề người khác', html.includes('TRALOI-KIEMTHU-abc'));
    check('thấy bài ở câu lạc bộ mở', html.includes('BAIMO-KIEMTHU-abc'));
    check('thấy ảnh ở album mở', html.includes('/uploads/anh-mo-kiemthu.png'));

    check('KHÔNG lộ bài ở câu lạc bộ kín', !html.includes('BAIKIN-KIEMTHU-xyz'));
    check('KHÔNG lộ tên câu lạc bộ kín', !html.includes(`${DAU} CLB kín`));
    check('KHÔNG lộ ảnh ở album riêng tư', !html.includes('/uploads/anh-kin-kiemthu.png'));
    check('KHÔNG lộ chú thích ảnh riêng tư', !html.includes('ANHKIN-KIEMTHU'));

    // ── Khách vãng lai: cũng không thấy phần kín ─────────────────────────
    html = await xem(khach);
    check('khách thấy phần công khai', html.includes('BAIMO-KIEMTHU-abc'));
    check('khách KHÔNG thấy bài câu lạc bộ kín', !html.includes('BAIKIN-KIEMTHU-xyz'));
    check('khách KHÔNG thấy ảnh riêng tư', !html.includes('/uploads/anh-kin-kiemthu.png'));

    // ── Chính chủ: thấy hết ──────────────────────────────────────────────
    html = await xem(chinhChu);
    check('chính chủ thấy bài câu lạc bộ kín của mình', html.includes('BAIKIN-KIEMTHU-xyz'));
    check('chính chủ thấy ảnh album riêng tư của mình', html.includes('/uploads/anh-kin-kiemthu.png'));

    // ── Thành viên của nhóm kín thì đọc được bài nhóm đó ─────────────────
    await db.clubMember.create({
      data: { clubId: clbKin.id, userId: nguoiLa.id, status: 'ACTIVE' }, select: { id: true },
    });
    html = await xem(nguoiNgoai);
    check('vào nhóm rồi thì thấy bài của nhóm kín', html.includes('BAIKIN-KIEMTHU-xyz'));
    check('nhưng ảnh riêng tư vẫn kín', !html.includes('/uploads/anh-kin-kiemthu.png'));

    // ── Phân trang ───────────────────────────────────────────────────────
    // Thanh phân trang tự ẩn khi chỉ có một trang, nên phải dựng đủ việc cho
    // quá một trang rồi mới kiểm được.
    const dong = (page) => page.locator('ol.card > li').count();
    for (let i = 1; i <= MOI_TRANG + 4; i++) {
      await db.thread.create({
        data: {
          forumId: forum.id, authorId: chu.id, status: 'PUBLISHED',
          title: `${DAU} chủ đề số ${i}`, content: '<p>Nội dung.</p>',
          createdAt: new Date(Date.now() - i * 60 * 1000), lastReplyAt: new Date(),
        },
        select: { id: true },
      });
    }

    await nguoiNgoai.goto(hoSo, { waitUntil: 'networkidle' });
    await nguoiNgoai.waitForTimeout(800);
    check('trang đầu đúng một trang việc', (await dong(nguoiNgoai)) === MOI_TRANG,
      `đếm được ${await dong(nguoiNgoai)}`);
    check('có thanh phân trang cho hoạt động',
      (await nguoiNgoai.locator('a[href*="hd=2"]').count()) > 0);

    await nguoiNgoai.goto(`${hoSo}?hd=2`, { waitUntil: 'networkidle' });
    await nguoiNgoai.waitForTimeout(800);
    const soTrang2 = await dong(nguoiNgoai);
    check('trang hai có việc', soTrang2 > 0, `đếm được ${soTrang2}`);

    // Trang hai phải là những dòng KHÁC, không phải lặp lại trang một.
    const dauTrang1 = await (async () => {
      await nguoiNgoai.goto(hoSo, { waitUntil: 'networkidle' });
      await nguoiNgoai.waitForTimeout(700);
      return nguoiNgoai.locator('ol.card > li a').first().getAttribute('href');
    })();
    await nguoiNgoai.goto(`${hoSo}?hd=2`, { waitUntil: 'networkidle' });
    await nguoiNgoai.waitForTimeout(700);
    const dauTrang2 = await nguoiNgoai.locator('ol.card > li a').first().getAttribute('href');
    check('trang hai không lặp lại trang một', dauTrang1 !== dauTrang2,
      `${dauTrang1} vs ${dauTrang2}`);

    // Số trang bịa ra thì kẹp về khoảng hợp lệ chứ không vỡ trang.
    const r = await nguoiNgoai.goto(`${hoSo}?hd=9999`, { waitUntil: 'networkidle' });
    check('số trang quá lớn vẫn mở được trang', r.status() === 200, `trả về ${r.status()}`);
  } finally {
    await wipe();
  }
}
