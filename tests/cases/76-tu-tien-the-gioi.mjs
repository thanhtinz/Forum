import fs from 'node:fs';
import { BASE, db, openPage, doiToi } from '../helpers.mjs';
import {
  DIA_DIEM, DIA_DIEM_DAU, HUONG, MA_TAM_PHAN_PHE, PHAT_THUA, QUAI,
  SO_HIEP_TOI_DA, THUOC_TINH,
  danhQuai, keNhau, loiRaCua, sucChien, timDiaDiem, timQuai,
} from '../../src/lib/tu-tien-const.ts';

/**
 * Vạn Đạo Tu Tiên — thế giới và trận đánh.
 *
 * Ba chỗ đáng canh nhất:
 *
 *   • NHẢY CÓC — bản đồ là một lưới, mà trình duyệt gửi lên mã ô muốn tới.
 *     Gửi thẳng mã đỉnh núi lúc đang đứng ở chân núi là đi hết bản đồ trong
 *     một lượt, nên máy chủ phải tự xét hai ô có kề nhau không.
 *   • ĐÁNH CON KHÔNG CÓ Ở ĐÂY — cũng vậy: đứng một chỗ mà gọi con thưởng cao
 *     nhất thì khỏi cần đi đâu.
 *   • NĂM ĐẠO PHẢI KHÁC CƠ CHẾ — đây là nguyên tắc số một của GDD. Cùng một
 *     bộ chỉ số, cùng một chuỗi tung xu, mà năm đạo phải ra năm bản nhật ký
 *     khác nhau; giống nhau tức là năm cái tên của cùng một phép trừ.
 */
const KHOA = 'kiemthu-the-gioi';

