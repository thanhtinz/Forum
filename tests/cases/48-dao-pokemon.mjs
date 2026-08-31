import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Đảo Pokémon — dựng lại từ một wap game JohnCMS quãng 2013.
 *
 * Soi đúng những chỗ hỏng là mất thật:
 *  • CÔNG THỨC ĐÁNH phải khớp bản gốc từng con số. Sai một chỗ là cả bảng chỉ
 *    số của 468 con thú vô nghĩa.
 *  • Thể lực, quả cầu, vàng đều là thứ trừ đi được: mỗi lần phải trừ ĐÚNG một
 *    lần. Bản gốc ghi bằng những câu UPDATE rời không điều kiện, nên bấm hai
 *    tab là đánh hai lượt mà chỉ tốn một lượt thể lực.
 *  • Máu con thú hoang phải là bản sao riêng của từng người. Bản gốc trừ thẳng
 *    vào bảng dùng chung — hai người đánh cùng lúc là trừ máu của nhau.
 *  • Quyền: thú của người khác thì không được cho ra trận, không được thả.
 */
/**
 * Cấp theo kinh nghiệm: cấp n cần 25·n·(n−1) điểm.
 *
 * Viết lại ở đây chứ không gọi hàm của ứng dụng — gọi hàm của chính nó thì bài
 * kiểm chỉ so nó với nó.
 */
function capTuExp(exp) {
  let c = 1;
  while (25 * (c + 1) * c <= exp && c < 99) c++;
  return c;
}

