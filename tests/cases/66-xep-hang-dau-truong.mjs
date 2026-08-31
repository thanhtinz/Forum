import { BASE, db, doiToi, openPage } from '../helpers.mjs';
import {
  DIEM_DAU_DAU, HANG_MUA, diemSauTran, hangTheoDiem, muaCua,
} from '../../src/lib/pokemon-const.ts';

/**
 * Xếp hạng, mùa giải, lịch sử trận và ghép kèo nhanh ở đấu trường.
 *
 * Bản gốc không có xếp hạng nào: thắng bao nhiêu trận cũng chỉ có cột
 * `thangDau` cộng dồn vĩnh viễn, nên người vào sau không bao giờ đuổi kịp và
 * bảng đứng yên. Những dòng `PokeDau` đã kết thúc thì nằm chết trong bảng,
 * không màn nào đọc ra — đánh xong là mất dấu.
 */
export default async function run(check) {
  // ── Elo ──────────────────────────────────────────────────────────────
  const deu = diemSauTran(1000, 1000, true);
  check('hai bên ngang điểm, người thắng được đúng nửa hệ số K',
    deu.toi === 1016 && deu.dich === 984, `${deu.toi} / ${deu.dich}`);
  check('điểm chuyển từ bên này sang bên kia, tổng giữ nguyên',
    deu.toi + deu.dich === 2000);

  const yeuThangManh = diemSauTran(800, 1400, true);
  const manhThangYeu = diemSauTran(1400, 800, true);
  check('thắng người mạnh hơn được nhiều điểm hơn hẳn',
    yeuThangManh.toi - 800 > manhThangYeu.toi - 1400,
    `+${yeuThangManh.toi - 800} so với +${manhThangYeu.toi - 1400}`);
  check('đánh kèo dễ gần như không lên điểm',
    manhThangYeu.toi - 1400 <= 2, `+${manhThangYeu.toi - 1400}`);

  check('điểm không bao giờ xuống dưới sàn',
    diemSauTran(100, 2000, false).toi >= 100);

  // ── Mùa giải ─────────────────────────────────────────────────────────
  const thang3 = muaCua(new Date('2026-03-15T05:00:00Z'));
  const thang4 = muaCua(new Date('2026-04-01T05:00:00Z'));
  check('số hiệu mùa là năm nhân trăm cộng tháng', thang3 === 202603, String(thang3));
  check('sang tháng là sang mùa', thang4 === 202604 && thang4 > thang3);
  // Mốc cắt phải theo giờ Việt Nam: 23h30 ngày cuối tháng theo giờ UTC đã là
  // tháng sau ở Việt Nam.
  check('mốc cắt mùa tính theo lịch giờ Việt Nam',
    muaCua(new Date('2026-03-31T18:00:00Z')) === 202604,
    String(muaCua(new Date('2026-03-31T18:00:00Z'))));

  check('hạng cao nhất cần điểm cao nhất', hangTheoDiem(9999)?.ten === HANG_MUA[0].ten);
  check('dưới mốc thấp nhất thì không có hạng nào', hangTheoDiem(0) === null);
  check('mốc hạng giảm dần và thưởng cũng giảm dần',
    HANG_MUA.every((h, i) => i === 0
      || (h.moc < HANG_MUA[i - 1].moc && h.vang < HANG_MUA[i - 1].vang)));

  // ── Trong ứng dụng thật ──────────────────────────────────────────────
  const a = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const b = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!a || !b) { check('có dữ liệu mẫu', false, 'thiếu minhdev hoặc huytran'); return; }
  await db.pokeNhanVat.deleteMany({ where: { userId: { in: [a.id, b.id] } } });

  const lam = async (userId, ten) => {
    const nv = await db.pokeNhanVat.create({
      data: { userId, ten, cap: 30, sk: 100, skToiDa: 100, khu: 'co', muaDau: muaCua(new Date()) },
    });
    const t = await db.pokeThu.create({
      data: {
        nhanVatId: nv.id, ten: `Thú ${ten}`, nguon: 3, he: 1, mau: 3000, mauToiDa: 3000,
        c1: 200, c2: 200, c3: 200, c4: 200, chieu: ['TACKLE', 'TACKLE', 'TACKLE', 'TACKLE'],
      },
    });
    await db.pokeNhanVat.update({ where: { id: nv.id }, data: { raTranId: t.id } });
    return { nv, t };
  };
  const A = await lam(a.id, 'DauA');
  const B = await lam(b.id, 'DauB');

  const pA = await openPage('minhdev');
  const pB = await openPage('huytran');

  try {
    check('nhân vật mới bắt đầu ở đúng điểm khởi đầu',
      A.nv.diemDau === DIEM_DAU_DAU, String(A.nv.diemDau));

    // ── Ghép kèo nhanh: chưa có kèo nào thì mở kèo mới ─────────────────
    await pA.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await pA.locator('button:has-text("Ghép kèo nhanh")').count()) > 0);
    await pA.waitForTimeout(900);
    check('trang đấu trường hiện điểm mùa này',
      (await pA.locator(`text=${DIEM_DAU_DAU}`).count()) > 0);

    await pA.locator('button:has-text("Ghép kèo nhanh")').click();
    await doiToi(async () => (await db.pokeDau.count({ where: { chuId: A.nv.id, ketThuc: null } })) > 0);
    check('chưa có kèo nào thì ghép nhanh tự mở kèo mới',
      (await db.pokeDau.count({ where: { chuId: A.nv.id, ketThuc: null } })) === 1);

    // ── Ghép kèo nhanh: có kèo thì nhận luôn ──────────────────────────
    await pB.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await pB.locator('button:has-text("Ghép kèo nhanh")').count()) > 0);
    await pB.waitForTimeout(900);
    await pB.locator('button:has-text("Ghép kèo nhanh")').click();
    await doiToi(async () => (await db.pokeDau.findFirst({ where: { chuId: A.nv.id, ketThuc: null } }))?.doiId === B.nv.id);
    const keo = await db.pokeDau.findFirst({ where: { chuId: A.nv.id, ketThuc: null } });
    check('có kèo đang mở thì ghép nhanh nhận luôn, không mở thêm kèo',
      keo?.doiId === B.nv.id
      && (await db.pokeDau.count({ where: { ketThuc: null } })) === 1);

    // ── Đánh cho xong để xem điểm đổi ─────────────────────────────────
    const diemTruocA = (await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } })).diemDau;
    const diemTruocB = (await db.pokeNhanVat.findUnique({ where: { id: B.nv.id } })).diemDau;
    // Ép máu đối thủ xuống để một lượt là xong, không phải bấm ba chục lần.
    await db.pokeDau.update({ where: { id: keo.id }, data: { doiMau: 1 } });
    await pA.reload({ waitUntil: 'networkidle' });
    await doiToi(async () => (await pA.locator('form button[name="chieu"]').count()) > 0);
    await pA.waitForTimeout(900);
    await pA.locator('form button[name="chieu"]').first().click();
    await doiToi(async () => (await db.pokeDau.findUnique({ where: { id: keo.id } }))?.ketThuc != null);

    const sauA = await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } });
    const sauB = await db.pokeNhanVat.findUnique({ where: { id: B.nv.id } });
    const mong = diemSauTran(diemTruocA, diemTruocB, true);
    check('thắng thì lên đúng số điểm Elo', sauA.diemDau === mong.toi,
      `${diemTruocA} → ${sauA.diemDau}, mong ${mong.toi}`);
    check('thua thì xuống đúng số điểm ấy', sauB.diemDau === mong.dich,
      `${diemTruocB} → ${sauB.diemDau}, mong ${mong.dich}`);
    check('tổng điểm hai bên giữ nguyên, không tự sinh ra điểm',
      sauA.diemDau + sauB.diemDau === diemTruocA + diemTruocB);

    // ── Lịch sử trận ──────────────────────────────────────────────────
    await pA.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await pA.locator('text=Trận gần đây').count()) > 0);
    await pA.waitForTimeout(900);
    check('trang có mục trận gần đây', (await pA.locator('text=Trận gần đây').count()) > 0);
    check('trận vừa xong hiện là THẮNG với người thắng',
      (await pA.locator('text=THẮNG').count()) > 0);
    await pB.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await pB.locator('text=Trận gần đây').count()) > 0);
    check('cùng trận ấy hiện là THUA với người thua',
      (await pB.locator('text=THUA').count()) > 0);
    check('bảng điểm mùa này hiện trên trang đấu trường',
      (await pA.locator('text=Bảng điểm mùa này').count()) > 0);

    // ── Chốt mùa ──────────────────────────────────────────────────────
    const hang = HANG_MUA[HANG_MUA.length - 1];
    await db.pokeNhanVat.update({
      where: { id: A.nv.id },
      data: { muaDau: muaCua(new Date()) - 1, diemDau: hang.moc, vang: 0, ngoc: 0, da: 0 },
    });
    await pA.goto(`${BASE}/pokemon/dau-truong`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } }))?.diemDau === DIEM_DAU_DAU);

    const sauMua = await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } });
    check('sang mùa mới thì điểm đặt lại về mốc khởi đầu',
      sauMua.diemDau === DIEM_DAU_DAU, String(sauMua.diemDau));
    check('chốt mùa phát đúng thưởng theo hạng',
      sauMua.vang === hang.vang && sauMua.ngoc === hang.ngoc,
      `${sauMua.vang} vàng, ${sauMua.ngoc} ngọc`);
    check('trang báo rõ mùa vừa khép lại',
      (await pA.locator('text=/đã khép/').count()) > 0);

    // Mở lại trang: không phát thưởng lần thứ hai.
    await pA.reload({ waitUntil: 'networkidle' });
    await pA.waitForTimeout(1500);
    const lanHai = await db.pokeNhanVat.findUnique({ where: { id: A.nv.id } });
    check('mở lại trang không chốt mùa lần thứ hai',
      lanHai.vang === hang.vang, `${sauMua.vang} → ${lanHai.vang}`);
  } finally {
    await db.pokeDau.deleteMany({ where: { OR: [{ chuId: A.nv.id }, { chuId: B.nv.id }] } });
    await db.pokeNhanVat.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
  }
}
