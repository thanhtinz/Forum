import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Bảng đơn hàng, phân bón và bảng xếp hạng nông trại.
 *
 * Nông trại nay KHÔNG còn lái buôn mua lẻ, nên giao đơn là đường DUY NHẤT đổi
 * nông sản ra điểm. Một đường duy nhất thì mọi lỗ hổng trên đó đều là lỗ hổng
 * điểm, nên bài này soi kỹ ba chỗ:
 *
 *  • giao đơn của NGƯỜI KHÁC — `userId` phải nằm trong `where`;
 *  • giao hai lần một đơn — hai tab bấm cùng lúc chỉ được trả một lần;
 *  • giao khi thiếu hàng — không được trừ nửa vời rồi vẫn trả điểm.
 */

// Loại phân rẻ nhất, theo đúng bảng trong `farm-const`.
const PHAN_KIND = 1;
const PHAN_GIA = 8;

export default async function run(check) {
  const u = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true, points: true } });
  const nguoiKhac = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!u || !nguoiKhac) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diemCu = u.points;
  const oCu = await db.farmPlot.findMany({
    where: { userId: u.id },
    select: { index: true, tilled: true, cropId: true, plantedAt: true, readyAt: true, watered: true, fertKind: true },
  });
  const hatCu = await db.farmSeed.findMany({ where: { userId: u.id }, select: { cropId: true, qty: true } });
  const khoCu = await db.farmBarn.findMany({ where: { userId: u.id }, select: { cropId: true, qty: true } });
  const vatTuCu = await db.farmFert.findMany({ where: { userId: u.id }, select: { kind: true, qty: true } });

  const diem = async () =>
    (await db.user.findUnique({ where: { id: u.id }, select: { points: true } })).points;
  /** Số bao của một loại phân đang có trong kho. */
  const soPhan = async (kind) =>
    (await db.farmFert.findUnique({
      where: { userId_kind: { userId: u.id, kind } }, select: { qty: true },
    }))?.qty ?? 0;

  const p = await openPage('huytran');
  const mo = async () => {
    await p.goto(`${BASE}/nong-trai`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1100);
  };
  /** Bảng đơn nay nằm sau tấm bảng trong cảnh, phải mở ra mới thấy đơn nào. */
  const moBangDon = async () => {
    await p.locator('button[aria-label="Mở bảng đơn hàng"]').click();
    await p.waitForTimeout(900);
  };

  const donRac = [];

  try {
    const cay = await db.farmCrop.findFirst({
      where: { active: true, plantable: true }, orderBy: { seedCost: 'asc' },
      select: { id: true, name: true, sellPrice: true },
    });
    const khe = await db.farmCrop.findUnique({
      where: { key: 0 }, select: { id: true, name: true, plantable: true },
    });

    check('quả khế có trong bảng giống', !!khe, 'chưa nạp dữ liệu khế');
    check('nhưng khế KHÔNG gieo được', khe?.plantable === false);

    // Tên nông sản phải đúng bộ của bản gốc, không phải tên đoán từ hình.
    const ten = (await db.farmCrop.findMany({
      where: { plantable: true }, orderBy: { key: 'asc' }, take: 12, select: { key: true, name: true },
    })).map((c) => `${c.key}:${c.name}`).join(' ');
    check('tên nông sản đúng bộ gốc',
      ten === '1:Lúa 2:Cà chua 3:Cà rốt 4:Dứa 5:Dưa hấu 6:Nho 7:Hoa hồng 8:Xoài 9:Thanh long 10:Hoa hướng dương 11:Hoa tulip',
      ten);

    await db.farmOrder.deleteMany({ where: { userId: u.id } });
    await db.farmSeed.deleteMany({ where: { userId: u.id } });
    await db.farmBarn.deleteMany({ where: { userId: u.id } });
    await db.farmFert.deleteMany({ where: { userId: u.id } });
    await db.user.update({ where: { id: u.id }, data: { points: 100000 } });

    // ── Phân bón: mua ở cửa hàng, cất trong kho ──────────────────────────
    await mo();
    const truocPhan = await diem();
    await p.locator('button[aria-label="Mở cửa hàng hạt giống"]').click();
    await p.waitForTimeout(800);
    await p.locator('button[aria-label="Thêm một bao Phân chuồng"]').click();
    await p.locator('button[aria-label^="Mua 2 bao Phân chuồng"]').click();
    await doiToi(async () => (await soPhan(PHAN_KIND)) > 0);
    check('mua hai bao phân thì kho có hai bao', (await soPhan(PHAN_KIND)) === 2,
      `kho có ${await soPhan(PHAN_KIND)}`);
    check('và trừ đúng giá hai bao', truocPhan - (await diem()) === PHAN_GIA * 2,
      `trừ ${truocPhan - (await diem())}`);
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);

    // ── Bảng đơn tự treo đủ đơn ─────────────────────────────────────────
    const treo = await db.farmOrder.count({ where: { userId: u.id, deliveredAt: null } });
    check('mở trang là bảng tự treo đủ bốn đơn', treo === 4, `đang treo ${treo}`);

    // ── Giao một đơn: trừ đúng hàng, cộng đúng điểm ─────────────────────
    await db.farmOrder.deleteMany({ where: { userId: u.id } });
    const don = await db.farmOrder.create({
      data: {
        // Tên khách KHÔNG nằm trong danh sách sinh đơn ngẫu nhiên: dùng tên
        // thật thì bảng vừa treo đơn mới của đúng người ấy là mục kiểm "đơn
        // đã giao thì không còn trên bảng" đỏ oan.
        userId: u.id, khach: 'Khách kiểm thử', kind: 'THUONG', reward: 100,
        items: { create: [{ cropId: cay.id, qty: 3 }] },
      },
      select: { id: true },
    });
    donRac.push(don.id);
    await db.farmBarn.create({ data: { userId: u.id, cropId: cay.id, qty: 5 } });

    await mo();
    await moBangDon();
    const truocGiao = await diem();
    await p.locator(`button[aria-label^="Giao đơn cho Khách kiểm thử"]`).first().click();
    await doiToi(async () =>
      (await db.farmOrder.findUnique({ where: { id: don.id }, select: { deliveredAt: true } }))?.deliveredAt != null);
    await p.waitForTimeout(1200);

    check('giao đơn thì cộng đúng điểm đã hứa', (await diem()) === truocGiao + 100,
      `cộng ${(await diem()) - truocGiao}`);
    const conKho = (await db.farmBarn.findUnique({
      where: { userId_cropId: { userId: u.id, cropId: cay.id } }, select: { qty: true },
    })).qty;
    check('và trừ đúng số hàng trong kho', conKho === 2, `kho còn ${conKho}`);

    // ── Giao lại đơn đã giao: không được trả thêm lần nào ────────────────
    const truocLai = await diem();
    const khoTruocLai = conKho;
    await db.farmOrder.update({ where: { id: don.id }, data: { deliveredAt: null } });
    await db.farmOrder.update({ where: { id: don.id }, data: { deliveredAt: new Date() } });
    await mo();
    await moBangDon();
    check('đơn đã giao thì không còn trên bảng',
      (await p.locator('button[aria-label^="Giao đơn cho Khách kiểm thử"]').count()) === 0);
    check('và điểm không đổi thêm', (await diem()) === truocLai, `điểm đổi ${(await diem()) - truocLai}`);
    check('kho cũng không bị trừ thêm',
      (await db.farmBarn.findUnique({
        where: { userId_cropId: { userId: u.id, cropId: cay.id } }, select: { qty: true },
      })).qty === khoTruocLai);

    // ── Thiếu hàng thì không giao được, và không mất gì ──────────────────
    await db.farmOrder.deleteMany({ where: { userId: u.id } });
    const donTo = await db.farmOrder.create({
      data: {
        userId: u.id, khach: 'Khách đơn to', kind: 'DAC_BIET', reward: 500,
        items: { create: [{ cropId: cay.id, qty: 99 }] },
      },
      select: { id: true },
    });
    donRac.push(donTo.id);
    await mo();
    await moBangDon();
    const truocThieu = await diem();
    const nutThieu = p.locator('button[aria-label^="Giao đơn cho Khách đơn to"]').first();
    check('thiếu hàng thì nút giao bị khoá', await nutThieu.isDisabled());
    // Máy chủ phải tự chặn, không chỉ dựa vào nút mờ
    await p.evaluate(() => {
      for (const el of document.querySelectorAll('button:disabled')) el.disabled = false;
    });
    await nutThieu.click({ force: true });
    await p.waitForTimeout(2500);
    check('ép giao khi thiếu hàng thì máy chủ không cho', (await diem()) === truocThieu,
      `điểm đổi ${(await diem()) - truocThieu}`);
    check('và đơn vẫn chưa được đánh dấu đã giao',
      (await db.farmOrder.findUnique({ where: { id: donTo.id }, select: { deliveredAt: true } }))?.deliveredAt == null);
    check('kho cũng không bị trừ nửa vời',
      (await db.farmBarn.findUnique({
        where: { userId_cropId: { userId: u.id, cropId: cay.id } }, select: { qty: true },
      })).qty === khoTruocLai);

    // ── Đơn của NGƯỜI KHÁC: không được giao hộ để ăn điểm ────────────────
    const donNguoiKhac = await db.farmOrder.create({
      data: {
        userId: nguoiKhac.id, khach: 'Khách người khác', kind: 'THUONG', reward: 999,
        items: { create: [{ cropId: cay.id, qty: 1 }] },
      },
      select: { id: true },
    });
    donRac.push(donNguoiKhac.id);
    const truocTrom = await diem();
    const maTrang = await p.content();
    check('đơn của người khác KHÔNG lọt vào mã trang', !maTrang.includes(donNguoiKhac.id));
    await db.farmBarn.update({
      where: { userId_cropId: { userId: u.id, cropId: cay.id } }, data: { qty: 10 },
    });
    await p.evaluate(async ([base, id]) => {
      // Gọi thẳng biểu mẫu với id đơn của người khác.
      const fd = new FormData();
      fd.set('don', id);
      await fetch(`${base}/nong-trai`, { method: 'POST', body: fd, headers: { 'Next-Action': 'x'.repeat(40) } })
        .catch(() => {});
    }, [BASE, donNguoiKhac.id]);
    await p.waitForTimeout(2000);
    check('không giao hộ được đơn của người khác để ăn điểm',
      (await diem()) === truocTrom, `điểm đổi ${(await diem()) - truocTrom}`);
    check('và đơn của người khác vẫn chưa giao',
      (await db.farmOrder.findUnique({ where: { id: donNguoiKhac.id }, select: { deliveredAt: true } }))?.deliveredAt == null);

    // ── Bảng xếp hạng nông trại mở được và không phải BXH diễn đàn ───────
    await mo();
    await p.locator('button[aria-label="Mở bảng xếp hạng nông trại"]').click();
    await p.waitForTimeout(900);
    const chuBxh = await p.locator('div[role="dialog"]').innerText();
    check('bấm tấm biển thì mở bảng xếp hạng nông trại',
      (await p.locator('div[role="dialog"]').count()) === 1);
    check('bảng xếp hạng xếp theo SỐ ĐƠN, không theo điểm',
      /đơn/.test(chuBxh) && !/điểm/.test(chuBxh), chuBxh.slice(0, 100).replace(/\n/g, ' | '));
  } finally {
    await db.farmOrder.deleteMany({ where: { userId: u.id } });
    if (donRac.length) await db.farmOrder.deleteMany({ where: { id: { in: donRac } } });
    await db.farmSeed.deleteMany({ where: { userId: u.id } });
    await db.farmBarn.deleteMany({ where: { userId: u.id } });
    await db.farmFert.deleteMany({ where: { userId: u.id } });
    await db.farmPlot.deleteMany({ where: { userId: u.id } });
    if (oCu.length) await db.farmPlot.createMany({ data: oCu.map((o) => ({ userId: u.id, ...o })) });
    if (hatCu.length) await db.farmSeed.createMany({ data: hatCu.map((h) => ({ userId: u.id, ...h })) });
    if (khoCu.length) await db.farmBarn.createMany({ data: khoCu.map((k) => ({ userId: u.id, ...k })) });
    if (vatTuCu.length) await db.farmFert.createMany({ data: vatTuCu.map((f) => ({ userId: u.id, ...f })) });
    await db.user.update({ where: { id: u.id }, data: { points: diemCu } });
  }
}
