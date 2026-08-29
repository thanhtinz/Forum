import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Nông trại — trần 40 ô và việc chia trang mảnh ruộng.
 *
 * Mua ô là một chỗ TIÊU ĐIỂM nên phần đáng kiểm nhất không phải giao diện mà
 * là cái trần và chuyện bấm hai lần: `moODat` là hàm export trong tệp
 * `'use server'`, tức một endpoint POST công khai — hai tab bấm cùng lúc là
 * hai lượt gọi thật, không phải chuyện giả tưởng.
 *
 * Phần chia trang kiểm điều NGƯỢC với thói quen: không được bày sẵn cả 40 ô.
 * Người mới có bốn ô thì vẫn đúng một trang, không phải năm trang rỗng.
 *
 * Số ghi thẳng ở đây (40, 8, giá 30 mỗi ô) là số MONG ĐỢI, cố ý không nhập từ
 * `farm-const.ts`: nhập vào thì bài kiểm chỉ còn so hằng số với chính nó, ai
 * sửa trần thành 4 nó cũng xanh.
 */

const TRAN = 40;
const MOI_TRANG = 8;
const GIA_MOI_O = 30;

export default async function run(check) {
  const u = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true, points: true } });
  if (!u) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diemCu = u.points;
  const oCu = await db.farmPlot.findMany({
    where: { userId: u.id },
    select: { index: true, cropId: true, plantedAt: true, readyAt: true, watered: true },
  });

  const soO = async () => db.farmPlot.count({ where: { userId: u.id } });
  const diem = async () =>
    (await db.user.findUnique({ where: { id: u.id }, select: { points: true } })).points;
  const datSoO = async (n) => {
    await db.farmPlot.deleteMany({ where: { userId: u.id } });
    await db.farmPlot.createMany({
      data: Array.from({ length: n }, (_, index) => ({ userId: u.id, index })),
      skipDuplicates: true,
    });
    await db.user.update({ where: { id: u.id }, data: { points: 100000 } });
  };

  const p = await openPage('huytran');
  const mo = async () => {
    await p.goto(`${BASE}/nong-trai`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
  };
  /** Lật tới trang thứ `n` (đếm từ 1) của mảnh ruộng. */
  const laTrang = async (n) => {
    await p.locator(`nav[aria-label="Trang ruộng"] button[aria-label^="Trang ruộng ${n}"]`)
      .first().click();
    await p.waitForTimeout(700);
  };

  try {
    // ── Người mới: bốn ô thì MỘT trang, chưa cần thanh chuyển trang ──────
    await datSoO(4);
    await mo();
    check('mới bốn ô thì chưa hiện thanh chuyển trang',
      (await p.locator('nav[aria-label="Trang ruộng"]').count()) === 0);
    const oBanDau = await p.locator('.farm-o').count();
    check('bốn ô đã mở cộng hàng mời mở rộng, vẫn nằm trong một trang',
      oBanDau <= MOI_TRANG, `bày ra ${oBanDau} ô`);

    // ── Chín ô thì đúng hai trang, trang đầu bày đủ 8 ────────────────────
    await datSoO(9);
    await mo();
    const nut = p.locator('nav[aria-label="Trang ruộng"] button[aria-label^="Trang ruộng "]');
    const soNut = await nut.count();
    check('9 ô thì có đúng hai trang', soNut === 2, `đếm được ${soNut} nút`);

    const t1 = await p.locator('.farm-o').count();
    check('trang đầu bày đúng 8 ô', t1 === MOI_TRANG, `đếm được ${t1}`);
    await laTrang(2);
    const t2 = await p.locator('.farm-o').count();
    check('lật sang trang hai thì bày phần còn lại, ít hơn 8 ô',
      t2 > 0 && t2 < MOI_TRANG, `đếm được ${t2}`);

    // ── Mua một ô: tăng đúng một, trừ đúng giá ───────────────────────────
    // Đúng 8 ô thì ô khoá thứ 9 rơi sang TRANG HAI — nút chuyển trang phải có
    // dấu báo, không thì người chơi không biết ruộng còn mở rộng được.
    await datSoO(8);
    await mo();
    check('ô mở tiếp ở trang sau thì nút trang ấy có dấu báo',
      (await p.locator('button[aria-label*="còn đất mở được"]').count()) === 1);
    await laTrang(2);
    const giaKyVong = 8 * GIA_MOI_O;
    const diemTruoc = await diem();
    await p.locator('button[aria-label^="Mở ô đất số 9"]').first().click();
    await doiToi(async () => (await soO()) === 9);
    check('mua được thì số ô tăng đúng một', (await soO()) === 9, `đang là ${await soO()}`);
    const daTru = diemTruoc - (await diem());
    check('và trừ đúng giá của ô ấy', daTru === giaKyVong, `trừ ${daTru}, đáng lẽ ${giaKyVong}`);

    // ── Bấm hai lần thật nhanh chỉ được mở MỘT ô ─────────────────────────
    // Đây là chỗ đua thật: hai lượt gọi cùng lúc mà đọc-rồi-ghi thì cả hai
    // cùng thấy "chưa kịch trần" và cùng tạo ô.
    await datSoO(20);
    await mo();
    await laTrang(3);
    const truocDua = await diem();
    const nutMua = p.locator('button[aria-label^="Mở ô đất số 21"]').first();
    await Promise.all([
      nutMua.click({ force: true }),
      nutMua.click({ force: true }).catch(() => {}),
    ]);
    await doiToi(async () => (await soO()) > 20);
    await p.waitForTimeout(2500);
    check('bấm hai lần chỉ mở được một ô', (await soO()) === 21, `đang là ${await soO()}`);
    check('và chỉ trừ tiền một lần',
      truocDua - (await diem()) === 20 * GIA_MOI_O,
      `trừ ${truocDua - (await diem())}, đáng lẽ ${20 * GIA_MOI_O}`);

    // ── Kịch trần: hết ô để mua, và không có đường nào tăng thêm ─────────
    await datSoO(TRAN);
    await mo();
    const diemTran = await diem();
    check(`mở đủ ${TRAN} ô thì không còn ô khoá nào để mua`,
      (await p.locator('button[aria-label^="Mở ô đất số"]').count()) === 0);
    check('kịch trần thì thanh chuyển trang có đủ 5 trang',
      (await p.locator('nav[aria-label="Trang ruộng"] button[aria-label^="Trang ruộng "]').count())
        === TRAN / MOI_TRANG);
    // Cả 40 ô KHÔNG được bày cùng lúc — đó là lý do chia trang.
    const bayRa = await p.locator('.farm-o').count();
    check('kịch trần vẫn chỉ bày 8 ô một trang', bayRa === MOI_TRANG, `bày ra ${bayRa} ô`);
    check('kịch trần thì số ô không tự tăng', (await soO()) === TRAN, `đang là ${await soO()}`);
    check('và điểm không bị trừ thêm', (await diem()) === diemTran);
  } finally {
    await db.farmPlot.deleteMany({ where: { userId: u.id } });
    if (oCu.length) {
      await db.farmPlot.createMany({
        data: oCu.map((o) => ({ userId: u.id, ...o })),
        skipDuplicates: true,
      });
    }
    await db.user.update({ where: { id: u.id }, data: { points: diemCu } });
  }
}
