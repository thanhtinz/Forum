import { BASE, db, openPage, doiToi } from '../helpers.mjs';
import { MOC_SUU_TAM, mocDatDuoc } from '../../src/lib/rong-const.ts';

/**
 * Sổ sưu tầm của Đảo Rồng và mốc thưởng.
 *
 * Hai chỗ dễ hỏng nhất, và bài này bám vào đúng hai chỗ ấy:
 *
 *   • ĐẾM TRÙNG — sổ tính theo CẶP loài+màu chứ không theo số con nuôi, nên nở
 *     con thứ hai y hệt con thứ nhất thì sổ phải đứng yên. Đếm nhầm ở đây là
 *     người chơi mua sáu quả trứng ra sáu con giống nhau vẫn ăn mốc mười con.
 *   • LĨNH HAI LẦN — mốc thưởng phát điểm thật, mà hàm lĩnh là một endpoint
 *     POST công khai. Bấm hai lần thật nhanh chỉ được ăn một lần.
 */
export default async function run(check) {
  const u = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!u) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diem = async () =>
    (await db.user.findUnique({ where: { id: u.id }, select: { points: true } }))?.points ?? 0;

  const rongCu = await db.rong.count({ where: { userId: u.id } });
  const hoCu = await db.rongNguoiChoi.findUnique({
    where: { userId: u.id }, select: { daSuuTam: true, mocDaNhan: true },
  });
  const diemCu = await diem();

  const wipe = async () => {
    await db.rongTran.deleteMany({ where: { OR: [{ a: { userId: u.id } }, { b: { userId: u.id } }] } });
    await db.rong.deleteMany({ where: { userId: u.id } });
    await db.rongNguoiChoi.deleteMany({ where: { userId: u.id } });
  };

  // ── Phần thuần: bảng mốc phải tự nhất quán ────────────────────────────
  check('mốc xếp tăng dần', MOC_SUU_TAM.every((m, i) => i === 0 || m.so > MOC_SUU_TAM[i - 1].so));
  check('thưởng cũng tăng dần', MOC_SUU_TAM.every((m, i) => i === 0 || m.thuong > MOC_SUU_TAM[i - 1].thuong));
  check('chưa con nào thì chưa mốc nào', mocDatDuoc(0) === 0);
  check('đủ mốc cuối thì đạt hết', mocDatDuoc(MOC_SUU_TAM.at(-1).so) === MOC_SUU_TAM.length,
    `${mocDatDuoc(MOC_SUU_TAM.at(-1).so)}/${MOC_SUU_TAM.length}`);
  check('sát dưới mốc đầu thì vẫn chưa đạt', mocDatDuoc(MOC_SUU_TAM[0].so - 1) === 0);

  await wipe();
  try {
    const luc = new Date();
    const noRa = (loai, mau) => db.rong.create({
      data: { userId: u.id, loai, mau, cap: 1, vui: 60, vuiTinhAt: luc, apXongAt: luc, noAt: luc },
      select: { id: true },
    });

    // ── Mở sổ lần đầu: hồ sơ tự sinh, đếm đúng số cặp ───────────────────
    await noRa(1, 1);
    await noRa(1, 1); // TRÙNG hệt con trên
    await noRa(2, 3);

    const p = await openPage('minhdev');
    await p.goto(`${BASE}/rong/so-suu-tam`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);

    await doiToi(async () => (await db.rongNguoiChoi.count({ where: { userId: u.id } })) > 0);
    const ho = await db.rongNguoiChoi.findUnique({
      where: { userId: u.id }, select: { daSuuTam: true, mocDaNhan: true },
    });
    check('mở sổ lần đầu thì hồ sơ tự sinh', !!ho);
    check('ba con nhưng chỉ hai CẶP loài+màu', ho?.daSuuTam === 2, `đếm ${ho?.daSuuTam}`);
    check('chưa lĩnh mốc nào', ho?.mocDaNhan === 0);

    const chuSo = await p.locator('main').innerText();
    check('sổ nói đúng số con đã có', chuSo.includes(`${2}`) && chuSo.includes('54'));
    check('chưa tới mốc thì không có nút lĩnh',
      (await p.locator('button:has-text("Lĩnh thưởng")').count()) === 0);

    // ── Đủ mốc đầu tiên ─────────────────────────────────────────────────
    const mocDau = MOC_SUU_TAM[0];
    // Nở cho đủ mốc đầu bằng những cặp KHÁC nhau.
    let da = 2;
    for (let loai = 3; loai <= 9 && da < mocDau.so; loai++) {
      for (let mau = 1; mau <= 6 && da < mocDau.so; mau++) {
        await noRa(loai, mau);
        da += 1;
      }
    }

    await p.goto(`${BASE}/rong/so-suu-tam`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await doiToi(async () =>
      (await db.rongNguoiChoi.findUnique({ where: { userId: u.id }, select: { daSuuTam: true } }))?.daSuuTam === mocDau.so);
    check('mở lại sổ thì cột đếm tự sửa cho khớp bảng',
      (await db.rongNguoiChoi.findUnique({ where: { userId: u.id }, select: { daSuuTam: true } }))?.daSuuTam === mocDau.so);

    const truoc = await diem();
    await p.locator('button:has-text("Lĩnh thưởng")').click();
    await doiToi(async () =>
      (await db.rongNguoiChoi.findUnique({ where: { userId: u.id }, select: { mocDaNhan: true } }))?.mocDaNhan === 1);
    check('lĩnh mốc thì cộng đúng số điểm thưởng',
      (await diem()) === truoc + mocDau.thuong, `${truoc} → ${await diem()}`);

    // ── Lĩnh lần hai không ăn thêm ──────────────────────────────────────
    const truoc2 = await diem();
    await p.goto(`${BASE}/rong/so-suu-tam`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    await p.evaluate(() => { for (const el of document.querySelectorAll('button:disabled')) el.disabled = false; });
    const nut = p.locator('button:has-text("Lĩnh thưởng")');
    if (await nut.count()) { await nut.first().click(); await p.waitForTimeout(1500); }
    check('mốc đã lĩnh thì không lĩnh lại được', (await diem()) === truoc2,
      `${truoc2} → ${await diem()}`);
    check('và số mốc đã lĩnh vẫn là 1',
      (await db.rongNguoiChoi.findUnique({ where: { userId: u.id }, select: { mocDaNhan: true } }))?.mocDaNhan === 1);

    // ── Thả rồng KHÔNG làm mất sổ ───────────────────────────────────────
    await db.rong.deleteMany({ where: { userId: u.id, loai: 1 } });
    await p.goto(`${BASE}/rong/so-suu-tam`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    const sauTha = await db.rongNguoiChoi.findUnique({
      where: { userId: u.id }, select: { daSuuTam: true, mocDaNhan: true },
    });
    check('thả rồng thì sổ hụt đi đúng số cặp đã mất', sauTha?.daSuuTam === mocDau.so - 1,
      `còn ${sauTha?.daSuuTam}`);
    check('nhưng mốc đã lĩnh thì không đòi lại', sauTha?.mocDaNhan === 1);
  } finally {
    await wipe();
    if (rongCu === 0 && hoCu) {
      await db.rongNguoiChoi.create({
        data: { userId: u.id, daSuuTam: hoCu.daSuuTam, mocDaNhan: hoCu.mocDaNhan },
      });
    }
    await db.user.update({ where: { id: u.id }, data: { points: diemCu } });
  }
}
