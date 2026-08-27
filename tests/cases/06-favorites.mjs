import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Mục đã lưu: game phải tìm lại được, và thư mục phải là chuyện riêng từng người.
 *
 * Trước đây lưu game xong là mất hút — trang "Đã lưu" chỉ có thẻ Bài viết và
 * Chủ đề, không có chỗ nào liệt kê game đã lưu.
 */
export default async function run(check) {
  const me = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const other = await db.user.findFirst({ where: { username: 'lanpham' }, select: { id: true } });
  const game = await db.game.findFirst({ select: { id: true, slug: true } });
  if (!game) { check('có game để kiểm', false, 'chưa seed game nào'); return; }

  await db.favorite.deleteMany({ where: { userId: { in: [me.id, other.id] }, gameId: game.id } });
  await db.favorite.create({ data: { userId: me.id, gameId: game.id }, select: { id: true } });
  const foreign = await db.favorite.create({
    data: { userId: other.id, gameId: game.id, folder: 'của người khác' },
    select: { id: true },
  });

  const p = await openPage('minhdev');
  await p.goto(`${BASE}/user/favorites?tab=games`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);

  check('trang Đã lưu có thẻ Game', (await p.locator('a[href="/user/favorites?tab=games"]').count()) > 0);
  check('game đã lưu hiện trong danh sách', (await p.locator(`a[href="/games/${game.slug}"]`).count()) > 0);
  check('không lộ mục đã lưu của người khác', !(await p.content()).includes(foreign.id));

  // Chuyển sang thư mục mới
  const picker = p.locator('button[title="Chuyển sang thư mục khác"]').first();
  check('có nút chuyển thư mục', (await picker.count()) > 0);
  await picker.click();
  await p.waitForTimeout(500);
  await p.fill('input[placeholder="Thư mục mới…"]', 'Thư mục kiểm thử');
  await p.locator('button[title="Tạo và chuyển vào"]').click();
  await p.waitForTimeout(2500);

  const mine = await db.favorite.findFirst({ where: { userId: me.id, gameId: game.id }, select: { folder: true } });
  check('tạo thư mục và chuyển vào được', mine?.folder === 'Thư mục kiểm thử', `đang ở "${mine?.folder}"`);

  const stillForeign = await db.favorite.findUnique({ where: { id: foreign.id }, select: { folder: true } });
  check('không đụng vào thư mục của người khác', stillForeign?.folder === 'của người khác');

  // Lọc theo thư mục
  await p.goto(`${BASE}/user/favorites?tab=games&folder=${encodeURIComponent('Thư mục kiểm thử')}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  check('lọc đúng thư mục thì thấy game', (await p.locator(`a[href="/games/${game.slug}"]`).count()) > 0);

  await p.goto(`${BASE}/user/favorites?tab=games&folder=default`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  check('lọc thư mục khác thì không thấy', (await p.locator(`a[href="/games/${game.slug}"]`).count()) === 0);

  await db.favorite.deleteMany({ where: { userId: { in: [me.id, other.id] }, gameId: game.id } });
}
