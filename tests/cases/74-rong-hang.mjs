import { BASE, db, openPage, doiToi } from '../helpers.mjs';
import {
  SO_TANG_HANG, TANG_HANG, THE_LUC_HANG, TOI_DA_CHAM, expLuyen, timDo, timTang,
} from '../../src/lib/rong-const.ts';

/**
 * Hang Rồng — phần chơi một mình.
 *
 * Hang là chỗ DUY NHẤT trong đảo mà máy chủ vừa ra đối thủ vừa phát thưởng,
 * nên nó phải tự chặn lấy mình. Ba chỗ bài này canh:
 *
 *   • NHẢY TẦNG — trình duyệt gửi lên số tầng, gửi tầng cuối lúc mới qua tầng
 *     một thì phải bị chặn, không thì đi thẳng tới chỗ thưởng to nhất.
 *   • THƯỞNG HAI LẦN — điểm chỉ phát đúng lần đầu vượt tầng. Đánh lại mà vẫn
 *     ăn điểm thì hang thành vòi bơm điểm không đáy.
 *   • THỂ LỰC — trừ trước khi đánh, và trừ cả khi thua.
 */
const KHOA = 'kiemthu-hang';

export default async function run(check) {
  // ── Bảng tầng tự nhất quán ────────────────────────────────────────────
  check('có đúng số tầng đã khai', TANG_HANG.length === SO_TANG_HANG);
  check('số tầng chạy liên tục từ 1', TANG_HANG.every((t, i) => t.so === i + 1));
  check('tầng sau con canh cửa cấp cao hơn',
    TANG_HANG.every((t, i) => i === 0 || t.cap >= TANG_HANG[i - 1].cap));
  check('tầng sau thưởng nhiều hơn',
    TANG_HANG.every((t, i) => i === 0 || t.thuong > TANG_HANG[i - 1].thuong));
  check('mọi con canh cửa đều là loài và màu có thật',
    TANG_HANG.every((t) => t.loai >= 1 && t.loai <= 9 && t.mau >= 1 && t.mau <= 6),
    TANG_HANG.filter((t) => t.loai < 1 || t.loai > 9).map((t) => t.so).join(','));
  check('món rơi nào cũng có trong bảng đồ',
    TANG_HANG.every((t) => !t.roi || timDo(t.roi) !== null),
    TANG_HANG.filter((t) => t.roi && !timDo(t.roi)).map((t) => t.roi).join(','));
  check('luyện lại cho ít kinh nghiệm hơn lần đầu',
    TANG_HANG.every((t) => expLuyen(t) < t.expThuong && expLuyen(t) >= 1));
  check('tra tầng bịa ra thì trả về rỗng chứ không nổ',
    timTang(0) === null && timTang(999) === null);
  // Hang phải chạy qua nhiều hệ, không thì chẳng cần nuôi con thứ hai.
  check('con canh cửa trải trên ít nhất bốn loài khác nhau',
    new Set(TANG_HANG.map((t) => t.loai)).size >= 4,
    `${new Set(TANG_HANG.map((t) => t.loai)).size} loài`);

  // ── Phần chạy thật ────────────────────────────────────────────────────
  const u = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!u) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diem = async () =>
    (await db.user.findUnique({ where: { id: u.id }, select: { points: true } }))?.points ?? 0;
  const diemCu = await diem();
  const wipe = async () => {
    await db.rongTran.deleteMany({ where: { OR: [{ a: { userId: u.id } }, { b: { userId: u.id } }] } });
    await db.rong.deleteMany({ where: { userId: u.id } });
    await db.rongDo.deleteMany({ where: { chuId: u.id } });
    await db.rongNguoiChoi.deleteMany({ where: { userId: u.id } });
  };
  await wipe();

  const goiThang = (p, tang) => p.evaluate(async ([base, t]) => {
    const fd = new FormData();
    fd.set('tang', String(t));
    await fetch(`${base}/rong/hang`, { method: 'POST', body: fd }).catch(() => {});
  }, [BASE, tang]);

  try {
    await db.user.update({ where: { id: u.id }, data: { points: 3000 } });
    const luc = new Date();
    // Con rồng rất khoẻ để chắc chắn thắng được tầng đầu — bài này kiểm luật
    // của hang, không kiểm may rủi của trận đánh.
    const rong = await db.rong.create({
      data: {
        userId: u.id, loai: 6, mau: 1, cap: 30, vui: 100, vuiTinhAt: luc,
        doNo: 100, noTinhAt: luc, theLuc: TOI_DA_CHAM, lucTinhAt: luc,
        apXongAt: luc, noAt: luc, raTran: true, ten: `${KHOA} con`,
      },
      select: { id: true },
    });

    const p = await openPage('minhdev');
    const mo = async () => {
      await p.goto(`${BASE}/rong/hang`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(600);
    };
    await mo();

    const chu = await p.locator('main').innerText();
    check('trang bày cả cái thang tầng', chu.includes(TANG_HANG[0].ten) && chu.includes(TANG_HANG.at(-1).ten));
    check('mới vào thì mới có một nút Vào đánh',
      (await p.locator('button:has-text("Vào đánh")').count()) === 1);

    // ── Nhảy thẳng tới tầng cuối phải bị chặn ───────────────────────────
    const truocNhay = await diem();
    await goiThang(p, SO_TANG_HANG);
    await p.waitForTimeout(1500);
    const hoNhay = await db.rongNguoiChoi.findUnique({
      where: { userId: u.id }, select: { tangHang: true },
    });
    check('không nhảy thẳng lên tầng cuối được', (hoNhay?.tangHang ?? 0) === 0,
      `đang ở tầng ${hoNhay?.tangHang}`);
    check('và không ăn được đồng thưởng nào', (await diem()) === truocNhay,
      `${truocNhay} → ${await diem()}`);

    // ── Vượt tầng 1 ─────────────────────────────────────────────────────
    const t1 = TANG_HANG[0];
    const truoc = await diem();
    await mo();
    await p.locator('button:has-text("Vào đánh")').click();
    await doiToi(async () =>
      (await db.rongNguoiChoi.findUnique({ where: { userId: u.id }, select: { tangHang: true } }))?.tangHang === 1);
    check('thắng thì lên tầng',
      (await db.rongNguoiChoi.findUnique({ where: { userId: u.id }, select: { tangHang: true } }))?.tangHang === 1);
    check('và thưởng đúng số điểm của tầng ấy', (await diem()) === truoc + t1.thuong,
      `${truoc} → ${await diem()}, đáng lẽ +${t1.thuong}`);
    const sauTran = await db.rong.findUnique({
      where: { id: rong.id }, select: { theLuc: true, exp: true },
    });
    check('trừ đúng số thể lực một lượt',
      sauTran.theLuc === TOI_DA_CHAM - THE_LUC_HANG, `còn ${sauTran.theLuc}`);

    // ── Đánh lại tầng đã qua: chỉ kinh nghiệm, KHÔNG điểm ────────────────
    await db.rong.update({
      where: { id: rong.id }, data: { theLuc: TOI_DA_CHAM, lucTinhAt: new Date() },
    });
    const truocLuyen = await diem();
    const expTruoc = (await db.rong.findUnique({ where: { id: rong.id }, select: { exp: true } })).exp;
    await mo();
    await p.locator('button:has-text("Luyện")').first().click();
    await doiToi(async () =>
      (await db.rong.findUnique({ where: { id: rong.id }, select: { theLuc: true } })).theLuc < TOI_DA_CHAM);
    await p.waitForTimeout(600);
    check('luyện lại tầng cũ KHÔNG cho thêm điểm nào', (await diem()) === truocLuyen,
      `${truocLuyen} → ${await diem()}`);
    check('nhưng vẫn tốn thể lực',
      (await db.rong.findUnique({ where: { id: rong.id }, select: { theLuc: true } })).theLuc
        === TOI_DA_CHAM - THE_LUC_HANG);
    check('và tầng cao nhất không nhích thêm',
      (await db.rongNguoiChoi.findUnique({ where: { userId: u.id }, select: { tangHang: true } }))?.tangHang === 1);

    // ── Gọi thẳng tầng 1 lần nữa cũng không phát thưởng lại ──────────────
    await db.rong.update({
      where: { id: rong.id }, data: { theLuc: TOI_DA_CHAM, lucTinhAt: new Date() },
    });
    const truocLai = await diem();
    await goiThang(p, 1);
    await p.waitForTimeout(1600);
    check('gọi thẳng tầng đã qua cũng không phát thưởng lần hai',
      (await diem()) === truocLai, `${truocLai} → ${await diem()}`);

    // ── Hết thể lực thì chặn, và không ăn thưởng ────────────────────────
    await db.rong.update({
      where: { id: rong.id },
      data: { theLuc: THE_LUC_HANG - 1, lucTinhAt: new Date() },
    });
    const truocKiet = await diem();
    const tangKiet = (await db.rongNguoiChoi.findUnique({
      where: { userId: u.id }, select: { tangHang: true },
    })).tangHang;
    await goiThang(p, tangKiet + 1);
    await p.waitForTimeout(1600);
    check('thiếu thể lực thì không vào hang được',
      (await db.rongNguoiChoi.findUnique({ where: { userId: u.id }, select: { tangHang: true } }))?.tangHang === tangKiet);
    check('và không mất thêm thể lực nào',
      (await db.rong.findUnique({ where: { id: rong.id }, select: { theLuc: true } })).theLuc === THE_LUC_HANG - 1);
    check('cũng không ăn thưởng', (await diem()) === truocKiet);

    // ── Chưa cử con nào ra trận thì không đánh được ─────────────────────
    await db.rong.updateMany({ where: { userId: u.id }, data: { raTran: false, theLuc: TOI_DA_CHAM, lucTinhAt: new Date() } });
    await mo();
    check('chưa cử rồng thì mọi nút vào hang đều tắt',
      await p.locator('button:has-text("Vào đánh")').first().isDisabled());
    const truocKhongCu = await diem();
    await goiThang(p, tangKiet + 1);
    await p.waitForTimeout(1500);
    check('và gọi thẳng cũng không ăn thua', (await diem()) === truocKhongCu);
  } finally {
    await wipe();
    await db.user.update({ where: { id: u.id }, data: { points: diemCu } });
  }
}
