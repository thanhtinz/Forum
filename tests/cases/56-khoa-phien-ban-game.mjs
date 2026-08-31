import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Khoá điểm theo từng PHIÊN BẢN — độc lập với khoá của cả game.
 *
 * Trước đây chỉ có một khoá cho cả game. Giờ một game có thể tải tự do mà một
 * bản nâng cấp bên trong vẫn thu điểm riêng (mỗi loại file có version riêng).
 * Bài này canh ba chỗ: máy chủ chặn cả ở API tải lẫn ở tay bấm, mở một bản
 * không tự mở bản khác, và không đủ điểm thì không trừ nhầm.
 */
export default async function run(check) {
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!me) { check('có dữ liệu mẫu', false, 'thiếu minhdev'); return; }

  const game = await db.game.create({
    data: {
      slug: `khoa-phien-ban-${Date.now()}`, title: 'Game Khoá Version',
      status: 'PUBLISHED', publishedAt: new Date(), pricePoints: null,
    },
  });
  const vMien = await db.gameVersion.create({
    data: { gameId: game.id, platform: 'WINDOWS', version: '1.0', latest: false, pricePoints: null },
  });
  const vKhoa = await db.gameVersion.create({
    data: { gameId: game.id, platform: 'WINDOWS', version: '2.0', latest: true, pricePoints: 500 },
  });
  await db.gameFile.create({
    data: { versionId: vMien.id, type: 'EXE', storageKey: 'a.exe', scanStatus: 'CLEAN' },
  });
  await db.gameFile.create({
    data: { versionId: vKhoa.id, type: 'EXE', storageKey: 'b.exe', scanStatus: 'CLEAN' },
  });

  await db.user.update({ where: { id: me.id }, data: { points: 200 } });

  // try/finally vì bài này lập một game PUBLISHED — sót lại là `11-game-price`
  // bốc trúng rồi đỏ oan.
  try {
    const p = await openPage('minhdev');
    await p.goto(`${BASE}/games/${game.slug}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);

    // ── Game không khoá gì cả nên khung tải phải hiện ngay ─────────────────
    const chuTrang = await p.locator('main').innerText();
    check('game không đặt giá thì khung tải hiện ngay, không đòi mở khoá cả game',
      chuTrang.includes('Tải game') && !chuTrang.includes('Dùng điểm để mở khoá game'));

    // ── Bản 2.0 (khoá) đang chọn sẵn vì là latest: phải thấy khối khoá riêng ──
    await doiToi(async () => (await p.locator('main').innerText()).includes('mở khoá riêng'));
    const chuKhoa = await p.locator('main').innerText();
    check('bản có giá riêng hiện khối khoá riêng, không hiện nút tải',
      chuKhoa.includes('mở khoá riêng') && !chuKhoa.includes('TẢI EXE'));
    check('thiếu điểm thì trang tự báo còn thiếu bao nhiêu', chuKhoa.includes('còn thiếu'));

    // Gọi thẳng API tải cho bản khoá — máy chủ phải chặn dù có biết version id.
    const apiKhoa = await p.evaluate(async ([base, slug, versionId]) => {
      const r = await fetch(`${base}/api/games/${slug}/download?version=${versionId}&type=EXE`);
      return { status: r.status, body: await r.json() };
    }, [BASE, game.slug, vKhoa.id]);
    check('API tải cũng chặn bản chưa mở khoá, không chỉ giao diện',
      apiKhoa.status === 403 && apiKhoa.body.error === 'VERSION_LOCKED');

    // Bản 1.0 miễn phí vẫn tải được bình thường qua API dù bản kia đang khoá.
    const apiMien = await p.evaluate(async ([base, slug, versionId]) => {
      const r = await fetch(`${base}/api/games/${slug}/download?version=${versionId}&type=EXE`);
      return { status: r.status };
    }, [BASE, game.slug, vMien.id]);
    check('bản không đặt giá vẫn tải được dù có bản khác trong cùng game đang khoá',
      apiMien.status === 200);

    // Không đủ điểm thì bấm mở khoá phải báo lỗi và không trừ điểm.
    await p.locator('button:has-text("Dùng điểm để mở khoá bản này")').click();
    await p.waitForTimeout(1000);
    const sauLoi = await db.user.findUnique({ where: { id: me.id }, select: { points: true } });
    check('không đủ điểm thì không trừ điểm', sauLoi.points === 200, `còn ${sauLoi.points}`);
    check('không có bản ghi mở khoá nào được tạo',
      (await db.gameVersionUnlock.count({ where: { versionId: vKhoa.id } })) === 0);

    // Đủ điểm rồi mở khoá thật.
    await db.user.update({ where: { id: me.id }, data: { points: 700 } });
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    await p.locator('button:has-text("Dùng điểm để mở khoá bản này")').click();
    await doiToi(async () => (await db.gameVersionUnlock.count({ where: { versionId: vKhoa.id, userId: me.id } })) > 0);

    const sauMo = await db.user.findUnique({ where: { id: me.id }, select: { points: true } });
    check('mở khoá trừ đúng số điểm của RIÊNG bản đó', sauMo.points === 200, `còn ${sauMo.points}`);

    // Nút mở khoá tự gọi `window.location.reload()` khi xong; đợi nó tự chạy
    // xong trước khi mình reload lần nữa, không thì hai lượt tải trang chồng
    // lên nhau làm Playwright báo khung hình bị rớt giữa chừng.
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(500);
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    const chuSauMo = await p.locator('main').innerText();
    check('mở khoá xong thì thấy nút tải, hết khối khoá', chuSauMo.includes('TẢI EXE'));

    const apiSauMo = await p.evaluate(async ([base, slug, versionId]) => {
      const r = await fetch(`${base}/api/games/${slug}/download?version=${versionId}&type=EXE`);
      return { status: r.status };
    }, [BASE, game.slug, vKhoa.id]);
    check('API tải cũng mở ra sau khi trả điểm', apiSauMo.status === 200);

    // Mở một bản không tự mở các bản khác nếu chúng cũng có giá riêng.
    const vKhoa2 = await db.gameVersion.create({
      data: { gameId: game.id, platform: 'WINDOWS', version: '3.0', latest: false, pricePoints: 300 },
    });
    const truyCap3 = await p.evaluate(async ([base, slug, versionId]) => {
      const r = await fetch(`${base}/api/games/${slug}/download?version=${versionId}&type=EXE`);
      return r.status;
    }, [BASE, game.slug, vKhoa2.id]);
    check('mở bản này không tự mở bản khác cùng game', truyCap3 === 403);

  } finally {
    await db.game.deleteMany({ where: { id: game.id } });
  }
}
