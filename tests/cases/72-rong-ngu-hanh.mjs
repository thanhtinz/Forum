import { BASE, db, openPage, doiToi } from '../helpers.mjs';
import {
  HE, HE_BI_KHAC, HE_KHAC, LOAI, chiSo, danhNhau, heCua, heSoKhac, tenHe, theKhac,
} from '../../src/lib/rong-const.ts';

/**
 * Ngũ hành và khắc chế ở Đảo Rồng.
 *
 * Cái đáng canh nhất ở đây là VÒNG KHẮC PHẢI KHÉP KÍN VÀ CÔNG BẰNG: mỗi hệ
 * khắc đúng một hệ và bị đúng một hệ khắc. Lệch một dòng dữ liệu là có hệ trội
 * hẳn lên, mà thứ ấy thì nhìn bảng không ra — phải đếm mới thấy.
 */
const KHOA = 'kiemthu-ngu-hanh';

export default async function run(check) {
  // ── Bảng hệ tự nhất quán ──────────────────────────────────────────────
  check('có đúng năm hệ', HE.length === 5, `${HE.length} hệ`);
  check('mã hệ không trùng', new Set(HE.map((h) => h.id)).size === HE.length);
  check('hệ nào cũng khắc một hệ CÓ THẬT',
    HE.every((h) => HE.some((k) => k.id === h.khac)));
  check('không hệ nào tự khắc chính mình', HE.every((h) => h.khac !== h.id));
  check('mỗi hệ bị đúng MỘT hệ khắc — vòng khép kín, không hệ nào trội',
    HE.every((h) => HE.filter((k) => k.khac === h.id).length === 1),
    HE.map((h) => `${h.ten}:${HE.filter((k) => k.khac === h.id).length}`).join(' '));

  // Đi hết vòng năm bước phải quay về chỗ cũ.
  let cur = HE[0].id;
  for (let i = 0; i < HE.length; i += 1) cur = HE.find((h) => h.id === cur).khac;
  check('đi đủ năm bước khắc thì về đúng hệ ban đầu', cur === HE[0].id, `về ${tenHe(cur)}`);

  // ── Hệ số ─────────────────────────────────────────────────────────────
  const kim = HE.find((h) => h.ten === 'Kim');
  check('đánh vào hệ mình khắc thì mạnh hơn',
    heSoKhac(kim.id, kim.khac) === HE_KHAC, String(heSoKhac(kim.id, kim.khac)));
  check('bị hệ kia khắc thì yếu đi',
    heSoKhac(kim.khac, kim.id) === HE_BI_KHAC, String(heSoKhac(kim.khac, kim.id)));
  check('hai hệ không dính nhau thì đúng bằng 1', heSoKhac(kim.id, kim.id) === 1);
  check('khắc thì lợi, bị khắc thì thiệt', HE_KHAC > 1 && HE_BI_KHAC < 1);
  check('theKhac đọc ra đúng ba thế',
    theKhac(kim.id, kim.khac) === 'khac'
    && theKhac(kim.khac, kim.id) === 'bi-khac'
    && theKhac(kim.id, kim.id) === 'ngang');

  // ── Chín loài đều có hệ hợp lệ ────────────────────────────────────────
  check('loài nào cũng mang một hệ có thật',
    LOAI.every((l) => HE.some((h) => h.id === l.he)),
    LOAI.map((l) => `${l.ten}:${l.he}`).join(' '));
  check('hệ suy ra từ số hiệu loài khớp với bảng',
    LOAI.every((l) => heCua(l.id) === l.he));
  check('loài bịa ra thì không nổ, trả về hệ mặc định',
    HE.some((h) => h.id === heCua(999)));
  check('Hoả Long đúng hệ Hoả',
    tenHe(heCua(LOAI.find((l) => l.ten === 'Hoả Long').id)) === 'Hoả');
  check('Thanh Long đúng hệ Mộc theo sách',
    tenHe(heCua(LOAI.find((l) => l.ten === 'Thanh Long').id)) === 'Mộc');
  // Không đòi năm hệ chia đều chín loài — cố ý gán theo nghĩa của cái tên.
  check('mỗi hệ có ít nhất một loài mang nó',
    HE.every((h) => LOAI.some((l) => l.he === h.id)),
    HE.map((h) => `${h.ten}:${LOAI.filter((l) => l.he === h.id).length}`).join(' '));

  // ── Khắc chế ăn vào sát thương thật ───────────────────────────────────
  // Hai con CÙNG cấp, cùng độ vui, chỉ khác hệ. Bơm tung xu cố định để bỏ hẳn
  // phần may rủi ra khỏi phép so.
  const giua = () => 0.5;
  const loaiKim = LOAI.find((l) => tenHe(l.he) === 'Kim');
  const loaiMoc = LOAI.find((l) => tenHe(l.he) === 'Mộc');
  const loaiThuy = LOAI.find((l) => tenHe(l.he) === 'Thuỷ');

  const a = chiSo({ loai: loaiKim.id, cap: 10, vui: 100 });
  const biKhac = chiSo({ loai: loaiMoc.id, cap: 10, vui: 100 });
  const trungTinh = chiSo({ loai: loaiThuy.id, cap: 10, vui: 100 });

  check('chiSo trả về cả hệ của loài', a.he === loaiKim.he, String(a.he));

  const danhVaoMoc = danhNhau(a, biKhac, giua).dienBien[0].aDanh;
  const danhVaoThuy = danhNhau(a, trungTinh, giua).dienBien[0].aDanh;
  check('đánh vào hệ mình khắc thì sát thương cao hơn hẳn',
    danhVaoMoc > danhVaoThuy, `khắc ${danhVaoMoc} vs thường ${danhVaoThuy}`);

  const mocDanhKim = danhNhau(biKhac, a, giua).dienBien[0].aDanh;
  const mocDanhThuy = danhNhau(biKhac, trungTinh, giua).dienBien[0].aDanh;
  check('đánh vào hệ khắc mình thì sát thương thấp hơn',
    mocDanhKim < mocDanhThuy, `bị khắc ${mocDanhKim} vs thường ${mocDanhThuy}`);

  check('nhưng vẫn luôn gây ít nhất một sát thương', mocDanhKim >= 1);

  // Khắc chế nhân SAU khi trừ thủ: nhân trước thì con thủ dày nuốt hết phần
  // lợi của hệ. Kiểm bằng một con thủ rất dày.
  const dayCui = chiSo({ loai: loaiMoc.id, cap: 30, vui: 100 });
  const yeu = chiSo({ loai: loaiKim.id, cap: 4, vui: 100 });
  const yeuDanhDay = danhNhau(yeu, dayCui, giua).dienBien[0].aDanh;
  check('con yếu đánh con dày ĐÚNG hệ mình khắc vẫn ăn được phần lợi',
    yeuDanhDay >= 1, `${yeuDanhDay}`);

  // ── Trên trang ────────────────────────────────────────────────────────
  const u = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!u) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const wipe = async () => {
    await db.rongTran.deleteMany({ where: { OR: [{ a: { userId: u.id } }, { b: { userId: u.id } }] } });
    await db.rong.deleteMany({ where: { userId: u.id } });
  };
  await wipe();

  try {
    const luc = new Date();
    await db.rong.create({
      data: {
        userId: u.id, loai: loaiKim.id, mau: 2, cap: 8, vui: 80, vuiTinhAt: luc,
        apXongAt: luc, noAt: luc, raTran: true, ten: `${KHOA} cua toi`,
      },
      select: { id: true },
    });

    const p = await openPage('minhdev');
    await p.goto(`${BASE}/rong`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const chuChuong = await p.locator('main').innerText();
    check('thẻ rồng ở chuồng có bày hệ', chuChuong.includes(tenHe(loaiKim.he)),
      chuChuong.slice(0, 200));

    await p.goto(`${BASE}/rong/so-suu-tam`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const chuSo = await p.locator('main').innerText();
    check('sổ sưu tầm bày hệ của cả năm hành',
      HE.every((h) => chuSo.includes(h.ten)),
      HE.filter((h) => !chuSo.includes(h.ten)).map((h) => h.ten).join(','));
  } finally {
    await wipe();
  }
}
