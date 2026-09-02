import { BASE, db, openPage, doiToi } from '../helpers.mjs';
import {
  BAC_TOI_DA, CHUAN_BI, DAO, PHAT_DO_KIEP, SO_TANG, THIEN_KIEP,
  doKiep, gomChuanBi, satThuongLoi, sucChien, tenCanhGioi, tiLeQuaKiep,
  timChuanBi, timThienKiep, tuViCanDe,
} from '../../src/lib/tu-tien-const.ts';

/**
 * Vạn Đạo Tu Tiên — đột phá và thiên kiếp.
 *
 * Bốn chỗ đáng canh nhất:
 *
 *   • DỰ BÁO PHẢI ĐÚNG LÀ THỨ MÁY CHỦ DÙNG — màn chuẩn bị hứa "51% qua", mà
 *     lúc xử lại tính bằng một công thức khác thì con số kia là nói dối ngay
 *     tại chỗ bản thiết kế gọi là "quyết định rủi ro". Nên `doKiep` phải gọi
 *     lại đúng `tiLeQuaKiep`, và bài này canh bằng cách bơm xu sát hai mép.
 *   • THẤT BẠI PHẢI CHỈ RA VIỆC LÀM ĐƯỢC — tiêu chí nghiệm thu cuối của bản
 *     thiết kế. Hỏng ở cửa nào thì lời khuyên phải nói về đúng cửa ấy, không
 *     được xui mua đồ cho cửa mình không thiếu.
 *   • GIÁ ĐỌC Ở MÁY CHỦ — trình duyệt chỉ gửi mã món. Mã lạ, mã trùng, mã bịa
 *     đều không được biến thành tiền hay tỉ lệ.
 *   • GHI CÓ ĐIỀU KIỆN — qua kiếp là lên bậc, hỏng là mất một phần tư tu vi;
 *     cả hai đều không được xảy ra hai lần cho một lượt tu vi.
 */
const KHOA = 'kiemthu-do-kiep';

/** Xu cố định, để chốt kết quả. */
const xuLa = (v) => () => v;

