import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Bình luận dưới mỗi game.
 *
 * Wap tải game Việt ngày xưa trang game nào cũng có phần này — đó mới là chỗ
 * người ta hỏi "máy mình chạy được không". Bình luận dùng chung model với bài
 * viết (một cột cho mỗi đối tượng), nên phải kiểm rằng bộ đếm cộng/trừ đúng
 * BẢNG của game chứ không nhầm sang bài viết.
 */
export default async function run(check) {
  const game = await db.game.findFirst({ where: { status: 'PUBLISHED' }, select: { id: true, slug: true } });
  if (!game) { check('có game để kiểm', false, 'chưa seed game nào'); return; }

  await db.comment.deleteMany({ where: { gameId: game.id } });
  await db.game.update({ where: { id: game.id }, data: { commentCount: 0 }, select: { id: true } });

  const url = `${BASE}/games/${game.slug}`;
  const member = await openPage('minhdev');
  const admin = await openPage('admin@nova.local', 'admin123');
  const guest = await openPage(null);

  try {
    await member.goto(url, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    check('trang game có mục bình luận', (await member.locator('h2:has-text("Bình luận")').count()) > 0);
    check('thành viên có ô soạn', (await member.locator('textarea[name="content"]').count()) > 0);
    // Ô bình luận phải có đúng bộ công cụ như ô trả lời bên diễn đàn.
    check('ô bình luận có nút emoji/sticker/GIF',
      (await member.locator('button[title="Emoji, sticker & GIF"]').count()) > 0);
    check('ô bình luận có nút gửi ảnh', (await member.locator('button[title="Gửi ảnh"]').count()) > 0);

    await member.fill('textarea[name="content"]', 'Máy Nokia 5230 chạy được không mọi người?');
    await member.locator('button[type="submit"]:has-text("Gửi")').first().click();
    await doiToi(async () => (await db.comment.count({ where: { gameId: game.id } })) > 0);
    // Có trong cơ sở dữ liệu chưa đủ: mục kiểm dưới đọc TRANG, mà trang dựng
    // lại sau đó một nhịp.
    await member.locator('text=Nokia 5230 chạy được không').first().waitFor({ timeout: 15000 }).catch(() => {});

    check('bình luận vào đúng game', (await db.comment.count({ where: { gameId: game.id } })) === 1);
    const g1 = await db.game.findUnique({ where: { id: game.id }, select: { commentCount: true } });
    check('bộ đếm của game tăng', g1?.commentCount === 1, `đang là ${g1?.commentCount}`);
    check('bình luận hiện trên trang', (await member.locator('text=Nokia 5230 chạy được không').count()) > 0);

    // ── Trả lời ──────────────────────────────────────────────────────────
    // Phải chờ qua giãn cách chống spam giữa hai lần bình luận, không thì lần
    // này bị chặn vì "quá nhanh" và ta tưởng nhầm là tính năng hỏng.
    await member.waitForTimeout(21_000);
    await member.reload({ waitUntil: 'networkidle' });
    await member.waitForTimeout(800);
    await member.locator('button:has-text("Trả lời")').first().click();
    await member.waitForTimeout(500);
    await member.locator('textarea[name="content"]').last().fill('Chạy tốt nhé bạn.');
    await member.locator('button[type="submit"]:has-text("Gửi")').last().click();
    await doiToi(async () => (await db.comment.count({ where: { gameId: game.id, parentId: { not: null } } })) > 0);
    check('trả lời được bình luận game',
      (await db.comment.count({ where: { gameId: game.id, parentId: { not: null } } })) === 1);

    // ── Quản trị ẩn được, bộ đếm trừ theo ────────────────────────────────
    await admin.goto(url, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(900);
    const hideBtn = admin.locator('button[title*="Ẩn bình luận"]').first();
    check('quản trị thấy nút ẩn', (await hideBtn.count()) > 0);

    const before = (await db.game.findUnique({ where: { id: game.id }, select: { commentCount: true } }))?.commentCount ?? 0;
    await hideBtn.click();
    await doiToi(async () => (await db.game.findUnique({ where: { id: game.id }, select: { commentCount: true } }))?.commentCount === before - 1);
    const after = (await db.game.findUnique({ where: { id: game.id }, select: { commentCount: true } }))?.commentCount ?? 0;
    check('ẩn xong bộ đếm của game trừ đúng', after === before - 1, `${before}→${after}`);
    check('ẩn chứ không xoá', (await db.comment.count({ where: { gameId: game.id, hidden: true } })) === 1);

    // ── Khách ────────────────────────────────────────────────────────────
    await guest.goto(url, { waitUntil: 'networkidle' });
    await guest.waitForTimeout(700);
    check('khách đọc được bình luận', (await guest.locator('h2:has-text("Bình luận")').count()) > 0);
    check('khách không có ô soạn', (await guest.locator('textarea[name="content"]').count()) === 0);

    // ── Không chèn được HTML ─────────────────────────────────────────────
    await member.goto(url, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    let alerted = false;
    member.on('dialog', async (d) => { alerted = true; await d.dismiss(); });
    await member.fill('textarea[name="content"]', '<img src=x onerror=alert(1)> thử chèn mã');
    await member.locator('button[type="submit"]:has-text("Gửi")').first().click();
    await member.waitForTimeout(3000);
    check('không chạy được mã chèn vào bình luận', !alerted);
    check('không sinh thẻ img từ nội dung bình luận', (await member.locator('img[src="x"]').count()) === 0);
  } finally {
    await db.comment.deleteMany({ where: { gameId: game.id } });
    await db.game.update({ where: { id: game.id }, data: { commentCount: 0 }, select: { id: true } });
  }
}
