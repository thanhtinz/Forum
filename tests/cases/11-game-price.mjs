import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Đặt giá điểm cho phần tải xuống của game, và quản lý danh mục kho game.
 *
 * Chỗ đáng kiểm nhất: khi chưa mở khoá thì đường tải KHÔNG được đi xuống
 * trình duyệt, và gọi thẳng API tải cũng phải bị chặn — ẩn nút thôi thì ai
 * đoán ra địa chỉ vẫn lấy được tệp.
 */
export default async function run(check) {
  const game = await db.game.findFirst({ where: { status: 'PUBLISHED' }, select: { id: true, slug: true } });
  if (!game) { check('có game để kiểm', false, 'chưa seed game nào'); return; }
  const minh = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true, points: true } });

  await db.gameUnlock.deleteMany({ where: { gameId: game.id } });
  await db.gameGenre.deleteMany({ where: { slug: 'the-loai-kiem-thu' } });
  await db.game.update({ where: { id: game.id }, data: { pricePoints: 30 }, select: { id: true } });
  await db.user.update({ where: { id: minh.id }, data: { points: 100 }, select: { id: true } });

  const url = `${BASE}/games/${game.slug}`;
  const admin = await openPage('admin@nova.local', 'admin123');
  const member = await openPage('minhdev');

  try {
    // ── Danh mục kho game ────────────────────────────────────────────────
    const r = await admin.goto(`${BASE}/admin/games/danh-muc`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(700);
    check('trang danh mục kho game mở được', r.status() === 200, `trả về ${r.status()}`);
    for (const t of ['thể loại', 'dòng máy', 'độ phân giải']) {
      check(`có nhóm ${t}`, (await admin.locator(`h2:has-text("${t}")`).count()) > 0);
    }

    await admin.locator('button:has-text("Thêm thể loại")').click();
    await admin.waitForTimeout(400);
    await admin.locator('form input[name="name"]').first().fill('Thể loại kiểm thử');
    await admin.locator('form input[name="slug"]').first().fill('the-loai-kiem-thu');
    await admin.locator('form button[type="submit"]:has-text("Lưu")').first().click();
    await doiToi(async () => (await db.gameGenre.count({ where: { slug: 'the-loai-kiem-thu' } })) === 1);
    check('tạo được thể loại mới',
      (await db.gameGenre.count({ where: { slug: 'the-loai-kiem-thu' } })) === 1);

    // ── Giá điểm hiện ở biểu mẫu sửa game ────────────────────────────────
    await admin.goto(`${BASE}/admin/games/${game.id}`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(700);
    check('biểu mẫu sửa game có ô giá điểm', (await admin.locator('input[name="pricePoints"]').count()) > 0);
    check('thể loại mới hiện ở biểu mẫu sửa game', (await admin.content()).includes('Thể loại kiểm thử'));

    // ── Chưa mở khoá ─────────────────────────────────────────────────────
    await member.goto(url, { waitUntil: 'networkidle' });
    await member.waitForTimeout(900);
    check('chưa mở khoá thì hiện khung đòi điểm',
      (await member.locator('text=cần mở khoá bằng điểm').count()) > 0);
    check('chưa mở khoá thì không có nút tải',
      (await member.locator('button:has-text("TẢI JAR")').count()) === 0);
    // Nút to ở đầu trang cũng phải nói đúng việc nó làm, không mời "TẢI GAME".
    const heroLocked = (await member.locator('header a[href="#download"]').first().innerText()).trim();
    check('nút đầu trang đổi thành mời mở khoá',
      /MỞ KHOÁ/.test(heroLocked) && !/TẢI GAME/.test(heroLocked), `đang là “${heroLocked}”`);
    check('mã nguồn trang không chứa dữ liệu tệp tải',
      !/versionId|"files"/.test(await member.content()));

    // Ngoài kho game, thẻ của game có giá phải báo giá thay vì mời "Tải về".
    await member.goto(`${BASE}/games/browse`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(900);
    const cardText = (await member.locator(`a[href^="/games/${game.slug}"]`).last().innerText()).trim();
    check('thẻ ngoài kho game báo giá điểm', /điểm/.test(cardText), `đang là “${cardText}”`);

    await member.goto(url, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    const status = await member.evaluate(async (slug) => {
      const res = await fetch(`/api/games/${slug}/download?type=JAR`);
      return res.status;
    }, game.slug);
    check('gọi thẳng API tải bị chặn', status === 403, `trả về ${status}`);

    // ── Mở khoá ──────────────────────────────────────────────────────────
    await member.locator('button:has-text("Dùng điểm để mở khoá")').click();
    // Chờ HAI thứ: điểm đã trừ xong ở cơ sở dữ liệu, RỒI trang mới dựng lại.
    // Chỉ chờ cơ sở dữ liệu là quay lại quá sớm — mấy mục kiểm ngay dưới đọc
    // trang chứ không đọc cơ sở dữ liệu, và trang lúc ấy vẫn còn nút mở khoá cũ.
    await doiToi(async () => (await db.user.findUnique({ where: { id: minh.id }, select: { points: true } }))?.points === 70);
    await member.locator('button:has-text("TẢI")').first().waitFor({ timeout: 15000 }).catch(() => {});
    const after = await db.user.findUnique({ where: { id: minh.id }, select: { points: true } });
    check('trừ đúng số điểm', after?.points === 70, `còn ${after?.points}`);
    const unlock = await db.gameUnlock.findUnique({
      where: { userId_gameId: { userId: minh.id, gameId: game.id } }, select: { pointsPaid: true },
    });
    check('ghi sổ mở khoá', unlock?.pointsPaid === 30);
    check('mở xong thấy nút tải', (await member.locator('button:has-text("TẢI")').count()) > 0);
    const heroOpen = (await member.locator('header a[href="#download"]').first().innerText()).trim();
    check('mở xong nút đầu trang về lại TẢI GAME', /TẢI GAME/.test(heroOpen), `đang là “${heroOpen}”`);

    // Vào lại không bị trừ lần nữa
    await member.reload({ waitUntil: 'networkidle' });
    await member.waitForTimeout(1000);
    const again = await db.user.findUnique({ where: { id: minh.id }, select: { points: true } });
    check('vào lại không bị trừ thêm', again?.points === 70, `còn ${again?.points}`);

    // ── Không đủ điểm ────────────────────────────────────────────────────
    await db.gameUnlock.deleteMany({ where: { gameId: game.id } });
    await db.user.update({ where: { id: minh.id }, data: { points: 5 }, select: { id: true } });
    await member.goto(url, { waitUntil: 'networkidle' });
    await member.waitForTimeout(900);
    await member.locator('button:has-text("Dùng điểm để mở khoá")').click();
    await member.waitForTimeout(3000);
    const broke = await db.user.findUnique({ where: { id: minh.id }, select: { points: true } });
    check('không đủ điểm thì không trừ', broke?.points === 5, `còn ${broke?.points}`);
    check('không đủ điểm thì nêu lý do', (await member.locator('text=không đủ điểm').count()) > 0);
  } finally {
    await db.game.update({ where: { id: game.id }, data: { pricePoints: null }, select: { id: true } });
    await db.gameUnlock.deleteMany({ where: { gameId: game.id } });
    await db.gameGenre.deleteMany({ where: { slug: 'the-loai-kiem-thu' } });
    await db.user.update({ where: { id: minh.id }, data: { points: minh.points }, select: { id: true } });
  }
}
