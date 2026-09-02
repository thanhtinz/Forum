import { BASE, db, openPage, doiToi } from '../helpers.mjs';
import {
  BAC_TOI_DA, BE_QUAN_TRAN_MS, CANH_GIOI, DAO, LINH_CAN, SO_TANG,
  THUOC_TINH, THUOC_TINH_TOI_DA, THUOC_TINH_TOI_THIEU, TONG_THUOC_TINH,
  bacKeTiep, gieoLinhCan, gieoThuocTinh, laDotPha, sucChien, tenCanhGioi, timDao,
  tongBo, tuViBeQuan, tuViCanDe, tuViMoiPhut,
} from '../../src/lib/tu-tien-const.ts';

/**
 * Vạn Đạo Tu Tiên — nền: tạo nhân vật, cảnh giới, tu luyện ngoại tuyến.
 *
 * Ba chỗ đáng canh nhất:
 *
 *   • GIEO THUỘC TÍNH — tổng phải CỐ ĐỊNH và không ô nào vượt trần. Gieo lệch
 *     là có người bước vào cửa với một bộ hơn hẳn người khác, mà đây là game
 *     dài: chênh ở vạch xuất phát thì đuổi cả tháng không kịp.
 *   • TU VI NGOẠI TUYẾN — có trần, và không được cộng hai lần. Đây là chỗ
 *     người chơi kiếm được thứ gì đó mà không cần bấm gì, nên nó phải chặt.
 *   • DỪNG Ở CỬA ĐỘT PHÁ — lên tầng trong cùng bậc thì tự động, nhưng qua bậc
 *     mới phải độ kiếp; không được để nó trôi qua trong lúc người chơi đang ngủ.
 */
const KHOA = 'kiemthu-tu-tien';
const PHUT = 60_000;

