import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Lãnh Thổ (điểm chiến công, đổi quà), Hang Huyền Thoại và bảng xếp hạng.
 *
 * Ba con huyền thoại — Landorus 17.000 máu, Victini 21.000, Mewtwo 25.000 —
 * nằm LẪN trong bảng thú của Rừng Xanh ở bản gốc, nhưng Rừng Xanh chỉ bốc
 * `rand(1,20)` còn khu huyền thoại bốc thẳng `rand(1044,1046)`. Lúc gộp mười
 * bốn bảng làm một tôi bê nguyên cả bảng, nên Rừng Xanh bậc 2 nhả ra Mewtwo.
 * Bài này canh đúng chỗ ấy.
 */
/** Ép trận đang đánh về một con hệ NORMAL máu 1 — chắc chắn hạ trong một đòn. */
async function deTranDeThang(nhanVatId) {
  await db.pokeTran.update({
    where: { nhanVatId },
    data: { he: 1, cong: 1, thu: 1, mau: 1, mauToiDa: 1 },
  });
}

export default async function run(check) {
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!me) { check('có dữ liệu mẫu', false, 'thiếu minhdev'); return; }

  // ── Thú huyền thoại ở đúng khu của nó ────────────────────────────────
  const hth = await db.pokeThuHoang.findMany({ where: { khu: 'huyenthoai' }, orderBy: { mau: 'asc' } });
  check('có khu Hang Huyền Thoại với đúng ba con', hth.length === 3, `${hth.length} con`);
  check('ba con huyền thoại đúng tên bản gốc',
    hth.map((x) => x.ten).join(',') === 'Landorus,Victini,Mewtwo', hth.map((x) => x.ten).join(','));

  const lacChoMap2 = await db.pokeThuHoang.count({
    where: { khu: 'map2', nguon: { in: [1044, 1045, 1046] } },
  });
  check('huyền thoại KHÔNG còn lẫn trong Rừng Xanh', lacChoMap2 === 0, `${lacChoMap2} con`);

  const khoTrongKhuDe = await db.pokeThuHoang.findMany({
    where: { khu: { in: ['co', 'ao', 'map2'] }, mau: { gt: 1000 } },
    select: { khu: true, ten: true, mau: true },
  });
  check('ba khu dễ nhất không có con nào trên 1000 máu',
    khoTrongKhuDe.length === 0,
    khoTrongKhuDe.map((x) => `${x.khu}/${x.ten}:${x.mau}`).join(', '));

  const conDiBiet = await db.pokeThuHoang.count({ where: { khu: 'co', cong: { gte: 100 } } });
  check('khu Cỏ không còn con dị biệt công 150', conDiBiet === 0, `${conDiBiet} con`);

  // ── Nhân vật để thử ──────────────────────────────────────────────────
  await db.pokeNhanVat.deleteMany({ where: { userId: me.id } });
  const nv = await db.pokeNhanVat.create({
    data: { userId: me.id, ten: 'LanhTho', cap: 25, exp: 15_000, huyChuong: 0, khu: 'co' },
  });
  const t = await db.pokeThu.create({
    data: {
      nhanVatId: nv.id, nguon: 3, ten: 'Thử', he: 1, mau: 99_999, mauToiDa: 99_999,
      c1: 99_999, c2: 99_999, c3: 99_999, c4: 99_999, chieu: ['TACKLE'],
    },
  });
  await db.pokeNhanVat.update({ where: { id: nv.id }, data: { raTranId: t.id } });

  const p = await openPage('minhdev');

  // ── Hang Huyền Thoại khoá bằng HUY CHƯƠNG chứ không bằng cấp ─────────
  await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  check('cấp cao mà chưa đủ huy chương thì Hang Huyền Thoại vẫn khoá',
    await p.locator('form:has(input[value="huyenthoai"]) button').isDisabled());
  check('trang nói rõ điều kiện là huy chương',
    (await p.locator('form:has(input[value="huyenthoai"])').innerText()).includes('huy chương'));

  await p.evaluate(async ([base]) => {
    const fd = new FormData(); fd.set('khu', 'huyenthoai');
    await fetch(`${base}/pokemon`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'a'.repeat(40) },
    }).catch(() => null);
  }, [BASE]);
  await p.waitForTimeout(1200);
  check('gọi thẳng máy chủ cũng không vào Hang Huyền Thoại được',
    (await db.pokeNhanVat.findUnique({ where: { id: nv.id } })).khu === 'co');

  await db.pokeNhanVat.update({ where: { id: nv.id }, data: { huyChuong: 14 } });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('form:has(input[value="huyenthoai"]) button').click();
  await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: nv.id } })).khu === 'huyenthoai');
  check('đủ mười bốn huy chương thì vào được', true);

  // ── Điểm chiến công chỉ tính ở Lãnh Thổ ──────────────────────────────
  await db.pokeNhanVat.update({
    where: { id: nv.id }, data: { khu: 'co', diemChien: 0, soDiet: 0, sk: 20 },
  });
  await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('button:has-text("Tìm thú")').click();
  await doiToi(async () => (await db.pokeTran.count({ where: { nhanVatId: nv.id } })) > 0);
  // Ép con thú hoang về một bộ ĐÃ BIẾT trước khi đánh. Bốc ngẫu nhiên thì có
  // lượt gặp thú hệ GHOST, mà đòn hệ NORMAL vô hiệu hoàn toàn với GHOST theo
  // bảng khắc hệ — trận không kết thúc và bài kiểm đỏ oan.
  await deTranDeThang(nv.id);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.locator('form button[name="chieu"]').first().click();
  await doiToi(async () => (await db.pokeTran.count({ where: { nhanVatId: nv.id } })) === 0);
  const sauKhuThuong = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
  check('thắng ở khu thường KHÔNG cho điểm chiến công',
    sauKhuThuong.diemChien === 0 && sauKhuThuong.soDiet === 0,
    `${sauKhuThuong.diemChien} điểm, ${sauKhuThuong.soDiet} diệt`);

  await db.pokeNhanVat.update({ where: { id: nv.id }, data: { khu: 'lanhtho', sk: 20 } });
  await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('button:has-text("Tìm thú")').click();
  await doiToi(async () => (await db.pokeTran.count({ where: { nhanVatId: nv.id } })) > 0);
  await deTranDeThang(nv.id);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.locator('form button[name="chieu"]').first().click();
  await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: nv.id } })).diemChien > 0);
  const sauChien = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
  check('thắng ở Lãnh Thổ cho đúng 1 điểm chiến công', sauChien.diemChien === 1, String(sauChien.diemChien));
  check('và tính đúng 1 con vào bảng diệt quái', sauChien.soDiet === 1, String(sauChien.soDiet));

  // ── Đổi quà ──────────────────────────────────────────────────────────
  await db.pokeNhanVat.update({
    where: { id: nv.id },
    data: { diemChien: 99, vang: 0, ngoc: 0, cau: 0, da: 0, skToiDa: 20 },
  });
  await p.goto(`${BASE}/pokemon/lanh-tho`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  check('thiếu điểm thì nút đổi quà bị khoá',
    await p.locator('button:has-text("Đổi quà")').isDisabled());
  await p.evaluate(async ([base]) => {
    await fetch(`${base}/pokemon/lanh-tho`, {
      method: 'POST', body: new FormData(), headers: { 'Next-Action': 'b'.repeat(40) },
    }).catch(() => null);
  }, [BASE]);
  await p.waitForTimeout(1200);
  check('thiếu điểm thì máy chủ cũng không phát quà',
    (await db.pokeNhanVat.findUnique({ where: { id: nv.id } })).diemChien === 99);

  await db.pokeNhanVat.update({ where: { id: nv.id }, data: { diemChien: 100 } });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('button:has-text("Đổi quà")').click();
  await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: nv.id } })).diemChien === 0);

  const sauQua = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
  check('đổi quà trừ đúng 100 điểm', sauQua.diemChien === 0, String(sauQua.diemChien));
  // Bảy phần quà đều cho một thứ gì đó — không phần nào là con số 0 suông.
  const duoc = sauQua.vang + sauQua.ngoc + sauQua.cau + sauQua.da + (sauQua.skToiDa - 20);
  check('phần quà nào cũng cho một thứ có thật', duoc > 0,
    `vàng ${sauQua.vang}, ngọc ${sauQua.ngoc}, cầu ${sauQua.cau}, đá ${sauQua.da}, thể lực ${sauQua.skToiDa}`);
  // Bản gốc ghi phần "5 quả cầu" vào cột NGỌC — chữ nói một đằng số vào một nẻo.
  check('không có phần quà nào cho đúng 5 ngọc (lỗi ghi nhầm cột của bản gốc)',
    sauQua.ngoc !== 5, `ngọc ${sauQua.ngoc}`);

  // ── Bảng xếp hạng ────────────────────────────────────────────────────
  // Xếp hạng nay gom về ĐÚNG MỘT chỗ: trang Lãnh Thổ và trang Đấu trường
  // trước đây mỗi trang chép lại một bảng, nay chỉ giữ chỉ số của riêng mình.
  await p.goto(`${BASE}/pokemon/lanh-tho`, { waitUntil: 'networkidle' });
  await doiToi(async () => (await p.locator('text=Đổi quà').count()) > 0);
  check('trang Lãnh Thổ không còn chép lại bảng diệt quái',
    (await p.locator('ol').count()) === 0, `${await p.locator('ol').count()} danh sách xếp hạng`);
  check('trang Lãnh Thổ vẫn giữ số quái của riêng mình',
    (await p.locator('text=/đã diệt \\d+/').count()) > 0);

  await db.pokeNhanVat.update({ where: { id: nv.id }, data: { soDiet: 7, thangDau: 3, vang: 555 } });
  await p.goto(`${BASE}/pokemon/xep-hang`, { waitUntil: 'networkidle' });
  await doiToi(async () => (await p.locator('a[href^="/pokemon/xep-hang?bang="]').count()) > 0);
  await p.waitForTimeout(700);

  // Năm tên bảng nằm sẵn trên hàng tab kể cả khi chưa mở, nên vẫn đọc được hết
  // trên một màn dù mỗi lần chỉ dựng một bảng.
  const TAB = [
    ['diem', 'Điểm đấu trường mùa này'],
    ['exp', 'Kinh nghiệm'],
    ['thang', 'Thắng đấu trường'],
    ['vang', 'Vàng'],
    ['diet', 'Diệt quái ở Lãnh Thổ'],
  ];
  const chu = await p.locator('main').innerText();
  for (const [, ten] of TAB) check(`hàng tab có mục ${ten}`, chu.includes(ten));

  // Mở từng tab: mỗi tab phải dựng đúng bảng của nó, và chỉ một bảng.
  let sai = null;
  for (const [ma, ten] of TAB) {
    await p.goto(`${BASE}/pokemon/xep-hang?bang=${ma}`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await p.locator('h2').count()) > 0);
    const tieuDe = await p.locator('h2').allInnerTexts();
    if (tieuDe.length !== 1 || tieuDe[0].trim() !== ten) {
      sai = `tab ${ma} dựng ${JSON.stringify(tieuDe)}`;
    }
  }
  check('mỗi tab dựng đúng một bảng, đúng bảng của nó', sai === null, sai ?? '');

  // Mã bảng bịa ra thì về bảng đầu chứ không nổ — cùng nếp với bộ lọc kho game.
  await p.goto(`${BASE}/pokemon/xep-hang?bang=khongcothat&trang=999`, { waitUntil: 'networkidle' });
  await doiToi(async () => (await p.locator('h2').count()) > 0);
  check('mã bảng và số trang bịa ra vẫn mở được trang',
    (await p.locator('h2').first().innerText()).trim() === TAB[0][1]);

  // Tên mình phải có trong bảng diệt quái — vừa gieo soDiet 7.
  await p.goto(`${BASE}/pokemon/xep-hang?bang=diet`, { waitUntil: 'networkidle' });
  await doiToi(async () => (await p.locator('text=LanhTho').count()) > 0);
  check('tên mình có trong bảng', (await p.locator('text=LanhTho').count()) > 0);
  check('trang nói rõ mình đang hạng mấy',
    (await p.locator('text=/Bạn đang hạng/').count()) > 0);

  // ── Phân trang ───────────────────────────────────────────────────────
  // Gieo đủ người để bảng vàng tràn sang trang hai.
  const themId = [];
  for (let i = 0; i < 12; i++) {
    const u = await db.user.create({
      data: { username: `bxh${i}`, email: `bxh${i}@test.local`, name: `BXH ${i}` },
      select: { id: true },
    });
    themId.push(u.id);
    await db.pokeNhanVat.create({
      data: { userId: u.id, ten: `BxhKiem${i}`, cap: 5, khu: 'co', vang: 100_000 + i },
    });
  }
  try {
    await p.goto(`${BASE}/pokemon/xep-hang?bang=vang`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await p.locator('ol li').count()) > 0);
    check('mỗi trang đúng mười dòng', (await p.locator('ol li').count()) === 10,
      String(await p.locator('ol li').count()));
    check('có thanh phân trang khi tràn trang',
      (await p.locator('a[href*="trang=2"]').count()) > 0);

    const trang1 = await p.locator('ol li').allInnerTexts();
    await p.goto(`${BASE}/pokemon/xep-hang?bang=vang&trang=2`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await p.locator('ol li').count()) > 0);
    const trang2 = await p.locator('ol li').allInnerTexts();
    check('trang hai dựng phần còn lại, không lặp lại trang một',
      trang2.every((d) => !trang1.includes(d)), `${trang1.length} / ${trang2.length}`);
    check('số thứ tự chạy tiếp chứ không quay về 1',
      trang2[0]?.trim().startsWith('11'), trang2[0] ?? '');
  } finally {
    await db.user.deleteMany({ where: { id: { in: themId } } });
  }

  await db.pokeNhanVat.deleteMany({ where: { userId: me.id } });
}
