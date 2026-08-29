import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Bàn bầu cua chung.
 *
 * Cả nhà ngồi một bàn, hết giờ hệ thống tự xóc. Không có tiến trình chạy nền
 * nào: phiên tính theo đồng hồ, và chính lượt người ta mở trang là thứ chốt sổ
 * phiên đã hết giờ. Nên bốn chỗ phải soi:
 *   • đặt cửa là TRỪ ĐIỂM NGAY, không ai ngồi vào chiếu mà chưa trả tiền,
 *   • người này đặt thì người kia thấy — đó mới là "chung một bàn",
 *   • tới giờ thì tự xóc và trả thưởng ĐÚNG số viên trúng,
 *   • một phiên chỉ xóc MỘT lần, dù mười người cùng ghé đúng lúc ấy.
 */
export default async function run(check) {
  const a = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const b = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!a || !b) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const diemCu = Object.fromEntries(
    (await db.user.findMany({ where: { id: { in: [a.id, b.id] } }, select: { id: true, points: true } }))
      .map((u) => [u.id, u.points]),
  );
  const wipe = async () => {
    await db.bauCuaBet.deleteMany({ where: { userId: { in: [a.id, b.id] } } });
    await db.bauCuaRound.deleteMany({ where: { startAt: { lt: new Date(0) } } });
  };
  await wipe();

  const diem = async (id) => (await db.user.findUnique({ where: { id }, select: { points: true } }))?.points ?? 0;

  try {
    await db.user.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { points: 5000 } });

    const pa = await openPage('minhdev');
    const pb = await openPage('huytran');
    const mo = async (p) => {
      await p.goto(`${BASE}/giai-tri/bau-cua`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(1200);
    };
    await mo(pa);

    // Chờ tới đầu một phiên còn nhiều thời gian rồi hẵng chơi. Hỏi thẳng máy
    // chủ chứ không đọc chữ trên trang: chữ chỉ mới đúng ở lần hỏi gần nhất,
    // mà cả bài kiểm này phụ thuộc vào việc còn kịp đặt cửa.
    const conMs = async () => pa.evaluate(async (base) => {
      const r = await fetch(`${base}/api/bau-cua`, { cache: 'no-store' });
      const d = await r.json();
      return d.conMs;
    }, BASE);
    for (let i = 0; i < 5; i++) {
      const ms = await conMs();
      if (ms >= 25000) break;
      // Ngủ cho hết phần còn lại của phiên này cộng quãng xóc, rồi hỏi lại.
      await pa.waitForTimeout(Math.max(1000, ms) + 16000);
    }
    await mo(pa);
    await mo(pb);

    // ── Đặt cửa là trừ điểm ngay ────────────────────────────────────────
    const truocA = await diem(a.id);
    await pa.locator('label[title="Bầu"]').click();
    await pa.fill('input[name="cuoc"]', '20');
    await pa.locator('form button[type="submit"]').click();
    await pa.waitForTimeout(2500);
    check('đặt cửa thì trừ điểm ngay', (await diem(a.id)) === truocA - 20,
      `${truocA} → ${await diem(a.id)}`);

    const cuaA = await db.bauCuaBet.findFirst({
      where: { userId: a.id }, orderBy: { createdAt: 'desc' },
      select: { con: true, amount: true, payout: true, roundId: true },
    });
    check('cửa vừa đặt có vào sổ', cuaA?.amount === 20, JSON.stringify(cuaA));
    check('cửa chưa chốt thì chưa có tiền trả', cuaA?.payout === null);

    // ── Người kia đặt thì mình thấy ─────────────────────────────────────
    await pb.locator('label[title="Gà"]').click();
    await pb.fill('input[name="cuoc"]', '30');
    await pb.locator('form button[type="submit"]').click();
    await pb.waitForTimeout(2500);
    // Trang tự hỏi lại máy chủ mỗi hai giây, chờ một nhịp là thấy.
    await pa.waitForTimeout(3000);
    const banA = await pa.locator('main').innerText();
    check('người này đặt thì người kia thấy cả bàn',
      banA.includes('cả bàn 50 điểm'), banA.slice(0, 200));

    // ── Tới giờ thì tự xóc và trả thưởng đúng ───────────────────────────
    // Kéo giờ đóng cửa về quá khứ để khỏi phải ngồi chờ hết phiên thật.
    await db.bauCuaRound.update({
      where: { id: cuaA.roundId },
      data: { closeAt: new Date(Date.now() - 1000) },
      select: { id: true },
    });
    const truocXocA = await diem(a.id);
    const truocXocB = await diem(b.id);
    // Chính lượt mở trang là thứ chốt sổ.
    await mo(pa);
    await pa.waitForTimeout(1500);

    const phien = await db.bauCuaRound.findUnique({
      where: { id: cuaA.roundId }, select: { dice: true, rolledAt: true },
    });
    check('hết giờ thì phiên tự xóc', !!phien?.dice && !!phien.rolledAt, JSON.stringify(phien));

    const dice = (phien?.dice ?? '').split(',').map(Number);
    const cua = await db.bauCuaBet.findMany({
      where: { roundId: cuaA.roundId }, select: { userId: true, con: true, amount: true, payout: true },
    });
    check('mọi cửa đều đã chốt', cua.every((c) => c.payout !== null), JSON.stringify(cua));

    let sai = null;
    for (const c of cua) {
      const trung = dice.filter((d) => d === c.con).length;
      const dung = trung === 0 ? 0 : c.amount * (trung + 1);
      if (c.payout !== dung) sai = `cửa ${c.con}: trả ${c.payout}, đáng lẽ ${dung} (bát ${dice})`;
    }
    check('trả thưởng đúng số viên trúng', sai === null, sai ?? '');

    const traA = cua.filter((c) => c.userId === a.id).reduce((s, c) => s + (c.payout ?? 0), 0);
    const traB = cua.filter((c) => c.userId === b.id).reduce((s, c) => s + (c.payout ?? 0), 0);
    check('điểm người A cộng đúng phần được trả', (await diem(a.id)) === truocXocA + traA,
      `${truocXocA} + ${traA} ≠ ${await diem(a.id)}`);
    check('điểm người B cộng đúng phần được trả', (await diem(b.id)) === truocXocB + traB,
      `${truocXocB} + ${traB} ≠ ${await diem(b.id)}`);

    // ── Một phiên chỉ xóc một lần ───────────────────────────────────────
    const batTruoc = phien?.dice;
    const diemTruoc = await diem(a.id);
    await Promise.all([mo(pa), mo(pb)]);
    await pa.waitForTimeout(1500);
    const lai = await db.bauCuaRound.findUnique({ where: { id: cuaA.roundId }, select: { dice: true } });
    check('ghé lại không xóc lại phiên cũ', lai?.dice === batTruoc, `${batTruoc} → ${lai?.dice}`);
    check('và không trả thưởng thêm lần nữa', (await diem(a.id)) === diemTruoc);

    // ── Hết giờ thì không đặt được ──────────────────────────────────────
    // Chờ tới đúng lúc bàn đang xóc / đang mở bát rồi mới thử. Không ép giờ
    // đóng cửa bằng dữ liệu nữa: ép xong mà phiên mới kịp mở thì cửa đặt được
    // là chuyện đúng, bài kiểm lại tưởng hỏng.
    let phaGio = 'dat';
    for (let i = 0; i < 70; i++) {
      phaGio = await pa.evaluate(async (base) => {
        const r = await fetch(`${base}/api/bau-cua`, { cache: 'no-store' });
        return (await r.json()).pha;
      }, BASE);
      if (phaGio !== 'dat') break;
      await pa.waitForTimeout(1000);
    }
    check('bắt được lúc bàn đã khoá cửa', phaGio !== 'dat', `pha ${phaGio}`);

    const truocHetGio = await diem(a.id);
    // Mở khoá nút rồi bấm thật: giao diện chỉ là gợi ý, ai cũng bỏ được thuộc
    // tính `disabled`. Phải thấy MÁY CHỦ chặn thì mới yên tâm.
    await pa.evaluate(() => {
      for (const el of document.querySelectorAll('form :disabled')) el.disabled = false;
    });
    await pa.locator('form button[type="submit"]').click();
    await pa.waitForTimeout(2500);
    check('gửi thẳng biểu mẫu lúc đã khoá cũng không trừ điểm',
      (await diem(a.id)) === truocHetGio, `${truocHetGio} → ${await diem(a.id)}`);
    check('có báo hết giờ đặt cửa',
      (await pa.locator('text=Hết giờ đặt cửa').count()) > 0);

  } finally {
    await wipe();
    for (const [id, points] of Object.entries(diemCu)) {
      await db.user.update({ where: { id }, data: { points }, select: { id: true } });
    }
  }
}
