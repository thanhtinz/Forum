import { BASE, db, doiToi, openPage } from '../helpers.mjs';
import { BANG_NANG_CAP, bacNangBangKe, congBang } from '../../src/lib/pokemon-const.ts';

/**
 * Chỉ số bang hết là số chết.
 *
 * Bản gốc dựng đủ hai cột `cong`/`thu` cho bang hội và bày ra trang bang
 * ("chỉ số bang: công 10, thủ 10") — rồi KHÔNG trận nào cộng chúng vào đâu, và
 * cũng không có đường nào tăng chúng lên. Đúng loại lỗi như bộ trang bị của
 * bản gốc: bán ba mươi tám món rồi chẳng cộng vào sát thương.
 *
 * Cột `ngoc` của quỹ bang cũng vậy: dựng ra rồi không bao giờ cộng vào lẫn
 * trừ ra.
 */
export default async function run(check) {
  // ── Phần luật thuần ──────────────────────────────────────────────────
  check('không ở bang nào thì không cộng gì',
    congBang(null).cong === 0 && congBang(undefined).thu === 0);
  check('ở bang thì cộng đúng chỉ số của bang',
    congBang({ cong: 30, thu: 40 }).cong === 30 && congBang({ cong: 30, thu: 40 }).thu === 40);

  check('bậc nâng tăng dần, không bậc nào rẻ hơn bậc trước',
    BANG_NANG_CAP.every((b, i) => i === 0
      || (b.cong > BANG_NANG_CAP[i - 1].cong && b.vang > BANG_NANG_CAP[i - 1].vang)));
  check('bang mới lập thì bậc kế tiếp là bậc một', bacNangBangKe(10)?.moc === 1);
  check('kịch bậc thì không còn bậc nào để nâng',
    bacNangBangKe(BANG_NANG_CAP[BANG_NANG_CAP.length - 1].cong) === null);

  // ── Trong trận thật ──────────────────────────────────────────────────
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const khac = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!me || !khac) { check('có dữ liệu mẫu', false, 'thiếu minhdev hoặc huytran'); return; }

  await db.pokeNhanVat.deleteMany({ where: { userId: { in: [me.id, khac.id] } } });
  await db.pokeBang.deleteMany({ where: { ten: { startsWith: 'BangKiem' } } });

  const nv = await db.pokeNhanVat.create({
    data: { userId: me.id, ten: 'ChiSoBang', cap: 30, sk: 200, skToiDa: 200, khu: 'co' },
  });
  const con = await db.pokeThu.create({
    data: {
      nhanVatId: nv.id, ten: 'Con Đo', nguon: 3, he: 1, mau: 9000, mauToiDa: 9000,
      c1: 400, c2: 400, c3: 400, c4: 400, chieu: ['TACKLE', 'TACKLE', 'TACKLE', 'TACKLE'],
    },
  });
  await db.pokeNhanVat.update({ where: { id: nv.id }, data: { raTranId: con.id } });

  const p = await openPage('minhdev');
  try {
    /** Đánh cho tới khi được một lượt thường, trả về số máu địch mất. */
    const doMotDon = async () => {
      for (let lan = 0; lan < 25; lan++) {
        await db.pokeTran.deleteMany({ where: { nhanVatId: nv.id } });
        await db.pokeThu.update({ where: { id: con.id }, data: { mau: 9000 } });
        await db.pokeTran.create({
          data: {
            nhanVatId: nv.id, khu: 'co', nguon: 1, ten: 'Bia', he: 1,
            cong: 100, thu: 50, mau: 500_000, mauToiDa: 500_000, exp: 1, vang: 1,
            chieu: ['TACKLE', 'TACKLE', 'TACKLE', 'TACKLE'],
          },
        });
        await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
        await doiToi(async () => (await p.locator('form button[name="chieu"]').count()) > 0);
        await p.waitForTimeout(900);
        await p.locator('form button[name="chieu"]').first().click();
        await doiToi(async () => (await db.pokeThu.findUnique({ where: { id: con.id } })).mau < 9000);
        const tr = await db.pokeTran.findUnique({ where: { nhanVatId: nv.id } });
        if (tr && !tr.lanTruot && !tr.lanChiMang) return 500_000 - tr.mau;
      }
      return -1;
    };

    // Chiêu 400 − thủ địch 50 = 350, cùng hệ nên không nhân hệ số.
    const khongBang = await doMotDon();
    check('chưa vào bang thì gây đúng công thức trần', khongBang === 350, String(khongBang));

    const bang = await db.pokeBang.create({
      data: { ten: 'BangKiem', truongId: nv.id, cong: 10, thu: 10, vang: 0, ngoc: 0 },
    });
    await db.pokeNhanVat.update({ where: { id: nv.id }, data: { bangId: bang.id } });

    const coBang = await doMotDon();
    check('vào bang thì chỉ số bang cộng thẳng vào sát thương',
      coBang === khongBang + 10, `${khongBang} → ${coBang}`);

    // ── Nâng bậc bằng quỹ ────────────────────────────────────────────
    const bac1 = BANG_NANG_CAP[0];
    await db.pokeBang.update({
      where: { id: bang.id }, data: { vang: bac1.vang, ngoc: bac1.ngoc },
    });
    await p.goto(`${BASE}/pokemon/bang`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await p.locator('button:has-text("Nâng lên bậc")').count()) > 0);
    await p.waitForTimeout(900);
    check('trang bang có nút nâng chỉ số',
      (await p.locator('button:has-text("Nâng lên bậc")').count()) === 1);
    check('trang bang nói rõ chỉ số cộng vào đâu',
      (await p.locator('text=/cộng thẳng vào mọi trận/').count()) > 0);

    await p.locator('button:has-text("Nâng lên bậc")').click();
    await doiToi(async () => (await db.pokeBang.findUnique({ where: { id: bang.id } }))?.cong === bac1.cong);
    const sauNang = await db.pokeBang.findUnique({ where: { id: bang.id } });
    check('nâng được lên bậc một', sauNang.cong === bac1.cong && sauNang.thu === bac1.thu,
      `công ${sauNang.cong}, thủ ${sauNang.thu}`);
    check('quỹ trừ đúng số vàng và ngọc của bậc ấy',
      sauNang.vang === 0 && sauNang.ngoc === 0, `${sauNang.vang} vàng, ${sauNang.ngoc} ngọc`);

    const sauNangDon = await doMotDon();
    check('nâng xong thì sát thương lên theo',
      sauNangDon === khongBang + bac1.cong, `${sauNangDon}, đáng lẽ ${khongBang + bac1.cong}`);

    // Quỹ đã cạn: bấm nữa không được, và chỉ số không nhảy thêm bậc.
    await p.goto(`${BASE}/pokemon/bang`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await p.locator('button:has-text("Nâng lên bậc")').count()) > 0);
    await p.waitForTimeout(900);
    await p.locator('button:has-text("Nâng lên bậc")').click();
    await doiToi(async () => (await p.locator('text=/Quỹ bang không đủ/').count()) > 0);
    const quyCan = await db.pokeBang.findUnique({ where: { id: bang.id } });
    check('quỹ không đủ thì không nâng được', quyCan.cong === bac1.cong, `công ${quyCan.cong}`);
    check('quỹ không bao giờ âm', quyCan.vang >= 0 && quyCan.ngoc >= 0);

    // ── Góp ngọc vào quỹ — cột ngọc trước đây chưa từng được đụng tới ──
    await db.pokeNhanVat.update({ where: { id: nv.id }, data: { ngoc: 50 } });
    await p.goto(`${BASE}/pokemon/bang`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await p.locator('select[name="kho"]').count()) > 0);
    await p.waitForTimeout(900);
    await p.selectOption('select[name="kho"]', 'ngoc');
    await p.fill('input[name="so"]', '30');
    await p.locator('button[name="huong"][value="gop"]').click();
    await doiToi(async () => (await db.pokeBang.findUnique({ where: { id: bang.id } }))?.ngoc === 30);
    const sauGop = await db.pokeBang.findUnique({ where: { id: bang.id } });
    const toiSauGop = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
    check('góp được ngọc vào quỹ bang', sauGop.ngoc === 30, String(sauGop.ngoc));
    check('góp ngọc thì trừ đúng ngọc của mình', toiSauGop.ngoc === 20, String(toiSauGop.ngoc));

    // ── Quyền: người không phải trưởng bang không nâng được ───────────
    const nvKhac = await db.pokeNhanVat.create({
      data: { userId: khac.id, ten: 'BangThanhVien', cap: 30, khu: 'co', bangId: bang.id },
    });
    await db.pokeBang.update({ where: { id: bang.id }, data: { vang: 999_999, ngoc: 999 } });
    const q = await openPage('huytran');
    await q.goto(`${BASE}/pokemon/bang`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await q.locator('button:has-text("Nâng lên bậc")').count()) > 0);
    check('thành viên thường thấy nút nâng nhưng bị khoá',
      await q.locator('button:has-text("Nâng lên bậc")').first().isDisabled());

    const congTruoc = (await db.pokeBang.findUnique({ where: { id: bang.id } })).cong;
    await q.evaluate(async (base) => {
      await fetch(`${base}/pokemon/bang`, {
        method: 'POST', body: new FormData(), headers: { 'Next-Action': 'e'.repeat(40) },
      }).catch(() => null);
    }, BASE);
    await q.waitForTimeout(1200);
    const congSau = (await db.pokeBang.findUnique({ where: { id: bang.id } })).cong;
    check('gọi thẳng máy chủ, thành viên thường vẫn không nâng được bang',
      congSau === congTruoc, `${congTruoc} → ${congSau}`);

    await db.pokeNhanVat.deleteMany({ where: { id: nvKhac.id } });
  } finally {
    await db.pokeTran.deleteMany({ where: { nhanVatId: nv.id } });
    await db.pokeNhanVat.deleteMany({ where: { userId: { in: [me.id, khac.id] } } });
    await db.pokeBang.deleteMany({ where: { ten: { startsWith: 'BangKiem' } } });
  }
}
