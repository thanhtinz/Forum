import { BASE, db, openPage, closeBrowser } from './tests/helpers.mjs';
const p = await openPage('huytran');
try {
  const u = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true, points: true } });
  const cu = await db.farmPlot.findMany({ where: { userId: u.id },
    select: { index: true, cropId: true, plantedAt: true, readyAt: true, watered: true } });
  const diemCu = u.points;
  try {
    await db.farmPlot.deleteMany({ where: { userId: u.id } });
    await db.farmPlot.createMany({ data: Array.from({ length: 12 }, (_, index) => ({ userId: u.id, index })) });
    await db.user.update({ where: { id: u.id }, data: { points: 100000 } });
    for (const [w, ten] of [[390, 'dt'], [1280, 'may']]) {
      await p.setViewportSize({ width: w, height: 1000 });
      await p.goto(`${BASE}/nong-trai`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(1500);
      const box = await p.locator('.farm-khung').first().boundingBox();
      await p.screenshot({ path: `/tmp/q-${ten}.png`,
        clip: { x: box.x - 4, y: box.y - 4, width: Math.min(w, box.width + 8), height: box.height + 12 } });
      // mở cửa hàng
      await p.locator('button[aria-label="Mở cửa hàng hạt giống"]').click();
      await p.waitForTimeout(800);
      await p.screenshot({ path: `/tmp/q-${ten}-popup.png`, fullPage: false });
      const co = await p.locator('div[role="dialog"]').count();
      console.log(ten, w + 'px · cao ruộng', Math.round(box.height), '· hộp thoại mở:', co === 1);
      await p.keyboard.press('Escape');
      await p.waitForTimeout(400);
      console.log('   Esc đóng được:', (await p.locator('div[role="dialog"]').count()) === 0);
    }
  } finally {
    await db.farmPlot.deleteMany({ where: { userId: u.id } });
    if (cu.length) await db.farmPlot.createMany({ data: cu.map((o) => ({ userId: u.id, ...o })) });
    await db.user.update({ where: { id: u.id }, data: { points: diemCu } });
  }
} finally { await closeBrowser(); }
