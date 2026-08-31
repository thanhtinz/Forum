import { BASE, db, doiToi, openPage } from '../helpers.mjs';
import {
  MOC_DO_GIAM, NHIEM_VU_NGAY, dauNgayVN, mocDoGiamDatDuoc,
} from '../../src/lib/pokemon-const.ts';

/**
 * Thưởng Đồ Giám và ba việc hằng ngày.
 *
 * Trước đợt này, sổ 468 loài chỉ là hai thanh tiến độ — sưu tầm đủ cả sổ mà
 * KHÔNG có phần thưởng nào — còn chuỗi nhiệm vụ thì đúng bốn bước, nhận hết là
 * mục Nhiệm vụ vĩnh viễn trống.
 */
export default async function run(check) {
  // ── Phần luật thuần ──────────────────────────────────────────────────
  check('chưa gặp con nào thì chưa đạt mốc nào', mocDoGiamDatDuoc(0, 0) === 0);
  check('gặp đủ mốc đầu thì đạt đúng một mốc', mocDoGiamDatDuoc(50, 0) === 1);
  check('mốc bắt chưa đủ thì dừng lại ở đó, không nhảy cóc',
    mocDoGiamDatDuoc(468, 0) === 1, String(mocDoGiamDatDuoc(468, 0)));
  check('gặp và bắt đủ hết thì đạt trọn bộ mốc',
    mocDoGiamDatDuoc(468, 468) === MOC_DO_GIAM.length);
  check('mốc sau luôn thưởng hơn mốc trước',
    MOC_DO_GIAM.every((m, i) => i === 0 || m.vang > MOC_DO_GIAM[i - 1].vang));
  check('có đủ ba việc hằng ngày', NHIEM_VU_NGAY.length === 3);

  // ── Trong ứng dụng thật ──────────────────────────────────────────────
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  if (!me) { check('có dữ liệu mẫu', false, 'thiếu minhdev'); return; }
  await db.pokeNhanVat.deleteMany({ where: { userId: me.id } });

  const nv = await db.pokeNhanVat.create({
    data: { userId: me.id, ten: 'ThuongSo', cap: 20, khu: 'co', vang: 0, ngoc: 0, cau: 0, da: 0 },
  });
  const p = await openPage('minhdev');

  try {
    // ── Mốc Đồ Giám ────────────────────────────────────────────────────
    const hoang = await db.pokeThuHoang.findMany({
      select: { nguon: true, ten: true, he: true }, take: 1000, orderBy: { nguon: 'asc' },
    });
    const rieng = [...new Map(hoang.map((h) => [h.nguon, h])).values()];
    check('có đủ loài để dựng mốc', rieng.length >= 50, `${rieng.length} loài`);

    await p.goto(`${BASE}/pokemon/do-giam`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await p.locator('button:has-text("Chưa tới mốc")').count()) > 0);
    check('chưa tới mốc thì nút nhận bị khoá',
      await p.locator('button:has-text("Chưa tới mốc")').first().isDisabled());

    // Ghi đủ 50 loài đã gặp — mốc đầu tiên.
    for (const h of rieng.slice(0, MOC_DO_GIAM[0].gap)) {
      await db.pokeDoGiam.create({
        data: { nhanVatId: nv.id, nguon: h.nguon, ten: h.ten, he: h.he, daBat: false },
      });
    }
    await p.reload({ waitUntil: 'networkidle' });
    await doiToi(async () => (await p.locator('button:has-text("Nhận thưởng")').count()) > 0);
    await p.waitForTimeout(900);
    check('đủ mốc thì hiện nút nhận thưởng',
      (await p.locator('button:has-text("Nhận thưởng")').count()) === 1);

    await p.locator('button:has-text("Nhận thưởng")').click();
    await doiToi(async () => (await db.pokeNhanVat.findUnique({ where: { id: nv.id } }))?.mocDoGiam === 1);

    const sau = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
    const m0 = MOC_DO_GIAM[0];
    check('nhận mốc thì ghi đúng số mốc đã nhận', sau.mocDoGiam === 1, String(sau.mocDoGiam));
    check('nhận mốc thì cộng đúng phần thưởng',
      sau.vang === m0.vang && sau.ngoc === m0.ngoc && sau.cau === m0.cau && sau.da === m0.da,
      `${sau.vang} vàng, ${sau.ngoc} ngọc, ${sau.cau} cầu, ${sau.da} đá`);

    // Bấm lại: mốc hai chưa đạt nên phải bị chặn, và không cộng thêm gì.
    await p.reload({ waitUntil: 'networkidle' });
    await doiToi(async () => (await p.locator('button:has-text("Chưa tới mốc")').count()) > 0);
    check('nhận xong thì nút khoá lại cho tới mốc sau',
      await p.locator('button:has-text("Chưa tới mốc")').first().isDisabled());

    await p.evaluate(async (base) => {
      await fetch(`${base}/pokemon/do-giam`, {
        method: 'POST', body: new FormData(), headers: { 'Next-Action': 'f'.repeat(40) },
      }).catch(() => null);
    }, BASE);
    await p.waitForTimeout(1200);
    const lai = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
    check('gọi thẳng máy chủ cũng không nhận được mốc chưa đạt',
      lai.mocDoGiam === 1 && lai.vang === m0.vang, `mốc ${lai.mocDoGiam}, ${lai.vang} vàng`);

    // ── Việc hằng ngày ─────────────────────────────────────────────────
    await p.goto(`${BASE}/pokemon/nhiem-vu`, { waitUntil: 'networkidle' });
    await doiToi(async () => (await db.pokeNhiemVuNgay.count({ where: { nhanVatId: nv.id } })) === 3);
    await p.waitForTimeout(900);

    const ngay = dauNgayVN(new Date());
    const dong = await db.pokeNhiemVuNgay.findMany({ where: { nhanVatId: nv.id, ngay } });
    check('mở trang là ba việc của hôm nay tự sinh ra', dong.length === 3, `${dong.length} dòng`);
    check('mốc đầu ngày chép đúng bộ đếm lúc ấy',
      dong.every((d) => d.mocDau === 0), dong.map((d) => `${d.ma}=${d.mocDau}`).join(' '));
    const nutNgay = p.locator('form:has(input[name="ma"]) button');
    check('chưa làm gì thì chưa nhận được',
      (await nutNgay.count()) === 3
      && (await p.locator('form:has(input[name="ma"]) button:has-text("Chưa xong")').count()) === 3,
      `${await nutNgay.count()} nút`);

    // Đẩy bộ đếm hạ gục lên đủ mức: tiến độ là HIỆU với mốc đầu ngày.
    const viecHa = NHIEM_VU_NGAY.find((v) => v.ma === 'haGuc');
    await db.pokeNhanVat.update({ where: { id: nv.id }, data: { soHaGuc: viecHa.can } });
    await p.reload({ waitUntil: 'networkidle' });
    await doiToi(async () =>
      (await p.locator('form:has(input[name="ma"]) button:has-text("Nhận thưởng")').count()) > 0);
    await p.waitForTimeout(900);

    const truocNhan = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
    await p.locator('form:has(input[name="ma"]) button:has-text("Nhận thưởng")').first().click();
    await doiToi(async () =>
      (await db.pokeNhiemVuNgay.findFirst({ where: { nhanVatId: nv.id, ma: 'haGuc' } }))?.daNhan === true);

    const sauNgay = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
    check('làm xong việc ngày thì nhận được thưởng',
      sauNgay.vang === truocNhan.vang + viecHa.vang
      && sauNgay.ngoc === truocNhan.ngoc + viecHa.ngoc
      && sauNgay.cau === truocNhan.cau + viecHa.cau,
      `${truocNhan.vang} → ${sauNgay.vang}`);

    // Nhận hai lần: ràng buộc `daNhan: false` trong `where` phải chặn.
    await p.evaluate(async (base) => {
      const fd = new FormData(); fd.set('ma', 'haGuc');
      await fetch(`${base}/pokemon/nhiem-vu`, {
        method: 'POST', body: fd, headers: { 'Next-Action': 'g'.repeat(40) },
      }).catch(() => null);
    }, BASE);
    await p.waitForTimeout(1200);
    const cuoi = await db.pokeNhanVat.findUnique({ where: { id: nv.id } });
    check('gọi lại lần nữa không phát thưởng lần thứ hai',
      cuoi.vang === sauNgay.vang, `${sauNgay.vang} → ${cuoi.vang}`);

    // Sang ngày mới thì dòng cũ không còn tính, việc mở lại từ đầu.
    const homQua = new Date(ngay.getTime() - 24 * 3600_000);
    await db.pokeNhiemVuNgay.updateMany({ where: { nhanVatId: nv.id }, data: { ngay: homQua } });
    await p.reload({ waitUntil: 'networkidle' });
    await doiToi(async () =>
      (await db.pokeNhiemVuNgay.count({ where: { nhanVatId: nv.id, ngay } })) === 3);
    const homNay = await db.pokeNhiemVuNgay.findMany({ where: { nhanVatId: nv.id, ngay } });
    check('sang ngày mới thì ba việc mở lại từ đầu',
      homNay.length === 3 && homNay.every((d) => !d.daNhan));
    check('mốc đầu ngày mới chép lại bộ đếm hiện tại, không tính lại từ 0',
      homNay.find((d) => d.ma === 'haGuc')?.mocDau === viecHa.can,
      String(homNay.find((d) => d.ma === 'haGuc')?.mocDau));
  } finally {
    await db.pokeNhanVat.deleteMany({ where: { userId: me.id } });
  }
}
