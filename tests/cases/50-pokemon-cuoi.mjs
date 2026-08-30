import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Bốn hệ còn lại của Đảo Pokémon: cường hoá, chợ thú, bang hội, nhiệm vụ.
 *
 * Chỗ nào cũng có tiền hoặc đồ đổi chủ, nên soi đúng những phép ghi ấy:
 *  • Cường hoá tốn đúng một viên huyền tinh và cộng đúng số máu của cấp ấy.
 *  • Chợ: mua là ngọc chuyển từ người mua sang người bán, con thú đổi chủ, và
 *    bản rao biến mất — không được có nửa vời.
 *  • Bang: lập bang trừ đúng ngọc, quỹ vàng góp vào rút ra không sinh ra vàng.
 *  • Nhiệm vụ: mỗi bước nhận thưởng đúng một lần.
 */
export default async function run(check) {
  const a = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const b = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!a || !b) { check('có dữ liệu mẫu', false, 'thiếu minhdev hoặc huytran'); return; }

  await db.pokeNhanVat.deleteMany({ where: { userId: { in: [a.id, b.id] } } });

  const lam = async (userId, ten, extra = {}) => {
    const nv = await db.pokeNhanVat.create({ data: { userId, ten, cap: 20, exp: 9500, ...extra } });
    const t1 = await db.pokeThu.create({
      data: { nhanVatId: nv.id, nguon: 3, ten: `${ten}-A`, he: 1, mau: 100, mauToiDa: 100, chieu: ['TACKLE'] },
    });
    const t2 = await db.pokeThu.create({
      data: { nhanVatId: nv.id, nguon: 4, ten: `${ten}-B`, he: 10, mau: 80, mauToiDa: 80, chieu: ['PECK'] },
    });
    await db.pokeNhanVat.update({ where: { id: nv.id }, data: { raTranId: t1.id } });
    return { nv, t1, t2 };
  };
  const A = await lam(a.id, 'CuoiMot', { vang: 200_000, ngoc: 800 });
  const B = await lam(b.id, 'CuoiHai', { vang: 100, ngoc: 50 });

  const pA = await openPage('minhdev');
  const pB = await openPage('huytran');

  // ── Cường hoá ────────────────────────────────────────────────────────
  await pA.goto(`${BASE}/pokemon/cuong-hoa`, { waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  check('chưa có huyền tinh thì không cường hoá được',
    await pA.locator('button:has-text("Cường hoá")').first().isDisabled());

  await pA.locator('form:has(input[name="cap"][value="1"]) input[name="sl"]').fill('2');
  await pA.locator('form:has(input[name="cap"][value="1"]) button:has-text("Mua")').click();
  await doiToi(async () => (await db.pokeHuyenTinh.count({ where: { nhanVatId: A.nv.id, cap: 1 } })) > 0);

  const sauMua = await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } });
  const ht1 = await db.pokeHuyenTinh.findFirst({ where: { nhanVatId: A.nv.id, cap: 1 } });
  check('mua hai huyền tinh cấp 1 thì trừ đúng 20.000 vàng',
    sauMua.vang === 200_000 - 20_000, `còn ${sauMua.vang}`);
  check('huyền tinh vào kho đúng số lượng', ht1.sl === 2, String(ht1.sl));

  const truocRen = await db.pokeThu.findUnique({ where: { id: A.t1.id } });
  await pA.reload({ waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  await pA.locator(`form:has(input[value="${A.t1.id}"]) button:has-text("Cường hoá")`).click();
  await doiToi(async () => (await db.pokeThu.findUnique({ where: { id: A.t1.id } })).capCuong === 1);

  const sauRen = await db.pokeThu.findUnique({ where: { id: A.t1.id } });
  const htSau = await db.pokeHuyenTinh.findFirst({ where: { nhanVatId: A.nv.id, cap: 1 } });
  check('cường hoá cấp 1 cộng đúng 500 máu tối đa',
    sauRen.mauToiDa === truocRen.mauToiDa + 500, `${truocRen.mauToiDa} → ${sauRen.mauToiDa}`);
  check('cường hoá cũng hồi đúng chừng ấy máu hiện tại',
    sauRen.mau === truocRen.mau + 500, `${truocRen.mau} → ${sauRen.mau}`);
  check('cường hoá tốn đúng một viên', htSau.sl === 1, String(htSau.sl));

  // Nhảy cóc: gọi thẳng máy chủ khi chưa có huyền tinh cấp kế tiếp.
  const capTruoc = sauRen.capCuong;
  await pA.evaluate(async ([base, id]) => {
    const fd = new FormData(); fd.set('thu', id);
    await fetch(`${base}/pokemon/cuong-hoa`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'a'.repeat(40) },
    }).catch(() => null);
  }, [BASE, A.t1.id]);
  await pA.waitForTimeout(1200);
  check('thiếu huyền tinh cấp kế tiếp thì không nhảy cóc được',
    (await db.pokeThu.findUnique({ where: { id: A.t1.id } })).capCuong === capTruoc);

  // ── Chợ thú ──────────────────────────────────────────────────────────
  await pA.goto(`${BASE}/pokemon/cho`, { waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  check('con đang ra trận không nằm trong danh sách rao được',
    (await pA.locator(`form:has(input[value="${A.t1.id}"])`).count()) === 0);

  await pA.locator(`form:has(input[value="${A.t2.id}"]) input[name="gia"]`).fill('30');
  await pA.locator(`form:has(input[value="${A.t2.id}"]) button:has-text("Rao bán")`).click();
  await doiToi(async () => (await db.pokeRao.count({ where: { thuId: A.t2.id } })) > 0);

  const rao = await db.pokeRao.findFirst({ where: { thuId: A.t2.id } });
  check('rao được lên chợ', rao?.gia === 30, `giá ${rao?.gia}`);

  // Người bán không mua được chính con mình rao.
  await pA.evaluate(async ([base, id]) => {
    const fd = new FormData(); fd.set('rao', id);
    await fetch(`${base}/pokemon/cho`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'b'.repeat(40) },
    }).catch(() => null);
  }, [BASE, rao.id]);
  await pA.waitForTimeout(1200);
  check('không mua được con của chính mình',
    (await db.pokeRao.count({ where: { id: rao.id } })) === 1
    && (await db.pokeThu.findUnique({ where: { id: A.t2.id } })).nhanVatId === A.nv.id);

  // Người mua thiếu ngọc.
  await db.pokeNhanVat.update({ where: { id: B.nv.id }, data: { ngoc: 5 } });
  await pB.goto(`${BASE}/pokemon/cho`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  check('thiếu ngọc thì nút mua bị khoá',
    await pB.locator(`form:has(input[value="${rao.id}"]) button:has-text("Mua")`).isDisabled());

  await pB.evaluate(async ([base, id]) => {
    const fd = new FormData(); fd.set('rao', id);
    await fetch(`${base}/pokemon/cho`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'c'.repeat(40) },
    }).catch(() => null);
  }, [BASE, rao.id]);
  await pB.waitForTimeout(1200);
  check('thiếu ngọc thì máy chủ cũng không cho mua',
    (await db.pokeRao.count({ where: { id: rao.id } })) === 1
    && (await db.pokeThu.findUnique({ where: { id: A.t2.id } })).nhanVatId === A.nv.id,
    'bản rao hoặc chủ con thú đã đổi');

  // Mua thật.
  await db.pokeNhanVat.update({ where: { id: B.nv.id }, data: { ngoc: 100 } });
  const ngocTruoc = {
    a: (await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } })).ngoc,
    b: 100,
  };
  await pB.reload({ waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  await pB.locator(`form:has(input[value="${rao.id}"]) button:has-text("Mua")`).click();
  await doiToi(async () => (await db.pokeRao.count({ where: { id: rao.id } })) === 0);

  const sauBan = {
    a: await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } }),
    b: await db.pokeNhanVat.findUnique({ where: { id: B.nv.id } }),
  };
  const conDaBan = await db.pokeThu.findUnique({ where: { id: A.t2.id } });
  check('mua xong thì con thú đổi chủ', conDaBan.nhanVatId === B.nv.id);
  check('người mua bị trừ đúng giá', sauBan.b.ngoc === ngocTruoc.b - 30, `còn ${sauBan.b.ngoc}`);
  check('người bán nhận đúng giá', sauBan.a.ngoc === ngocTruoc.a + 30, `còn ${sauBan.a.ngoc}`);
  check('bản rao biến mất sau khi bán',
    (await db.pokeRao.count({ where: { id: rao.id } })) === 0);
  check('ngọc không tự sinh ra: tổng hai bên giữ nguyên',
    sauBan.a.ngoc + sauBan.b.ngoc === ngocTruoc.a + ngocTruoc.b,
    `${ngocTruoc.a + ngocTruoc.b} → ${sauBan.a.ngoc + sauBan.b.ngoc}`);

  // ── Bang hội ─────────────────────────────────────────────────────────
  await db.pokeNhanVat.update({ where: { id: A.nv.id }, data: { ngoc: 600, vang: 1000 } });
  await db.pokeNhanVat.update({ where: { id: B.nv.id }, data: { cap: 10, exp: 2250 } });

  await pA.goto(`${BASE}/pokemon/bang`, { waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  await pA.fill('input[name="ten"]', 'HoiKiemThu');
  await pA.locator('button:has-text("Lập bang")').click();
  await doiToi(async () => (await db.pokeBang.count({ where: { ten: 'HoiKiemThu' } })) > 0);

  const bang = await db.pokeBang.findFirst({ where: { ten: 'HoiKiemThu' } });
  const sauLap = await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } });
  check('lập được bang', !!bang);
  check('lập bang trừ đúng 500 ngọc', sauLap.ngoc === 100, `còn ${sauLap.ngoc}`);
  check('người lập bang thành trưởng bang', bang.truongId === A.nv.id);
  check('người lập bang cũng là thành viên', sauLap.bangId === bang.id);

  // Cấp thấp không vào bang được.
  await pB.goto(`${BASE}/pokemon/bang`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  check('chưa đủ cấp thì nút gia nhập bị khoá',
    await pB.locator('button:has-text("Gia nhập")').first().isDisabled());
  await pB.evaluate(async ([base, id]) => {
    const fd = new FormData(); fd.set('bang', id);
    await fetch(`${base}/pokemon/bang`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'd'.repeat(40) },
    }).catch(() => null);
  }, [BASE, bang.id]);
  await pB.waitForTimeout(1200);
  check('gọi thẳng máy chủ khi chưa đủ cấp cũng không vào được',
    (await db.pokeNhanVat.findUnique({ where: { id: B.nv.id } })).bangId === null);

  // Đủ cấp thì vào được.
  await db.pokeNhanVat.update({ where: { id: B.nv.id }, data: { cap: 15, exp: 5250 } });
  await pB.reload({ waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  await pB.locator('button:has-text("Gia nhập")').first().click();
  await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: B.nv.id } })).bangId !== null);
  check('đủ cấp thì gia nhập được',
    (await db.pokeNhanVat.findUnique({ where: { id: B.nv.id } })).bangId === bang.id);

  // Quỹ vàng.
  const vangTruoc = (await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } })).vang;
  await pA.goto(`${BASE}/pokemon/bang`, { waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  await pA.fill('input[name="so"]', '300');
  await pA.locator('button:has-text("Góp vào")').click();
  await doiToi(async () => (await db.pokeBang.findUnique({ where: { id: bang.id } })).vang === 300);

  const sauGop = await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } });
  check('góp vàng thì trừ đúng của người góp',
    sauGop.vang === vangTruoc - 300, `${vangTruoc} → ${sauGop.vang}`);
  check('quỹ bang nhận đúng số vàng',
    (await db.pokeBang.findUnique({ where: { id: bang.id } })).vang === 300);

  // Quỹ khoá: thành viên thường không rút được.
  await pB.goto(`${BASE}/pokemon/bang`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  await pB.fill('input[name="so"]', '300');
  await pB.locator('button:has-text("Rút ra")').click();
  await pB.waitForTimeout(1500);
  check('quỹ đang khoá thì thành viên thường không rút được',
    (await db.pokeBang.findUnique({ where: { id: bang.id } })).vang === 300);

  // Rút quá quỹ.
  await pA.reload({ waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  await pA.fill('input[name="so"]', '99999');
  await pA.locator('button:has-text("Rút ra")').click();
  await pA.waitForTimeout(1500);
  check('rút quá quỹ thì bị chặn',
    (await db.pokeBang.findUnique({ where: { id: bang.id } })).vang === 300);
  check('quỹ bang không bao giờ âm',
    (await db.pokeBang.findUnique({ where: { id: bang.id } })).vang >= 0);

  // Trưởng bang giải tán thì thành viên tự ra khỏi bang.
  await pA.reload({ waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  await pA.locator('button:has-text("Giải tán bang")').click();
  await doiToi(async () => (await db.pokeBang.count({ where: { id: bang.id } })) === 0);
  check('trưởng bang giải tán thì bang biến mất',
    (await db.pokeBang.count({ where: { id: bang.id } })) === 0);
  check('thành viên tự ra khỏi bang khi bang tan',
    (await db.pokeNhanVat.findUnique({ where: { id: B.nv.id } })).bangId === null);

  // ── Nhiệm vụ ─────────────────────────────────────────────────────────
  await db.pokeNhanVat.update({
    where: { id: A.nv.id },
    data: { nhiemVu: 0, huyChuong: 0, thangDau: 0, cap: 1, exp: 0, vang: 0, ngoc: 0 },
  });
  // Lúc này A còn đúng một con (đã bán con thứ hai) nên bước 1 chưa xong.
  await pA.goto(`${BASE}/pokemon/nhiem-vu`, { waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  check('chưa xong thì nút nhận thưởng bị khoá',
    await pA.locator('button:has-text("Chưa xong")').first().isDisabled());

  await pA.evaluate(async ([base]) => {
    await fetch(`${base}/pokemon/nhiem-vu`, {
      method: 'POST', body: new FormData(), headers: { 'Next-Action': 'e'.repeat(40) },
    }).catch(() => null);
  }, [BASE]);
  await pA.waitForTimeout(1200);
  check('chưa xong thì máy chủ cũng không phát thưởng',
    (await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } })).nhiemVu === 0);

  // Cho đủ điều kiện bước 1: có hai con trong kho.
  await db.pokeThu.create({
    data: { nhanVatId: A.nv.id, nguon: 5, ten: 'ConHai', he: 1, mau: 20, mauToiDa: 20, chieu: ['TACKLE'] },
  });
  await pA.reload({ waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  await pA.locator('button:has-text("Nhận thưởng")').first().click();
  await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } })).nhiemVu === 1);

  const sauNhiem = await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } });
  check('nhận thưởng nhiệm vụ đầu đúng 10 kinh nghiệm và 50 vàng',
    sauNhiem.exp === 10 && sauNhiem.vang === 50, `${sauNhiem.exp} kn, ${sauNhiem.vang} vàng`);

  await pA.evaluate(async ([base]) => {
    await fetch(`${base}/pokemon/nhiem-vu`, {
      method: 'POST', body: new FormData(), headers: { 'Next-Action': 'f'.repeat(40) },
    }).catch(() => null);
  }, [BASE]);
  await pA.waitForTimeout(1200);
  const lai = await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } });
  check('mỗi nhiệm vụ chỉ nhận thưởng đúng một lần',
    lai.nhiemVu === 1 && lai.vang === 50, `bước ${lai.nhiemVu}, ${lai.vang} vàng`);

  await db.pokeNhanVat.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
}
