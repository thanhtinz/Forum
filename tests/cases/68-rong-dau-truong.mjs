import { BASE, db, openPage, doiToi } from '../helpers.mjs';
import { LECH_CAP, SO_HIEP, chiSo, danhNhau } from '../../src/lib/rong-const.ts';

/**
 * Đấu trường Đảo Rồng: luật đánh, ghép đối thủ, và màn kể lại trận.
 *
 * `danhNhau` có sẵn tham số `tungXu` để bơm ngẫu nhiên vào — trước nay không
 * bài kiểm nào dùng, nên luật đánh chưa từng được chốt lấy một lần. Bài này
 * bơm số cố định để kiểm đúng ba điều: né là né hẳn, mạnh hơn thì thắng, và
 * trận không bao giờ dài quá số hiệp đã định.
 */
const KHOA = 'kiemthu-dau-rong';

export default async function run(check) {
  // ── Luật đánh, không cần cơ sở dữ liệu ────────────────────────────────
  const yeu = { cong: 10, thu: 5, nhanh: 10 };
  const manh = { cong: 40, thu: 30, nhanh: 10 };

  const giua = () => 0.5;
  const kq = danhNhau(manh, yeu, giua);
  check('con mạnh hơn hẳn thì thắng', kq.ai === 'a', `ra ${kq.ai}`);
  check('trận không dài quá số hiệp đã định', kq.dienBien.length <= SO_HIEP,
    `${kq.dienBien.length} hiệp`);
  check('cùng một chuỗi tung xu thì ra cùng một kết quả',
    JSON.stringify(danhNhau(manh, yeu, giua)) === JSON.stringify(kq));

  // Đảo hai bên thì kết quả phải đảo theo — công thức không thiên vị chỗ đứng.
  check('đổi chỗ hai bên thì bên thắng cũng đổi theo',
    danhNhau(yeu, manh, giua).ai === 'b');

  // Né: bên B nhanh hơn hẳn, mà tung xu luôn ra 0 thì lần nào cũng né.
  const chamKhoe = { cong: 20, thu: 10, nhanh: 1 };
  const nhanhNhu = { cong: 20, thu: 10, nhanh: 40 };
  const neHet = danhNhau(chamKhoe, nhanhNhu, () => 0);
  check('chênh lệch nhanh đủ lớn và xui thì né sạch mọi đòn',
    neHet.dienBien.every((h) => h.aDanh === 0), JSON.stringify(neHet.dienBien));

  // Vui thấp thì đánh yếu hơn — đó là lý do việc chăm rồng có nghĩa.
  const no = chiSo({ loai: 1, cap: 10, vui: 100 });
  const doi = chiSo({ loai: 1, cap: 10, vui: 0 });
  check('rồng bị bỏ đói đánh yếu hơn hẳn rồng được chăm',
    no.cong > doi.cong && no.thu > doi.thu, `${no.cong} vs ${doi.cong}`);

  // ── Phần chạy thật ────────────────────────────────────────────────────
  const a = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const b = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!a || !b) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diemCu = {};
  for (const u of [a, b]) {
    diemCu[u.id] = (await db.user.findUnique({ where: { id: u.id }, select: { points: true } }))?.points ?? 0;
  }

  const wipe = async () => {
    await db.rongTran.deleteMany({ where: { OR: [{ a: { userId: { in: [a.id, b.id] } } }, { b: { userId: { in: [a.id, b.id] } } }] } });
    await db.rong.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.rongNguoiChoi.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.rongLuotDau.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
  };
  await wipe();

  try {
    await db.user.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { points: 3000 } });

    const luc = new Date();
    const noRa = (userId, loai, mau, cap, ten, raTran = false) => db.rong.create({
      data: { userId, loai, mau, cap, vui: 90, vuiTinhAt: luc, apXongAt: luc, noAt: luc, raTran, ten },
      select: { id: true, cap: true },
    });

    const cuaToi = await noRa(a.id, 5, 2, 10, `${KHOA} cua toi`, true);
    // Ba đối thủ: một sát cấp, một hơi lệch, một lệch hẳn ngoài khoảng.
    const gan = await noRa(b.id, 2, 3, 10, `${KHOA} sat cap`, true);
    await noRa(b.id, 3, 4, 10 + LECH_CAP, `${KHOA} hoi lech`, true);
    await noRa(b.id, 6, 5, 10 + LECH_CAP + 12, `${KHOA} lech han`, true);

    const p = await openPage('minhdev');
    await p.goto(`${BASE}/rong/dau-truong`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);

    // ── Ghép đối thủ theo cấp ───────────────────────────────────────────
    const nutDau = p.locator('button:has-text("Đấu")');
    check('có đối thủ để đánh', (await nutDau.count()) > 0);

    const chuSan = await p.locator('main').innerText();
    check('đối thủ sát cấp đứng đầu danh sách',
      chuSan.indexOf(`${KHOA} sat cap`) < chuSan.indexOf(`${KHOA} lech han`),
      'con lệch hẳn lại đứng trên con sát cấp');

    // ── Đánh một trận, và màn kể lại trận phải hiện ra ──────────────────
    await nutDau.first().click();
    await doiToi(async () => (await db.rongTran.count({ where: { aId: cuaToi.id } })) > 0);
    await p.waitForTimeout(3500); // để màn kể diễn hết mấy hiệp

    const tran = await db.rongTran.findFirst({
      where: { aId: cuaToi.id }, orderBy: { createdAt: 'desc' },
      select: { dienBien: true, bId: true, thangId: true },
    });
    check('đánh đúng con sát cấp chứ không phải con lệch hẳn', tran?.bId === gan.id);
    check('trận có ghi diễn biến từng hiệp',
      Array.isArray(tran?.dienBien) && tran.dienBien.length > 0);
    check('mỗi hiệp đều có đủ máu hai bên',
      tran.dienBien.every((h) => typeof h.aMau === 'number' && typeof h.bMau === 'number'),
      JSON.stringify(tran?.dienBien)?.slice(0, 100));

    const chuSau = await p.locator('main').innerText();
    check('màn kể lại trận hiện ra sau khi đánh',
      /thắng|thua|Bất phân thắng bại/.test(chuSau), chuSau.slice(0, 160));

    // ── Sổ trận đã đánh ─────────────────────────────────────────────────
    await p.goto(`${BASE}/rong/dau-truong`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    const chuSo = await p.locator('main').innerText();
    check('sổ trận đã đánh có tên hai con vừa đấu',
      chuSo.includes('Trận đã đánh') && chuSo.includes(`${KHOA} cua toi`));

    // ── Không cử con nào ra trận thì không có đối thủ nào ───────────────
    await db.rong.updateMany({ where: { userId: a.id }, data: { raTran: false } });
    await p.goto(`${BASE}/rong/dau-truong`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    check('chưa cử rồng thì không bày đối thủ nào',
      (await p.locator('button:has-text("Đấu")').count()) === 0);
  } finally {
    await wipe();
    for (const [id, diem] of Object.entries(diemCu)) {
      await db.user.update({ where: { id }, data: { points: diem } });
    }
  }
}
