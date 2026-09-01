import { BASE, db, openPage, doiToi } from '../helpers.mjs';
import {
  LUC_HOI_MOI_GIO, NGUONG_CHO_AN, NO_MOI_BUA, NO_TUT_MOI_GIO, THE_LUC_CHOI,
  TOI_DA_CHAM, VUI_TUT_MOI_GIO, chiSo, noHienGio, theLucHienGio, vuiHienGio,
} from '../../src/lib/rong-const.ts';

/**
 * Ba trục chăm sóc của Đảo Rồng: vui, no, thể lực.
 *
 * Cả ba đều tính LÚC ĐỌC từ một cặp "giá trị + mốc", không có tác vụ nền nào
 * ghi giảm dần. Nên chỗ đáng canh nhất là phép tính thuần ấy: bài này viết lại
 * công thức trong chính bài kiểm rồi so, chứ không gọi hàm ứng dụng để đối
 * chiếu với chính nó.
 *
 * Chỗ thứ hai là hai cái CHẶN mới. Trước đây cho ăn và chơi bị chặn bằng hẹn
 * giờ; nay chặn bằng chính độ no và thể lực. Cả hai đều là endpoint POST công
 * khai nên phải chặn ở máy chủ, không phải ở cái nút mờ đi.
 */
const KHOA = 'kiemthu-cham-soc';
const GIO = 3_600_000;

