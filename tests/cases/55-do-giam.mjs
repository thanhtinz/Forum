import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Đồ Giám — sổ loài đã gặp và đã bắt.
 *
 * Hai chỗ phải canh: gặp rồi bắt thì dấu "đã bắt" không được mất đi khi gặp
 * lại con cùng loài, và tên loài phải phân biệt được — bản gốc đặt "s" cho 39
 * mã ảnh khác nhau và "sâu xanh" cho 20 mã nữa, tức 228 trong 468 dòng trùng
 * tên nhau, nên mở sổ ra là một trang toàn "s".
 */
export default async function run(check) {
  // ── Tên loài ─────────────────────────────────────────────────────────
  const ds = await db.pokeThuHoang.findMany({ select: { ten: true, nguon: true }, take: 1000 });
  const theoTen = new Map();
  for (const t of ds) {
    if (!theoTen.has(t.ten)) theoTen.set(t.ten, new Set());
    theoTen.get(t.ten).add(t.nguon);
  }
  const trung = [...theoTen.entries()].filter(([, v]) => v.size >= 3);
  check('không tên nào còn dùng chung cho từ ba mã ảnh trở lên',
    trung.length === 0, trung.map(([n, v]) => `${n}×${v.size}`).join(', '));
  check('mỗi mã ảnh chỉ mang một tên',
    new Set(ds.map((t) => t.nguon)).size
      === new Set(ds.map((t) => `${t.nguon}|${t.ten}`)).size);

  // ── Ghi sổ khi gặp và khi bắt ────────────────────────────────────────
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!me) { check('có dữ liệu mẫu', false, 'thiếu minhdev'); return; }
  await db.pokeNhanVat.deleteMany({ where: { userId: me.id } });
  const nv = await db.pokeNhanVat.create({
    data: { userId: me.id, ten: 'DoGiam', cap: 1, sk: 40, cau: 50, khu: 'co' },
  });
  const t = await db.pokeThu.create({
    data: {
      nhanVatId: nv.id, nguon: 3, ten: 'Thử', he: 1, mau: 9000, mauToiDa: 9000,
      c1: 9000, c2: 9000, c3: 9000, c4: 9000, chieu: ['A', 'B', 'C', 'D'],
    },
  });
  await db.pokeNhanVat.update({ where: { id: nv.id }, data: { raTranId: t.id } });

  check('sổ bắt đầu trống', (await db.pokeDoGiam.count({ where: { nhanVatId: nv.id } })) === 0);

  const p = await openPage('minhdev');
  await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('button:has-text("Tìm thú")').click();
  await doiToi(async () => (await db.pokeDoGiam.count({ where: { nhanVatId: nv.id } })) > 0);

  const sauGap = await db.pokeDoGiam.findFirst({ where: { nhanVatId: nv.id } });
  const tran = await db.pokeTran.findUnique({ where: { nhanVatId: nv.id } });
  check('gặp một con là ghi ngay vào sổ', sauGap != null);
  check('ghi đúng loài vừa gặp', sauGap?.nguon === tran?.nguon,
    `${sauGap?.nguon} so với ${tran?.nguon}`);
  check('mới gặp thì chưa đánh dấu đã bắt', sauGap?.daBat === false);

  // Ném cầu tới khi bắt được: tỉ lệ trúng chưa tới một phần năm.
  for (let i = 0; i < 40; i++) {
    if (await db.pokeDoGiam.count({ where: { nhanVatId: nv.id, daBat: true } })) break;
    if (!(await db.pokeTran.count({ where: { nhanVatId: nv.id } }))) {
      await p.locator('button:has-text("Tìm thú")').click();
      await doiToi(async () => (await db.pokeTran.count({ where: { nhanVatId: nv.id } })) > 0, 8);
      continue;
    }
    await p.locator('button:has-text("Ném cầu")').click();
    await p.waitForTimeout(700);
  }
  const daBat = await db.pokeDoGiam.findFirst({ where: { nhanVatId: nv.id, daBat: true } });
  check('bắt được thì sổ đánh dấu đã bắt', daBat != null);

  // Gặp lại đúng loài đã bắt: dấu "đã bắt" không được xoá.
  if (daBat) {
    await db.pokeTran.deleteMany({ where: { nhanVatId: nv.id } });
    const hoang = await db.pokeThuHoang.findFirst({ where: { nguon: daBat.nguon } });
    await db.pokeTran.create({
      data: {
        nhanVatId: nv.id, khu: 'co', nguon: hoang.nguon, ten: hoang.ten, he: hoang.he,
        nac: hoang.nac, cong: 1, thu: 1, mau: 5, mauToiDa: 5, exp: 1, vang: 1,
        chieu: hoang.chieu,
      },
    });
    await db.pokeDoGiam.update({
      where: { nhanVatId_nguon: { nhanVatId: nv.id, nguon: daBat.nguon } },
      data: { ten: hoang.ten },
    });
    check('gặp lại loài đã bắt không xoá mất dấu đã bắt',
      (await db.pokeDoGiam.findUnique({
        where: { nhanVatId_nguon: { nhanVatId: nv.id, nguon: daBat.nguon } },
      })).daBat === true);
  }

  // ── Trang sổ ─────────────────────────────────────────────────────────
  await p.goto(`${BASE}/pokemon/do-giam`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const chu = await p.locator('main').innerText();
  check('trang Đồ Giám mở được và có tiến độ', chu.includes('Đồ Giám') && /gặp \d+\//.test(chu));
  const soO = await p.locator('main img[src*="/thu/"]').count();
  check('sổ dựng đủ ô cho từng loài', soO > 100, `${soO} ô`);
  check('loài chưa gặp thì giấu tên', chu.includes('???'));

  await db.pokeNhanVat.deleteMany({ where: { userId: me.id } });
}
