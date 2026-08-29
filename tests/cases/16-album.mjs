import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Album ảnh cá nhân, và mức riêng tư "chỉ bạn bè".
 *
 * Chỗ đáng kiểm nhất: album không được xem thì đường dẫn ảnh KHÔNG được đi
 * xuống trình duyệt, và vào thẳng địa chỉ album cũng phải ra 404 — ẩn khỏi
 * danh sách thôi thì ai đoán ra địa chỉ vẫn xem được.
 */
export default async function run(check) {
  const [minh, huy, lan] = await Promise.all([
    db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } }),
    db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } }),
    db.user.findFirst({ where: { username: 'lanpham' }, select: { id: true } }),
  ]);
  if (!minh || !huy || !lan) { check('có người dùng mẫu', false, 'thiếu minhdev/huytran/lanpham'); return; }

  const ids = [minh.id, huy.id, lan.id];
  const wipe = async () => {
    await db.photoAlbum.deleteMany({ where: { ownerId: { in: ids } } });
    await db.friendship.deleteMany({
      where: { OR: [{ requesterId: { in: ids } }, { addresseeId: { in: ids } }] },
    });
  };
  await wipe();

  const me = await openPage('minhdev');
  const friend = await openPage('huytran');
  const stranger = await openPage('lanpham');
  const anon = await openPage(null);
  const url = `${BASE}/u/minhdev/album`;

  try {
    // ── Tạo album ────────────────────────────────────────────────────────
    await me.goto(`${BASE}/u/minhdev`, { waitUntil: 'networkidle' });
    await me.waitForTimeout(700);
    check('trang cá nhân có lối vào album', (await me.locator('a[href="/u/minhdev/album"]').count()) > 0);

    await me.goto(url, { waitUntil: 'networkidle' });
    await me.waitForTimeout(700);
    await me.locator('button:has-text("Tạo album")').click();
    await me.waitForTimeout(400);
    await me.fill('input[name="name"]', 'Album công khai');
    await me.locator('form button:has-text("Tạo album")').click();
    await doiToi(async () => (await db.photoAlbum.count({ where: { ownerId: minh.id } })) > 0);
    const pub = await db.photoAlbum.findFirst({ where: { ownerId: minh.id }, select: { id: true, privacy: true } });
    check('tạo được album', !!pub, 'không thấy album nào');
    check('mặc định là công khai', pub?.privacy === 'PUBLIC', `đang là ${pub?.privacy}`);

    // Hai album kín tạo thẳng bằng dữ liệu cho nhanh và chắc chắn đúng mức.
    const friendsOnly = await db.photoAlbum.create({
      data: { ownerId: minh.id, name: 'Album chỉ bạn bè', privacy: 'FRIENDS', cover: '/uploads/ANH-BAN-BE.jpg' },
      select: { id: true },
    });
    await db.photo.create({
      data: { albumId: friendsOnly.id, ownerId: minh.id, url: '/uploads/ANH-BAN-BE.jpg', caption: 'CHUTHICH-BANBE' },
      select: { id: true },
    });
    await db.photoAlbum.update({ where: { id: friendsOnly.id }, data: { photoCount: 1 }, select: { id: true } });

    const priv = await db.photoAlbum.create({
      data: { ownerId: minh.id, name: 'Album riêng tư', privacy: 'PRIVATE', cover: '/uploads/ANH-RIENG.jpg' },
      select: { id: true },
    });
    await db.photo.create({
      data: { albumId: priv.id, ownerId: minh.id, url: '/uploads/ANH-RIENG.jpg', caption: 'CHUTHICH-RIENG' },
      select: { id: true },
    });
    await db.photoAlbum.update({ where: { id: priv.id }, data: { photoCount: 1 }, select: { id: true } });

    // ── Người lạ / khách vãng lai chỉ thấy album công khai ────────────────
    for (const [ten, page] of [['khách vãng lai', anon], ['người lạ', stranger]]) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const html = await page.content();
      check(`${ten} thấy album công khai`, html.includes('Album công khai'));
      check(`${ten} không thấy album chỉ bạn bè`, !html.includes('Album chỉ bạn bè'));
      check(`${ten} không thấy album riêng tư`, !html.includes('Album riêng tư'));
      // Mấu chốt: đường dẫn ảnh của album kín cũng không được lọt ra.
      check(`${ten} không nhận được đường dẫn ảnh của album kín`,
        !html.includes('ANH-BAN-BE') && !html.includes('ANH-RIENG'));

      const r = await page.goto(`${BASE}/u/minhdev/album/${friendsOnly.id}`, { waitUntil: 'networkidle' });
      check(`${ten} vào thẳng địa chỉ album kín thì bị chặn`, r.status() === 404, `trả về ${r.status()}`);
      check(`${ten} không đọc được chú thích ảnh trong album kín`,
        !(await page.content()).includes('CHUTHICH-BANBE'));
    }

    // ── Kết bạn xong thì mở ra ───────────────────────────────────────────
    await db.friendship.create({
      data: { requesterId: minh.id, addresseeId: huy.id, status: 'ACCEPTED', acceptedAt: new Date() },
      select: { id: true },
    });
    await friend.goto(url, { waitUntil: 'networkidle' });
    await friend.waitForTimeout(800);
    const friendHtml = await friend.content();
    check('bạn bè thấy album chỉ bạn bè', friendHtml.includes('Album chỉ bạn bè'));
    check('nhưng bạn bè vẫn không thấy album riêng tư', !friendHtml.includes('Album riêng tư'));

    const rf = await friend.goto(`${BASE}/u/minhdev/album/${friendsOnly.id}`, { waitUntil: 'networkidle' });
    check('bạn bè mở được album chỉ bạn bè', rf.status() === 200, `trả về ${rf.status()}`);
    check('bạn bè đọc được chú thích ảnh', (await friend.content()).includes('CHUTHICH-BANBE'));

    const rp = await friend.goto(`${BASE}/u/minhdev/album/${priv.id}`, { waitUntil: 'networkidle' });
    check('bạn bè vào album riêng tư vẫn bị chặn', rp.status() === 404, `trả về ${rp.status()}`);

    // Huỷ kết bạn thì đóng lại ngay
    await db.friendship.deleteMany({ where: { requesterId: minh.id, addresseeId: huy.id } });
    const rf2 = await friend.goto(`${BASE}/u/minhdev/album/${friendsOnly.id}`, { waitUntil: 'networkidle' });
    check('huỷ kết bạn thì album đóng lại', rf2.status() === 404, `trả về ${rf2.status()}`);

    // ── Quản trị viên cũng không mở được ảnh riêng tư ─────────────────────
    const admin = await openPage('admin@nova.local', 'admin123');
    const ra = await admin.goto(`${BASE}/u/minhdev/album/${priv.id}`, { waitUntil: 'networkidle' });
    check('quản trị viên cũng không mở được album riêng tư', ra.status() === 404, `trả về ${ra.status()}`);

    // ── Chính chủ ────────────────────────────────────────────────────────
    await me.goto(url, { waitUntil: 'networkidle' });
    await me.waitForTimeout(800);
    const mine = await me.content();
    check('chính chủ thấy đủ ba album',
      mine.includes('Album công khai') && mine.includes('Album chỉ bạn bè') && mine.includes('Album riêng tư'));

    const rm = await me.goto(`${BASE}/u/minhdev/album/${pub.id}`, { waitUntil: 'networkidle' });
    check('chính chủ mở được album của mình', rm.status() === 200);
    check('chính chủ có ô thêm ảnh', (await me.locator('button:has-text("Chọn ảnh")').count()) > 0);
    check('người khác không có ô thêm ảnh',
      (await (async () => {
        await stranger.goto(`${BASE}/u/minhdev/album/${pub.id}`, { waitUntil: 'networkidle' });
        await stranger.waitForTimeout(600);
        return stranger.locator('button:has-text("Chọn ảnh")').count();
      })()) === 0);

    // ── Xoá ảnh thì bìa và bộ đếm phải theo ──────────────────────────────
    const photo = await db.photo.findFirst({ where: { albumId: friendsOnly.id }, select: { id: true } });
    await db.friendship.create({
      data: { requesterId: minh.id, addresseeId: huy.id, status: 'ACCEPTED', acceptedAt: new Date() },
      select: { id: true },
    });
    await me.goto(`${BASE}/u/minhdev/album/${friendsOnly.id}`, { waitUntil: 'networkidle' });
    await me.waitForTimeout(800);
    me.once('dialog', (d) => d.accept());
    await me.locator('button[title="Xoá ảnh"]').first().click();
    await me.waitForTimeout(2500);
    const after = await db.photoAlbum.findUnique({
      where: { id: friendsOnly.id }, select: { photoCount: true, cover: true },
    });
    check('xoá ảnh thì bộ đếm giảm', after?.photoCount === 0, `còn ${after?.photoCount}`);
    check('xoá ảnh đang làm bìa thì bìa được gỡ theo', after?.cover === null, `bìa là ${after?.cover}`);
    check('ảnh bị xoá thật', (await db.photo.count({ where: { id: photo.id } })) === 0);

    // ── Xoá album kéo theo toàn bộ ảnh ───────────────────────────────────
    await db.photo.create({
      data: { albumId: friendsOnly.id, ownerId: minh.id, url: '/uploads/x.jpg' }, select: { id: true },
    });
    await me.goto(`${BASE}/u/minhdev/album/${friendsOnly.id}`, { waitUntil: 'networkidle' });
    await me.waitForTimeout(800);
    me.once('dialog', (d) => d.accept());
    await me.locator('button:has-text("Xoá album")').click();
    await doiToi(async () => (await db.photoAlbum.count({ where: { id: friendsOnly.id } })) === 0);
    check('xoá được album', (await db.photoAlbum.count({ where: { id: friendsOnly.id } })) === 0);
    check('ảnh trong album cũng đi theo',
      (await db.photo.count({ where: { albumId: friendsOnly.id } })) === 0);
  } finally {
    await wipe();
  }
}
