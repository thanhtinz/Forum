import { BASE, db, doiToi, openPage } from '../helpers.mjs';
import { chuoiDiemDanh, dauNgayVN, quaDiemDanh } from '../../src/lib/pokemon-const.ts';

/**
 * Điểm danh hằng ngày.
 *
 * Hai chỗ dễ hỏng: cắt ngày theo giờ, và phát quà hai lần. Cắt theo 24 giờ
 * trôi thì vào lúc 23h rồi 8h sáng mai bị tính là đứt chuỗi — mà đó đúng là
 * hai ngày liền. Còn đọc rồi mới ghi thì hai tab bấm cùng lúc là nhận đôi.
 */
export default async function run(check) {
  // ── Cắt ngày theo giờ Việt Nam ───────────────────────────────────────
  const toiMuon = new Date('2026-08-30T16:30:00Z'); // 23h30 giờ VN ngày 30
  const sangSom = new Date('2026-08-31T01:00:00Z'); // 8h sáng giờ VN ngày 31
  check('23h hôm nay và 8h sáng mai là hai ngày khác nhau',
    dauNgayVN(toiMuon).getTime() !== dauNgayVN(sangSom).getTime());
  check('hai mốc ấy vẫn là hai ngày LIỀN NHAU nên chuỗi được nối',
    chuoiDiemDanh(toiMuon, 3, dauNgayVN(sangSom)) === 4);
  check('nghỉ một ngày thì chuỗi về 1',
    chuoiDiemDanh(new Date('2026-08-28T05:00:00Z'), 6, dauNgayVN(sangSom)) === 1);
  check('cùng một ngày thì không nhận lần hai',
    chuoiDiemDanh(sangSom, 4, dauNgayVN(sangSom)) === null);
  check('chưa từng điểm danh thì bắt đầu từ ngày 1',
    chuoiDiemDanh(null, 0, dauNgayVN(sangSom)) === 1);
  check('chuỗi quá bảy ngày thì giữ mức ngày thứ bảy',
    quaDiemDanh(30).vang === quaDiemDanh(7).vang);

  // ── Nhận quà thật ────────────────────────────────────────────────────
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!me) { check('có dữ liệu mẫu', false, 'thiếu minhdev'); return; }
  await db.pokeNhanVat.deleteMany({ where: { userId: me.id } });
  const nv = await db.pokeNhanVat.create({
    data: { userId: me.id, ten: 'DiemDanh', vang: 0, cau: 0, ngoc: 0 },
  });

  const p = await openPage('minhdev');
  await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('button:has-text("Điểm danh nhận quà")').click();
  await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: nv.id } })).vang > 0);

  const sau = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
  const q1 = quaDiemDanh(1);
  check('nhận đúng quà ngày thứ nhất', sau.vang === q1.vang && sau.cau === q1.cau,
    `${sau.vang} vàng, ${sau.cau} cầu`);
  check('chuỗi ghi là 1', sau.diemDanhChuoi === 1, `chuỗi ${sau.diemDanhChuoi}`);
  check('ngày nhận cắt đúng đầu ngày',
    sau.diemDanhNgay.getTime() === dauNgayVN(new Date()).getTime());

  // Gọi thẳng lần nữa: máy chủ phải từ chối, không phát quà lần hai.
  await p.evaluate(async (base) => {
    await fetch(`${base}/pokemon`, {
      method: 'POST', body: new FormData(), headers: { 'Next-Action': 'c'.repeat(40) },
    }).catch(() => null);
  }, BASE);
  await p.waitForTimeout(1200);
  const lai = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
  check('bấm lần hai trong ngày không nhận thêm', lai.vang === q1.vang, `${lai.vang} vàng`);

  // Lùi ngày nhận về hôm qua: chuỗi phải nối tiếp lên 2, không phải về 1.
  const homQua = new Date(dauNgayVN(new Date()).getTime() - 86_400_000);
  await db.pokeNhanVat.update({ where: { id: nv.id }, data: { diemDanhNgay: homQua } });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.locator('button:has-text("Điểm danh nhận quà")').click();
  await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: nv.id } })).diemDanhChuoi === 2);
  const q2 = quaDiemDanh(2);
  const hai = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
  check('điểm danh ngày liền sau nối chuỗi lên 2', hai.diemDanhChuoi === 2, `chuỗi ${hai.diemDanhChuoi}`);
  check('quà ngày thứ hai to hơn ngày thứ nhất', q2.vang > q1.vang);
  check('cộng đúng quà ngày thứ hai', hai.vang === q1.vang + q2.vang, `${hai.vang} vàng`);

  await db.pokeNhanVat.deleteMany({ where: { userId: me.id } });
}
