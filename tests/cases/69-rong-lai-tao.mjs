import { BASE, db, openPage, doiToi } from '../helpers.mjs';
import {
  AP_MS, DOI_TOI_DA, GIA_LAI, LAI_CAP_TOI_THIEU, LAI_CHO_MS, LAI_TOI_DA,
  SO_LOAI, SO_MAU, bocTrungLai, chiSo,
} from '../../src/lib/rong-const.ts';

/**
 * Lai tạo: ghép hai con rồng lấy một quả trứng.
 *
 * Đây là chỗ tiêu điểm thật và sinh ra một con rồng mới, nên bài kiểm bám vào
 * đúng những chỗ mất tiền oan hoặc đẻ ra rồng chùa:
 *
 *   • việc bị chặn thì KHÔNG được trừ điểm;
 *   • rồng của người khác không lai ké được — mỗi hàm là một endpoint công khai;
 *   • hết lượt lai, chưa nghỉ đủ, chuồng đầy: cả ba đều phải chặn ở MÁY CHỦ.
 */
const KHOA = 'kiemthu-lai-rong';

export default async function run(check) {
  // ── Di truyền, hàm thuần ──────────────────────────────────────────────
  const cha = { loai: 3, mau: 1, doi: 1 };
  const me = { loai: 7, mau: 5, doi: 2 };

  // Tung xu luôn cao thì không đột biến, và luôn lấy của con thứ HAI.
  const conCao = bocTrungLai(cha, me, () => 0.99);
  check('không đột biến thì loài lấy của cha hoặc mẹ',
    conCao.loai === cha.loai || conCao.loai === me.loai, `ra loài ${conCao.loai}`);
  check('màu cũng vậy', conCao.mau === cha.mau || conCao.mau === me.mau);
  check('con lai lên một đời so với bên cao hơn', conCao.doi === 3, `đời ${conCao.doi}`);

  // Tung xu luôn 0 thì rơi vào nhánh đột biến.
  const dotBien = bocTrungLai(cha, me, () => 0);
  check('đột biến vẫn ra loài hợp lệ', dotBien.loai >= 1 && dotBien.loai <= SO_LOAI);
  check('đột biến vẫn ra màu hợp lệ', dotBien.mau >= 1 && dotBien.mau <= SO_MAU);

  const gia = { loai: 1, mau: 1, doi: DOI_TOI_DA };
  check('đời có trần', bocTrungLai(gia, gia, () => 0.99).doi === DOI_TOI_DA);

  // Đời phải CÓ TÁC DỤNG, không thì là con số chết trên màn hình.
  const d1 = chiSo({ loai: 1, cap: 10, vui: 100, doi: 1 });
  const d5 = chiSo({ loai: 1, cap: 10, vui: 100, doi: DOI_TOI_DA });
  check('đời cao thì mạnh hơn', d5.cong > d1.cong && d5.thu > d1.thu, `${d1.cong} → ${d5.cong}`);
  check('nhưng hơn có chừng mực', d5.cong - d1.cong === DOI_TOI_DA - 1,
    `chênh ${d5.cong - d1.cong}`);
  check('không truyền đời thì tính như đời 1',
    chiSo({ loai: 1, cap: 10, vui: 100 }).cong === d1.cong);

  // ── Phần chạy thật ────────────────────────────────────────────────────
  const a = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const b = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!a || !b) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }

  const diem = async (id) =>
    (await db.user.findUnique({ where: { id }, select: { points: true } }))?.points ?? 0;
  const diemCu = { a: await diem(a.id), b: await diem(b.id) };

  const wipe = async () => {
    await db.rongTran.deleteMany({ where: { OR: [{ a: { userId: { in: [a.id, b.id] } } }, { b: { userId: { in: [a.id, b.id] } } }] } });
    await db.rong.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.rongNguoiChoi.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
  };
  await wipe();

  try {
    await db.user.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { points: 3000 } });

    const luc = new Date();
    const noRa = (userId, loai, mau, cap, ten, them = {}) => db.rong.create({
      data: {
        userId, loai, mau, cap, vui: 80, vuiTinhAt: luc, apXongAt: luc, noAt: luc, ten, ...them,
      },
      select: { id: true },
    });

    const non = await noRa(a.id, 1, 1, LAI_CAP_TOI_THIEU - 1, `${KHOA} con non`);
    const bo1 = await noRa(a.id, 3, 2, LAI_CAP_TOI_THIEU, `${KHOA} bo mot`);

    const p = await openPage('minhdev');
    const mo = async () => {
      await p.goto(`${BASE}/rong/ap-trung`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(600);
    };
    await mo();

    check('chỉ một con đủ tuổi thì chưa lai được',
      (await p.locator('button:has-text("Lai ·")').count()) === 0);

    // ── Gọi thẳng máy chủ với con chưa đủ cấp ───────────────────────────
    // Giao diện không bày nút, nhưng hàm lai là endpoint POST công khai.
    const truocNon = await diem(a.id);
    const soTruoc = await db.rong.count({ where: { userId: a.id } });
    await p.evaluate(async ([base, x, y]) => {
      const fd = new FormData();
      fd.set('cha', x); fd.set('me', y);
      await fetch(`${base}/rong/ap-trung`, { method: 'POST', body: fd }).catch(() => {});
    }, [BASE, non.id, bo1.id]);
    await p.waitForTimeout(1200);
    check('con chưa đủ cấp thì không lai ra trứng nào',
      (await db.rong.count({ where: { userId: a.id } })) === soTruoc);
    check('và không mất điểm vì lượt gửi ấy', (await diem(a.id)) === truocNon);

    // ── Lai thật ────────────────────────────────────────────────────────
    const bo2 = await noRa(a.id, 8, 4, LAI_CAP_TOI_THIEU + 5, `${KHOA} bo hai`);
    await mo();

    const truoc = await diem(a.id);
    await p.locator('select').first().selectOption(bo1.id);
    await p.locator('select').nth(1).selectOption(bo2.id);
    await p.locator('button:has-text("Lai ·")').click();
    await doiToi(async () => (await db.rong.count({ where: { userId: a.id, noAt: null } })) > 0);

    const trung = await db.rong.findFirst({
      where: { userId: a.id, noAt: null },
      select: { loai: true, mau: true, doi: true, chaId: true, meId: true, apXongAt: true },
    });
    check('lai trừ đúng giá', (await diem(a.id)) === truoc - GIA_LAI, `còn ${await diem(a.id)}`);
    check('lai ra một quả TRỨNG chứ không phải rồng đã nở', !!trung);
    check('trứng ghi đúng cha mẹ',
      trung.chaId === bo1.id && trung.meId === bo2.id);
    check('trứng lai là đời 2', trung.doi === 2, `đời ${trung.doi}`);
    check('trứng lai vẫn phải ấp', trung.apXongAt.getTime() > Date.now(),
      `hẹn ${trung.apXongAt.toISOString()}`);
    check('trứng lai mang loài hợp lệ', trung.loai >= 1 && trung.loai <= SO_LOAI);

    const sauLai = await db.rong.findMany({
      where: { id: { in: [bo1.id, bo2.id] } },
      select: { soLanLai: true, laiLanCuoi: true },
    });
    check('cả hai bố mẹ đều tăng số lần lai', sauLai.every((r) => r.soLanLai === 1));
    check('và đều bắt đầu nghỉ', sauLai.every((r) => r.laiLanCuoi !== null));

    // ── Lai lại ngay thì bị chặn, và không mất điểm ──────────────────────
    await mo();
    const truoc2 = await diem(a.id);
    const soTrung = await db.rong.count({ where: { userId: a.id, noAt: null } });
    await p.evaluate(async ([base, x, y]) => {
      const fd = new FormData();
      fd.set('cha', x); fd.set('me', y);
      await fetch(`${base}/rong/ap-trung`, { method: 'POST', body: fd }).catch(() => {});
    }, [BASE, bo1.id, bo2.id]);
    await p.waitForTimeout(1200);
    check('chưa nghỉ đủ thì không lai tiếp được',
      (await db.rong.count({ where: { userId: a.id, noAt: null } })) === soTrung);
    check('và cũng không mất điểm', (await diem(a.id)) === truoc2);

    // ── Hết lượt lai ────────────────────────────────────────────────────
    const xa = new Date(Date.now() - LAI_CHO_MS - 60_000);
    await db.rong.updateMany({
      where: { id: { in: [bo1.id, bo2.id] } },
      data: { soLanLai: LAI_TOI_DA, laiLanCuoi: xa },
    });
    await mo();
    check('hết lượt lai thì không còn nút lai',
      (await p.locator('button:has-text("Lai ·")').count()) === 0);

    // ── Rồng của người khác thì không lai ké ────────────────────────────
    await db.rong.updateMany({
      where: { id: { in: [bo1.id, bo2.id] } },
      data: { soLanLai: 0, laiLanCuoi: xa },
    });
    const cuaNguoiKhac = await noRa(b.id, 5, 5, 20, `${KHOA} cua nguoi khac`);
    const truoc3 = await diem(a.id);
    const soTrung3 = await db.rong.count({ where: { userId: a.id, noAt: null } });
    await p.evaluate(async ([base, x, y]) => {
      const fd = new FormData();
      fd.set('cha', x); fd.set('me', y);
      await fetch(`${base}/rong/ap-trung`, { method: 'POST', body: fd }).catch(() => {});
    }, [BASE, bo1.id, cuaNguoiKhac.id]);
    await p.waitForTimeout(1200);
    check('không lai ké được rồng của người khác',
      (await db.rong.count({ where: { userId: a.id, noAt: null } })) === soTrung3);
    check('và không mất điểm vì lượt ấy', (await diem(a.id)) === truoc3);
    check('rồng người kia không hề đổi',
      (await db.rong.findUnique({ where: { id: cuaNguoiKhac.id }, select: { soLanLai: true } }))?.soLanLai === 0);

    // Trứng lai phải nở ĐÚNG khoảng ấp thường, không dài hơn.
    check('thời gian ấp trứng lai bằng trứng thường',
      trung.apXongAt.getTime() - luc.getTime() <= AP_MS + 60_000);
  } finally {
    await wipe();
    await db.user.update({ where: { id: a.id }, data: { points: diemCu.a } });
    await db.user.update({ where: { id: b.id }, data: { points: diemCu.b } });
  }
}
