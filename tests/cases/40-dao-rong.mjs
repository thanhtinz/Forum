import { BASE, db, openPage, doiToi } from '../helpers.mjs';

/**
 * Đảo rồng — ấp trứng, nuôi lớn, đấu trường.
 *
 * Trò này đụng vào điểm ở năm chỗ (mua trứng, thúc nở, cho ăn, ghi danh đấu,
 * tiền thưởng), nên mục kiểm ở đây bám vào đúng những chỗ dễ mất tiền oan:
 *
 *   • việc bị chặn thì KHÔNG được trừ điểm — trừ rồi mới chặn là mất tiền thật;
 *   • người BỊ THÁCH không mất gì, vì họ có bấm nút nào đâu;
 *   • rồng của người khác thì không cho ăn, không thả, không đổi tên được —
 *     mỗi hàm là một endpoint POST công khai, giao diện không chặn hộ được.
 */

const KHOA = 'kiemthu-rong';

export default async function run(check) {
  const a = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const b = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!a || !b) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diem = async (id) =>
    (await db.user.findUnique({ where: { id }, select: { points: true } }))?.points ?? 0;

  const diemCu = { a: await diem(a.id), b: await diem(b.id) };

  const wipe = async () => {
    await db.rongTran.deleteMany({ where: { OR: [{ a: { userId: { in: [a.id, b.id] } } }, { b: { userId: { in: [a.id, b.id] } } }] } });
    await db.rong.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.rongLuotDau.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
  };
  await wipe();

  try {
    await db.user.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { points: 3000 } });

    const p = await openPage('minhdev');
    // Đảo tách làm bốn lối đi, nên mở trang phải nói rõ lối nào: chuồng ở
    // `/rong`, mua và nở trứng ở `/rong/ap-trung`, thách đấu ở
    // `/rong/dau-truong`.
    const mo = async (duong = '/rong') => {
      await p.goto(`${BASE}${duong}`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(500);
    };
    await mo('/rong/ap-trung');

    // ── Mua trứng ───────────────────────────────────────────────────────
    let truoc = await diem(a.id);
    await p.locator('button:has-text("Mua trứng")').click();
    await doiToi(async () => (await db.rong.count({ where: { userId: a.id } })) > 0);

    const trung = await db.rong.findFirst({
      where: { userId: a.id },
      select: { id: true, loai: true, mau: true, noAt: true, apXongAt: true },
    });
    check('mua trứng thì trừ đúng giá', (await diem(a.id)) === truoc - 80, `còn ${await diem(a.id)}`);
    check('trứng chưa nở ngay', trung?.noAt === null);
    check('trứng bốc ra loài và màu hợp lệ',
      trung.loai >= 1 && trung.loai <= 9 && trung.mau >= 1 && trung.mau <= 6,
      `loài ${trung?.loai} màu ${trung?.mau}`);
    check('hẹn giờ nở nằm ở tương lai', trung.apXongAt.getTime() > Date.now());

    // ── Chưa tới giờ thì MÁY CHỦ không cho nở thường ────────────────────
    // Gọi thẳng biểu mẫu, không qua nút: giao diện chỉ là gợi ý.
    const goiThang = (viec, truong) => p.evaluate(async ([base, v, t]) => {
      const fd = new FormData();
      for (const [k, val] of Object.entries(t)) fd.set(k, val);
      const r = await fetch(`${base}/rong`, { method: 'POST', body: fd, headers: { 'Next-Action': v } });
      return r.status;
    }, [BASE, viec, truong]);

    truoc = await diem(a.id);
    await p.locator('button:has-text("Thúc nở ngay")').click();
    await doiToi(async () => (await db.rong.findUnique({ where: { id: trung.id }, select: { noAt: true } }))?.noAt !== null);
    const daNo = await db.rong.findUnique({ where: { id: trung.id }, select: { noAt: true, cap: true, vui: true } });
    check('thúc nở ngay thì trứng nở', daNo?.noAt !== null);
    check('thúc nở trừ đúng phí', (await diem(a.id)) === truoc - 40, `còn ${await diem(a.id)}`);
    check('rồng mới nở ở cấp 1', daNo?.cap === 1, `cấp ${daNo?.cap}`);

    // ── Cho ăn ──────────────────────────────────────────────────────────
    await mo('/rong');
    truoc = await diem(a.id);
    await p.locator('button:has-text("Ăn ·")').click();
    await doiToi(async () => (await db.rong.findUnique({ where: { id: trung.id }, select: { exp: true } }))?.exp > 0);
    const sauAn = await db.rong.findUnique({ where: { id: trung.id }, select: { exp: true, anLanCuoi: true } });
    check('cho ăn trừ đúng giá', (await diem(a.id)) === truoc - 12, `còn ${await diem(a.id)}`);
    check('cho ăn cộng kinh nghiệm', sauAn.exp === 18, `exp ${sauAn.exp}`);

    // Ăn lần hai ngay lập tức phải bị chặn, và KHÔNG được trừ điểm
    await mo();
    truoc = await diem(a.id);
    await p.evaluate(() => { for (const el of document.querySelectorAll('button:disabled')) el.disabled = false; });
    const nutAn = p.locator('button:has-text("Ăn ·")').first();
    if (await nutAn.count()) { await nutAn.click(); await p.waitForTimeout(2000); }
    check('ăn lại lúc còn no thì không mất điểm', (await diem(a.id)) === truoc,
      `${truoc} → ${await diem(a.id)}`);
    const conNguyen = await db.rong.findUnique({ where: { id: trung.id }, select: { exp: true } });
    check('và cũng không cộng thêm kinh nghiệm', conNguyen.exp === 18, `exp ${conNguyen.exp}`);

    // ── Chơi bóng: miễn phí, tăng vui ───────────────────────────────────
    await mo();
    truoc = await diem(a.id);
    const vuiTruoc = (await db.rong.findUnique({ where: { id: trung.id }, select: { vui: true } })).vui;
    await p.locator('button:has-text("Chơi bóng")').click();
    await doiToi(async () => (await db.rong.findUnique({ where: { id: trung.id }, select: { choiLanCuoi: true } }))?.choiLanCuoi !== null);
    const sauChoi = await db.rong.findUnique({ where: { id: trung.id }, select: { vui: true } });
    check('chơi bóng không mất điểm', (await diem(a.id)) === truoc, `còn ${await diem(a.id)}`);
    check('chơi bóng làm rồng vui hơn', sauChoi.vui > vuiTruoc, `${vuiTruoc} → ${sauChoi.vui}`);

    // ── Đấu trường ──────────────────────────────────────────────────────
    // Người kia cử một con ra trận.
    const luc = new Date();
    const rongB = await db.rong.create({
      data: {
        userId: b.id, loai: 2, mau: 3, cap: 3, vui: 90, vuiTinhAt: luc,
        apXongAt: luc, noAt: luc, raTran: true, ten: `${KHOA} doi thu`,
      },
      select: { id: true },
    });

    await mo('/rong');
    await p.locator('button:has-text("Cử ra trận")').click();
    await doiToi(async () => (await db.rong.findUnique({ where: { id: trung.id }, select: { raTran: true } }))?.raTran === true);

    await mo('/rong/dau-truong');
    const thayDoiThu = (await p.locator('main').innerText()).includes(`${KHOA} doi thu`);
    check('thấy rồng của người khác ở đấu trường', thayDoiThu);

    const aTruoc = await diem(a.id);
    const bTruoc = await diem(b.id);
    await p.locator('button:has-text("Đấu")').first().click();
    await doiToi(async () => (await db.rongTran.count({ where: { aId: trung.id } })) > 0);

    const tran = await db.rongTran.findFirst({
      where: { aId: trung.id }, orderBy: { createdAt: 'desc' },
      select: { thangId: true, duoc: true, dienBien: true, bId: true },
    });
    const aSau = await diem(a.id);

    check('trận đấu có vào sổ', !!tran);
    check('đúng đối thủ đã chọn', tran?.bId === rongB.id);
    check('sổ ghi khớp với số điểm thật đổi', tran?.duoc === aSau - aTruoc,
      `sổ ${tran?.duoc}, thật ${aSau - aTruoc}`);
    check('người BỊ THÁCH không mất điểm nào', (await diem(b.id)) === bTruoc,
      `${bTruoc} → ${await diem(b.id)}`);
    check('có diễn biến từng hiệp', Array.isArray(tran?.dienBien) && tran.dienBien.length > 0,
      JSON.stringify(tran?.dienBien)?.slice(0, 80));
    check('thắng thì được, thua thì mất đúng phí ghi danh',
      tran?.thangId === trung.id ? aSau - aTruoc === 25
        : tran?.thangId === null ? aSau - aTruoc === 0
          : aSau - aTruoc === -25,
      `thắng=${tran?.thangId} đổi=${aSau - aTruoc}`);

    // ── Không tự đánh chính mình ────────────────────────────────────────
    const aTruoc2 = await diem(a.id);
    const soTran = await db.rongTran.count({ where: { aId: trung.id } });
    await p.evaluate(async ([base, id]) => {
      // Gửi thẳng: hai ô cùng một con rồng.
      const fd = new FormData();
      fd.set('cua_toi', id);
      fd.set('doi_thu', id);
      await fetch(`${base}/rong`, { method: 'POST', body: fd }).catch(() => {});
    }, [BASE, trung.id]);
    await p.waitForTimeout(1200);
    check('không ghép được trận tự đánh mình',
      (await db.rongTran.count({ where: { aId: trung.id } })) === soTran);
    check('và không mất điểm vì lượt gửi ấy', (await diem(a.id)) === aTruoc2);

    // ── Rồng người khác thì không đụng vào được ─────────────────────────
    const bTruocKhac = await diem(b.id);
    const tenCu = (await db.rong.findUnique({ where: { id: rongB.id }, select: { ten: true } })).ten;
    await p.evaluate(async ([base, id]) => {
      for (const t of [{ rong: id }, { rong: id, ten: 'bi doi ten' }]) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(t)) fd.set(k, v);
        await fetch(`${base}/rong`, { method: 'POST', body: fd }).catch(() => {});
      }
    }, [BASE, rongB.id]);
    await p.waitForTimeout(1200);

    const conDo = await db.rong.findUnique({ where: { id: rongB.id }, select: { ten: true } });
    check('không đổi được tên rồng của người khác', conDo?.ten === tenCu, `thành ${conDo?.ten}`);
    check('rồng của người khác vẫn còn nguyên', conDo !== null);
    check('và điểm người kia không đổi', (await diem(b.id)) === bTruocKhac);

    // ── Thả rồng KHÔNG xoá được trần trận mỗi ngày ──────────────────────
    // Trần từng đếm trên `RongTran`, mà bảng ấy cascade theo con rồng và người
    // chơi thả rồng lúc nào cũng được — đấu đủ số trận rồi thả con vừa đấu là
    // bộ đếm về 0, đấu tiếp, mỗi trận thắng lãi ròng 25 điểm.
    const truocTha = await db.rongLuotDau.count({ where: { userId: a.id } });
    check('trận đấu có ghi vào sổ lượt đấu', truocTha > 0, `mới có ${truocTha} lượt`);

    await db.rong.delete({ where: { id: trung.id } });
    check('thả rồng thì lịch sử trận đi theo',
      (await db.rongTran.count({ where: { aId: trung.id } })) === 0);
    check('nhưng SỔ LƯỢT ĐẤU vẫn còn nguyên — trần ngày không bị xoá',
      (await db.rongLuotDau.count({ where: { userId: a.id } })) === truocTha,
      `còn ${await db.rongLuotDau.count({ where: { userId: a.id } })}/${truocTha}`);

    // ── Khách vãng lai ──────────────────────────────────────────────────
    const khach = await openPage(null);
    await khach.goto(`${BASE}/rong`, { waitUntil: 'networkidle' });
    const chuKhach = await khach.locator('main').innerText();
    check('khách vãng lai không thấy chuồng', !chuKhach.includes('Chuồng rồng'));
    check('khách vãng lai được mời đăng nhập', chuKhach.includes('Đăng nhập'));
  } finally {
    await wipe();
    await db.user.update({ where: { id: a.id }, data: { points: diemCu.a } });
    await db.user.update({ where: { id: b.id }, data: { points: diemCu.b } });
  }
}