export default async function run(check) {
  // ── Bảng luật tự nhất quán ────────────────────────────────────────────
  check('có đúng năm đạo', DAO.length === 5, `${DAO.length} đạo`);
  check('mã đạo không trùng', new Set(DAO.map((d) => d.ma)).size === DAO.length);
  check('đạo nào cũng nuôi bằng hai thuộc tính CÓ THẬT',
    DAO.every((d) => d.nuoi.length === 2 && d.nuoi.every((m) => THUOC_TINH.some((t) => t.ma === m))),
    DAO.filter((d) => !d.nuoi.every((m) => THUOC_TINH.some((t) => t.ma === m))).map((d) => d.ma).join(','));
  // Năm đạo phải khác nhau thật, không phải năm cái tên của cùng một lối chơi.
  check('không hai đạo nào ăn cùng một cặp thuộc tính',
    new Set(DAO.map((d) => [...d.nuoi].sort().join('+'))).size === DAO.length,
    DAO.map((d) => `${d.ma}:${[...d.nuoi].sort().join('+')}`).join(' '));
  check('thuộc tính nào cũng có ít nhất một chỗ ăn vào luật chơi',
    THUOC_TINH.every((t) => t.dung.trim().length > 0));
  check('tra đạo bịa ra thì trả rỗng chứ không nổ', timDao('khong-co-dao-nay') === null);

  check('mọi bậc cảnh giới đều có tên cho cả năm đạo',
    CANH_GIOI.every((c) => DAO.every((d) => (c.ten[d.ma] ?? '').length > 0)),
    CANH_GIOI.flatMap((c) => DAO.filter((d) => !c.ten[d.ma]).map((d) => `${c.bac}/${d.ma}`)).join(','));
  check('tên cảnh giới của năm đạo khác nhau ở từng bậc',
    CANH_GIOI.every((c) => new Set(DAO.map((d) => c.ten[d.ma])).size === DAO.length));
  check('bậc sau tu vi mỗi tầng đắt hơn bậc trước',
    CANH_GIOI.every((c, i) => i === 0 || c.tuViMoiTang > CANH_GIOI[i - 1].tuViMoiTang));
  check('tầng sau trong cùng bậc cũng đắt dần',
    tuViCanDe(1, SO_TANG) > tuViCanDe(1, 1));
  check('kịch trần thì không cần thêm tu vi nào nữa',
    tuViCanDe(BAC_TOI_DA, SO_TANG) === 0, String(tuViCanDe(BAC_TOI_DA, SO_TANG)));
  check('bậc bịa ra thì không nổ', tuViCanDe(99, 1) === 0 && tenCanhGioi(99, 1, 'linh') === 'Phàm nhân');

  check('hết tầng thì sang bậc mới',
    JSON.stringify(bacKeTiep(1, SO_TANG)) === JSON.stringify({ bac: 2, tang: 1 }));
  check('chưa hết tầng thì chỉ lên tầng',
    JSON.stringify(bacKeTiep(1, 1)) === JSON.stringify({ bac: 1, tang: 2 }));
  check('kịch trần thì đứng yên',
    JSON.stringify(bacKeTiep(BAC_TOI_DA, SO_TANG)) === JSON.stringify({ bac: BAC_TOI_DA, tang: SO_TANG }));
  check('chỉ tầng cuối mới là cửa đột phá',
    laDotPha(SO_TANG) && !laDotPha(1));

  // ── Gieo thuộc tính ───────────────────────────────────────────────────
  let lechTong = 0;
  let vuotTran = 0;
  let duoiSan = 0;
  for (let i = 0; i < 300; i += 1) {
    const bo = gieoThuocTinh();
    if (tongBo(bo) !== TONG_THUOC_TINH) lechTong += 1;
    for (const t of THUOC_TINH) {
      if ((bo[t.ma] ?? 0) > THUOC_TINH_TOI_DA) vuotTran += 1;
      if ((bo[t.ma] ?? 0) < THUOC_TINH_TOI_THIEU) duoiSan += 1;
    }
  }
  check('gieo ba trăm lượt, tổng lượt nào cũng đúng bằng nhau', lechTong === 0, `${lechTong} lượt lệch`);
  check('không ô nào vượt trần', vuotTran === 0, `${vuotTran} ô`);
  check('không ô nào thủng sàn', duoiSan === 0, `${duoiSan} ô`);
  check('gieo có ngẫu nhiên thật, không ra một bộ duy nhất',
    new Set(Array.from({ length: 40 }, () => JSON.stringify(gieoThuocTinh()))).size > 1);
  // Bơm được tung xu thì bài kiểm mới chốt được kết quả.
  check('cùng một chuỗi tung xu thì ra cùng một bộ',
    JSON.stringify(gieoThuocTinh(() => 0.5)) === JSON.stringify(gieoThuocTinh(() => 0.5)));

  check('linh căn gieo ra luôn hợp lệ',
    Array.from({ length: 100 }, () => gieoLinhCan()).every((id) => LINH_CAN.some((l) => l.id === id)));
  check('dị linh căn tu nhanh hơn linh căn thường',
    Math.min(...LINH_CAN.filter((l) => l.di).map((l) => l.heSo))
      > Math.max(...LINH_CAN.filter((l) => !l.di).map((l) => l.heSo)));

  // ── Tốc độ tu vi ──────────────────────────────────────────────────────
  const boThap = Object.fromEntries(THUOC_TINH.map((t) => [t.ma, THUOC_TINH_TOI_THIEU]));
  const boCao = Object.fromEntries(THUOC_TINH.map((t) => [t.ma, THUOC_TINH_TOI_DA]));
  check('thuộc tính cao thì tu nhanh hơn',
    tuViMoiPhut(boCao, 'linh', 1, 1) > tuViMoiPhut(boThap, 'linh', 1, 1));
  check('cảnh giới càng cao càng tu chậm',
    tuViMoiPhut(boCao, 'linh', 1, 1) > tuViMoiPhut(boCao, 'linh', 1, BAC_TOI_DA));
  check('dị linh căn tu nhanh hơn thật',
    tuViMoiPhut(boCao, 'linh', 7, 1) > tuViMoiPhut(boCao, 'linh', 1, 1));
  check('đạo bịa ra thì tốc độ bằng không', tuViMoiPhut(boCao, 'bia', 1, 1) === 0);
  // Hai đạo ăn hai cặp thuộc tính khác nhau, nên cùng một bộ phải ra khác tốc độ.
  const boLech = { ...boThap, canCot: THUOC_TINH_TOI_DA, khiHuyet: THUOC_TINH_TOI_DA };
  check('cùng một bộ mà đạo khác thì tốc độ khác',
    tuViMoiPhut(boLech, 'the', 1, 1) > tuViMoiPhut(boLech, 'linh', 1, 1));

  // ── Bế quan: trần và mốc ──────────────────────────────────────────────
  const moc = Date.now();
  check('chưa trôi phút nào thì chưa có tu vi nào', tuViBeQuan(10, moc, moc) === 0);
  check('mười phút thì đúng mười lần tốc độ', tuViBeQuan(10, moc, moc + 10 * PHUT) === 100);
  check('quá trần thì phần dôi ra không tính',
    tuViBeQuan(10, moc, moc + BE_QUAN_TRAN_MS * 5)
      === tuViBeQuan(10, moc, moc + BE_QUAN_TRAN_MS),
    String(tuViBeQuan(10, moc, moc + BE_QUAN_TRAN_MS * 5)));
  check('mốc nằm ở tương lai thì không tự sinh tu vi',
    tuViBeQuan(10, moc + 10 * PHUT, moc) === 0);

  // ── Phần chạy thật ────────────────────────────────────────────────────
  const u = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!u) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const wipe = async () => { await db.tienNhanVat.deleteMany({ where: { userId: u.id } }); };
  await wipe();

  try {
    const p = await openPage('minhdev');
    await p.goto(`${BASE}/tu-tien`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    const chuDau = await p.locator('main').innerText();
    check('chưa có nhân vật thì mời lập đạo hiệu', chuDau.includes('Lập đạo hiệu'), chuDau.slice(0, 160));

    // ── Lập đạo hiệu ────────────────────────────────────────────────────
    await p.goto(`${BASE}/tu-tien/tao`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    await p.locator('input[aria-label="Đạo hiệu"]').fill(`${KHOA} nhan vat`);
    await p.locator('button:has-text("Linh Tu")').first().click();
    await p.locator('button:has-text("Bái nhập đạo đồ")').click();
    await doiToi(async () => (await db.tienNhanVat.count({ where: { userId: u.id } })) > 0);

    const nv = await db.tienNhanVat.findUnique({ where: { userId: u.id } });
    check('tạo được nhân vật', !!nv);
    check('đúng đạo đã chọn', nv.dao === 'linh', nv?.dao);
    check('bắt đầu ở bậc một tầng một', nv.bac === 1 && nv.tang === 1);
    check('chưa có tu vi nào', nv.tuVi === 0);
    const boThat = Object.fromEntries(THUOC_TINH.map((t) => [t.ma, nv[t.ma]]));
    check('bộ thuộc tính ghi vào sổ đúng tổng đã định', tongBo(boThat) === TONG_THUOC_TINH,
      `tổng ${tongBo(boThat)}`);
    check('và linh căn hợp lệ', LINH_CAN.some((l) => l.id === nv.linhCan), String(nv.linhCan));
    // Cột `hp` mặc định 0 ở lược đồ, mà máu chỉ hồi theo giờ — quên đặt lúc
    // tạo là nhân vật mới toanh đứng ở 0 máu, không đánh nổi con quái nào cho
    // tới mấy tiếng sau. Đã dính đúng lỗi này một lần.
    check('vào cửa là đầy máu', nv.hp === sucChien(boThat, nv.dao, 1, 1).hpToiDa,
      `${nv.hp}/${sucChien(boThat, nv.dao, 1, 1).hpToiDa}`);

    // ── Trình duyệt KHÔNG gửi được thuộc tính lên ────────────────────────
    // Gieo là việc của máy chủ; gửi kèm tám cột kịch trần cũng không ăn thua.
    await db.tienNhanVat.deleteMany({ where: { userId: u.id } });
    await p.evaluate(async ([base, ten]) => {
      const fd = new FormData();
      fd.set('ten', ten); fd.set('dao', 'linh');
      for (const m of ['canCot', 'ngoTinh', 'daoTam', 'khiVan', 'thanHon', 'khiHuyet', 'satY', 'huyetMach']) {
        fd.set(m, '999');
      }
      await fetch(`${base}/tu-tien/tao`, { method: 'POST', body: fd }).catch(() => {});
    }, [BASE, `${KHOA} bia`]);
    await p.waitForTimeout(1500);
    const biBia = await db.tienNhanVat.findUnique({ where: { userId: u.id } });
    if (biBia) {
      check('gửi thẳng thuộc tính kịch trần cũng không ăn thua',
        tongBo(Object.fromEntries(THUOC_TINH.map((t) => [t.ma, biBia[t.ma]]))) === TONG_THUOC_TINH,
        'nhân vật mang bộ thuộc tính bịa');
    } else {
      check('gửi thẳng thuộc tính kịch trần cũng không ăn thua', true);
    }

    // ── Bế quan ─────────────────────────────────────────────────────────
    await db.tienNhanVat.deleteMany({ where: { userId: u.id } });
    const luc = new Date();
    const ta = await db.tienNhanVat.create({
      data: {
        userId: u.id, ten: `${KHOA} be quan`, dao: 'linh', linhCan: 1,
        canCot: 10, ngoTinh: 10, daoTam: 10, khiVan: 10,
        thanHon: 10, khiHuyet: 10, satY: 10, huyetMach: 10,
        // Lùi mốc đúng một giờ để có tu vi mà nhận.
        tuLuyenTu: new Date(luc.getTime() - 60 * PHUT),
      },
    });
    const boTa = Object.fromEntries(THUOC_TINH.map((t) => [t.ma, ta[t.ma]]));
    const doi = tuViBeQuan(tuViMoiPhut(boTa, 'linh', 1, 1), ta.tuLuyenTu.getTime(), Date.now());

    await p.goto(`${BASE}/tu-tien/tu-luyen`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const sauMo = await db.tienNhanVat.findUnique({ where: { userId: u.id } });
    check('mở trang là chốt luôn tu vi ngoại tuyến', sauMo.tuVi > 0 || sauMo.tang > 1,
      `tu vi ${sauMo.tuVi}, tầng ${sauMo.tang}`);
    check('tu vi nhận về khớp công thức (sai số một tầng)',
      sauMo.tuVi + (sauMo.tang - 1) * tuViCanDe(1, 1) >= doi - 5,
      `nhận ${sauMo.tuVi}, đáng lẽ quanh ${doi}`);
    check('và mốc bế quan được đẩy lên', sauMo.tuLuyenTu.getTime() > ta.tuLuyenTu.getTime());

    // Mở lại ngay thì KHÔNG cộng lần thứ hai.
    const truoc2 = sauMo.tuVi;
    const tang2 = sauMo.tang;
    await p.goto(`${BASE}/tu-tien/tu-luyen`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    const lai = await db.tienNhanVat.findUnique({ where: { userId: u.id } });
    check('mở lại ngay thì không cộng thêm lần nữa',
      lai.tuVi === truoc2 && lai.tang === tang2, `${truoc2} → ${lai.tuVi}`);

    // ── Dừng ở cửa đột phá ──────────────────────────────────────────────
    await db.tienNhanVat.update({
      where: { userId: u.id },
      data: {
        bac: 1, tang: SO_TANG, tuVi: 0,
        tuLuyenTu: new Date(Date.now() - BE_QUAN_TRAN_MS * 3),
      },
    });
    await p.goto(`${BASE}/tu-tien`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const chan = await db.tienNhanVat.findUnique({ where: { userId: u.id } });
    check('bế quan không tự vượt qua cửa đột phá',
      chan.bac === 1 && chan.tang === SO_TANG, `bậc ${chan.bac} tầng ${chan.tang}`);
    check('và tu vi dồn tới sát cửa rồi dừng',
      chan.tuVi === tuViCanDe(1, SO_TANG), `${chan.tuVi}/${tuViCanDe(1, SO_TANG)}`);

    const chuChan = await p.locator('main').innerText();
    check('trang nói rõ phải độ kiếp mới qua bậc', chuChan.includes('đột phá'),
      chuChan.slice(0, 200));

    // ── Không tạo được nhân vật thứ hai ─────────────────────────────────
    await p.evaluate(async ([base, ten]) => {
      const fd = new FormData();
      fd.set('ten', ten); fd.set('dao', 'ma');
      await fetch(`${base}/tu-tien/tao`, { method: 'POST', body: fd }).catch(() => {});
    }, [BASE, `${KHOA} thu hai`]);
    await p.waitForTimeout(1400);
    check('một tài khoản chỉ một nhân vật',
      (await db.tienNhanVat.count({ where: { userId: u.id } })) === 1);

    // ── Không dùng emoji hay icon ───────────────────────────────────────
    // Đây là game chữ; một hàng biểu tượng chen vào là phá đúng cái lối ấy.
    await p.goto(`${BASE}/tu-tien/dao`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const soSvg = await p.locator('main svg').count();
    check('trang Đạo Phổ không có biểu tượng nào', soSvg === 0, `${soSvg} svg`);
    const chuDao = await p.locator('main').innerText();
    check('và không có emoji nào trong chữ',
      !/\p{Extended_Pictographic}/u.test(chuDao),
      (chuDao.match(/\p{Extended_Pictographic}/gu) ?? []).join(''));
    check('Đạo Phổ bày tên cảnh giới của cả năm đạo',
      DAO.every((d) => chuDao.includes(CANH_GIOI[0].ten[d.ma])));
  } finally {
    await wipe();
  }
}
