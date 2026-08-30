import { BASE, db, openPage, closeBrowser } from './tests/helpers.mjs';
const p = await openPage('huytran');
try {
  const u = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true, points: true } });
  const cu = await db.farmPlot.findMany({ where: { userId: u.id },
    select: { index: true, tilled: true, cropId: true, plantedAt: true, readyAt: true, watered: true, fertKind: true } });
  const diemCu = u.points;
  try {
    await db.farmOrder.deleteMany({ where: { userId: u.id } });
    await db.farmSeed.deleteMany({ where: { userId: u.id } });
    await db.farmBarn.deleteMany({ where: { userId: u.id } });
    await db.farmFert.deleteMany({ where: { userId: u.id } });
    await db.farmPlot.deleteMany({ where: { userId: u.id } });
    await db.farmPlot.createMany({ data: Array.from({ length: 12 }, (_, index) => ({ userId: u.id, index })) });
    const cays = await db.farmCrop.findMany({ where: { plantable: true }, orderBy: { order: 'asc' }, take: 4, select: { id: true } });
    for (const c of cays) await db.farmSeed.create({ data: { userId: u.id, cropId: c.id, qty: 4 } });
    for (const c of cays.slice(0, 3)) await db.farmBarn.create({ data: { userId: u.id, cropId: c.id, qty: 9 } });
    for (const k of [1, 3, 5]) await db.farmFert.create({ data: { userId: u.id, kind: k, qty: 4 } });
    await db.user.update({ where: { id: u.id }, data: { points: 100000, lastTreeAt: null } });
    const os = await db.farmPlot.findMany({ where: { userId: u.id }, orderBy: { index: 'asc' } });
    for (const i of [1, 3]) await db.farmPlot.update({ where: { id: os[i].id },
      data: { tilled: true, cropId: cays[i % cays.length].id, plantedAt: new Date(Date.now() - 600000),
              readyAt: new Date(Date.now() + 5400000), watered: i === 1 } });
    await db.farmPlot.update({ where: { id: os[0].id }, data: { tilled: true } });

    for (const [w, ten] of [[390, 'dt'], [1280, 'may']]) {
      await p.setViewportSize({ width: w, height: 1200 });
      await p.goto(`${BASE}/nong-trai`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(1800);
      const khoi = await p.locator('.farm-khung').boundingBox();
      await p.screenshot({ path: `/tmp/z-${ten}.png`,
        clip: { x: khoi.x, y: khoi.y, width: khoi.width, height: Math.min(240, khoi.height) } });
      // cắt sát tấm biển đơn hàng để soi cỡ thật
      const b = await p.locator('button[aria-label="Mở bảng đơn hàng"]').boundingBox();
      await p.screenshot({ path: `/tmp/z-${ten}-bien.png`,
        clip: { x: b.x - 3, y: b.y - 3, width: b.width + 6, height: b.height + 6 } });
      console.log(ten, '· biển', Math.round(b.width) + 'x' + Math.round(b.height));
    }
  } finally {
    await db.farmOrder.deleteMany({ where: { userId: u.id } });
    await db.farmSeed.deleteMany({ where: { userId: u.id } });
    await db.farmBarn.deleteMany({ where: { userId: u.id } });
    await db.farmFert.deleteMany({ where: { userId: u.id } });
    await db.farmPlot.deleteMany({ where: { userId: u.id } });
    if (cu.length) await db.farmPlot.createMany({ data: cu.map((o) => ({ userId: u.id, ...o })) });
    await db.user.update({ where: { id: u.id }, data: { points: diemCu } });
  }
} finally { await closeBrowser(); }
