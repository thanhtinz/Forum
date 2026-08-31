import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Trang bị bốn ô và thuốc hồi máu.
 *
 * Giống hệt bảng khắc hệ: bản gốc dựng đủ bốn ô, bán ba mươi tám món từ +1 tới
 * +500, cho mặc vào bằng cột `dressed` — rồi KHÔNG trận nào cộng chỉ số của
 * chúng vào đâu cả. Mua xong mặc vào là hết chuyện. Bài này canh đúng chỗ ấy:
 * mặc đồ vào thì sát thương phải khác đi thật.
 */
export default async function run(check) {
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!me) { check('có dữ liệu mẫu', false, 'thiếu minhdev'); return; }

  // ── Bảng hàng ────────────────────────────────────────────────────────
  const soHang = await db.pokeHang.count();
  check('đã nạp bảng hàng', soHang === 68, `${soHang} món`);
  for (const [loai, so] of [['weapon', 15], ['shield', 15], ['golova', 15], ['body', 15], ['elixir', 8]]) {
    check(`đủ ${so} món loại ${loai}`,
      (await db.pokeHang.count({ where: { loai } })) === so);
  }
  // Bảng gốc bỏ sót đúng hai ô: mũ không có bậc +500 và giáp không có bậc +50,
  // trong khi vũ khí và khiên đủ cả mười bậc.
  const mu500 = await db.pokeHang.findFirst({ where: { loai: 'golova', mu: 500 } });
  const giap50 = await db.pokeHang.findFirst({ where: { loai: 'body', giap: 50 } });
  check('mũ đã có bậc +500', mu500 != null);
  check('giáp đã có bậc +50', giap50 != null);
  // Tên món phải là tên thật, không còn là chính con số cộng thêm.
  const conTenSo = await db.pokeHang.count({ where: { ten: { startsWith: '+' } } });
  check('không món nào còn tên kiểu "+50"', conTenSo === 0, `${conTenSo} món`);
  const manh = await db.pokeHang.findFirst({ where: { loai: 'weapon' }, orderBy: { cong: 'desc' } });
  check('vũ khí mạnh nhất là bậc 25.000', manh?.cong === 25000, `công ${manh?.cong}`);

  await db.pokeNhanVat.deleteMany({ where: { userId: me.id } });
  const nv = await db.pokeNhanVat.create({
    data: { userId: me.id, ten: 'TrangBi', cap: 20, exp: 9500, vang: 5000, ngoc: 3000, sk: 20 },
  });
  const t = await db.pokeThu.create({
    data: {
      nhanVatId: nv.id, nguon: 3, ten: 'Thử', he: 1, mau: 500, mauToiDa: 500,
      c1: 100, c2: 100, c3: 100, c4: 100, chieu: ['TACKLE', 'A', 'B', 'C'],
    },
  });
  await db.pokeNhanVat.update({ where: { id: nv.id }, data: { raTranId: t.id } });

  const p = await openPage('minhdev');

  // ── Mua và mặc ───────────────────────────────────────────────────────
  // Tra theo CHỈ SỐ chứ không theo tên: tên món nay là tên thật ("Kiếm Thép")
  // chứ không còn là con số cộng thêm.
  const vk = await db.pokeHang.findFirst({ where: { loai: 'weapon', cong: 20 } });
  await p.goto(`${BASE}/pokemon/trang-bi`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  await p.locator(`form:has(input[name="ma"][value="${vk.ma}"]) button:has-text("Mua")`).click();
  await doiToi(async () => (await db.pokeDo.count({ where: { nhanVatId: nv.id } })) > 0);

  const sauMua = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
  check('mua trang bị trừ đúng giá',
    sauMua.vang === 5000 - vk.vang && sauMua.ngoc === 3000 - vk.ngoc,
    `${sauMua.vang} vàng, ${sauMua.ngoc} ngọc`);
  const mon = await db.pokeDo.findFirst({ where: { nhanVatId: nv.id } });
  check('món mới nằm trong túi và chưa mặc', mon?.dangMac === false);

  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator(`form:has(input[name="do"][value="${mon.id}"]) button:has-text("Mặc vào")`).click();
  await doiToi(async () => (await db.pokeDo.findUnique({ where: { id: mon.id } })).dangMac);
  check('mặc được vào ô của nó', true);

  // Mua món thứ hai cùng ô rồi mặc: món cũ phải tự cởi ra.
  const vk2 = await db.pokeHang.findFirst({ where: { loai: 'weapon', cong: 10 } });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator(`form:has(input[name="ma"][value="${vk2.ma}"]) button:has-text("Mua")`).click();
  await doiToi(async () => (await db.pokeDo.count({ where: { nhanVatId: nv.id } })) === 2);
  const mon2 = await db.pokeDo.findFirst({ where: { nhanVatId: nv.id, ma: vk2.ma } });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator(`form:has(input[name="do"][value="${mon2.id}"]) button:has-text("Mặc vào")`).click();
  await doiToi(async () => (await db.pokeDo.findUnique({ where: { id: mon2.id } })).dangMac);
  check('mỗi ô chỉ mặc được một món — món cũ tự cởi ra',
    (await db.pokeDo.count({ where: { nhanVatId: nv.id, loai: 'weapon', dangMac: true } })) === 1);

  // ── Trang bị PHẢI đổi sát thương thật ────────────────────────────────
  // Cởi hết ra, đánh một đòn, ghi lại số máu trừ được; rồi mặc vào, đánh lại.
  await db.pokeDo.updateMany({ where: { nhanVatId: nv.id }, data: { dangMac: false } });
  /**
   * Đánh cho tới khi được một lượt THƯỜNG — không chí mạng, không trượt.
   *
   * Bài này đo phần cộng của trang bị, mà lượt đánh nay có chí mạng (×1,5) và
   * trượt (mất trắng): lấy đại một lượt thì con số đo được lệch hẳn. Máy chủ
   * ghi kết quả bốc vào `lanChiMang`/`lanTruot` nên đọc ra rồi bỏ qua những
   * lượt không thường là được, không phải tắt ngẫu nhiên đi.
   */
  const danhMotDon = async () => {
    for (let lan = 0; lan < 25; lan++) {
      await db.pokeTran.deleteMany({ where: { nhanVatId: nv.id } });
      await db.pokeNhanVat.update({ where: { id: nv.id }, data: { sk: 20, khu: 'co' } });
      await db.pokeThu.update({ where: { id: t.id }, data: { mau: 500 } });
      await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(800);
      await p.locator('button:has-text("Tìm thú")').click();
      await doiToi(async () => (await db.pokeTran.count({ where: { nhanVatId: nv.id } })) > 0);
      // Ép con thú hoang về bộ đã biết: hệ 1 để bảng khắc hệ không xen vào, máu
      // cao để trận không kết thúc giữa chừng.
      await db.pokeTran.update({
        where: { nhanVatId: nv.id },
        data: { he: 1, cong: 200, thu: 30, mau: 100_000, mauToiDa: 100_000 },
      });
      await p.reload({ waitUntil: 'networkidle' });
      await p.waitForTimeout(700);
      await p.locator('form button[name="chieu"]').first().click();
      // Chờ theo MÁU CỦA MÌNH: địch lượt nào cũng đánh trả, còn máu địch thì
      // lượt trượt không đổi.
      await doiToi(async () => (await db.pokeThu.findUnique({ where: { id: t.id } })).mau < 500);
      const tr = await db.pokeTran.findUnique({ where: { nhanVatId: nv.id } });
      const th = await db.pokeThu.findUnique({ where: { id: t.id } });
      if (tr && !tr.lanTruot && !tr.lanChiMang) {
        return { gay: 100_000 - tr.mau, chiu: 500 - th.mau };
      }
    }
    return { gay: -1, chiu: -1 };
  };

  const tran = await danhMotDon();
  // Chiêu 100, thủ địch 30 → gây 70. Công địch 200, bộ thủ 100 → chịu 100.
  check('chưa mặc gì thì sát thương đúng công thức trần',
    tran.gay === 70 && tran.chiu === 100, `gây ${tran.gay}, chịu ${tran.chiu}`);

  await db.pokeDo.updateMany({ where: { nhanVatId: nv.id, ma: vk.ma }, data: { dangMac: true } });
  const co = await danhMotDon();
  check('mặc vũ khí +20 thì gây thêm đúng 20 máu',
    co.gay === tran.gay + 20, `${tran.gay} → ${co.gay}`);
  check('vũ khí không đụng tới sát thương phải chịu',
    co.chiu === tran.chiu, `${tran.chiu} → ${co.chiu}`);

  const khien = await db.pokeHang.findFirst({ where: { loai: 'shield', thu: 20 } });
  await db.pokeDo.create({
    data: {
      nhanVatId: nv.id, ma: khien.ma, ten: khien.ten, loai: 'shield',
      cong: 0, thu: khien.thu, mu: 0, giap: 0, dangMac: true,
    },
  });
  const co2 = await danhMotDon();
  check('mặc thêm khiên +20 thì chịu ít hơn đúng 20 máu',
    co2.chiu === tran.chiu - 20, `${tran.chiu} → ${co2.chiu}`);

  // Mũ và giáp cũng đổ vào bộ thủ.
  const mu = await db.pokeHang.findFirst({ where: { loai: 'golova', mu: 10 } });
  await db.pokeDo.create({
    data: {
      nhanVatId: nv.id, ma: mu.ma, ten: mu.ten, loai: 'golova',
      cong: 0, thu: 0, mu: mu.mu, giap: 0, dangMac: true,
    },
  });
  const co3 = await danhMotDon();
  check('mũ cũng cộng vào bộ thủ',
    co3.chiu === tran.chiu - 30, `${tran.chiu} → ${co3.chiu}`);

  // ── Thuốc ────────────────────────────────────────────────────────────
  await db.pokeThu.update({ where: { id: t.id }, data: { mau: 100 } });
  const thuoc = await db.pokeHang.findFirst({ where: { loai: 'elixir' }, orderBy: { mau: 'asc' } });
  await p.goto(`${BASE}/pokemon/trang-bi`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  // Quầy hàng mở sẵn ở tab vũ khí; thuốc nằm ở tab riêng.
  await p.locator('button:has-text("Thuốc")').first().click();
  await p.waitForTimeout(400);
  await p.locator(`form:has(input[name="ma"][value="${thuoc.ma}"]) input[name="sl"]`).fill('2');
  await p.locator(`form:has(input[name="ma"][value="${thuoc.ma}"]) button:has-text("Mua")`).click();
  await doiToi(async () => (await db.pokeDo.count({ where: { nhanVatId: nv.id, ma: thuoc.ma } })) > 0);
  const loThuoc = await db.pokeDo.findFirst({ where: { nhanVatId: nv.id, ma: thuoc.ma } });
  check('thuốc gộp thành một dòng có số lượng', loThuoc.sl === 2, `sl ${loThuoc.sl}`);

  // NGOÀI trận thì uống không mất gì cả, hồi đúng số ghi trên nhãn.
  await db.pokeTran.deleteMany({ where: { nhanVatId: nv.id } });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator(`form:has(input[name="do"][value="${loThuoc.id}"]) button`).click();
  await doiToi(async () => (await db.pokeThu.findUnique({ where: { id: t.id } })).mau > 100);
  const sauUong = await db.pokeThu.findUnique({ where: { id: t.id } });
  check('ngoài trận, uống thuốc hồi đúng số máu ghi trên nhãn',
    sauUong.mau === 100 + thuoc.mau, `100 + ${thuoc.mau} ≠ ${sauUong.mau}`);
  check('uống xong thì trừ đúng một liều',
    (await db.pokeDo.findUnique({ where: { id: loThuoc.id } })).sl === 1);

  // ── Uống thuốc GIỮA trận thì mất một lượt ────────────────────────────
  // Không tính lượt thì đứng đó uống là bất tử, chỉ số thủ hoá vô nghĩa.
  await db.pokeDo.update({ where: { id: loThuoc.id }, data: { sl: 5 } });
  await db.pokeThu.update({ where: { id: t.id }, data: { mau: 100 } });
  await db.pokeDo.updateMany({ where: { nhanVatId: nv.id }, data: { dangMac: false } });
  await db.pokeTran.create({
    data: {
      nhanVatId: nv.id, nguon: 3, ten: 'Đối thủ', he: 1, nac: 0, khu: 'co',
      cong: 200, thu: 30, mau: 100_000, mauToiDa: 100_000, exp: 1, vang: 1,
    },
  });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator(`form:has(input[name="do"][value="${loThuoc.id}"]) button`).first().click();
  await doiToi(async () => (await db.pokeThu.findUnique({ where: { id: t.id } })).mau !== 100);
  const sauUongTran = await db.pokeThu.findUnique({ where: { id: t.id } });
  // Thú thử có bộ thủ 100, đối thủ công 200 nên đòn trả đúng 100 máu.
  check('giữa trận, uống thuốc rồi bị đánh trả đúng một lượt',
    sauUongTran.mau === 100 + thuoc.mau - 100,
    `${100 + thuoc.mau} - 100 ≠ ${sauUongTran.mau}`);
  check('lượt đánh trả không xoá mất trận',
    (await db.pokeTran.count({ where: { nhanVatId: nv.id } })) === 1);
  await db.pokeTran.deleteMany({ where: { nhanVatId: nv.id } });

  // ── Quyền và giới hạn ────────────────────────────────────────────────
  await db.pokeNhanVat.update({ where: { id: nv.id }, data: { cap: 1, exp: 0 } });
  const dat = await db.pokeHang.findFirst({ where: { loai: 'weapon', cap: 3 } });
  const truocLo = await db.pokeDo.count({ where: { nhanVatId: nv.id } });
  await p.evaluate(async ([base, ma]) => {
    const fd = new FormData(); fd.set('ma', String(ma));
    await fetch(`${base}/pokemon/trang-bi`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'a'.repeat(40) },
    }).catch(() => null);
  }, [BASE, dat.ma]);
  await p.waitForTimeout(1200);
  check('chưa đủ cấp thì máy chủ không bán',
    (await db.pokeDo.count({ where: { nhanVatId: nv.id } })) === truocLo);

  await db.pokeNhanVat.update({ where: { id: nv.id }, data: { cap: 20, vang: 0, ngoc: 0 } });
  await p.evaluate(async ([base, ma]) => {
    const fd = new FormData(); fd.set('ma', String(ma));
    await fetch(`${base}/pokemon/trang-bi`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'b'.repeat(40) },
    }).catch(() => null);
  }, [BASE, dat.ma]);
  await p.waitForTimeout(1200);
  const het = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
  check('không đủ tiền thì không mua được',
    (await db.pokeDo.count({ where: { nhanVatId: nv.id } })) === truocLo);
  check('vàng và ngọc không bao giờ âm', het.vang >= 0 && het.ngoc >= 0,
    `${het.vang} vàng, ${het.ngoc} ngọc`);

  await db.pokeNhanVat.deleteMany({ where: { userId: me.id } });
}
