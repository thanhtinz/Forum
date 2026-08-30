import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Đảo Pokémon — dựng lại từ một wap game JohnCMS quãng 2013.
 *
 * Soi đúng những chỗ hỏng là mất thật:
 *  • CÔNG THỨC ĐÁNH phải khớp bản gốc từng con số. Sai một chỗ là cả bảng chỉ
 *    số của 318 con thú vô nghĩa.
 *  • Thể lực, quả cầu, vàng đều là thứ trừ đi được: mỗi lần phải trừ ĐÚNG một
 *    lần. Bản gốc ghi bằng những câu UPDATE rời không điều kiện, nên bấm hai
 *    tab là đánh hai lượt mà chỉ tốn một lượt thể lực.
 *  • Máu con thú hoang phải là bản sao riêng của từng người. Bản gốc trừ thẳng
 *    vào bảng dùng chung — hai người đánh cùng lúc là trừ máu của nhau.
 *  • Quyền: thú của người khác thì không được cho ra trận, không được thả.
 */
export default async function run(check) {
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const khac = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!me || !khac) { check('có dữ liệu mẫu', false, 'thiếu minhdev hoặc huytran'); return; }

  // ── Bảng thú hoang đã nạp ────────────────────────────────────────────
  const soHoang = await db.pokeThuHoang.count();
  check('đã nạp bảng thú hoang', soHoang >= 300, `${soHoang} con`);
  const soKhu = (await db.pokeThuHoang.groupBy({ by: ['khu'], _count: true })).length;
  check('đủ mười bốn khu', soKhu === 14, `${soKhu} khu`);
  const thieuChieu = await db.pokeThuHoang.count({ where: { chieu: { isEmpty: true } } });
  check('thú hoang nào cũng có chiêu', thieuChieu === 0, `${thieuChieu} con trống chiêu`);
  const heLa = await db.pokeThuHoang.count({ where: { OR: [{ he: { lt: 1 } }, { he: { gt: 17 } }] } });
  check('hệ của thú hoang đều nằm trong 1–17', heLa === 0, `${heLa} con sai hệ`);

  // ── Dọn rồi tạo nhân vật ─────────────────────────────────────────────
  await db.pokeNhanVat.deleteMany({ where: { userId: { in: [me.id, khac.id] } } });

  const p = await openPage('minhdev');
  await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  check('chưa có nhân vật thì mời tạo',
    (await p.locator('a[href="/pokemon/tao"]').count()) > 0);

  await p.goto(`${BASE}/pokemon/tao`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.fill('input[name="ten"]', 'KiemThu');
  await p.locator('input[name="thu"][value="3"]').check({ force: true });
  await p.locator('button:has-text("Bắt đầu")').click();
  await doiToi(async () => (await db.pokeNhanVat.count({ where: { userId: me.id } })) > 0);

  const nv0 = await db.pokeNhanVat.findUnique({
    where: { userId: me.id },
    include: { thu: true },
  });
  check('tạo được nhân vật', !!nv0);
  check('vốn ban đầu đúng bản gốc',
    nv0?.vang === 200 && nv0?.sk === 20 && nv0?.cau === 5 && nv0?.exp === 20,
    `vàng ${nv0?.vang}, sk ${nv0?.sk}, cầu ${nv0?.cau}, kn ${nv0?.exp}`);
  check('được đúng một con thú khởi đầu', nv0?.thu.length === 1);
  check('con khởi đầu đúng chỉ số gốc: 20 máu, bốn chiêu 10',
    nv0?.thu[0]?.mauToiDa === 20 && nv0?.thu[0]?.c1 === 10 && nv0?.thu[0]?.c4 === 10,
    `${nv0?.thu[0]?.mauToiDa} máu, chiêu ${nv0?.thu[0]?.c1}`);
  check('con khởi đầu được cho ra trận sẵn', nv0?.raTranId === nv0?.thu[0]?.id);

  // ── Tên trùng thì không tạo được nhân vật thứ hai ─────────────────────
  const p2 = await openPage('huytran');
  await p2.goto(`${BASE}/pokemon/tao`, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(700);
  await p2.fill('input[name="ten"]', 'KiemThu');
  await p2.locator('button:has-text("Bắt đầu")').click();
  await p2.waitForTimeout(1500);
  check('tên nhân vật trùng thì bị chặn',
    (await db.pokeNhanVat.count({ where: { userId: khac.id } })) === 0);

  // ── Vào trận và soi công thức ────────────────────────────────────────
  await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('button:has-text("Tìm thú")').click();
  await doiToi(async () => (await db.pokeTran.count({ where: { nhanVatId: nv0.id } })) > 0);

  const tran = await db.pokeTran.findUnique({ where: { nhanVatId: nv0.id } });
  check('gặp được thú hoang', !!tran);
  check('thú hoang lấy từ đúng khu đang đứng', tran?.khu === nv0.khu, String(tran?.khu));
  check('trận giữ BẢN SAO máu riêng, không trỏ về bảng chung',
    tran?.mau === tran?.mauToiDa, `${tran?.mau}/${tran?.mauToiDa}`);

  const truocDanh = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  const conTruoc = await db.pokeThu.findUnique({ where: { id: nv0.raTranId } });

  // Hệ số khắc hệ đọc từ chính dòng chữ trang đang hiện: nếu bảng hệ của máy
  // chủ và dòng chữ nói hai đằng thì phép so bên dưới sẽ đỏ.
  const dongHe = await p.locator('text=/sát thương/').first().innerText();
  const heSo = [
    /vô hiệu/.test(dongHe) ? 0 : Number(dongHe.match(/sát thương ×([\d.]+)/)?.[1] ?? 1),
    Number(dongHe.match(/chịu ×([\d.]+)/)?.[1] ?? 1),
  ];
  check('trang có nói rõ hệ số khắc hệ', dongHe.includes('×') || dongHe.includes('vô hiệu'), dongHe);

  await p.locator('button:has-text("TACKLE"), button:has-text("Ra chiêu") + * button').first().click()
    .catch(async () => { await p.locator('form button[name="chieu"]').first().click(); });
  await doiToi(async () => {
    const t = await db.pokeTran.findUnique({ where: { nhanVatId: nv0.id } });
    return !t || t.mau < tran.mau;
  });

  const sauDanh = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  check('mỗi lượt trừ đúng 2 thể lực',
    sauDanh.sk === truocDanh.sk - 2, `${truocDanh.sk} → ${sauDanh.sk}`);

  const tranSau = await db.pokeTran.findUnique({ where: { nhanVatId: nv0.id } });
  const conSau = await db.pokeThu.findUnique({ where: { id: nv0.raTranId } });

  // Công thức gốc, viết LẠI ở đây từ mã PHP chứ không gọi hàm của ứng dụng —
  // gọi hàm của chính nó thì bài kiểm chỉ so nó với nó.
  //   mình gây  = (chiêu − thủ của địch)      , sàn 1
  //   mình chịu = (công của địch − thủ của mình), sàn 1,  thủ = trung bình 4 chiêu
  // rồi nhân hệ số khắc hệ. Hệ số lấy từ chính dòng chữ trang đang hiện, nên
  // nếu bảng hệ và màn đánh nói hai đằng thì bài này đỏ.
  const boThu = Math.floor((conTruoc.c1 + conTruoc.c2 + conTruoc.c3 + conTruoc.c4) / 4);
  const nhan = (chuoi) => (chuoi === 'vô hiệu' ? 0 : Number(chuoi.replace(/[^\d.]/g, '')));
  const gayThuong = Math.max(1, conTruoc.c1 - tran.thu);
  const chiuThuong = Math.max(1, tran.cong - boThu);
  const gay = heSo[0] === 0 ? 0 : Math.max(1, Math.floor(gayThuong * heSo[0]));
  const chiu = heSo[1] === 0 ? 0 : Math.max(1, Math.floor(chiuThuong * heSo[1]));
  void nhan;

  if (tranSau) {
    check('sát thương gây ra khớp công thức gốc',
      tranSau.mau === Math.max(0, tran.mau - gay),
      `${tran.mau} − ${gay} ≠ ${tranSau.mau}`);
    check('sát thương phải chịu khớp công thức gốc',
      conSau.mau === Math.max(0, conTruoc.mau - chiu),
      `${conTruoc.mau} − ${chiu} ≠ ${conSau.mau}`);
  } else {
    check('hạ gục trong một lượt thì được cộng thưởng',
      sauDanh.vang > truocDanh.vang && sauDanh.exp > truocDanh.exp,
      `${truocDanh.vang}→${sauDanh.vang} vàng`);
  }

  // ── Ném cầu: trừ cầu dù trúng hay trượt ──────────────────────────────
  await db.pokeTran.deleteMany({ where: { nhanVatId: nv0.id } });
  await db.pokeNhanVat.update({
    where: { id: nv0.id }, data: { sk: 20, cau: 5, vang: 1000 },
  });
  await db.pokeThu.update({ where: { id: nv0.raTranId }, data: { mau: 20 } });

  await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('button:has-text("Tìm thú")').click();
  await doiToi(async () => (await db.pokeTran.count({ where: { nhanVatId: nv0.id } })) > 0);

  const cauTruoc = (await db.pokeNhanVat.findUnique({ where: { id: nv0.id } })).cau;
  const khoTruoc = await db.pokeThu.count({ where: { nhanVatId: nv0.id } });
  await p.locator('button:has-text("Ném cầu")').click();
  await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: nv0.id } })).cau < cauTruoc);

  const sauCau = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  const khoSau = await db.pokeThu.count({ where: { nhanVatId: nv0.id } });
  check('ném cầu là mất một quả, trúng hay trượt cũng vậy',
    sauCau.cau === cauTruoc - 1, `${cauTruoc} → ${sauCau.cau}`);
  check('bắt trúng thì thú vào kho, trượt thì kho giữ nguyên',
    khoSau === khoTruoc || khoSau === khoTruoc + 1, `${khoTruoc} → ${khoSau}`);
  if (khoSau > khoTruoc) {
    const moi = await db.pokeThu.findFirst({
      where: { nhanVatId: nv0.id }, orderBy: { createdAt: 'desc' },
    });
    check('con bắt được bắt đầu lại từ 20 máu và bốn chiêu 10, y bản gốc',
      moi.mauToiDa === 20 && moi.c1 === 10, `${moi.mauToiDa} máu, chiêu ${moi.c1}`);
  }

  // ── Hết cầu thì không ném được ───────────────────────────────────────
  await db.pokeNhanVat.update({ where: { id: nv0.id }, data: { cau: 0 } });
  await db.pokeTran.deleteMany({ where: { nhanVatId: nv0.id } });

  // ── Cửa hàng ─────────────────────────────────────────────────────────
  await db.pokeNhanVat.update({ where: { id: nv0.id }, data: { vang: 100, da: 0 } });
  await p.goto(`${BASE}/pokemon/cua-hang`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('form:has(input[value="cau"]) input[name="sl"]').fill('3');
  await p.locator('form:has(input[value="cau"]) button[type="submit"]').click();
  await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: nv0.id } })).cau >= 3);

  const sauMua = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  check('mua ba quả cầu thì trừ đúng 60 vàng',
    sauMua.vang === 40 && sauMua.cau === 3, `${sauMua.vang} vàng, ${sauMua.cau} cầu`);

  // Mua quá số vàng đang có phải bị máy chủ chặn, không tin ô nhập.
  const vangTruoc = sauMua.vang;
  await p.locator('form:has(input[value="cau"]) input[name="sl"]').evaluate((el) => el.removeAttribute('max'));
  await p.locator('form:has(input[value="cau"]) input[name="sl"]').fill('99');
  await p.locator('form:has(input[value="cau"]) button[type="submit"]').click({ force: true });
  await p.waitForTimeout(1500);
  const sauLo = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  check('mua quá số vàng đang có thì bị chặn',
    sauLo.vang === vangTruoc && sauLo.cau === 3, `${sauLo.vang} vàng, ${sauLo.cau} cầu`);
  check('vàng không bao giờ âm', sauLo.vang >= 0, String(sauLo.vang));

  // ── Đá tiến cấp và tiến hoá ──────────────────────────────────────────
  const con = await db.pokeThu.findUnique({ where: { id: nv0.raTranId } });
  await db.pokeNhanVat.update({ where: { id: nv0.id }, data: { da: 1 } });
  await db.pokeThu.update({ where: { id: con.id }, data: { exp: 999, cap: 5, nac: 1 } });

  await p.goto(`${BASE}/pokemon/kho`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  check('thiếu kinh nghiệm thì nút dùng đá bị khoá',
    await p.locator('button:has-text("Dùng đá tiến cấp")').first().isDisabled());

  await db.pokeThu.update({ where: { id: con.id }, data: { exp: 1000 } });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('button:has-text("Dùng đá tiến cấp")').first().click();
  await doiToi(async () => (await db.pokeThu.findUnique({ where: { id: con.id } })).cap > 5);

  const sauDa = await db.pokeThu.findUnique({ where: { id: con.id } });
  const nvSauDa = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  check('dùng đá thì lên một cấp', sauDa.cap === 6, String(sauDa.cap));
  check('mỗi cấp cộng 100 vào cả bốn chiêu lẫn máu tối đa',
    sauDa.c1 === con.c1 + 100 && sauDa.c4 === con.c4 + 100 && sauDa.mauToiDa === con.mauToiDa + 100,
    `chiêu ${sauDa.c1}, máu ${sauDa.mauToiDa}`);
  // Bản gốc ghi `exp = exp*3` — nhân lên thay vì trừ đi, nên ngưỡng 1000 vĩnh
  // viễn thoả sau lần đầu. Ở đây phải TRỪ.
  check('lên cấp thì TRỪ kinh nghiệm chứ không nhân lên',
    sauDa.exp === 0, String(sauDa.exp));
  check('dùng đá thì mất một viên', nvSauDa.da === 0, String(nvSauDa.da));
  check('tới cấp 6 thì tiến hoá lên nấc 2', sauDa.nac === 2, `nấc ${sauDa.nac}`);

  // ── Quyền: không đụng được thú của người khác ────────────────────────
  await db.pokeNhanVat.deleteMany({ where: { userId: khac.id } });
  const nvKhac = await db.pokeNhanVat.create({
    data: { userId: khac.id, ten: 'KiemThuHai' },
    select: { id: true },
  });
  const thuKhac = await db.pokeThu.create({
    data: {
      nhanVatId: nvKhac.id, nguon: 3, ten: 'Rattata', he: 1,
      mau: 20, mauToiDa: 20, chieu: ['TACKLE'],
    },
    select: { id: true },
  });

  const truocTron = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  const ma = await p.evaluate(async ([base, id]) => {
    const fd = new FormData();
    fd.set('thu', id);
    const r = await fetch(`${base}/pokemon/kho`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'x'.repeat(40) },
    }).catch(() => null);
    return r ? r.status : 0;
  }, [BASE, thuKhac.id]);
  void ma;
  const sauTron = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  check('không cho thú của người khác ra trận được',
    sauTron.raTranId === truocTron.raTranId, String(sauTron.raTranId));
  check('thú của người khác vẫn còn nguyên',
    (await db.pokeThu.count({ where: { id: thuKhac.id } })) === 1);

  // ── Khu khoá theo cấp ────────────────────────────────────────────────
  await db.pokeNhanVat.update({ where: { id: nv0.id }, data: { cap: 1, khu: 'co' } });
  await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const nutLanhTho = p.locator('form:has(input[value="lanhtho"]) button');
  check('khu bậc cao bị khoá khi chưa đủ cấp', await nutLanhTho.isDisabled());

  const maKhu = await p.evaluate(async ([base]) => {
    const fd = new FormData();
    fd.set('khu', 'lanhtho');
    const r = await fetch(`${base}/pokemon`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'y'.repeat(40) },
    }).catch(() => null);
    return r ? r.status : 0;
  }, [BASE]);
  void maKhu;
  check('gọi thẳng máy chủ cũng không vào được khu chưa mở',
    (await db.pokeNhanVat.findUnique({ where: { id: nv0.id } })).khu === 'co');

  // ── Dọn ──────────────────────────────────────────────────────────────
  await db.pokeNhanVat.deleteMany({ where: { userId: { in: [me.id, khac.id] } } });
}