export default async function run(check) {
  // ── Phép tính thuần ───────────────────────────────────────────────────
  const moc = Date.now();

  check('chưa trôi giờ nào thì ba trục giữ nguyên',
    vuiHienGio(60, moc, moc) === 60
    && noHienGio(60, moc, moc) === 60
    && theLucHienGio(60, moc, moc) === 60);

  check('vui tụt đúng nhịp đã định',
    vuiHienGio(100, moc, moc + 5 * GIO) === 100 - 5 * VUI_TUT_MOI_GIO,
    String(vuiHienGio(100, moc, moc + 5 * GIO)));
  check('no tụt đúng nhịp đã định',
    noHienGio(100, moc, moc + 5 * GIO) === 100 - 5 * NO_TUT_MOI_GIO,
    String(noHienGio(100, moc, moc + 5 * GIO)));
  check('thể lực thì HỒI chứ không tụt',
    theLucHienGio(20, moc, moc + 5 * GIO) === 20 + 5 * LUC_HOI_MOI_GIO,
    String(theLucHienGio(20, moc, moc + 5 * GIO)));

  check('bỏ bê cả năm trăm giờ cũng không tụt xuống âm',
    vuiHienGio(100, moc, moc + 500 * GIO) === 0
    && noHienGio(100, moc, moc + 500 * GIO) === 0);
  check('thể lực hồi mãi cũng không vượt trần',
    theLucHienGio(50, moc, moc + 500 * GIO) === TOI_DA_CHAM);
  check('mốc nằm ở tương lai thì không tự cộng thêm gì',
    vuiHienGio(60, moc + 10 * GIO, moc) === 60
    && theLucHienGio(60, moc + 10 * GIO, moc) === 60);

  // ── Đói và buồn đều làm yếu, nhưng đói nhẹ tay hơn ────────────────────
  const day = chiSo({ loai: 1, cap: 20, vui: 100, doNo: 100 });
  const buon = chiSo({ loai: 1, cap: 20, vui: 0, doNo: 100 });
  const doi = chiSo({ loai: 1, cap: 20, vui: 100, doNo: 0 });
  const teHet = chiSo({ loai: 1, cap: 20, vui: 0, doNo: 0 });

  check('con được chăm đủ mạnh nhất', day.cong > buon.cong && day.cong > doi.cong,
    `đủ ${day.cong}, buồn ${buon.cong}, đói ${doi.cong}`);
  check('buồn phạt nặng hơn đói', buon.cong < doi.cong,
    `buồn ${buon.cong} vs đói ${doi.cong}`);
  check('bỏ bê cả hai thì yếu nhất', teHet.cong < buon.cong && teHet.cong < doi.cong,
    String(teHet.cong));
  check('nhưng không bao giờ tụt xuống dưới 1', teHet.cong >= 1 && teHet.thu >= 1);
  check('không truyền độ no thì tính như đang no đủ',
    chiSo({ loai: 1, cap: 20, vui: 100 }).cong === day.cong);

  // ── Phần chạy thật ────────────────────────────────────────────────────
  const u = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!u) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diem = async () =>
    (await db.user.findUnique({ where: { id: u.id }, select: { points: true } }))?.points ?? 0;
  const diemCu = await diem();
  const wipe = async () => {
    await db.rongTran.deleteMany({ where: { OR: [{ a: { userId: u.id } }, { b: { userId: u.id } }] } });
    await db.rong.deleteMany({ where: { userId: u.id } });
  };
  await wipe();

  try {
    await db.user.update({ where: { id: u.id }, data: { points: 3000 } });
    const luc = new Date();
    const tao = (them = {}) => db.rong.create({
      data: {
        userId: u.id, loai: 1, mau: 2, cap: 5, vui: 50, vuiTinhAt: luc,
        doNo: 40, noTinhAt: luc, theLuc: 100, lucTinhAt: luc,
        apXongAt: luc, noAt: luc, ten: `${KHOA} con`, ...them,
      },
      select: { id: true },
    });
    const rong = await tao();

    const p = await openPage('minhdev');
    const mo = async () => {
      await p.goto(`${BASE}/rong`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(600);
    };
    await mo();

    const chu = await p.locator('main').innerText();
    check('thẻ rồng bày đủ ba trục', /No\s/.test(chu) && /Vui/.test(chu) && /Thể lực/.test(chu),
      chu.slice(0, 250));

    // ── Cho ăn thì no lên ───────────────────────────────────────────────
    const truoc = await diem();
    await p.locator('button:has-text("Ăn ·")').click();
    await doiToi(async () => (await db.rong.findUnique({ where: { id: rong.id }, select: { doNo: true } })).doNo > 40);
    const sauAn = await db.rong.findUnique({
      where: { id: rong.id }, select: { doNo: true, exp: true, vui: true },
    });
    check('cho ăn cộng đúng số no của một bữa', sauAn.doNo === 40 + NO_MOI_BUA,
      `40 → ${sauAn.doNo}`);
    check('và vẫn trừ đúng giá bữa ăn', (await diem()) === truoc - 12,
      `${truoc} → ${await diem()}`);

    // ── No căng thì máy chủ từ chối, không mất điểm ──────────────────────
    await db.rong.update({
      where: { id: rong.id }, data: { doNo: TOI_DA_CHAM, noTinhAt: new Date() },
    });
    await mo();
    check('no căng thì nút cho ăn tắt',
      (await p.locator('button:has-text("Ăn ·")').count()) === 0
      || await p.locator('button:has-text("Ăn ·")').first().isDisabled());

    const truocNo = await diem();
    await p.evaluate(() => { for (const el of document.querySelectorAll('button:disabled')) el.disabled = false; });
    const nutAn = p.locator('button:has-text("Còn no"), button:has-text("Ăn ·")').first();
    if (await nutAn.count()) { await nutAn.click(); await p.waitForTimeout(1600); }
    check('gọi lúc còn no thì MÁY CHỦ chặn, không mất điểm',
      (await diem()) === truocNo, `${truocNo} → ${await diem()}`);
    check('và độ no không vượt trần',
      (await db.rong.findUnique({ where: { id: rong.id }, select: { doNo: true } })).doNo <= TOI_DA_CHAM);

    // ── Chơi bóng tốn thể lực ───────────────────────────────────────────
    await db.rong.update({
      where: { id: rong.id },
      data: { theLuc: TOI_DA_CHAM, lucTinhAt: new Date(), vui: 40, vuiTinhAt: new Date() },
    });
    await mo();
    await p.locator('button:has-text("Chơi bóng")').click();
    await doiToi(async () => (await db.rong.findUnique({ where: { id: rong.id }, select: { theLuc: true } })).theLuc < TOI_DA_CHAM);
    const sauChoi = await db.rong.findUnique({
      where: { id: rong.id }, select: { theLuc: true, vui: true },
    });
    check('chơi bóng tiêu đúng số thể lực đã định',
      sauChoi.theLuc === TOI_DA_CHAM - THE_LUC_CHOI, `còn ${sauChoi.theLuc}`);
    check('và làm con rồng vui hơn', sauChoi.vui > 40, `40 → ${sauChoi.vui}`);

    // ── Hết lực thì chặn ở máy chủ ──────────────────────────────────────
    await db.rong.update({
      where: { id: rong.id },
      data: { theLuc: THE_LUC_CHOI - 1, lucTinhAt: new Date(), vui: 30, vuiTinhAt: new Date() },
    });
    await mo();
    await p.evaluate(() => { for (const el of document.querySelectorAll('button:disabled')) el.disabled = false; });
    const nutChoi = p.locator('button:has-text("Mệt lử"), button:has-text("Chơi bóng")').first();
    if (await nutChoi.count()) { await nutChoi.click(); await p.waitForTimeout(1600); }
    const sauHet = await db.rong.findUnique({
      where: { id: rong.id }, select: { theLuc: true, vui: true },
    });
    check('thiếu thể lực thì không chơi được, và lực không xuống âm',
      sauHet.theLuc === THE_LUC_CHOI - 1, `còn ${sauHet.theLuc}`);
    check('và độ vui cũng không tự tăng', sauHet.vui === 30, String(sauHet.vui));

    // ── Bỏ bê thì thật sự yếu đi trên trang ─────────────────────────────
    const xa = new Date(Date.now() - 40 * GIO);
    await db.rong.update({
      where: { id: rong.id },
      data: { vui: 100, vuiTinhAt: xa, doNo: 100, noTinhAt: xa },
    });
    await mo();
    const chuDoi = await p.locator('main').innerText();
    check('bỏ bê bốn chục tiếng thì trang báo đói lả',
      chuDoi.includes('đói lả'), chuDoi.slice(0, 250));
    check('ngưỡng cho ăn nhỏ hơn trần, không thì chẳng bao giờ ăn được',
      NGUONG_CHO_AN < TOI_DA_CHAM);
  } finally {
    await wipe();
    await db.user.update({ where: { id: u.id }, data: { points: diemCu } });
  }
}
