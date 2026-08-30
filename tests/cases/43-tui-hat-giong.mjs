import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Một vụ trọn vẹn: xới → gieo → tưới → bón → thu, và túi hạt.
 *
 * Thứ tự năm việc là LUẬT chứ không phải cách bày nút, nên bài này kiểm cả
 * hai mặt: đúng một việc sáng lên mỗi lúc, VÀ máy chủ tự chặn khi làm sai thứ
 * tự (gieo xuống ô chưa xới) chứ không chỉ dựa vào nút bị mờ.
 *
 * Chỗ đua thật là hạt cuối cùng: hai tab cùng gieo thì cả hai ô đều thấy mình
 * trống nên cả hai câu ghi ô đều khớp, mà túi chỉ có một hạt. `gieoHat` vì
 * thế rút hạt TRƯỚC rồi mới xuống giống.
 */

const PHAN_GIA = 15;

export default async function run(check) {
  const u = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true, points: true } });
  if (!u) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diemCu = u.points;
  const oCu = await db.farmPlot.findMany({
    where: { userId: u.id },
    select: { index: true, tilled: true, cropId: true, plantedAt: true, readyAt: true, watered: true, fertKind: true },
  });
  const hatCu = await db.farmSeed.findMany({ where: { userId: u.id }, select: { cropId: true, qty: true } });
  const khoCu = await db.farmBarn.findMany({ where: { userId: u.id }, select: { cropId: true, qty: true } });

  const diem = async () =>
    (await db.user.findUnique({ where: { id: u.id }, select: { points: true } })).points;
  const soHat = async (cropId) =>
    (await db.farmSeed.findUnique({
      where: { userId_cropId: { userId: u.id, cropId } }, select: { qty: true },
    }))?.qty ?? 0;
  const oDaTrong = async () => db.farmPlot.count({ where: { userId: u.id, cropId: { not: null } } });

  const dungLai = async (soO, diemCho) => {
    await db.farmSeed.deleteMany({ where: { userId: u.id } });
    await db.farmBarn.deleteMany({ where: { userId: u.id } });
    await db.farmPlot.deleteMany({ where: { userId: u.id } });
    await db.farmPlot.createMany({
      data: Array.from({ length: soO }, (_, index) => ({ userId: u.id, index })),
    });
    await db.user.update({ where: { id: u.id }, data: { points: diemCho } });
  };

  const p = await openPage('huytran');
  const mo = async () => {
    await p.goto(`${BASE}/nong-trai`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
  };
  /** Nhãn của năm nút việc, theo đúng thứ tự bày ra. */
  const cacBuoc = () => p.evaluate(() =>
    [...document.querySelectorAll('button[aria-label*="tới lượt"], button[aria-label*="đã xong"]')]
      .map((b) => b.getAttribute('aria-label')));
  const bam = async (ten) => {
    await p.locator(`button[aria-label="${ten}, đang tới lượt"]`).click();
  };

  try {
    const re = await db.farmCrop.findFirst({
      where: { active: true }, orderBy: { seedCost: 'asc' },
      select: { id: true, name: true, seedCost: true, yieldMin: true, yieldMax: true },
    });

    // ── Mua hạt ở cửa hàng trong cảnh ────────────────────────────────────
    await dungLai(8, 100000);
    await p.setViewportSize({ width: 1280, height: 1100 });
    await mo();

    const truocMua = await diem();
    await p.locator('button[aria-label="Mở cửa hàng hạt giống"]').click();
    await p.waitForTimeout(800);
    check('bấm căn cửa hàng thì mở hộp thoại',
      (await p.locator('div[role="dialog"]').count()) === 1);

    // Bám theo NHÃN chứ không theo thứ tự thẻ: cửa hàng nay bày phân bón
    // trước hạt giống, nên `li` đầu tiên là bao phân chứ không phải giống.
    const themGoi = p.locator('div[role="dialog"] button[aria-label^="Thêm một gói"]').first();
    await themGoi.click();
    await themGoi.click();
    await p.locator('div[role="dialog"] button[aria-label^="Mua "][aria-label*="hạt"]').first().click();
    await doiToi(async () => (await soHat(re.id)) > 0);

    check('mua ba gói thì túi có ba hạt', (await soHat(re.id)) === 3, `túi có ${await soHat(re.id)}`);
    const daTru = truocMua - (await diem());
    check('trừ đúng giá nhân số gói', daTru === re.seedCost * 3, `trừ ${daTru}, đáng lẽ ${re.seedCost * 3}`);
    check('mua xong hộp thoại VẪN MỞ để mua tiếp',
      (await p.locator('div[role="dialog"]').count()) === 1);

    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);

    // ── Nhà kho bày cả hạt giống ─────────────────────────────────────────
    await p.locator('button[aria-label="Mở nhà kho"]').click();
    await p.waitForTimeout(800);
    const chuKho = await p.locator('div[role="dialog"]').innerText();
    check('nhà kho mở được từ trong cảnh', (await p.locator('div[role="dialog"]').count()) === 1);
    check('và nhà kho bày cả hạt giống lẫn nông sản',
      chuKho.includes('Hạt giống') && chuKho.includes('Nông sản') && chuKho.includes(re.name),
      chuKho.slice(0, 90).replace(/\n/g, ' | '));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);

    // ── Chưa xới thì việc đầu tiên là XỚI, và chỉ mình nó sáng ───────────
    await p.locator('.farm-o').first().click();
    await p.waitForTimeout(600);
    let buoc = await cacBuoc();
    check('ô mới chọn thì đúng năm việc bày ra', buoc.length === 5, `đếm được ${buoc.length}`);
    check('và việc sáng lên là XỚI ĐẤT',
      buoc[0] === 'Xới đất, đang tới lượt'
      && buoc.slice(1).every((b) => b.includes('chưa tới lượt')),
      buoc.join(' | '));

    // Máy chủ phải tự chặn gieo xuống ô chưa xới, không chỉ dựa vào nút mờ
    await p.evaluate(() => {
      for (const el of document.querySelectorAll('button:disabled')) el.disabled = false;
    });
    await p.locator('button[aria-label="Gieo hạt, chưa tới lượt"]').click();
    await p.waitForTimeout(900);
    if (await p.locator('div[role="dialog"] button[aria-label^="Gieo hạt"]').count()) {
      await p.locator('div[role="dialog"] button[aria-label^="Gieo hạt"]').first().click();
      await p.waitForTimeout(2500);
    }
    check('ép gieo xuống ô CHƯA XỚI thì máy chủ không cho',
      (await oDaTrong()) === 0, `đã trồng ${await oDaTrong()} ô`);
    check('và hạt không bị mất oan', (await soHat(re.id)) === 3, `túi còn ${await soHat(re.id)}`);

    // ── Xới → gieo → tưới → bón, mỗi bước một việc sáng ─────────────────
    await mo();
    await p.locator('.farm-o').first().click();
    await p.waitForTimeout(600);

    await bam('Xới đất');
    await doiToi(async () => (await db.farmPlot.count({ where: { userId: u.id, tilled: true } })) === 1);
    await p.waitForTimeout(1200);
    buoc = await cacBuoc();
    check('xới xong thì tới lượt GIEO HẠT',
      buoc[0] === 'Xới đất, đã xong' && buoc[1] === 'Gieo hạt, đang tới lượt', buoc.join(' | '));

    await bam('Gieo hạt');
    await p.waitForTimeout(900);
    check('bấm Gieo hạt thì mở hộp thoại túi hạt',
      (await p.locator('div[role="dialog"] button[aria-label^="Gieo hạt"]').count()) > 0);
    await p.locator('div[role="dialog"] button[aria-label^="Gieo hạt"]').first().click();
    await doiToi(async () => (await oDaTrong()) === 1);
    await p.waitForTimeout(1500);

    check('chọn hạt là gieo luôn và hộp thoại tự đóng',
      (await p.locator('div[role="dialog"]').count()) === 0);
    check('gieo ăn đúng một hạt trong túi', (await soHat(re.id)) === 2, `túi còn ${await soHat(re.id)}`);
    buoc = await cacBuoc();
    check('gieo xong thì tới lượt TƯỚI NƯỚC',
      buoc[2] === 'Tưới nước, đang tới lượt', buoc.join(' | '));

    const truocTuoi = await diem();
    await bam('Tưới nước');
    await doiToi(async () => (await db.farmPlot.count({ where: { userId: u.id, watered: true } })) === 1);
    await p.waitForTimeout(1200);
    check('tưới không mất điểm', (await diem()) === truocTuoi, `điểm đổi ${(await diem()) - truocTuoi}`);
    buoc = await cacBuoc();
    check('tưới xong thì tới lượt BÓN PHÂN',
      buoc[3] === 'Bón phân, đang tới lượt', buoc.join(' | '));

    const truocBon = await diem();
    await bam('Bón phân');
    await doiToi(async () => (await db.farmPlot.count({ where: { userId: u.id, fertKind: true } })) === 1);
    await p.waitForTimeout(1200);
    check('bón phân trừ đúng giá', truocBon - (await diem()) === PHAN_GIA,
      `trừ ${truocBon - (await diem())}, đáng lẽ ${PHAN_GIA}`);

    // ── Chín thì THU HOẠCH giành lượt, và đất về lại chưa xới ────────────
    await db.farmPlot.updateMany({
      where: { userId: u.id, cropId: { not: null } },
      data: { readyAt: new Date(Date.now() - 1000) },
    });
    await mo();
    await p.locator('.farm-o').first().click();
    await p.waitForTimeout(600);
    buoc = await cacBuoc();
    check('cây chín thì tới lượt THU HOẠCH', buoc[4] === 'Thu hoạch, đang tới lượt', buoc.join(' | '));

    await bam('Thu hoạch');
    await doiToi(async () => (await db.farmBarn.count({ where: { userId: u.id } })) > 0);
    await p.waitForTimeout(1200);
    const thu = await db.farmBarn.findFirst({ where: { userId: u.id }, select: { qty: true } });
    check('tưới và bón đủ thì thu được nhiều nhất cộng phần phân bón',
      thu.qty === re.yieldMax + 2, `thu ${thu.qty}, đáng lẽ ${re.yieldMax + 2}`);

    const oSau = await db.farmPlot.findUnique({
      where: { userId_index: { userId: u.id, index: 0 } },
      select: { tilled: true, cropId: true, watered: true, fertKind: true },
    });
    check('thu xong thì đất chai lại, phải xới từ đầu',
      oSau.tilled === false && oSau.cropId === null
      && oSau.watered === false && oSau.fertKind === null,
      JSON.stringify(oSau));
    buoc = await cacBuoc();
    check('và vòng năm việc quay về XỚI ĐẤT', buoc[0] === 'Xới đất, đang tới lượt', buoc.join(' | '));

    // ── Hạt cuối cùng: bấm gieo hai lần cùng lúc chỉ xuống MỘT ô ─────────
    await db.farmSeed.updateMany({ where: { userId: u.id, cropId: re.id }, data: { qty: 1 } });
    await db.farmPlot.updateMany({ where: { userId: u.id }, data: { tilled: true } });
    await mo();
    await p.locator('.farm-o').first().click();
    await p.waitForTimeout(600);
    await bam('Gieo hạt');
    await p.waitForTimeout(900);
    const goi = p.locator('div[role="dialog"] button[aria-label^="Gieo hạt"]').first();
    await Promise.all([
      goi.click({ force: true }),
      goi.click({ force: true }).catch(() => {}),
    ]);
    await doiToi(async () => (await soHat(re.id)) === 0);
    await p.waitForTimeout(2500);
    check('hạt cuối bấm hai lần chỉ xuống được MỘT ô',
      (await oDaTrong()) === 1, `đã trồng ${await oDaTrong()} ô`);
    check('và túi không âm', (await soHat(re.id)) === 0, `túi ${await soHat(re.id)}`);

    // ── Không đủ điểm thì không mua chịu được ────────────────────────────
    await dungLai(8, 0);
    await mo();
    await p.locator('button[aria-label="Mở cửa hàng hạt giống"]').click();
    await p.waitForTimeout(800);
    const conBam = await p.locator('div[role="dialog"] button[aria-label^="Mua "]:not([disabled])').count();
    check('không còn điểm thì không nút Mua nào bấm được', conBam === 0, `còn ${conBam} nút`);
    await p.evaluate(() => {
      for (const el of document.querySelectorAll('div[role="dialog"] button:disabled')) el.disabled = false;
    });
    await p.locator('div[role="dialog"] button[aria-label^="Mua "]').first().click({ force: true });
    await p.waitForTimeout(2500);
    check('ép bấm thì máy chủ vẫn không cho mua chịu',
      (await db.farmSeed.count({ where: { userId: u.id, qty: { gt: 0 } } })) === 0);
    check('và điểm không âm', (await diem()) === 0, `điểm ${await diem()}`);
  } finally {
    await db.farmSeed.deleteMany({ where: { userId: u.id } });
    await db.farmBarn.deleteMany({ where: { userId: u.id } });
    await db.farmPlot.deleteMany({ where: { userId: u.id } });
    if (oCu.length) await db.farmPlot.createMany({ data: oCu.map((o) => ({ userId: u.id, ...o })) });
    if (hatCu.length) await db.farmSeed.createMany({ data: hatCu.map((h) => ({ userId: u.id, ...h })) });
    if (khoCu.length) await db.farmBarn.createMany({ data: khoCu.map((k) => ({ userId: u.id, ...k })) });
    await db.user.update({ where: { id: u.id }, data: { points: diemCu } });
  }
}
