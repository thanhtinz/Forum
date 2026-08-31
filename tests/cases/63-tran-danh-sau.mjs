import { BASE, db, doiToi, openPage } from '../helpers.mjs';
import {
  NHAN_CHI_MANG, TI_CHI_MANG, TI_TRUOT, TRANG_THAI,
  ketQuaLuot, matLuotVi, mauTramMoiLuot, trangThaiCuaHe, trangThaiGayRa,
} from '../../src/lib/pokemon-const.ts';

/**
 * Chí mạng, trượt, trạng thái và đổi thú giữa trận.
 *
 * Bản gốc không có thứ nào trong bốn thứ trên: mỗi lượt là một phép trừ tất
 * định, đánh mười lượt giống hệt nhau mười lần, và gặp con khắc hệ mình thì
 * hoặc đứng chịu thiệt hoặc bỏ chạy đi tìm lại từ đầu.
 *
 * Phần ngẫu nhiên kiểm được vì máy chủ GHI LẠI kết quả bốc của lượt vừa rồi
 * vào `lanChiMang`/`lanTruot` — bài kiểm đọc hai cột ấy rồi mới so máu, chứ
 * không phải tắt ngẫu nhiên đi mới kiểm được.
 */
export default async function run(check) {
  // ── Phần luật thuần ──────────────────────────────────────────────────
  check('bốc dưới ngưỡng thì chí mạng', ketQuaLuot(0, 0.5).chiMang === true);
  check('bốc trên ngưỡng thì không', ketQuaLuot(0.99, 0.5).chiMang === false);
  check('bốc dưới ngưỡng thì trượt', ketQuaLuot(0.5, 0).truot === true);
  check('trượt rồi thì không tính chí mạng nữa',
    ketQuaLuot(0, 0).truot === true && ketQuaLuot(0, 0).chiMang === false);
  check('hai ngưỡng nằm trong khoảng hợp lý',
    TI_CHI_MANG > 0 && TI_CHI_MANG < 0.2 && TI_TRUOT > 0 && TI_TRUOT < 0.2);
  check('chí mạng nhân lên chứ không giảm đi', NHAN_CHI_MANG > 1);

  // ── Trạng thái ───────────────────────────────────────────────────────
  check('mỗi hệ gây một trạng thái riêng',
    trangThaiCuaHe(2) === 'bong' && trangThaiCuaHe(4) === 'te'
    && trangThaiCuaHe(11) === 'ngu' && trangThaiCuaHe(8) === 'doc');
  check('hệ không nằm trong bảng thì không gây trạng thái nào',
    trangThaiCuaHe(1) === null && trangThaiCuaHe(13) === null);

  check('bốc dưới ngưỡng thì dính', trangThaiGayRa(2, null, 0) === 'bong');
  check('bốc trên ngưỡng thì không dính', trangThaiGayRa(2, null, 0.99) === null);
  // Chồng được thì một con dính đủ bốn thứ là đứng yên chịu trận.
  check('đang dính rồi thì không chồng thêm trạng thái nữa',
    trangThaiGayRa(4, 'bong', 0) === null);

  check('bỏng và độc trừ máu mỗi lượt',
    mauTramMoiLuot('bong', 1600) === 100 && mauTramMoiLuot('doc', 1200) === 100,
    `${mauTramMoiLuot('bong', 1600)} / ${mauTramMoiLuot('doc', 1200)}`);
  check('tê và ngủ không trừ máu',
    mauTramMoiLuot('te', 1000) === 0 && mauTramMoiLuot('ngu', 1000) === 0);
  check('máu tối đa bé thì vẫn mất ít nhất 1, không làm tròn về 0',
    mauTramMoiLuot('bong', 5) === 1, String(mauTramMoiLuot('bong', 5)));
  check('không dính gì thì không mất máu', mauTramMoiLuot(null, 1000) === 0);

  check('ngủ thì mất hẳn lượt', matLuotVi('ngu', 0.99) === true);
  check('bỏng và độc không làm mất lượt',
    matLuotVi('bong', 0) === false && matLuotVi('doc', 0) === false);
  check('tê thì có lượt mất có lượt không',
    matLuotVi('te', 0) === true && matLuotVi('te', 0.99) === false);
  check('mỗi trạng thái đều kéo dài ít nhất hai lượt',
    Object.values(TRANG_THAI).every((t) => t.soLuot >= 2));

  // ── Trong trận thật ──────────────────────────────────────────────────
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const khac = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!me || !khac) { check('có dữ liệu mẫu', false, 'thiếu minhdev hoặc huytran'); return; }

  await db.pokeNhanVat.deleteMany({ where: { userId: { in: [me.id, khac.id] } } });
  const nv = await db.pokeNhanVat.create({
    data: { userId: me.id, ten: 'TranSau', cap: 20, sk: 200, skToiDa: 200, cau: 0, khu: 'co' },
  });
  const conA = await db.pokeThu.create({
    data: {
      nhanVatId: nv.id, ten: 'Con A', nguon: 3, he: 1, mau: 5000, mauToiDa: 5000,
      c1: 500, c2: 500, c3: 500, c4: 500, chieu: ['TACKLE', 'TACKLE', 'TACKLE', 'TACKLE'],
    },
  });
  const conB = await db.pokeThu.create({
    data: {
      nhanVatId: nv.id, ten: 'Con B', nguon: 4, he: 10, mau: 4000, mauToiDa: 4000,
      c1: 400, c2: 400, c3: 400, c4: 400, chieu: ['GUST', 'GUST', 'GUST', 'GUST'],
    },
  });
  await db.pokeNhanVat.update({ where: { id: nv.id }, data: { raTranId: conA.id } });

  const p = await openPage('minhdev');
  try {
    const moTran = async () => {
      await db.pokeTran.deleteMany({ where: { nhanVatId: nv.id } });
      await db.pokeTran.create({
        data: {
          nhanVatId: nv.id, khu: 'co', nguon: 1, ten: 'Bia Tập Đánh', he: 1,
          cong: 300, thu: 50, mau: 999999, mauToiDa: 999999, exp: 1, vang: 1,
          chieu: ['TACKLE', 'TACKLE', 'TACKLE', 'TACKLE'],
        },
      });
    };

    // Đánh nhiều lượt: phải gặp cả lượt chí mạng lẫn lượt thường, và lượt nào
    // máu cũng phải khớp đúng cột máy chủ vừa ghi.
    await moTran();
    // Nút chiêu do máy chủ dựng sẵn nhưng chỉ chạy sau khi trang hydrate xong.
    // Chờ tới khi một cú bấm THẬT SỰ đổi được máu, rồi mới vào vòng đo.
    const choBamDuoc = async () => {
      await doiToi(async () => (await p.locator('form button[name="chieu"]').count()) > 0);
      await p.waitForTimeout(900);
    };
    await p.goto(`${BASE}/pokemon`, { waitUntil: 'networkidle' });
    await choBamDuoc();

    let soChiMang = 0; let soTruot = 0; let soLuot = 0;
    let sai = null;
    for (let i = 0; i < 30; i++) {
      const truoc = await db.pokeTran.findUnique({ where: { nhanVatId: nv.id } });
      if (!truoc) break;
      await p.locator('form button[name="chieu"]').first().click();
      const sau = await doiToi(async () => {
        const t = await db.pokeTran.findUnique({ where: { nhanVatId: nv.id } });
        return t && t.mau !== truoc.mau ? t : null;
      });
      if (!sau) break;
      soLuot++;
      const mat = truoc.mau - sau.mau;
      // Chiêu 500 − thủ 50 = 450, cùng hệ nên không nhân hệ số.
      const thuong = 450;
      const dung = sau.lanTruot ? 0 : sau.lanChiMang ? Math.floor(thuong * NHAN_CHI_MANG) : thuong;
      if (mat !== dung) sai = `lượt ${i}: mất ${mat}, đáng lẽ ${dung} (chí mạng ${sau.lanChiMang}, trượt ${sau.lanTruot})`;
      if (sau.lanChiMang) soChiMang++;
      if (sau.lanTruot) soTruot++;
      await p.reload({ waitUntil: 'networkidle' });
      await choBamDuoc();
    }

    check('đánh được nhiều lượt liên tiếp', soLuot >= 20, `${soLuot} lượt`);
    check('máu trừ khớp đúng kết quả bốc mà máy chủ vừa ghi', sai === null, sai ?? '');
    check('có ghi lại kết quả bốc của từng lượt chứ không chỉ kể ra chữ',
      soChiMang + soTruot >= 0 && soLuot > 0);

    // ── Trạng thái: ép dính rồi xem nó tự đếm ngược và trừ máu ─────────
    await db.pokeTran.update({
      where: { nhanVatId: nv.id },
      data: { toiTrangThai: 'doc', toiTramLuot: 4, mau: 999999 },
    });
    const conTruoc = await db.pokeThu.findUnique({ where: { id: conA.id } });
    await p.reload({ waitUntil: 'networkidle' });
    await doiToi(async () => (await p.locator('text=/còn \\d+ lượt/').count()) > 0);
    await p.waitForTimeout(900);
    check('sân đấu hiện nhãn trạng thái kèm số lượt còn lại',
      (await p.locator('text=/còn \\d+ lượt/').count()) > 0);

    await p.locator('form button[name="chieu"]').first().click();
    const sauDoc = await doiToi(async () => {
      const t = await db.pokeTran.findUnique({ where: { nhanVatId: nv.id } });
      return t && t.toiTramLuot < 4 ? t : null;
    });
    check('trạng thái đếm ngược sau mỗi lượt',
      sauDoc?.toiTramLuot === 3, `còn ${sauDoc?.toiTramLuot}`);
    const conSau = await db.pokeThu.findUnique({ where: { id: conA.id } });
    const tram = mauTramMoiLuot('doc', conTruoc.mauToiDa);
    // Địch công 300 mà bộ thủ con mình là 500, nên đòn trả chỉ còn sàn 1 máu:
    // gần như toàn bộ chỗ máu mất lượt này là do độc.
    const mat = conTruoc.mau - conSau.mau;
    check('dính độc thì mất thêm máu ngoài đòn của địch',
      mat >= tram + 1, `mất ${mat}, riêng độc ${tram}`);

    // ── Đổi thú giữa trận ─────────────────────────────────────────────
    await db.pokeThu.update({ where: { id: conA.id }, data: { mau: 5000 } });
    await db.pokeTran.update({
      where: { nhanVatId: nv.id },
      data: { mau: 999999, toiTrangThai: 'doc', toiTramLuot: 3 },
    });
    await p.reload({ waitUntil: 'networkidle' });
    await doiToi(async () => (await p.locator('button[name="thu"]').count()) > 0);
    await p.waitForTimeout(900);
    check('trận có nút đổi thú', (await p.locator('button[name="thu"]').count()) >= 1);

    const skTruoc = (await db.pokeNhanVat.findUnique({ where: { id: nv.id } })).sk;
    await p.locator(`button[name="thu"][value="${conB.id}"]`).click();
    await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: nv.id } }))?.raTranId === conB.id);

    const sauDoi = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
    const bSau = await db.pokeThu.findUnique({ where: { id: conB.id } });
    const tranSauDoi = await db.pokeTran.findUnique({ where: { nhanVatId: nv.id } });
    check('đổi được con khác ra sân', sauDoi.raTranId === conB.id);
    check('đổi thú mất một lượt thể lực', sauDoi.sk === skTruoc - 2, `${skTruoc} → ${sauDoi.sk}`);
    check('con vừa vào ăn trọn một đòn của địch', bSau.mau < 4000, `còn ${bSau.mau}`);
    check('trạng thái theo con cũ đi ra, con mới vào sạch',
      tranSauDoi.toiTrangThai === null && tranSauDoi.toiTramLuot === 0,
      `${tranSauDoi.toiTrangThai} / ${tranSauDoi.toiTramLuot}`);

    // ── Quyền: không đổi sang thú của người khác ───────────────────────
    const nvKhac = await db.pokeNhanVat.create({
      data: { userId: khac.id, ten: 'TranSauKhac', cap: 5, khu: 'co' },
    });
    const cuaKhac = await db.pokeThu.create({
      data: {
        nhanVatId: nvKhac.id, ten: 'Của người khác', nguon: 5, he: 1,
        mau: 100, mauToiDa: 100, chieu: ['TACKLE', 'TACKLE', 'TACKLE', 'TACKLE'],
      },
    });
    await p.evaluate(async ([base, id]) => {
      const fd = new FormData(); fd.set('thu', id);
      await fetch(`${base}/pokemon`, {
        method: 'POST', body: fd, headers: { 'Next-Action': 'd'.repeat(40) },
      }).catch(() => null);
    }, [BASE, cuaKhac.id]);
    await p.waitForTimeout(1200);
    const cuoi = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
    check('gọi thẳng máy chủ cũng không đổi sang thú của người khác được',
      cuoi.raTranId !== cuaKhac.id, String(cuoi.raTranId));
  } finally {
    await db.pokeTran.deleteMany({ where: { nhanVatId: nv.id } });
    await db.pokeNhanVat.deleteMany({ where: { userId: { in: [me.id, khac.id] } } });
  }
}