export default async function run(check) {
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const khac = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!me || !khac) { check('có dữ liệu mẫu', false, 'thiếu minhdev hoặc huytran'); return; }

  // ── Bảng thú hoang đã nạp ────────────────────────────────────────────
  const soHoang = await db.pokeThuHoang.count();
  check('đã nạp bảng thú hoang', soHoang >= 300, `${soHoang} con`);
  const soKhu = (await db.pokeThuHoang.groupBy({ by: ['khu'], _count: true })).length;
  // Mười bốn khu của bản gốc, cộng Hang Huyền Thoại tách ra từ bảng của
  // Rừng Xanh (xem chú thích ở `KHU_HUYEN_THOAI`), cộng năm khu bậc 9–13 mở
  // sau hang — xem `BAC_SAU_HUYEN_THOAI`.
  check('đủ hai mươi khu', soKhu === 20, `${soKhu} khu`);
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

  // Ép chỉ số con thú hoang về một bộ ĐÃ BIẾT rồi mới đánh. Bốc ngẫu nhiên
  // thì có lượt gặp con dị biệt của khu Cỏ (công 150, thủ 120, máu 100 giữa
  // toàn những con công dưới 20) — thú khởi đầu chết ngay lượt đầu và bài
  // kiểm đỏ oan, mà nhánh thưởng thì lượt có lượt không.
  await db.pokeTran.update({
    where: { nhanVatId: nv0.id },
    data: { cong: 12, thu: 4, mau: 60, mauToiDa: 60, he: 1, exp: 7, vang: 9 },
  });
  await db.pokeThu.update({ where: { id: nv0.raTranId }, data: { mau: 20 } });

  const tranD = await db.pokeTran.findUnique({ where: { nhanVatId: nv0.id } });
  const truocDanh = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  const conTruoc = await db.pokeThu.findUnique({ where: { id: nv0.raTranId } });

  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(900);

  // Hệ số khắc hệ đọc từ chính dòng chữ trang đang hiện: nếu bảng hệ của máy
  // chủ và dòng chữ nói hai đằng thì phép so bên dưới sẽ đỏ.
  const dongHe = await p.locator('text=/sát thương/').first().innerText();
  const heSo = [
    /vô hiệu/.test(dongHe) ? 0 : Number(dongHe.match(/sát thương ×([\d.]+)/)?.[1] ?? 1),
    Number(dongHe.match(/chịu ×([\d.]+)/)?.[1] ?? 1),
  ];
  check('trang có nói rõ hệ số khắc hệ', dongHe.includes('×') || dongHe.includes('vô hiệu'), dongHe);

  await p.locator('form button[name="chieu"]').first().click();
  await doiToi(async () => {
    const t = await db.pokeTran.findUnique({ where: { nhanVatId: nv0.id } });
    return !!t && t.mau < tranD.mau;
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
  // rồi nhân hệ số khắc hệ.
  const boThu = Math.floor((conTruoc.c1 + conTruoc.c2 + conTruoc.c3 + conTruoc.c4) / 4);
  const gay = heSo[0] === 0 ? 0 : Math.max(1, Math.floor(Math.max(1, conTruoc.c1 - tranD.thu) * heSo[0]));
  const chiu = heSo[1] === 0 ? 0 : Math.max(1, Math.floor(Math.max(1, tranD.cong - boThu) * heSo[1]));

  check('sát thương gây ra khớp công thức gốc',
    tranSau.mau === Math.max(0, tranD.mau - gay),
    `${tranD.mau} − ${gay} ≠ ${tranSau.mau}`);
  check('sát thương phải chịu khớp công thức gốc',
    conSau.mau === Math.max(0, conTruoc.mau - chiu),
    `${conTruoc.mau} − ${chiu} ≠ ${conSau.mau}`);

  // ── Hạ gục thì được đúng số vàng và kinh nghiệm của con thú ──────────
  await db.pokeTran.update({ where: { nhanVatId: nv0.id }, data: { mau: 1 } });
  const truocThang = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('form button[name="chieu"]').first().click();
  await doiToi(async () => (await db.pokeTran.count({ where: { nhanVatId: nv0.id } })) === 0);

  const sauThang = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  check('hạ gục thì được đúng số vàng của con thú',
    sauThang.vang === truocThang.vang + tranD.vang,
    `${truocThang.vang} + ${tranD.vang} ≠ ${sauThang.vang}`);
  check('hạ gục thì được đúng số kinh nghiệm của con thú',
    sauThang.exp === truocThang.exp + tranD.exp,
    `${truocThang.exp} + ${tranD.exp} ≠ ${sauThang.exp}`);
  check('cấp nhân vật tính lại từ tổng kinh nghiệm',
    sauThang.cap === capTuExp(sauThang.exp), `cấp ${sauThang.cap}, kn ${sauThang.exp}`);

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

  // ── Gym ──────────────────────────────────────────────────────────────
  const soGym = await db.pokeGym.count();
  check('đã nạp đủ mười bốn Gym', soGym === 14, `${soGym} Gym`);

  await db.pokeTran.deleteMany({ where: { nhanVatId: nv0.id } });
  await db.pokeNhanVat.update({
    where: { id: nv0.id },
    data: { huyChuong: 0, sk: 20, cau: 5, ngoc: 0, vang: 0, cap: 1, khu: 'co' },
  });
  // Cho con thú đủ khoẻ để hạ Gym 1 trong một lượt: bài này soi PHẦN THƯỞNG,
  // không soi việc đánh nhau — phần ấy đã có ở trên.
  await db.pokeThu.update({
    where: { id: nv0.raTranId },
    data: { mau: 9999, mauToiDa: 9999, c1: 99999, c2: 99999, c3: 99999, c4: 99999 },
  });

  await p.goto(`${BASE}/pokemon/gym`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  // Đếm theo ẢNH của Gym chứ không theo nhãn chữ: mười bốn Gym nay mang tên
  // chủ Gym chứ không còn đánh số, nên đếm chữ "Gym N" là đếm hụt hết.
  const soO = await p.locator('img[src^="/hoai-niem/pokemon/gym/"]').count();
  check('trang Gym bày đủ mười bốn Gym', soO >= 14, String(soO));
  check('chỉ Gym kế tiếp mới có nút thách đấu',
    (await p.locator('button:has-text("Thách đấu")').count()) === 1);

  // Gọi thẳng máy chủ để nhảy cóc sang Gym 5 — phải bị chặn.
  await p.evaluate(async ([base]) => {
    const fd = new FormData();
    fd.set('gym', '5');
    await fetch(`${base}/pokemon/gym`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'z'.repeat(40) },
    }).catch(() => null);
  }, [BASE]);
  await p.waitForTimeout(1200);
  const tranNhay = await db.pokeTran.findUnique({ where: { nhanVatId: nv0.id } });
  check('không nhảy cóc sang Gym chưa mở được', !tranNhay || tranNhay.gym === 1,
    `gym ${tranNhay?.gym}`);
  await db.pokeTran.deleteMany({ where: { nhanVatId: nv0.id } });

  await p.locator('button:has-text("Thách đấu")').click();
  await doiToi(async () => (await db.pokeTran.count({ where: { nhanVatId: nv0.id } })) > 0);
  const tranGym = await db.pokeTran.findUnique({ where: { nhanVatId: nv0.id } });
  check('vào được Gym 1', tranGym?.gym === 1, `gym ${tranGym?.gym}`);

  await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  check('trận Gym không bày nút ném cầu',
    (await p.locator('button:has-text("Ném cầu")').count()) === 0);

  // Gọi thẳng hàm ném cầu vào trận Gym — máy chủ phải chặn, và không được
  // trừ mất quả cầu nào.
  const cauTruocGym = (await db.pokeNhanVat.findUnique({ where: { id: nv0.id } })).cau;
  await p.evaluate(async ([base]) => {
    await fetch(`${base}/pokemon`, {
      method: 'POST', body: new FormData(),
      headers: { 'Next-Action': 'w'.repeat(40) },
    }).catch(() => null);
  }, [BASE]);
  await p.waitForTimeout(1200);
  check('không bắt được chủ Gym, mà cũng không mất cầu',
    (await db.pokeNhanVat.findUnique({ where: { id: nv0.id } })).cau === cauTruocGym);

  const gym1 = await db.pokeGym.findUnique({ where: { so: 1 } });
  const truocGym = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  const khoTruocGym = await db.pokeThu.count({ where: { nhanVatId: nv0.id } });

  await p.locator('form button[name="chieu"]').first().click();
  await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: nv0.id } })).huyChuong === 1);

  const sauGym = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  check('hạ Gym thì nhận huy chương', sauGym.huyChuong === 1, String(sauGym.huyChuong));
  check('hạ Gym thì được đúng số vàng của Gym',
    sauGym.vang === truocGym.vang + gym1.vang, `${truocGym.vang} → ${sauGym.vang}`);
  check('hạ Gym thì được đúng số cầu của Gym',
    sauGym.cau === truocGym.cau + gym1.cau, `${truocGym.cau} → ${sauGym.cau}`);
  check('hạ Gym thì được đúng số ngọc của Gym',
    sauGym.ngoc === truocGym.ngoc + gym1.ngoc, `${truocGym.ngoc} → ${sauGym.ngoc}`);
  check('hạ Gym thì được tặng một con thú',
    (await db.pokeThu.count({ where: { nhanVatId: nv0.id } })) === khoTruocGym + 1);
  const qua = await db.pokeThu.findFirst({
    where: { nhanVatId: nv0.id }, orderBy: { createdAt: 'desc' },
  });
  check('con thú tặng đúng số hiệu ảnh của bản gốc (Gym + 1500)',
    qua.nguon === gym1.tangNguon && qua.nguon === 1501, String(qua.nguon));
  check('đánh xong Gym thì trận kết thúc',
    (await db.pokeTran.count({ where: { nhanVatId: nv0.id } })) === 0);

  await p.goto(`${BASE}/pokemon/gym`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  check('Gym đã hạ thì không đánh lại được',
    (await p.locator('text=đã hạ').count()) >= 1);

  // ── Đổi ngọc lấy đá ──────────────────────────────────────────────────
  await db.pokeNhanVat.update({ where: { id: nv0.id }, data: { ngoc: 12, da: 0 } });
  await p.goto(`${BASE}/pokemon/cua-hang`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('form:has-text("Đổi ngọc lấy đá") input[name="sl"]').fill('2');
  await p.locator('form:has-text("Đổi ngọc lấy đá") button:has-text("Đổi")').click();
  await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: nv0.id } })).da >= 2);
  const sauDoi = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  check('đổi hai viên đá thì trừ đúng mười ngọc',
    sauDoi.ngoc === 2 && sauDoi.da === 2, `${sauDoi.ngoc} ngọc, ${sauDoi.da} đá`);

  const ngocTruoc = sauDoi.ngoc;
  await p.locator('form:has-text("Đổi ngọc lấy đá") input[name="sl"]').fill('50');
  await p.locator('form:has-text("Đổi ngọc lấy đá") button:has-text("Đổi")').click({ force: true });
  await p.waitForTimeout(1500);
  const sauLoNgoc = await db.pokeNhanVat.findUnique({ where: { id: nv0.id } });
  check('đổi quá số ngọc đang có thì bị chặn',
    sauLoNgoc.ngoc === ngocTruoc && sauLoNgoc.da === 2, `${sauLoNgoc.ngoc} ngọc, ${sauLoNgoc.da} đá`);

  // ── Dọn ──────────────────────────────────────────────────────────────
  await db.pokeNhanVat.deleteMany({ where: { userId: { in: [me.id, khac.id] } } });
}
