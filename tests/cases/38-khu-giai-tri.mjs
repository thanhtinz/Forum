import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Khu giải trí — oẳn tù tì.
 *
 * Bàn bầu cua chung nằm ở ca kiểm riêng (39), vì nó chạy theo phiên chứ không
 * phải bấm phát ăn ngay.
 *
 * Trò này đụng thẳng vào điểm nên chỗ đáng soi không phải là "chơi có vui
 * không" mà là:
 *   • trần ván mỗi ngày là thật, không lách bằng cách gửi thẳng biểu mẫu,
 *   • hết lượt thì không có đường nào chơi thêm,
 *   • khách vãng lai không chơi được.
 */
const VAN_MOI_NGAY = 30;

export default async function run(check) {
  const ai = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!ai) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const cu = await db.user.findUnique({
    where: { id: ai.id }, select: { points: true },
  });
  const dauNgay = new Date(Date.parse(
    `${new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)}T00:00:00Z`,
  ) - 7 * 3600 * 1000);

  const wipe = async () => {
    await db.miniGamePlay.deleteMany({ where: { userId: ai.id } });
  };
  await wipe();

  const diem = async () => (await db.user.findUnique({
    where: { id: ai.id }, select: { points: true },
  }))?.points ?? 0;

  try {
    await db.user.update({
      where: { id: ai.id }, data: { points: 5000 }, select: { id: true },
    });

    const p = await openPage('huytran');

    // ── Một ván thật: điểm đổi đúng bằng kết quả ────────────────────────
    await p.goto(`${BASE}/giai-tri/oan-tu-ti`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const truocVan = await diem();
    await p.fill('input[name="cuoc"]', '20');
    await p.locator('button:has-text("Oẳn tù tì!")').click();
    await p.waitForTimeout(2500);

    const van = await db.miniGamePlay.findFirst({
      where: { userId: ai.id, game: 'OANTUTI' }, orderBy: { createdAt: 'desc' },
      select: { bet: true, delta: true, detail: true },
    });
    check('ván có vào sổ chơi', !!van, JSON.stringify(van));
    check('cược ghi đúng số đã nhập', van?.bet === 20, `ghi ${van?.bet}`);
    check('điểm đổi đúng bằng kết quả ván',
      (await diem()) === truocVan + (van?.delta ?? 0),
      `${truocVan} → ${await diem()}, delta ${van?.delta}`);
    // Thắng ăn đúng số cược, thua mất đúng số ấy, hoà thì không đổi gì.
    check('ăn thua đúng một lần tiền cược', [20, 0, -20].includes(van?.delta ?? 999),
      `delta ${van?.delta}`);
    if (van?.detail) {
      const [toi, may] = van.detail.split(' vs ');
      const thang = (toi === 'Búa' && may === 'Kéo') || (toi === 'Kéo' && may === 'Bao')
        || (toi === 'Bao' && may === 'Búa');
      const dung = toi === may ? 0 : thang ? 20 : -20;
      check('chữ kể lại khớp với việc cộng trừ điểm', van.delta === dung,
        `${van.detail} → delta ${van.delta}, đáng lẽ ${dung}`);
    }

    // ── Cược ngoài khoảng cho phép bị chặn ──────────────────────────────
    const truocSai = await diem();
    const soVanTruoc = await db.miniGamePlay.count({ where: { userId: ai.id, game: 'OANTUTI' } });
    await p.evaluate(() => {
      const el = document.querySelector('input[name="cuoc"]');
      const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
      setter.call(el, '99999');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.removeAttribute('max');
    });
    await p.locator('button:has-text("Oẳn tù tì!")').click();
    await p.waitForTimeout(2200);
    check('cược quá trần bị chặn ở máy chủ',
      (await db.miniGamePlay.count({ where: { userId: ai.id, game: 'OANTUTI' } })) === soVanTruoc);
    check('ván bị chặn không đụng vào điểm', (await diem()) === truocSai);

    // ── Thiếu điểm thì không mất gì ─────────────────────────────────────
    await db.user.update({ where: { id: ai.id }, data: { points: 5 }, select: { id: true } });
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    await p.fill('input[name="cuoc"]', '100');
    await p.locator('button:has-text("Oẳn tù tì!")').click();
    await p.waitForTimeout(2200);
    check('không đủ điểm thì vẫn còn nguyên 5 điểm', (await diem()) === 5, `còn ${await diem()}`);
    check('có báo không đủ điểm', (await p.locator('text=không đủ điểm').count()) > 0);

    // ── Trần ván mỗi ngày ───────────────────────────────────────────────
    await db.user.update({ where: { id: ai.id }, data: { points: 5000 }, select: { id: true } });
    // Nhồi cho đủ trần bằng dữ liệu, rồi thử chơi thêm một ván thật.
    await db.miniGamePlay.createMany({
      data: Array.from({ length: VAN_MOI_NGAY }, () => ({
        userId: ai.id, game: 'OANTUTI', bet: 10, delta: -10, createdAt: new Date(dauNgay.getTime() + 60000),
      })),
    });
    await p.goto(`${BASE}/giai-tri/oan-tu-ti`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const truocTran = await diem();
    check('hết lượt thì nút chơi bị khoá',
      await p.locator('button:has-text("Oẳn tù tì!")').isDisabled());
    check('trang nói rõ còn 0 ván', (await p.locator('text=Còn 0 ván').count()) > 0);
    check('hết lượt thì điểm không đổi', (await diem()) === truocTran);

    // ── Khách vãng lai không chơi được ──────────────────────────────────
    const khach = await openPage(null);
    await khach.goto(`${BASE}/giai-tri/oan-tu-ti`, { waitUntil: 'networkidle' });
    await khach.waitForTimeout(800);
    check('khách vãng lai không có ô chơi',
      (await khach.locator('button:has-text("Đặt cửa")').count()) === 0);
    check('khách vãng lai được mời đăng nhập',
      (await khach.locator('a:has-text("Đăng nhập")').count()) > 0);
  } finally {
    await wipe();
    await db.user.update({
      where: { id: ai.id },
      data: { points: cu?.points ?? 0 },
      select: { id: true },
    });
  }
}
