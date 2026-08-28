import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Đồ trang trí mua ở cửa hàng phải hiện ở MỌI chỗ in tên người ra.
 *
 * Đây là loại lỗi âm thầm nhất của tính năng này: mua màu nick rồi mà chỗ thì
 * hiện chỗ thì không, người mua chỉ thấy nó lúc có lúc không mà không hiểu vì
 * sao — và không ai báo lỗi cả, họ chỉ thôi không mua nữa. Nên phải quét đúng
 * danh sách trang, không kiểm mỗi trang cá nhân rồi coi là xong.
 */
export default async function run(check) {
  const [minh, huy] = await Promise.all([
    db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } }),
    db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } }),
  ]);
  const thread = await db.thread.findFirst({
    where: { status: 'PUBLISHED' },
    select: { id: true, forumId: true, forum: { select: { slug: true } } },
  });
  const game = await db.game.findFirst({ where: { status: 'PUBLISHED' }, select: { id: true, slug: true } });
  if (!minh || !huy || !thread || !game) { check('có dữ liệu mẫu', false, 'thiếu người dùng, chủ đề hoặc game'); return; }

  const wipe = async () => {
    await db.reply.deleteMany({ where: { content: 'COSMETIC-REPLY' } });
    await db.comment.deleteMany({ where: { content: 'COSMETIC-CMT' } });
    await db.thread.deleteMany({ where: { title: 'COSMETIC-THREAD' } });
    await db.gameRequest.deleteMany({ where: { title: 'COSMETIC-REQ' } });
    await db.guestbookEntry.deleteMany({ where: { ownerId: minh.id } });
    await db.friendship.deleteMany({ where: { OR: [{ requesterId: minh.id }, { addresseeId: minh.id }] } });
    await db.user.updateMany({ where: { id: huy.id }, data: { nameColorId: null } });
    await db.shopItem.deleteMany({ where: { slug: { startsWith: 'cos-kiem-thu' } } });
  };
  await wipe();

  const page = await openPage('minhdev');

  try {
    // huytran đeo màu xanh, rồi để tên huytran xuất hiện ở khắp nơi.
    const color = await db.shopItem.create({
      data: { slug: 'cos-kiem-thu', kind: 'NAME_COLOR', name: 'Xanh kiểm thử', value: '#00b7ff', pricePoints: 0 },
      select: { id: true },
    });
    await db.shopPurchase.create({ data: { userId: huy.id, itemId: color.id, pointsPaid: 0 }, select: { id: true } });
    await db.user.update({ where: { id: huy.id }, data: { nameColorId: color.id }, select: { id: true } });

    await db.reply.create({
      data: { threadId: thread.id, authorId: huy.id, content: 'COSMETIC-REPLY' }, select: { id: true },
    });
    await db.guestbookEntry.create({
      data: { ownerId: minh.id, authorId: huy.id, content: 'COSMETIC-GB' }, select: { id: true },
    });
    await db.friendship.create({
      data: { requesterId: minh.id, addresseeId: huy.id, status: 'ACCEPTED', acceptedAt: new Date() },
      select: { id: true },
    });
    await db.gameRequest.create({ data: { userId: huy.id, title: 'COSMETIC-REQ' }, select: { id: true } });
    await db.comment.create({
      data: { gameId: game.id, authorId: huy.id, content: 'COSMETIC-CMT' }, select: { id: true },
    });
    const newThread = await db.thread.create({
      data: { forumId: thread.forumId, authorId: huy.id, title: 'COSMETIC-THREAD', content: 'x', status: 'PUBLISHED' },
      select: { forum: { select: { slug: true } } },
    });

    // Kiểm bằng màu ĐÃ TÍNH trên thẻ, không phải bằng chuỗi trong mã nguồn:
    // chuỗi có thể nằm ở một thuộc tính chẳng ai nhìn thấy.
    const coMau = () => page.locator('[style*="rgb(0, 183, 255)"], [style*="#00b7ff"]').count();

    const noi = [
      ['trang cá nhân', `${BASE}/u/huytran`],
      ['bài trong chủ đề', `${BASE}/forum/${thread.forum.slug}/${thread.id}`],
      ['danh sách chủ đề của box', `${BASE}/forum/${newThread.forum.slug}`],
      ['chủ đề mới ở trang chủ', `${BASE}/`],
      // Hồ sơ chia tab nên sổ lưu bút nằm ở tab riêng.
      ['sổ lưu bút', `${BASE}/u/minhdev?tab=luu-but`],
      ['danh sách bạn bè', `${BASE}/user/friends`],
      ['bình luận game', `${BASE}/games/${game.slug}`],
      ['bảng yêu cầu game', `${BASE}/games/yeu-cau`],
      ['bảng xếp hạng', `${BASE}/ranking`],
      ['kết quả tìm kiếm', `${BASE}/search?q=COSMETIC&tab=threads`],
    ];

    for (const [ten, url] of noi) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      check(`màu nick hiện ở ${ten}`, (await coMau()) > 0);
    }

    // Gỡ ra thì màu phải biến mất, không chỉ ở hồ sơ mà cả ở diễn đàn.
    await db.user.update({ where: { id: huy.id }, data: { nameColorId: null }, select: { id: true } });
    await page.goto(`${BASE}/forum/${thread.forum.slug}/${thread.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    check('gỡ màu ra thì bài trong chủ đề hết màu', (await coMau()) === 0);
  } finally {
    await wipe();
  }
}