export default async function run(check) {
  // ── Bản đồ tự nhất quán ───────────────────────────────────────────────
  check('mã địa điểm không trùng',
    new Set(DIA_DIEM.map((d) => d.ma)).size === DIA_DIEM.length);
  check('toạ độ không trùng',
    new Set(DIA_DIEM.map((d) => `${d.x},${d.y}`)).size === DIA_DIEM.length);
  check('ô đầu bản đồ có thật', timDiaDiem(DIA_DIEM_DAU) !== null);
  check('nơi nào cũng có mô tả', DIA_DIEM.every((d) => d.moTa.trim().length > 0));

  /*
   * Tranh của ô: khai tay từng ô nên phải canh cả BA thứ — có khai, tệp có
   * thật, và chín ô không dùng chung một bức. Quên một trong ba thì trang gãy
   * đúng ở ô ấy, mà không ai thấy cho tới lúc người chơi đi tới đó.
   */
  check('ô nào cũng có tranh', DIA_DIEM.every((d) => d.anh.startsWith('/tu-tien/canh/')),
    DIA_DIEM.filter((d) => !d.anh.startsWith('/tu-tien/canh/')).map((d) => d.ma).join(','));
  const thieuAnh = DIA_DIEM.filter((d) => !fs.existsSync(`public${d.anh}`));
  check('và tệp tranh có thật trên đĩa', thieuAnh.length === 0,
    thieuAnh.map((d) => d.anh).join(','));
  check('không hai ô nào dùng chung một bức',
    new Set(DIA_DIEM.map((d) => d.anh)).size === DIA_DIEM.length);
  check('mọi mã quái trên bản đồ đều có trong bảng quái',
    DIA_DIEM.every((d) => d.quai.every((q) => timQuai(q) !== null)),
    DIA_DIEM.flatMap((d) => d.quai.filter((q) => !timQuai(q))).join(','));

  // Lối ra suy từ toạ độ nên phải ĐỐI XỨNG: đi được sang thì về được.
  let mộtChiều = 0;
  for (const d of DIA_DIEM) {
    for (const r of loiRaCua(d.ma)) if (!keNhau(r.ma, d.ma)) mộtChiều += 1;
  }
  check('không có lối nào đi được mà về không được', mộtChiều === 0, `${mộtChiều} lối`);
  check('nơi nào cũng có ít nhất một lối ra',
    DIA_DIEM.every((d) => loiRaCua(d.ma).length > 0),
    DIA_DIEM.filter((d) => loiRaCua(d.ma).length === 0).map((d) => d.ma).join(','));
  check('lối ra không bao giờ trỏ vào chính nó',
    DIA_DIEM.every((d) => loiRaCua(d.ma).every((r) => r.ma !== d.ma)));
  check('ô bịa ra thì không có lối nào và không nổ',
    loiRaCua('khong-co-o-nay').length === 0 && !keNhau('khong-co-o-nay', DIA_DIEM_DAU));
  check('bốn hướng đủ cả bốn', HUONG.length === 4);

  // Cả bản đồ phải ĐI TỚI ĐƯỢC từ ô đầu — không có hòn đảo lạc.
  const daTham = new Set([DIA_DIEM_DAU]);
  const hangDoi = [DIA_DIEM_DAU];
  while (hangDoi.length) {
    const cur = hangDoi.shift();
    for (const r of loiRaCua(cur)) if (!daTham.has(r.ma)) { daTham.add(r.ma); hangDoi.push(r.ma); }
  }
  check('mọi nơi đều đi tới được từ ô đầu', daTham.size === DIA_DIEM.length,
    DIA_DIEM.filter((d) => !daTham.has(d.ma)).map((d) => d.ma).join(','));

  // ── Bảng quái ─────────────────────────────────────────────────────────
  check('mã quái không trùng', new Set(QUAI.map((q) => q.ma)).size === QUAI.length);
  check('quái cấp cao thì thưởng nhiều hơn',
    [...QUAI].sort((a, b) => a.cap - b.cap).every((q, i, arr) => i === 0 || q.tuVi > arr[i - 1].tuVi));
  check('quái nào cũng có máu và công dương',
    QUAI.every((q) => q.hp > 0 && q.cong > 0));

  // ── Chỉ số ra trận ────────────────────────────────────────────────────
  const bo = Object.fromEntries(THUOC_TINH.map((t) => [t.ma, 10]));
  const s1 = sucChien(bo, 'linh', 1, 1);
  const s9 = sucChien(bo, 'linh', 3, 4);
  check('cảnh giới cao thì mạnh hơn hẳn',
    s9.cong > s1.cong && s9.hpToiDa > s1.hpToiDa,
    `${s1.cong}→${s9.cong}`);
  check('đạo khác nhau thì bộ chỉ số khác nhau',
    new Set(['the', 'linh', 'ma', 'yeu', 'tula']
      .map((d) => JSON.stringify(sucChien(bo, d, 2, 2)))).size === 5);
  check('Luyện Thể trâu hơn Linh Tu',
    sucChien(bo, 'the', 2, 2).hpToiDa > sucChien(bo, 'linh', 2, 2).hpToiDa);
  check('chỉ số không bao giờ tụt xuống dưới 1',
    Object.values(sucChien(Object.fromEntries(THUOC_TINH.map((t) => [t.ma, 0])), 'linh', 1, 1))
      .every((v) => v >= 1));

  // ── Năm đạo, năm cơ chế ───────────────────────────────────────────────
  const quai = QUAI[0];
  const giua = () => 0.5;
  const nhatKy = {};
  for (const d of ['the', 'linh', 'ma', 'yeu', 'tula']) {
    const suc = sucChien(bo, d, 2, 2);
    nhatKy[d] = danhQuai(suc, suc.hpToiDa, quai, d, giua);
  }
  check('cùng một chuỗi tung xu thì cùng một đạo ra cùng một trận',
    JSON.stringify(danhQuai(sucChien(bo, 'the', 2, 2), sucChien(bo, 'the', 2, 2).hpToiDa, quai, 'the', giua))
      === JSON.stringify(nhatKy.the));
  check('năm đạo ra năm bản nhật ký KHÁC NHAU',
    new Set(Object.values(nhatKy).map((k) => JSON.stringify(k.dienBien.map((d) => d.cau)))).size === 5,
    Object.entries(nhatKy).map(([k, v]) => `${k}:${v.dienBien.length}`).join(' '));
  check('trận không bao giờ dài quá số hiệp đã định',
    Object.values(nhatKy).every((k) => Math.max(...k.dienBien.map((d) => d.hiep)) <= SO_HIEP_TOI_DA));
  check('nhật ký dòng nào cũng có câu kể',
    Object.values(nhatKy).every((k) => k.dienBien.every((d) => d.cau.trim().length > 0)));
  check('máu hai bên không bao giờ xuống âm',
    Object.values(nhatKy).every((k) => k.dienBien.every((d) => d.hpTa >= 0 && d.hpDich >= 0)));

  // Từng cơ chế phải THẬT SỰ hiện ra trong nhật ký, không chỉ đổi lời.
  const cau = (d) => nhatKy[d].dienBien.map((x) => x.cau).join(' | ');
  check('Luyện Thể có phá giáp tích theo đòn', /phá giáp|giáp địch đã mòn/.test(cau('the')), cau('the').slice(0, 80));
  check('Linh Tu tiêu linh lực và có lúc cạn', /linh lực/.test(cau('linh')), cau('linh').slice(0, 80));
  check('Ma Luyện có ma tâm dâng lên', /ma tâm/.test(cau('ma')), cau('ma').slice(0, 80));
  check('Tu La có chiến ý tích dần', /chiến ý/.test(cau('tula')), cau('tula').slice(0, 80));

  // Yêu Luyện phải đổi dạng khi bị dồn xuống ngưỡng máu.
  const sucYeu = sucChien(bo, 'yeu', 1, 1);
  const yeuBiDon = danhQuai(sucYeu, Math.max(2, Math.round(sucYeu.hpToiDa * 0.3)), QUAI[2], 'yeu', giua);
  check('Yêu Luyện bị dồn thì hiện nguyên hình',
    /nguyên hình|nửa người nửa thú/.test(yeuBiDon.dienBien.map((x) => x.cau).join(' ')),
    yeuBiDon.dienBien.map((x) => x.cau).join(' | ').slice(0, 120));

  // Ma Luyện: ma tâm quá ngưỡng thì phản phệ, tự mất máu. Cái GIÁ phải tới
  // trong một trận vừa phải, không thì rủi ro chỉ có trên giấy.
  const sucMa = sucChien(bo, 'ma', 2, 2);
  const maVua = danhQuai(sucMa, sucMa.hpToiDa, QUAI[3], 'ma', giua);
  const cauMa = maVua.dienBien.map((x) => x.cau).join(' | ');
  check('Ma Luyện phản phệ tới ngay trong một trận vừa phải',
    /phản phệ/.test(cauMa), cauMa.slice(0, 160));
  const maTamCuoi = Math.max(...maVua.dienBien
    .map((x) => Number(/ma tâm (\d+)/.exec(x.cau)?.[1] ?? 0)));
  check('và ma tâm thật sự vượt qua mốc cắn ngược',
    maTamCuoi > MA_TAM_PHAN_PHE, `cao nhất ${maTamCuoi}, mốc ${MA_TAM_PHAN_PHE}`);

  // ── Phần chạy thật ────────────────────────────────────────────────────
  const u = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!u) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const wipe = async () => { await db.tienNhanVat.deleteMany({ where: { userId: u.id } }); };
  await wipe();

  try {
    await db.tienNhanVat.create({
      data: {
        userId: u.id, ten: `${KHOA} nv`, dao: 'the', linhCan: 1,
        canCot: 18, ngoTinh: 5, daoTam: 5, khiVan: 5,
        thanHon: 5, khiHuyet: 18, satY: 5, huyetMach: 5,
        bac: 3, tang: 4, tuVi: 500, viTri: DIA_DIEM_DAU,
        hp: 9999, hpTinhAt: new Date(),
      },
    });

    const p = await openPage('minhdev');
    const mo = async () => {
      await p.goto(`${BASE}/tu-tien/the-gioi`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(600);
    };
    await mo();

    const chu = await p.locator('main').innerText();
    const oDau = timDiaDiem(DIA_DIEM_DAU);
    check('trang bày tên nơi kèm toạ độ',
      chu.includes(oDau.ten) && chu.includes(`(${oDau.x},${oDau.y})`), chu.slice(0, 160));
    check('và bày lối ra ghi rõ đi đâu',
      loiRaCua(DIA_DIEM_DAU).every((r) => chu.includes(r.ten)));
    check('màn thế giới không có biểu tượng nào',
      (await p.locator('main svg').count()) === 0);
    // Tranh phải là ẢNH RASTER, không phải SVG dán thẳng vào trang: mục kiểm
    // ngay trên đếm `svg` bằng không, mà cả game cố ý không có biểu tượng nào.
    check('và có đúng tranh của ô đang đứng',
      (await p.locator(`main img[src="${timDiaDiem(DIA_DIEM_DAU).anh}"]`).count()) === 1);

    /*
     * Chốt chặn nhảy cóc và chặn đánh con vắng mặt nằm ở MÁY CHỦ, nhưng không
     * gọi thẳng bằng `fetch` được: server action của Next cần đúng mã hành
     * động trong tiêu đề `Next-Action`, mà một lượt POST trần thì chẳng gọi
     * được gì cả — nên một mục kiểm dựng kiểu ấy sẽ XANH KỂ CẢ KHI MÁY CHỦ
     * KHÔNG CÓ CHỐT NÀO. Bản đầu của bài này mắc đúng lỗi ấy.
     *
     * Nên ở đây canh hai thứ canh được thật: phép thuần `keNhau` (ở trên), và
     * việc GIAO DIỆN chỉ bày đúng những lối đi, những con quái hợp lệ.
     */
    const nutLoiRa = await p.locator('main ul button').allInnerTexts();
    const tenKe = loiRaCua(DIA_DIEM_DAU).map((r) => r.ten);
    const oXa = DIA_DIEM.filter((d) => !keNhau(DIA_DIEM_DAU, d.ma) && d.ma !== DIA_DIEM_DAU);
    check('trang chỉ bày đúng những lối đi kề bên',
      tenKe.every((t) => nutLoiRa.includes(t))
      && !oXa.some((d) => nutLoiRa.includes(d.ten)),
      `bày ${nutLoiRa.join(',')}`);
    check('và không bày con quái nào không có ở ô này',
      QUAI.filter((q) => !timDiaDiem(DIA_DIEM_DAU).quai.includes(q.ma))
        .every((q) => !chu.includes(q.ten)),
      chu.slice(0, 200));

    // ── Đi một bước hợp lệ ──────────────────────────────────────────────
    const ke = loiRaCua(DIA_DIEM_DAU)[0];
    await mo();
    await p.locator(`button:has-text("${ke.ten}")`).first().click();
    await doiToi(async () =>
      (await db.tienNhanVat.findUnique({ where: { userId: u.id }, select: { viTri: true } })).viTri === ke.ma);
    check('đi được sang ô kề bên',
      (await db.tienNhanVat.findUnique({ where: { userId: u.id }, select: { viTri: true } })).viTri === ke.ma);

    const oHienTai = timDiaDiem(ke.ma);

    // ── Đánh thật ───────────────────────────────────────────────────────
    if (oHienTai.quai.length > 0) {
      await mo();
      const truoc = await db.tienNhanVat.findUnique({ where: { userId: u.id }, select: { tuVi: true } });
      await p.locator('button:has-text("' + timQuai(oHienTai.quai[0]).ten + '")').first().click();
      await doiToi(async () =>
        (await db.tienNhanVat.findUnique({ where: { userId: u.id }, select: { tuVi: true } })).tuVi !== truoc.tuVi);
      await p.waitForTimeout(2500);
      const sau = await db.tienNhanVat.findUnique({ where: { userId: u.id }, select: { tuVi: true } });
      check('đánh xong thì tu vi có đổi', sau.tuVi !== truoc.tuVi, `${truoc.tuVi} → ${sau.tuVi}`);
      const chuTran = await p.locator('main').innerText();
      check('nhật ký trận hiện ra từng hiệp', /Hiệp\s*\d/.test(chuTran), chuTran.slice(0, 200));
    } else {
      check('đánh xong thì tu vi có đổi', false, 'ô kề đầu bản đồ không có quái nào');
      check('nhật ký trận hiện ra từng hiệp', false, 'không đánh được');
    }

    // ── Thua thì bị đưa về đầu bản đồ, không mất nhân vật ────────────────
    // Bấm NÚT THẬT trên trang, không gửi POST trần — xem lý do ở trên.
    const conManh = QUAI.at(-1);
    const oManh = DIA_DIEM.find((d) => d.quai.includes(conManh.ma));
    await db.tienNhanVat.update({
      where: { userId: u.id },
      data: {
        viTri: oManh.ma, hp: 2, hpTinhAt: new Date(), tuVi: 1000,
        bac: 1, tang: 1,
        canCot: 5, ngoTinh: 5, daoTam: 5, khiVan: 5,
        thanHon: 5, khiHuyet: 5, satY: 5, huyetMach: 5,
      },
    });
    await mo();
    await p.locator(`button:has-text("${conManh.ten}")`).first().click();
    await doiToi(async () =>
      (await db.tienNhanVat.findUnique({ where: { userId: u.id }, select: { viTri: true } })).viTri === DIA_DIEM_DAU);
    await p.waitForTimeout(1200);
    const sauThua = await db.tienNhanVat.findUnique({ where: { userId: u.id } });
    check('nhân vật vẫn còn sau khi thua', !!sauThua);
    check('thua thì bị đưa về đầu bản đồ', sauThua.viTri === DIA_DIEM_DAU, sauThua?.viTri);
    check('và mất đúng phần tu vi đã định',
      sauThua.tuVi === 1000 - Math.floor(1000 * PHAT_THUA), `còn ${sauThua.tuVi}`);
    check('máu tụt xuống nhưng không âm', sauThua.hp >= 0 && sauThua.hp <= 2, String(sauThua.hp));
  } finally {
    await wipe();
  }
}
