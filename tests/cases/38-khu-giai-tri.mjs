import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Khu giải trí — hộp quà và oẳn tù tì.
 *
 * Bàn bầu cua chung nằm ở ca kiểm riêng (39), vì nó chạy theo phiên chứ không
 * phải bấm phát ăn ngay.
 *
 * Mấy trò này đụng thẳng vào điểm nên chỗ đáng soi không phải là "chơi có vui
 * không" mà là:
 *   • điểm cộng trừ ĐÚNG bằng kết quả ván, không có đường nào ăn không,
 *   • hộp quà chỉ mở được một lần trong 24 giờ, bấm hai lần cùng lúc cũng vậy,
 *   • trần ván mỗi ngày là thật, không lách bằng cách gửi thẳng biểu mẫu,
 *   • thiếu điểm thì không mất gì, cược ngoài khoảng cho phép thì bị chặn.
 */
const VAN_MOI_NGAY = 30;

export default async function run(check) {
  const ai = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!ai) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const cu = await db.user.findUnique({
    where: { id: ai.id }, select: { points: true, lastGiftAt: true },
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
      where: { id: ai.id }, data: { points: 5000, lastGiftAt: null }, select: { id: true },
    });

    const p = await openPage('huytran');

    // ── Hộp quà ─────────────────────────────────────────────────────────
    await p.goto(`${BASE}/giai-tri`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const truocQua = await diem();
    await p.locator('button:has-text("Mở hộp quà")').click();
    await p.waitForTimeout(2500);
    const sauQua = await diem();
    check('mở hộp quà được cộng đúng 50 điểm', sauQua === truocQua + 50, `${truocQua} → ${sauQua}`);
    check('lượt nhận quà có vào sổ chơi',
      (await db.miniGamePlay.count({ where: { userId: ai.id, game: 'GIFT' } })) === 1);

    // Bấm lần nữa: nút đã khoá, mà gọi thẳng cũng không ăn thêm.
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    check('mở xong thì nút khoá lại',
      (await p.locator('button:has-text("Mở hộp quà")').count()) === 0);
    const lanHai = await diem();
    check('không có đường nhận quà lần hai trong ngày', lanHai === sauQua, `${sauQua} → ${lanHai}`);

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
      data: { points: cu?.points ?? 0, lastGiftAt: cu?.lastGiftAt ?? null },
      select: { id: true },
    });
  }
}
