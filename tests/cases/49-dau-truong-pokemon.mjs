import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Đấu trường Đảo Pokémon — đánh luân phiên giữa hai người thật.
 *
 * Đấu trường của bản gốc HỎNG HẲN, ba lỗi chồng nhau khiến ai đánh trước là
 * thắng ngay: truy vấn con thú đối thủ dùng cột `po` không tồn tại nên trả về
 * rỗng, thành ra sát thương bằng đúng chiêu của mình còn máu đối thủ đọc ra
 * `null`, mà `$uron > null` thì luôn đúng; nhánh xử thua thì viết
 * `if($udata2['hp'] = 0)` — gán chứ không so sánh — nên không bao giờ chạy.
 * Vì thế bài này soi ĐÚNG những chỗ ấy:
 *
 *  • Lượt phải luân phiên: đánh xong là hết lượt, bấm nữa không ăn thua.
 *  • Máu phải trừ đúng công thức chiêu-chọi-chiêu, và trận chỉ kết thúc khi
 *    một bên thật sự hết máu.
 *  • Quá hạn thì bên đến lượt xử thua, chốt đúng một lần dù nhiều người mở
 *    trang cùng lúc.
 *  • Vàng người thua không bao giờ âm.
 */
export default async function run(check) {
  const a = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const b = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!a || !b) { check('có dữ liệu mẫu', false, 'thiếu minhdev hoặc huytran'); return; }

  await db.pokeNhanVat.deleteMany({ where: { userId: { in: [a.id, b.id] } } });

  const lam = async (userId, ten, chieu) => {
    const nv = await db.pokeNhanVat.create({
      data: { userId, ten, cap: 10, exp: 2250, vang: 100 },
    });
    const t = await db.pokeThu.create({
      data: {
        nhanVatId: nv.id, nguon: 3, ten: `${ten}-thú`, he: 1,
        mau: 100, mauToiDa: 100,
        c1: chieu[0], c2: chieu[1], c3: chieu[2], c4: chieu[3],
        chieu: ['TACKLE', 'GROWL', 'QUICK ATTACK', 'BITE'],
      },
    });
    await db.pokeNhanVat.update({ where: { id: nv.id }, data: { raTranId: t.id } });
    return { nv, t };
  };
  // Chiêu đặt lệch nhau để phép trừ chiêu-chọi-chiêu ra số khác nhau rõ rệt.
  const A = await lam(a.id, 'DauMot', [60, 10, 10, 10]);
  const B = await lam(b.id, 'DauHai', [10, 10, 10, 10]);

  const pA = await openPage('minhdev');
  const pB = await openPage('huytran');

  // ── Mở kèo ───────────────────────────────────────────────────────────
  await pA.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  await pA.fill('input[name="min"]', '1');
  await pA.fill('input[name="max"]', '100');
  await pA.locator('button:has-text("Mở kèo")').click();
  await doiToi(async () => (await db.pokeDau.count({ where: { chuId: A.nv.id, ketThuc: null } })) > 0);

  const keo = await db.pokeDau.findFirst({ where: { chuId: A.nv.id, ketThuc: null } });
  check('mở được kèo', !!keo);
  check('kèo chưa có đối thủ thì chưa tới lượt ai', keo?.luotCua === null, String(keo?.luotCua));
  check('kèo chép sẵn chỉ số con ra sàn',
    keo?.chuChieu?.[0] === 60 && keo?.chuMauToiDa === 100, JSON.stringify(keo?.chuChieu));

  // Chủ kèo không tự nhận kèo của mình được, kể cả gọi thẳng máy chủ.
  await pA.evaluate(async ([base, id]) => {
    const fd = new FormData(); fd.set('dau', id);
    await fetch(`${base}/pokemon/dau-truong`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'a'.repeat(40) },
    }).catch(() => null);
  }, [BASE, keo.id]);
  await pA.waitForTimeout(1200);
  check('không tự nhận kèo của chính mình',
    (await db.pokeDau.findUnique({ where: { id: keo.id } })).doiId === null);

  // ── Người thứ hai nhận kèo ───────────────────────────────────────────
  await pB.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  await pB.locator('button:has-text("Nhận")').first().click();
  await doiToi(async () => (await db.pokeDau.findUnique({ where: { id: keo.id } })).doiId !== null);

  const daVao = await db.pokeDau.findUnique({ where: { id: keo.id } });
  check('nhận được kèo', daVao.doiId === B.nv.id);
  check('chủ kèo đánh trước, đúng bản gốc', daVao.luotCua === 'chu', String(daVao.luotCua));
  check('máu hai bên chép đúng lúc vào sàn',
    daVao.chuMau === 100 && daVao.doiMau === 100, `${daVao.chuMau} / ${daVao.doiMau}`);

  // ── Chưa tới lượt thì đánh không ăn thua ─────────────────────────────
  await pB.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  check('bên chưa tới lượt không thấy nút ra chiêu',
    (await pB.locator('button[name="chieu"]').count()) === 0);

  const truocLen = await db.pokeDau.findUnique({ where: { id: keo.id } });
  await pB.evaluate(async ([base]) => {
    const fd = new FormData(); fd.set('chieu', '1');
    await fetch(`${base}/pokemon/dau-truong`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'b'.repeat(40) },
    }).catch(() => null);
  }, [BASE]);
  await pB.waitForTimeout(1200);
  const sauLen = await db.pokeDau.findUnique({ where: { id: keo.id } });
  check('gọi thẳng máy chủ khi chưa tới lượt cũng không đánh được',
    sauLen.chuMau === truocLen.chuMau && sauLen.luotCua === truocLen.luotCua,
    `${truocLen.chuMau} → ${sauLen.chuMau}`);

  // ── Chủ kèo đánh một lượt ────────────────────────────────────────────
  await pA.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  check('tới lượt thì có bốn nút chiêu',
    (await pA.locator('button[name="chieu"]').count()) === 4);

  await pA.locator('button[name="chieu"][value="1"]').click();
  await doiToi(async () => (await db.pokeDau.findUnique({ where: { id: keo.id } })).luotCua === 'doi');

  const sauLuot1 = await db.pokeDau.findUnique({ where: { id: keo.id } });
  // Công thức gốc: chiêu số n của mình trừ chiêu số n của đối thủ, sàn 1.
  check('sát thương đúng công thức chiêu chọi chiêu',
    sauLuot1.doiMau === 100 - (60 - 10), `còn ${sauLuot1.doiMau}`);
  check('đánh xong thì chuyền lượt cho đối thủ', sauLuot1.luotCua === 'doi');
  check('trận chưa kết thúc vì đối thủ còn máu', sauLuot1.ketThuc === null);
  check('hạn giờ được đặt lại sau mỗi lượt',
    sauLuot1.hanLuc.getTime() > truocLen.hanLuc.getTime());

  // Bấm thêm lần nữa khi đã hết lượt.
  const truocLai = sauLuot1.doiMau;
  await pA.evaluate(async ([base]) => {
    const fd = new FormData(); fd.set('chieu', '1');
    await fetch(`${base}/pokemon/dau-truong`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'c'.repeat(40) },
    }).catch(() => null);
  }, [BASE]);
  await pA.waitForTimeout(1200);
  check('đánh xong rồi bấm nữa thì không trừ thêm máu',
    (await db.pokeDau.findUnique({ where: { id: keo.id } })).doiMau === truocLai);

  // ── Đối thủ đánh trả, chiêu yếu nên sàn về 1 ────────────────────────
  await pB.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  await pB.locator('button[name="chieu"][value="1"]').click();
  await doiToi(async () => (await db.pokeDau.findUnique({ where: { id: keo.id } })).luotCua === 'chu');

  const sauLuot2 = await db.pokeDau.findUnique({ where: { id: keo.id } });
  check('chiêu yếu hơn đối thủ vẫn gây đúng 1 máu, không âm',
    sauLuot2.chuMau === 99, `còn ${sauLuot2.chuMau}`);

  // ── Hạ gục và trả thưởng ─────────────────────────────────────────────
  await db.pokeDau.update({ where: { id: keo.id }, data: { doiMau: 3, luotCua: 'chu' } });
  const vangTruoc = {
    a: (await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } })).vang,
    b: (await db.pokeNhanVat.findUnique({ where: { id: B.nv.id } })).vang,
  };
  await pA.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  await pA.locator('button[name="chieu"][value="1"]').click();
  await doiToi(async () => (await db.pokeDau.findUnique({ where: { id: keo.id } })).ketThuc !== null);

  const xong = await db.pokeDau.findUnique({ where: { id: keo.id } });
  const sauA = await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } });
  const sauB = await db.pokeNhanVat.findUnique({ where: { id: B.nv.id } });
  const thuB = await db.pokeThu.findUnique({ where: { id: B.t.id } });
  check('hạ gục thì trận kết thúc', xong.ketThuc !== null);
  check('ghi đúng người thắng', xong.thangId === A.nv.id);
  check('người thắng được cộng vàng', sauA.vang > vangTruoc.a, `${vangTruoc.a} → ${sauA.vang}`);
  check('người thắng được tính một trận thắng', sauA.thangDau === 1, String(sauA.thangDau));
  check('người thua bị trừ vàng', sauB.vang < vangTruoc.b, `${vangTruoc.b} → ${sauB.vang}`);
  check('thú người thua tụt về 10 máu, y bản gốc', thuB.mau === 10, String(thuB.mau));

  // ── Quá hạn thì bên đến lượt xử thua ─────────────────────────────────
  await db.pokeDau.deleteMany({ where: { OR: [{ chuId: A.nv.id }, { doiId: A.nv.id }] } });
  await db.pokeNhanVat.update({ where: { id: A.nv.id }, data: { vang: 3, thangDau: 0 } });
  await db.pokeNhanVat.update({ where: { id: B.nv.id }, data: { vang: 100, thangDau: 0 } });
  const heo = await db.pokeDau.create({
    data: {
      chuId: A.nv.id, doiId: B.nv.id, capMin: 1, capMax: 100,
      chuTen: 'A', chuNguon: 3, chuChieu: [10, 10, 10, 10], chuTenChieu: ['a'],
      chuMau: 50, chuMauToiDa: 100, chuThuId: A.t.id,
      doiTen: 'B', doiNguon: 3, doiChieu: [10, 10, 10, 10], doiTenChieu: ['b'],
      doiMau: 50, doiMauToiDa: 100, doiThuId: B.t.id,
      luotCua: 'chu', hanLuc: new Date(Date.now() - 1000),
    },
  });

  await pB.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(1500);
  const heoXong = await db.pokeDau.findUnique({ where: { id: heo.id } });
  check('kèo quá hạn được chốt ngay khi có người mở trang', heoXong.ketThuc !== null);
  check('bên đến lượt mà để quá giờ thì xử thua', heoXong.thangId === B.nv.id,
    String(heoXong.thangId));

  const heoA = await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } });
  check('vàng người thua không bao giờ âm', heoA.vang >= 0, String(heoA.vang));
  check('thiếu vàng thì lấy nốt phần còn lại chứ không âm', heoA.vang === 0, String(heoA.vang));

  // Mở lại trang lần nữa: không được chốt thêm lần nào.
  const thangTruoc = (await db.pokeNhanVat.findUnique({ where: { id: B.nv.id } })).thangDau;
  await pA.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
  await pA.waitForTimeout(1500);
  check('kèo quá hạn chỉ chốt đúng một lần',
    (await db.pokeNhanVat.findUnique({ where: { id: B.nv.id } })).thangDau === thangTruoc,
    `${thangTruoc} → ${(await db.pokeNhanVat.findUnique({ where: { id: B.nv.id } })).thangDau}`);

  // ── Kèo treo không ai nhận thì huỷ, không phạt ───────────────────────
  await db.pokeDau.deleteMany({ where: { OR: [{ chuId: A.nv.id }, { doiId: A.nv.id }] } });
  const treo = await db.pokeDau.create({
    data: {
      chuId: A.nv.id, capMin: 1, capMax: 100,
      chuTen: 'A', chuNguon: 3, chuChieu: [10, 10, 10, 10], chuTenChieu: ['a'],
      chuMau: 50, chuMauToiDa: 100, chuThuId: A.t.id,
      hanLuc: new Date(Date.now() - 1000),
    },
  });
  const vangA = (await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } })).vang;
  await pA.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
  await pA.waitForTimeout(1500);
  const treoXong = await db.pokeDau.findUnique({ where: { id: treo.id } });
  check('kèo treo hết hạn thì đóng lại', treoXong.ketThuc !== null);
  check('kèo treo hết hạn không phạt ai',
    treoXong.thangId === null
    && (await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } })).vang === vangA);

  await db.pokeNhanVat.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
}
