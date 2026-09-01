import { BASE, db, openPage, doiToi } from '../helpers.mjs';
import { EXP_MOI_BUA, MUA_TOI_DA, RONG_DO, timDo } from '../../src/lib/rong-const.ts';

/**
 * Cửa hàng rồng và túi đồ.
 *
 * Ranh giới tin cậy là chỗ đáng kiểm nhất ở đây: trình duyệt chỉ gửi lên MÃ
 * MÓN, SỐ LƯỢNG và id con rồng — giá lẫn tác dụng đọc ở máy chủ. Nên bài này
 * gửi thẳng những thứ giao diện không bao giờ gửi: số lượng chín nghìn, mã
 * món bịa, và id rồng của người khác.
 */
const KHOA = 'kiemthu-cua-hang';

export default async function run(check) {
  // ── Bảng món phải tự nhất quán ────────────────────────────────────────
  check('mã món không trùng nhau',
    new Set(RONG_DO.map((m) => m.ma)).size === RONG_DO.length);
  check('món nào cũng có giá dương', RONG_DO.every((m) => m.gia > 0));
  check('món nào cũng có mô tả', RONG_DO.every((m) => m.moTa.trim().length > 0));
  check('đúng một món dùng cho trứng',
    RONG_DO.filter((m) => m.choTrung).length === 1);
  check('tra mã bịa thì không ra món nào', timDo('khong-co-mon-nay') === null);

  const a = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const b = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!a || !b) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diem = async (id) =>
    (await db.user.findUnique({ where: { id }, select: { points: true } }))?.points ?? 0;
  const diemCu = { a: await diem(a.id), b: await diem(b.id) };

  const wipe = async () => {
    await db.rongTran.deleteMany({ where: { OR: [{ a: { userId: { in: [a.id, b.id] } } }, { b: { userId: { in: [a.id, b.id] } } }] } });
    await db.rong.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.rongDo.deleteMany({ where: { chuId: { in: [a.id, b.id] } } });
    await db.rongNguoiChoi.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
  };
  await wipe();

  const banh = timDo('banh-vui');
  const thit = timDo('thit-thuong-hang');
  const da = timDo('da-thuc-no');

  try {
    await db.user.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { points: 5000 } });

    const luc = new Date();
    const rong = await db.rong.create({
      data: {
        userId: a.id, loai: 4, mau: 2, cap: 3, exp: 0, vui: 30, vuiTinhAt: luc,
        apXongAt: luc, noAt: luc, ten: `${KHOA} con cua toi`,
        // Vừa ăn xong: món thịt phải BỎ QUA được cái chờ ấy.
        anLanCuoi: luc,
      },
      select: { id: true },
    });
    const trung = await db.rong.create({
      data: { userId: a.id, loai: 2, mau: 2, apXongAt: new Date(Date.now() + 9e6) },
      select: { id: true },
    });
    const cuaNguoiKhac = await db.rong.create({
      data: {
        userId: b.id, loai: 5, mau: 5, cap: 9, vui: 40, vuiTinhAt: luc,
        apXongAt: luc, noAt: luc, ten: `${KHOA} cua nguoi khac`,
      },
      select: { id: true },
    });

    const p = await openPage('minhdev');
    const mo = async () => {
      await p.goto(`${BASE}/rong/cua-hang`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(600);
    };
    await mo();

    const chu = await p.locator('main').innerText();
    check('cửa hàng bày đủ mọi món', RONG_DO.every((m) => chu.includes(m.ten)));

    // ── Mua ─────────────────────────────────────────────────────────────
    const truoc = await diem(a.id);
    await p.locator('li:has-text("Bánh vui") button:has-text("Mua")').first().click();
    await doiToi(async () => (await db.rongDo.count({ where: { chuId: a.id, ma: banh.ma } })) > 0);
    check('mua trừ đúng giá món', (await diem(a.id)) === truoc - banh.gia,
      `${truoc} → ${await diem(a.id)}`);
    check('món vào túi đúng một cái',
      (await db.rongDo.findFirst({ where: { chuId: a.id, ma: banh.ma }, select: { soLuong: true } }))?.soLuong === 1);

    // ── Gửi thẳng số lượng bịa: phải bị kẹp ─────────────────────────────
    const truocBia = await diem(a.id);
    await p.evaluate(async ([base, ma]) => {
      const fd = new FormData();
      fd.set('ma', ma); fd.set('so', '9999');
      await fetch(`${base}/rong/cua-hang`, { method: 'POST', body: fd }).catch(() => {});
    }, [BASE, banh.ma]);
    await p.waitForTimeout(1400);
    const sauBia = await db.rongDo.findFirst({
      where: { chuId: a.id, ma: banh.ma }, select: { soLuong: true },
    });
    check('gửi số lượng chín nghìn thì không mua quá trần',
      sauBia.soLuong <= 1 + MUA_TOI_DA, `có ${sauBia.soLuong} cái`);
    const daTru = truocBia - (await diem(a.id));
    check('và tiền trừ khớp đúng số món thật sự nhận được',
      daTru === (sauBia.soLuong - 1) * banh.gia, `trừ ${daTru}`);

    // ── Dùng bánh vui: cộng vui ─────────────────────────────────────────
    await mo();
    const vuiTruoc = (await db.rong.findUnique({ where: { id: rong.id }, select: { vui: true } })).vui;
    await p.locator('li:has-text("Bánh vui") select').selectOption(rong.id);
    await p.locator('li:has-text("Bánh vui") button:has-text("Dùng")').click();
    await doiToi(async () =>
      (await db.rong.findUnique({ where: { id: rong.id }, select: { vui: true } })).vui > vuiTruoc);
    check('bánh vui làm rồng vui hơn',
      (await db.rong.findUnique({ where: { id: rong.id }, select: { vui: true } })).vui > vuiTruoc);

    // ── Thịt thượng hạng: bỏ qua thời gian chờ, gấp đôi kinh nghiệm ─────
    await db.rongDo.upsert({
      where: { chuId_ma: { chuId: a.id, ma: thit.ma } },
      create: { chuId: a.id, ma: thit.ma, soLuong: 1 },
      update: { soLuong: 1 },
    });
    await mo();
    const expTruoc = (await db.rong.findUnique({ where: { id: rong.id }, select: { exp: true } })).exp;
    await p.locator('li:has-text("Thịt thượng hạng") select').selectOption(rong.id);
    await p.locator('li:has-text("Thịt thượng hạng") button:has-text("Dùng")').click();
    await doiToi(async () =>
      (await db.rong.findUnique({ where: { id: rong.id }, select: { exp: true } })).exp !== expTruoc);
    const sauThit = await db.rong.findUnique({ where: { id: rong.id }, select: { exp: true, cap: true } });
    check('thịt thượng hạng cộng gấp đôi kinh nghiệm một bữa',
      sauThit.exp === expTruoc + EXP_MOI_BUA * thit.so || sauThit.cap > 3,
      `exp ${expTruoc} → ${sauThit.exp}`);
    check('và dùng hết thì túi không còn cái nào',
      (await db.rongDo.findFirst({ where: { chuId: a.id, ma: thit.ma }, select: { soLuong: true } }))?.soLuong === 0);

    // ── Hết đồ thì không dùng được, và con rồng không đổi ────────────────
    const truocHet = await db.rong.findUnique({ where: { id: rong.id }, select: { exp: true, cap: true } });
    await p.evaluate(async ([base, ma, id]) => {
      const fd = new FormData();
      fd.set('ma', ma); fd.set('rong', id);
      await fetch(`${base}/rong/cua-hang`, { method: 'POST', body: fd }).catch(() => {});
    }, [BASE, thit.ma, rong.id]);
    await p.waitForTimeout(1200);
    const sauHet = await db.rong.findUnique({ where: { id: rong.id }, select: { exp: true, cap: true } });
    check('hết đồ thì dùng không ăn thua gì',
      sauHet.exp === truocHet.exp && sauHet.cap === truocHet.cap);
    check('và số lượng không xuống âm',
      (await db.rongDo.findFirst({ where: { chuId: a.id, ma: thit.ma }, select: { soLuong: true } }))?.soLuong === 0);

    // ── Đá thúc nở: chỉ dùng cho TRỨNG ──────────────────────────────────
    await db.rongDo.upsert({
      where: { chuId_ma: { chuId: a.id, ma: da.ma } },
      create: { chuId: a.id, ma: da.ma, soLuong: 2 },
      update: { soLuong: 2 },
    });
    // Dùng lên con ĐÃ NỞ: phải hỏng, và không được nuốt mất viên đá.
    await p.evaluate(async ([base, ma, id]) => {
      const fd = new FormData();
      fd.set('ma', ma); fd.set('rong', id);
      await fetch(`${base}/rong/cua-hang`, { method: 'POST', body: fd }).catch(() => {});
    }, [BASE, da.ma, rong.id]);
    await p.waitForTimeout(1200);
    check('đá thúc nở dùng lên con đã nở thì hỏng, và không mất viên nào',
      (await db.rongDo.findFirst({ where: { chuId: a.id, ma: da.ma }, select: { soLuong: true } }))?.soLuong === 2);

    await mo();
    const truocNo = await diem(a.id);
    await p.locator('li:has-text("Đá thúc nở") select').selectOption(trung.id);
    await p.locator('li:has-text("Đá thúc nở") button:has-text("Dùng")').click();
    await doiToi(async () =>
      (await db.rong.findUnique({ where: { id: trung.id }, select: { noAt: true } }))?.noAt !== null);
    check('đá thúc nở làm trứng nở ngay',
      (await db.rong.findUnique({ where: { id: trung.id }, select: { noAt: true } }))?.noAt !== null);
    check('nở bằng đá thì không tốn thêm điểm nào', (await diem(a.id)) === truocNo,
      `${truocNo} → ${await diem(a.id)}`);
    check('và viên đá bị tiêu đi đúng một cái',
      (await db.rongDo.findFirst({ where: { chuId: a.id, ma: da.ma }, select: { soLuong: true } }))?.soLuong === 1);

    // ── Rồng của người khác ─────────────────────────────────────────────
    await db.rongDo.updateMany({ where: { chuId: a.id, ma: banh.ma }, data: { soLuong: 3 } });
    const vuiKhac = (await db.rong.findUnique({ where: { id: cuaNguoiKhac.id }, select: { vui: true } })).vui;
    const diemKhacTruoc = await diem(b.id);
    await p.evaluate(async ([base, ma, id]) => {
      const fd = new FormData();
      fd.set('ma', ma); fd.set('rong', id);
      await fetch(`${base}/rong/cua-hang`, { method: 'POST', body: fd }).catch(() => {});
    }, [BASE, banh.ma, cuaNguoiKhac.id]);
    await p.waitForTimeout(1200);
    check('không dùng đồ lên rồng của người khác được',
      (await db.rong.findUnique({ where: { id: cuaNguoiKhac.id }, select: { vui: true } })).vui === vuiKhac);
    check('và điểm người kia không đổi', (await diem(b.id)) === diemKhacTruoc,
      `${diemKhacTruoc} → ${await diem(b.id)}`);

    // ── Mã món bịa ──────────────────────────────────────────────────────
    const truocBia2 = await diem(a.id);
    await p.evaluate(async ([base]) => {
      const fd = new FormData();
      fd.set('ma', 'kim-cuong-vo-cuc'); fd.set('so', '1');
      await fetch(`${base}/rong/cua-hang`, { method: 'POST', body: fd }).catch(() => {});
    }, [BASE]);
    await p.waitForTimeout(1200);
    check('mua món không có trong bảng thì không mất điểm',
      (await diem(a.id)) === truocBia2);
    check('và không sinh ra hàng nào trong túi',
      (await db.rongDo.count({ where: { chuId: a.id, ma: 'kim-cuong-vo-cuc' } })) === 0);
  } finally {
    await wipe();
    await db.user.update({ where: { id: a.id }, data: { points: diemCu.a } });
    await db.user.update({ where: { id: b.id }, data: { points: diemCu.b } });
  }
}
