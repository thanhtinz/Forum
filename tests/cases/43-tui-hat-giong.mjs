import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Túi hạt giống — mua và gieo nay là hai việc tách rời.
 *
 * Trước đây gieo hạt trừ điểm luôn. Tách ra thì có một bất biến mới phải giữ:
 * GIEO KHÔNG ĐỤNG TỚI ĐIỂM, và một hạt chỉ xuống được một ô. Chỗ đua thật là
 * hạt cuối cùng — hai tab cùng gieo thì cả hai ô đều thấy mình trống, cả hai
 * câu ghi ô đều khớp, mà trong túi chỉ có một hạt. Vì thế `gieoHat` rút hạt
 * TRƯỚC rồi mới xuống giống; bài này kiểm đúng thứ tự ấy có tác dụng.
 */

export default async function run(check) {
  const u = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true, points: true } });
  if (!u) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diemCu = u.points;
  const oCu = await db.farmPlot.findMany({
    where: { userId: u.id },
    select: { index: true, cropId: true, plantedAt: true, readyAt: true, watered: true },
  });
  const hatCu = await db.farmSeed.findMany({
    where: { userId: u.id }, select: { cropId: true, qty: true },
  });

  const diem = async () =>
    (await db.user.findUnique({ where: { id: u.id }, select: { points: true } })).points;
  const soHat = async (cropId) =>
    (await db.farmSeed.findUnique({
      where: { userId_cropId: { userId: u.id, cropId } }, select: { qty: true },
    }))?.qty ?? 0;
  const oDaTrong = async () =>
    db.farmPlot.count({ where: { userId: u.id, cropId: { not: null } } });

  const dungLai = async (soO, diemCho) => {
    await db.farmSeed.deleteMany({ where: { userId: u.id } });
    await db.farmPlot.deleteMany({ where: { userId: u.id } });
    await db.farmPlot.createMany({
      data: Array.from({ length: soO }, (_, index) => ({ userId: u.id, index })),
    });
    await db.user.update({ where: { id: u.id }, data: { points: diemCho } });
  };

  const p = await openPage('huytran');
  const mo = async () => {
    await p.goto(`${BASE}/nong-trai`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
  };

  try {
    const re = await db.farmCrop.findFirst({
      where: { active: true }, orderBy: { seedCost: 'asc' },
      select: { id: true, name: true, seedCost: true },
    });

    // ── Túi rỗng: không gieo được, và trang phải CHỈ ĐƯỜNG đi mua ────────
    await dungLai(8, 100000);
    await p.setViewportSize({ width: 1280, height: 1000 });
    await mo();
    await p.locator('.farm-o').first().click();
    await p.waitForTimeout(500);
    check('túi rỗng thì không có gói hạt nào để bấm',
      (await p.locator('button[aria-label^="Gieo hạt"]').count()) === 0);
    check('túi rỗng thì trang mời đi mua chứ không chỉ báo suông',
      (await p.locator('button:has-text("Tới cửa hàng mua hạt")').count()) === 1);

    // ── Mua ở hộp thoại: trừ đúng giá × số gói, hạt vào túi ──────────────
    const truocMua = await diem();
    await p.locator('button[aria-label="Mở cửa hàng hạt giống"]').click();
    await p.waitForTimeout(800);
    check('bấm căn cửa hàng thì mở hộp thoại',
      (await p.locator('div[role="dialog"]').count()) === 1);

    const the = p.locator('div[role="dialog"] li').first();
    await the.locator('button[aria-label^="Thêm một gói"]').click();
    await the.locator('button[aria-label^="Thêm một gói"]').click();
    await the.locator('button[aria-label^="Mua "]').click();
    await doiToi(async () => (await soHat(re.id)) > 0);

    check('mua ba gói thì túi có ba hạt', (await soHat(re.id)) === 3, `túi có ${await soHat(re.id)}`);
    const daTru = truocMua - (await diem());
    check('và trừ đúng giá nhân số gói', daTru === re.seedCost * 3,
      `trừ ${daTru}, đáng lẽ ${re.seedCost * 3}`);
    check('mua xong hộp thoại VẪN MỞ để mua tiếp',
      (await p.locator('div[role="dialog"]').count()) === 1);

    // ── Gieo: ăn hạt trong túi, KHÔNG đụng tới điểm ──────────────────────
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
    check('bấm Esc thì đóng được hộp thoại',
      (await p.locator('div[role="dialog"]').count()) === 0);

    const truocGieo = await diem();
    // Ô số 1 đã được chọn ở phần trên rồi; bấm lại chính nó là BỎ chọn (nút ô
    // đất bật/tắt), nên phải chọn một ô khác.
    await p.locator('.farm-o').nth(1).click();
    await p.waitForTimeout(500);
    await p.locator('button[aria-label^="Gieo hạt"]').first().click();
    await doiToi(async () => (await oDaTrong()) === 1);

    check('gieo thì ô có cây', (await oDaTrong()) === 1);
    check('gieo ăn đúng một hạt trong túi', (await soHat(re.id)) === 2, `túi còn ${await soHat(re.id)}`);
    check('và gieo KHÔNG đụng tới điểm', (await diem()) === truocGieo,
      `điểm đổi ${(await diem()) - truocGieo}`);

    // ── Hạt cuối cùng: bấm gieo hai lần cùng lúc chỉ xuống MỘT ô ─────────
    await db.farmSeed.updateMany({ where: { userId: u.id, cropId: re.id }, data: { qty: 1 } });
    await db.farmPlot.updateMany({
      where: { userId: u.id },
      data: { cropId: null, plantedAt: null, readyAt: null, watered: false },
    });
    await mo();
    await p.locator('.farm-o').first().click();
    await p.waitForTimeout(600);
    const goi = p.locator('button[aria-label^="Gieo hạt"]').first();
    await Promise.all([
      goi.click({ force: true }),
      goi.click({ force: true }).catch(() => {}),
    ]);
    await doiToi(async () => (await soHat(re.id)) === 0);
    await p.waitForTimeout(2500);
    check('hạt cuối bấm hai lần chỉ xuống được MỘT ô',
      (await oDaTrong()) === 1, `đã trồng ${await oDaTrong()} ô`);
    check('và túi không âm', (await soHat(re.id)) === 0, `túi ${await soHat(re.id)}`);

    // ── Không đủ điểm thì không mua được ─────────────────────────────────
    await dungLai(8, 0);
    await mo();
    await p.locator('button[aria-label="Mở cửa hàng hạt giống"]').click();
    await p.waitForTimeout(800);
    const nutMua = p.locator('div[role="dialog"] button[aria-label^="Mua "]').first();
    const tatCa = await p.locator('div[role="dialog"] button[aria-label^="Mua "]:not([disabled])').count();
    check('không còn điểm thì không nút Mua nào bấm được', tatCa === 0, `còn ${tatCa} nút`);

    // Bật lại rồi bấm: máy chủ vẫn phải chặn, không chỉ dựa vào thuộc tính disabled
    await p.evaluate(() => {
      for (const el of document.querySelectorAll('div[role="dialog"] button:disabled')) el.disabled = false;
    });
    await nutMua.click({ force: true });
    await p.waitForTimeout(2500);
    check('ép bấm thì máy chủ vẫn không cho mua chịu',
      (await db.farmSeed.count({ where: { userId: u.id, qty: { gt: 0 } } })) === 0);
    check('và điểm không âm', (await diem()) === 0, `điểm ${await diem()}`);
  } finally {
    await db.farmSeed.deleteMany({ where: { userId: u.id } });
    await db.farmPlot.deleteMany({ where: { userId: u.id } });
    if (oCu.length) {
      await db.farmPlot.createMany({ data: oCu.map((o) => ({ userId: u.id, ...o })) });
    }
    if (hatCu.length) {
      await db.farmSeed.createMany({ data: hatCu.map((h) => ({ userId: u.id, ...h })) });
    }
    await db.user.update({ where: { id: u.id }, data: { points: diemCu } });
  }
}
