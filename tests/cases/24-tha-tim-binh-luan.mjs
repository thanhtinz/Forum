import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Thả tim cho bình luận — bài viết, game, và bảng tin câu lạc bộ.
 *
 * Cột `likeCount` và `Reaction.commentId` đã nằm trong lược đồ từ lâu mà không
 * nơi nào dùng: bình luận là chỗ duy nhất trên trang không thả tim được, trong
 * khi chủ đề, trả lời và bài viết đều thả được. Bài kiểm này soi con số trong
 * cơ sở dữ liệu chứ không tin chữ hiện trên màn hình.
 */
export default async function run(check) {
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const other = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!me || !other) { check('có dữ liệu mẫu', false, 'thiếu người dùng'); return; }

  const post = await db.post.findFirst({ where: { status: 'PUBLISHED' }, select: { id: true, slug: true } });
  const game = await db.game.findFirst({ where: { status: 'PUBLISHED' }, select: { id: true, slug: true } });
  if (!post || !game) { check('có bài viết và game mẫu', false, 'thiếu bài viết hoặc game'); return; }

  const NOI_DUNG = 'Binh luan de kiem tha tim';
  const wipe = () => db.comment.deleteMany({ where: { content: { startsWith: NOI_DUNG } } });
  await wipe();

  const blBai = await db.comment.create({
    data: { postId: post.id, authorId: other.id, content: `${NOI_DUNG} (bai viet)` }, select: { id: true },
  });
  const blGame = await db.comment.create({
    data: { gameId: game.id, authorId: other.id, content: `${NOI_DUNG} (game)` }, select: { id: true },
  });

  const page = await openPage('minhdev');
  const anon = await openPage(null);

  try {
    // ── Bình luận bài viết ───────────────────────────────────────────────
    // Bình luận của bài viết nằm ở tab riêng, không phải trang chi tiết.
    await page.goto(`${BASE}/posts/${post.slug}/binh-luan`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const timBai = page.locator(`#bl-${blBai.id} button:has-text("Thích")`);
    check('bình luận bài viết có nút thả tim', (await timBai.count()) === 1);

    await timBai.click();
    const sauBai = await doiToi(async () => {
      const r = await db.comment.findUnique({ where: { id: blBai.id }, select: { likeCount: true } });
      return r.likeCount === 1 ? r : null;
    });
    check('thả tim bình luận bài viết', sauBai?.likeCount === 1);
    check('ghi đúng một lượt vào bảng phản ứng',
      (await db.reaction.count({ where: { commentId: blBai.id, userId: me.id, type: 'LIKE' } })) === 1);

    // Bấm lại thì bỏ tim, không cộng dồn.
    await page.locator(`#bl-${blBai.id} button:has(svg.lucide-heart)`).click();
    const boTim = await doiToi(async () => {
      const r = await db.comment.findUnique({ where: { id: blBai.id }, select: { likeCount: true } });
      return r.likeCount === 0 ? r : null;
    });
    check('bấm lại thì bỏ tim', boTim?.likeCount === 0);
    check('lượt phản ứng cũng bị gỡ',
      (await db.reaction.count({ where: { commentId: blBai.id } })) === 0);

    // ── Bình luận game: cùng một khối bình luận, phải có luôn ────────────
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
    await anon.goto(`${BASE}/posts/${post.slug}/binh-luan`, { waitUntil: 'networkidle' });
    await anon.waitForTimeout(700);
    check('khách vẫn thấy nút tim', (await anon.locator(`#bl-${blBai.id} button:has(svg.lucide-heart)`).count()) === 1);
    await anon.locator(`#bl-${blBai.id} button:has(svg.lucide-heart)`).click();
    await anon.waitForURL((u) => u.pathname.includes('/login'), { timeout: 15000 }).catch(() => {});
    check('khách bấm thì bị đưa sang trang đăng nhập', anon.url().includes('/login'));
    check('khách không tạo được lượt tim nào',
      (await db.reaction.count({ where: { commentId: blBai.id } })) === 0);
  } finally {
    await wipe();
  }
}
