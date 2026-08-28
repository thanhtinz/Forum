import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Thả tim cho bình luận game.
 *
 * Cột `likeCount` và `Reaction.commentId` đã nằm trong lược đồ từ lâu mà không
 * nơi nào dùng: bình luận là chỗ duy nhất trên trang không thả tim được, trong
 * khi chủ đề, trả lời và bảng tin câu lạc bộ đều thả được. Bài kiểm này soi con
 * số trong cơ sở dữ liệu chứ không tin chữ hiện trên màn hình.
 */
export default async function run(check) {
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const other = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!me || !other) { check('có dữ liệu mẫu', false, 'thiếu người dùng'); return; }

  const game = await db.game.findFirst({ where: { status: 'PUBLISHED' }, select: { id: true, slug: true } });
  if (!game) { check('có game mẫu', false, 'thiếu game'); return; }

  const NOI_DUNG = 'Binh luan de kiem tha tim';
  const wipe = () => db.comment.deleteMany({ where: { content: { startsWith: NOI_DUNG } } });
  await wipe();

  const blGame = await db.comment.create({
    data: { gameId: game.id, authorId: other.id, content: `${NOI_DUNG} (game)` }, select: { id: true },
  });

  const page = await openPage('minhdev');
  const anon = await openPage(null);

  try {
    // ── Bình luận game ──────────────────────────────────────────────────
    await page.goto(`${BASE}/games/${game.slug}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const timGame = page.locator(`#bl-${blGame.id} button:has-text("Thích")`);
    check('bình luận game có nút thả tim', (await timGame.count()) === 1);
    await timGame.click();
    const sauGame = await doiToi(async () => {
      const r = await db.comment.findUnique({ where: { id: blGame.id }, select: { likeCount: true } });
      return r.likeCount === 1 ? r : null;
    });
    check('thả tim bình luận game', sauGame?.likeCount === 1);

    // ── Khách vãng lai: thấy nút nhưng bấm thì bị đưa sang đăng nhập ─────
    await anon.goto(`${BASE}/games/${game.slug}`, { waitUntil: 'networkidle' });
    await anon.waitForTimeout(700);
    check('khách vẫn thấy nút tim', (await anon.locator(`#bl-${blGame.id} button:has(svg.lucide-heart)`).count()) === 1);
    await anon.locator(`#bl-${blGame.id} button:has(svg.lucide-heart)`).click();
    await anon.waitForURL((u) => u.pathname.includes('/login'), { timeout: 15000 }).catch(() => {});
    check('khách bấm thì bị đưa sang trang đăng nhập', anon.url().includes('/login'));
    check('khách không tạo thêm được lượt tim nào',
      (await db.reaction.count({ where: { commentId: blGame.id } })) === 1);
  } finally {
    await wipe();
  }
}
