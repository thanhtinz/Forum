import { BASE, db, openPage, doiToi } from '../helpers.mjs';
import {
  DIEM_DAU_DAU, HANG_MUA_RONG, HE_SO_K, diemSauTran, hangTheoDiemRong, muaCua,
} from '../../src/lib/rong-const.ts';

/**
 * Xếp hạng và mùa giải của Đảo Rồng.
 *
 * Chỗ tế nhị nhất ở đây là RANH GIỚI giữa hai loại điểm: điểm diễn đàn là
 * TIỀN, lấy của người bị thách — người không hề bấm nút nào — là lấy trộm;
 * còn điểm Elo chỉ là chỗ đứng trên bảng, và một cái bảng chỉ lên không xuống
 * thì chẳng nói được ai mạnh hơn ai. Bài này canh đúng ranh giới ấy.
 */
const KHOA = 'kiemthu-xep-hang';

export default async function run(check) {
  // ── Công thức Elo, hàm thuần ──────────────────────────────────────────
  const deu = diemSauTran(1000, 1000, true);
  check('hai bên ngang điểm, thắng thì được nửa hệ số K',
    deu.doi === Math.round(HE_SO_K / 2), `được ${deu.doi}`);
  check('bên kia mất đúng bằng bên này được', deu.toi - 1000 === 1000 - deu.dich);

  const keoDe = diemSauTran(1600, 1000, true);
  const keoKho = diemSauTran(1000, 1600, true);
  check('thắng người mạnh hơn được nhiều điểm hơn hẳn', keoKho.doi > keoDe.doi,
    `kèo khó ${keoKho.doi} vs kèo dễ ${keoDe.doi}`);
  check('đánh kèo dễ thắng cũng chẳng được mấy', keoDe.doi < Math.round(HE_SO_K / 4),
    `được ${keoDe.doi}`);

  check('thua thì mất điểm', diemSauTran(1000, 1000, false).doi < 0);
  check('có sàn, không tụt xuống âm', diemSauTran(100, 3000, false).toi >= 100);

  check('mùa tính theo năm × 100 + tháng',
    muaCua(new Date('2026-03-15T05:00:00Z')) === 202603,
    `ra ${muaCua(new Date('2026-03-15T05:00:00Z'))}`);
  check('nửa đêm giờ Việt Nam đã sang tháng mới',
    muaCua(new Date('2026-03-31T17:30:00Z')) === 202604,
    `ra ${muaCua(new Date('2026-03-31T17:30:00Z'))}`);

  check('mốc thưởng mùa xếp giảm dần',
    HANG_MUA_RONG.every((h, i) => i === 0 || h.moc < HANG_MUA_RONG[i - 1].moc));
  check('dưới mốc thấp nhất thì không có hạng nào',
    hangTheoDiemRong(HANG_MUA_RONG.at(-1).moc - 1) === null);
  check('điểm khởi đầu chưa đủ hạng cao nhất', DIEM_DAU_DAU < HANG_MUA_RONG[0].moc);

  // ── Phần chạy thật ────────────────────────────────────────────────────
  const a = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const b = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!a || !b) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diem = async (id) =>
    (await db.user.findUnique({ where: { id }, select: { points: true } }))?.points ?? 0;
  const diemCu = { a: await diem(a.id), b: await diem(b.id) };

  const wipe = async () => {
    await db.rongTran.deleteMany({ where: { OR: [{ a: { userId: { in: [a.id, b.id] } } }, { b: { userId: { in: [a.id, b.id] } } }] } });
    await db.rong.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.rongNguoiChoi.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.miniGamePlay.deleteMany({ where: { userId: { in: [a.id, b.id] }, game: 'RONGDAU' } });
  };
  await wipe();

  try {
    await db.user.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { points: 3000 } });

    const luc = new Date();
    const noRa = (userId, loai, mau, cap, ten) => db.rong.create({
      data: { userId, loai, mau, cap, vui: 90, vuiTinhAt: luc, apXongAt: luc, noAt: luc, raTran: true, ten },
      select: { id: true },
    });
    const cuaToi = await noRa(a.id, 6, 1, 12, `${KHOA} cua toi`);
    await noRa(b.id, 2, 2, 12, `${KHOA} doi thu`);

    const p = await openPage('minhdev');
    await p.goto(`${BASE}/rong/dau-truong`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);

    // Mở trang đấu trường lần đầu là tự sinh hồ sơ và ghi mùa hiện tại.
    await doiToi(async () => (await db.rongNguoiChoi.count({ where: { userId: a.id } })) > 0);
    const hoDau = await db.rongNguoiChoi.findUnique({
      where: { userId: a.id }, select: { diemDau: true, muaDau: true },
    });
    check('mở đấu trường lần đầu thì hồ sơ mang điểm khởi đầu',
      hoDau?.diemDau === DIEM_DAU_DAU, `${hoDau?.diemDau}`);
    check('và ghi đúng mùa hiện tại', hoDau?.muaDau === muaCua(new Date()),
      `${hoDau?.muaDau}`);

    // ── Đánh một trận: Elo hai bên đổi, điểm diễn đàn người bị thách thì không
    const bTruoc = await diem(b.id);
    await p.locator('button:has-text("Đấu")').first().click();
    await doiToi(async () => (await db.rongTran.count({ where: { aId: cuaToi.id } })) > 0);
    await p.waitForTimeout(600);

    const tran = await db.rongTran.findFirst({
      where: { aId: cuaToi.id }, orderBy: { createdAt: 'desc' },
      select: { thangId: true, diemDoi: true, mua: true },
    });
    const hoA = await db.rongNguoiChoi.findUnique({
      where: { userId: a.id }, select: { diemDau: true, thangDau: true, thuaDau: true, hoaDau: true },
    });
    const hoB = await db.rongNguoiChoi.findUnique({
      where: { userId: b.id }, select: { diemDau: true, thangDau: true, thuaDau: true, hoaDau: true },
    });

    check('người bị thách cũng có hồ sơ sau trận', !!hoB);
    check('trận ghi lại mùa lúc đánh', tran?.mua === muaCua(new Date()), `${tran?.mua}`);

    const hoa = tran?.thangId === null;
    check('hoà thì không ai đổi Elo, còn lại thì có',
      hoa ? tran.diemDoi === 0 : tran.diemDoi !== 0, `đổi ${tran?.diemDoi}`);
    check('Elo của tôi khớp đúng con số đã ghi vào sổ trận',
      hoA.diemDau === DIEM_DAU_DAU + tran.diemDoi,
      `${DIEM_DAU_DAU} + ${tran.diemDoi} ≠ ${hoA.diemDau}`);
    check('Elo đối thủ đổi ngược lại đúng bấy nhiêu',
      hoB.diemDau === DIEM_DAU_DAU - tran.diemDoi,
      `${hoB.diemDau}`);
    check('nhưng ĐIỂM DIỄN ĐÀN của người bị thách không suy suyển',
      (await diem(b.id)) === bTruoc, `${bTruoc} → ${await diem(b.id)}`);

    const tong = hoA.thangDau + hoA.thuaDau + hoA.hoaDau;
    check('sổ thắng/thua/hoà cộng đúng một trận', tong === 1, `cộng ${tong}`);
    check('và bên kia cũng vậy', hoB.thangDau + hoB.thuaDau + hoB.hoaDau === 1);

    // ── Bảng xếp hạng ───────────────────────────────────────────────────
    await p.goto(`${BASE}/rong/xep-hang`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const chu = await p.locator('main').innerText();
    check('bảng điểm đấu trường có tên người đã đánh',
      chu.includes(String(hoA.diemDau)) || chu.includes(String(hoB.diemDau)), chu.slice(0, 200));
    check('trang xếp hạng bày mốc thưởng cuối mùa',
      HANG_MUA_RONG.every((h) => chu.includes(h.ten)));

    await p.goto(`${BASE}/rong/xep-hang?bang=cap`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const chuCap = await p.locator('main').innerText();
    check('bảng cấp bày đúng con rồng chứ không phải tên người',
      chuCap.includes(`${KHOA} cua toi`), chuCap.slice(0, 200));

    await p.goto(`${BASE}/rong/xep-hang?bang=khong-co-bang-nay`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    check('mã bảng bịa ra thì về bảng đầu chứ không nổ',
      (await p.locator('main').innerText()).includes('Điểm đấu trường mùa này'));

    // ── Chốt mùa: đẩy mùa lùi lại rồi mở trang ──────────────────────────
    const diemCao = HANG_MUA_RONG[0].moc + 50;
    await db.rongNguoiChoi.update({
      where: { userId: a.id },
      data: { muaDau: muaCua(new Date()) - 1, diemDau: diemCao, thangDau: 7, thuaDau: 2 },
    });
    const truocChot = await diem(a.id);
    await p.goto(`${BASE}/rong/dau-truong`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);

    const sauChot = await db.rongNguoiChoi.findUnique({
      where: { userId: a.id },
      select: { diemDau: true, muaDau: true, thangDau: true, thuaDau: true },
    });
    check('sang mùa mới thì điểm về mốc khởi đầu', sauChot.diemDau === DIEM_DAU_DAU,
      `còn ${sauChot.diemDau}`);
    check('mùa được ghi lại đúng tháng này', sauChot.muaDau === muaCua(new Date()));
    check('sổ thắng thua cũng về không', sauChot.thangDau === 0 && sauChot.thuaDau === 0);
    check('và thưởng cuối mùa vào đúng túi',
      (await diem(a.id)) === truocChot + HANG_MUA_RONG[0].thuong,
      `${truocChot} → ${await diem(a.id)}`);

    // Mở lại trang KHÔNG được phát thưởng lần nữa.
    const truoc2 = await diem(a.id);
    await p.goto(`${BASE}/rong/dau-truong`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    check('mở lại trang thì không phát thưởng mùa lần hai',
      (await diem(a.id)) === truoc2, `${truoc2} → ${await diem(a.id)}`);
  } finally {
    await wipe();
    await db.user.update({ where: { id: a.id }, data: { points: diemCu.a } });
    await db.user.update({ where: { id: b.id }, data: { points: diemCu.b } });
  }
}