export default async function run(check) {
  // ── Bảng luật tự nhất quán ────────────────────────────────────────────
  check('mỗi bậc chưa kịch trần đều có một thiên kiếp',
    THIEN_KIEP.length === BAC_TOI_DA - 1, `${THIEN_KIEP.length} kiếp / ${BAC_TOI_DA} bậc`);
  check('bậc chót không có kiếp nào để độ', timThienKiep(BAC_TOI_DA) === null);
  check('kiếp nào cũng có ít nhất ba đạo lôi', THIEN_KIEP.every((k) => k.soDao >= 3));
  check('kiếp bậc sau nặng hơn kiếp bậc trước',
    THIEN_KIEP.every((k, i) => i === 0 || k.sucLoi > THIEN_KIEP[i - 1].sucLoi));
  check('mã món chuẩn bị không trùng',
    new Set(CHUAN_BI.map((m) => m.ma)).size === CHUAN_BI.length);
  check('món nào cũng đỡ được ít nhất một cửa',
    CHUAN_BI.every((m) => m.congTam > 0 || m.giamLoi > 0));
  check('tra món bịa ra thì trả rỗng chứ không nổ', timChuanBi('khong-co-mon-nay') === null);

  // ── Gom đồ: mã lạ, mã trùng ───────────────────────────────────────────
  const mot = CHUAN_BI[0];
  check('gửi cùng một mã nhiều lần cũng chỉ tính một',
    gomChuanBi([mot.ma, mot.ma, mot.ma]).gia === mot.gia,
    String(gomChuanBi([mot.ma, mot.ma, mot.ma]).gia));
  check('mã bịa không thành tiền cũng không thành tỉ lệ',
    gomChuanBi(['bia-dat', '../../etc/passwd', '']).gia === 0
    && gomChuanBi(['bia-dat']).congTam === 0
    && gomChuanBi(['bia-dat']).giamLoi === 0);
  check('gom đủ ba món cũng không miễn nhiễm lôi',
    gomChuanBi(CHUAN_BI.map((m) => m.ma)).giamLoi <= 0.5);

  // ── Dự báo ────────────────────────────────────────────────────────────
  const bo = {
    canCot: 10, ngoTinh: 10, daoTam: 10, khiVan: 10,
    thanHon: 10, khiHuyet: 10, satY: 10, huyetMach: 10,
  };
  const suc = sucChien(bo, 'linh', 1, SO_TANG);
  const kiep = timThienKiep(1);

  const it = tiLeQuaKiep(bo, suc, 20, 1, []);
  const nhieu = tiLeQuaKiep(bo, suc, suc.hpToiDa, 1, []);
  check('càng nhiều máu càng dễ trụ', nhieu.song > it.song,
    `${it.song.toFixed(2)} → ${nhieu.song.toFixed(2)}`);
  check('mọi tỉ lệ nằm trong khoảng hợp lệ',
    [it, nhieu].every((d) => d.song >= 0 && d.song <= 1 && d.tam >= 0 && d.tam <= 1
      && Math.abs(d.qua - d.song * d.tam) < 1e-9));

  const phu = tiLeQuaKiep(bo, suc, suc.hpToiDa, 1, ['ho-the-phu']);
  const dan = tiLeQuaKiep(bo, suc, suc.hpToiDa, 1, ['tinh-tam-dan']);
  check('Hộ Thể phù chỉ đỡ cửa thân, không đụng cửa tâm',
    phu.song > nhieu.song && phu.tam === nhieu.tam,
    `song ${nhieu.song.toFixed(2)}→${phu.song.toFixed(2)}, tam ${nhieu.tam.toFixed(2)}→${phu.tam.toFixed(2)}`);
  check('Tĩnh Tâm đan chỉ đỡ cửa tâm, không đụng cửa thân',
    dan.tam > nhieu.tam && dan.song === nhieu.song,
    `tam ${nhieu.tam.toFixed(2)}→${dan.tam.toFixed(2)}`);
  check('đạo tâm cao thì cửa tâm ma dễ hơn',
    tiLeQuaKiep({ ...bo, daoTam: 18 }, suc, suc.hpToiDa, 1, []).tam > nhieu.tam);
  check('tổng sát thương dự báo khớp phép nhân đơn giản',
    nhieu.tongSatThuong === satThuongLoi(kiep.sucLoi, suc.thu, 0) * kiep.soDao,
    String(nhieu.tongSatThuong));
  check('bậc chót thì không dự báo gì', tiLeQuaKiep(bo, suc, 100, BAC_TOI_DA, []).qua === 0);

  /*
   * CANH CÂN BẰNG — không cửa nào được thành cửa chết.
   *
   * Bản đầu đặt sức lôi 24 và 58, tính ra bậc 2 phải chịu hơn 500 sát thương
   * trên 129 máu: không đạo nào qua nổi, chuẩn bị kiểu gì cũng thế. Lỗi ấy
   * nhìn bảng hằng số không thấy được, phải nhân ra mới lòi — nên nhân ở đây.
   */
  const boDeu = {
    canCot: 10, ngoTinh: 10, daoTam: 10, khiVan: 10,
    thanHon: 10, khiHuyet: 10, satY: 10, huyetMach: 10,
  };
  const xau = [];
  for (const k of THIEN_KIEP) {
    for (const d of DAO) {
      const sc = sucChien(boDeu, d.ma, k.bac, SO_TANG);
      const tran = tiLeQuaKiep(boDeu, sc, sc.hpToiDa, k.bac, []);
      const duDo = tiLeQuaKiep(boDeu, sc, sc.hpToiDa, k.bac, ['ho-the-phu', 'tinh-tam-dan']);
      if (tran.song < 0.15 || duDo.qua < 0.5) {
        xau.push(`bậc${k.bac}/${d.ma} trắng tay ${tran.song.toFixed(2)}, đủ đồ ${duDo.qua.toFixed(2)}`);
      }
    }
  }
  check('đầy máu thì đạo nào cũng có cửa, và chuẩn bị đủ thì cửa rộng hẳn',
    xau.length === 0, xau.join(' | '));

  // ── Độ kiếp: hai mép của xu ───────────────────────────────────────────
  // Xu = 0: đòn nhẹ nhất, và luôn nhỏ hơn tỉ lệ tâm ma nên qua cửa hai.
  const qua = doKiep(bo, suc, suc.hpToiDa * 4, 1, [], xuLa(0));
  check('máu dư dả và xu thấp nhất thì qua kiếp', qua.qua === true, qua.hong ?? '');
  check('qua kiếp thì không kèm lời phân tích nào', qua.nguyenNhan.length === 0);
  check('diễn biến ghi đủ số đạo lôi cộng một lượt tâm ma',
    qua.dienBien.length === kiep.soDao + 1, String(qua.dienBien.length));
  check('máu sau kiếp không âm và không vượt máu ban đầu',
    qua.hpConLai > 0 && qua.hpConLai <= suc.hpToiDa * 4);

  // Xu = 0.999: đòn nặng nhất, và lớn hơn mọi tỉ lệ tâm ma nên hỏng cửa hai.
  const hongTam = doKiep(bo, suc, suc.hpToiDa * 8, 1, [], xuLa(0.999));
  check('trụ được hết lôi mà xu quá cao thì hỏng ở cửa tâm ma',
    hongTam.qua === false && hongTam.hong === 'tam', hongTam.hong ?? 'không hỏng');
  check('hỏng vì tâm ma thì không xui đi mua Hộ Thể phù',
    !hongTam.nguyenNhan.some((n) => /Hộ Thể phù/.test(n) && !/đừng/.test(n)),
    hongTam.nguyenNhan.join(' | '));
  check('và nói thẳng là thân thể không hề hấn',
    hongTam.nguyenNhan.some((n) => /không hề hấn/.test(n)));

  const hongThan = doKiep(bo, suc, 5, 1, [], xuLa(0.999));
  check('ít máu thì gục ngay ở cửa thân', hongThan.hong === 'than', hongThan.hong ?? 'không hỏng');
  check('hỏng vì thân thì nói rõ thiếu bao nhiêu máu',
    hongThan.nguyenNhan.some((n) => /thiếu \d+ máu/.test(n)), hongThan.nguyenNhan.join(' | '));
  check('và gợi ý đúng món đỡ cửa thân',
    hongThan.nguyenNhan.some((n) => /Hộ Thể phù/.test(n)));
  check('gục thì máu về một, không âm', hongThan.hpConLai === 1, String(hongThan.hpConLai));
  check('đã mang phù rồi thì không xui mua phù nữa',
    !doKiep(bo, suc, 5, 1, ['ho-the-phu'], xuLa(0.999))
      .nguyenNhan.some((n) => /Chưa mang Hộ Thể phù/.test(n)));
  check('mọi lời phân tích đều là câu nói được, không rỗng',
    [hongTam, hongThan].every((k) => k.nguyenNhan.every((n) => n.trim().length > 10)));

  // Dự báo và lúc xử phải dùng CHUNG một con số tỉ lệ tâm ma.
  const nguong = tiLeQuaKiep(bo, suc, suc.hpToiDa * 8, 1, []).tam;
  check('xu ngay dưới ngưỡng dự báo thì qua, ngay trên thì hỏng',
    doKiep(bo, suc, suc.hpToiDa * 8, 1, [], xuLa(nguong - 1e-6)).qua === true
    && doKiep(bo, suc, suc.hpToiDa * 8, 1, [], xuLa(nguong + 1e-6)).qua === false,
    `ngưỡng ${nguong.toFixed(4)}`);

  check('bậc chót thì không độ được kiếp nào',
    doKiep(bo, suc, 999, BAC_TOI_DA, [], xuLa(0)).qua === false
    && doKiep(bo, suc, 999, BAC_TOI_DA, [], xuLa(0)).dienBien.length === 0);

  // ── Phần chạy thật ────────────────────────────────────────────────────
  const u = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!u) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const wipe = async () => { await db.tienNhanVat.deleteMany({ where: { userId: u.id } }); };
  await wipe();

  const doc = () => db.tienNhanVat.findUnique({ where: { userId: u.id } });

  try {
    // Nhân vật CHƯA đủ điều kiện: mới tầng một, tu vi rỗng.
    await db.tienNhanVat.create({
      data: {
        userId: u.id, ten: `${KHOA} nv`, dao: 'linh', linhCan: 1,
        canCot: 10, ngoTinh: 10, daoTam: 10, khiVan: 10,
        thanHon: 10, khiHuyet: 10, satY: 10, huyetMach: 10,
        bac: 1, tang: 1, tuVi: 0, linhThach: 0,
        hp: 400, hpTinhAt: new Date(), tuLuyenTu: new Date(),
      },
    });

    const p = await openPage('minhdev');
    const mo = async (duong = '/tu-tien/do-kiep') => {
      await p.goto(BASE + duong, { waitUntil: 'networkidle' });
      await p.waitForTimeout(500);
    };

    await mo();
    let chu = await p.locator('main').innerText();
    check('chưa đủ điều kiện vẫn vào xem được, không bị đá ra',
      p.url().includes('/tu-tien/do-kiep'), p.url());
    check('và bày rõ đang thiếu gì', /Thiếu/.test(chu), chu.slice(0, 200));
    check('nút ngồi vào đàn bị khoá khi chưa đủ điều kiện',
      await p.locator('button:has-text("Ngồi vào đàn")').isDisabled());
    check('màn độ kiếp không có biểu tượng nào',
      (await p.locator('main svg').count()) === 0);

    await mo('/tu-tien');
    check('chưa đủ điều kiện thì trang chính không nhắc đột phá',
      !(await p.locator('main').innerText()).includes('Đủ điều kiện đột phá'));

    // ── Đủ điều kiện ────────────────────────────────────────────────────
    const can = tuViCanDe(1, SO_TANG);
    await db.tienNhanVat.update({
      where: { userId: u.id },
      data: { tang: SO_TANG, tuVi: can, linhThach: 500, hp: 400, hpTinhAt: new Date() },
    });

    await mo('/tu-tien');
    check('đủ điều kiện thì trang chính nhắc đột phá ngay',
      (await p.locator('main').innerText()).includes('Đủ điều kiện đột phá'));

    await mo();
    chu = await p.locator('main').innerText();
    check('màn chuẩn bị gọi đúng tên thiên kiếp của bậc', chu.includes(kiep.ten), chu.slice(0, 200));
    check('và nói trước cảnh giới sẽ mở ra',
      chu.includes(tenCanhGioi(2, 1, 'linh')), chu.slice(0, 300));
    check('bày cả hai cửa rủi ro chứ không gộp một số',
      /Trụ hết/.test(chu) && /Giữ được đạo tâm/.test(chu), chu.slice(0, 400));
    check('và nói rõ hỏng thì mất bao nhiêu tu vi',
      chu.includes(String(Math.round(PHAT_DO_KIEP * 100))), chu.slice(0, 500));

    // Chọn một món: giá phải hiện đúng, và số còn lại phải trừ đúng.
    await p.locator('button:has-text("Tĩnh Tâm đan")').first().click();
    await p.waitForTimeout(300);
    chu = await p.locator('main').innerText();
    check('chọn món thì bày rõ tiêu bao nhiêu, còn lại bao nhiêu',
      chu.includes(`Tiêu ${timChuanBi('tinh-tam-dan').gia} linh thạch`), chu.slice(-400));

    // Bỏ chọn rồi độ trắng tay, cho kết quả gọn.
    await p.locator('button:has-text("Tĩnh Tâm đan")').first().click();
    await p.waitForTimeout(300);

    const truoc = await doc();
    await p.locator('button:has-text("Ngồi vào đàn")').click();
    await doiToi(async () => {
      const r = await doc();
      return r.bac !== truoc.bac || r.tuVi !== truoc.tuVi;
    });
    await p.waitForTimeout(4000);
    const sau = await doc();

    if (sau.bac > truoc.bac) {
      check('qua kiếp thì lên đúng một bậc và về tầng một',
        sau.bac === truoc.bac + 1 && sau.tang === 1, `${sau.bac}/${sau.tang}`);
      check('và tu vi trở về không', sau.tuVi === 0, String(sau.tuVi));
      check('màn kết quả bày cảnh giới vừa mở',
        (await p.locator('main').innerText()).includes(tenCanhGioi(sau.bac, 1, 'linh')));
    } else {
      check('hỏng thì giữ nguyên cảnh giới',
        sau.bac === truoc.bac && sau.tang === truoc.tang, `${sau.bac}/${sau.tang}`);
      check('và mất đúng phần tu vi đã định',
        sau.tuVi === truoc.tuVi - Math.floor(truoc.tuVi * PHAT_DO_KIEP), String(sau.tuVi));
      check('màn kết quả nói vì sao hỏng và làm gì tiếp',
        (await p.locator('main').innerText()).includes('Vì sao hỏng'));
    }
    check('không mang đồ thì không mất linh thạch nào',
      sau.linhThach === truoc.linhThach, `${truoc.linhThach} → ${sau.linhThach}`);
    check('máu sau kiếp không âm', sau.hp >= 0, String(sau.hp));

    // ── Không đủ linh thạch thì nút khoá ────────────────────────────────
    await db.tienNhanVat.update({
      where: { userId: u.id },
      data: { bac: 1, tang: SO_TANG, tuVi: can, linhThach: 0, hp: 400, hpTinhAt: new Date() },
    });
    await mo();
    await p.locator('button:has-text("Tụ Linh trận")').first().click();
    await p.waitForTimeout(300);
    check('thiếu linh thạch thì nói thiếu bao nhiêu',
      /Thiếu \d+ linh thạch/.test(await p.locator('main').innerText()));
    check('và khoá luôn nút ngồi vào đàn',
      await p.locator('button:has-text("Ngồi vào đàn")').isDisabled());
    const veSau = await doc();
    check('bấm không được thì cũng không mất gì',
      veSau.linhThach === 0 && veSau.tuVi === can && veSau.bac === 1);

    // ── Thương thế nặng thì không cho ngồi vào ──────────────────────────
    await db.tienNhanVat.update({
      where: { userId: u.id },
      data: { hp: 1, hpTinhAt: new Date(), linhThach: 500 },
    });
    await mo();
    check('máu cạn thì checklist báo thiếu và nút vẫn khoá',
      /Thương thế còn nặng/.test(await p.locator('main').innerText())
      && await p.locator('button:has-text("Ngồi vào đàn")').isDisabled());
  } finally {
    await wipe();
  }
}
