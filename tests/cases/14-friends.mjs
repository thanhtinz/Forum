import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Kết bạn hai chiều.
 *
 * Chỗ đáng kiểm nhất: chỉ NGƯỜI NHẬN mới đồng ý được. Nếu người gửi tự bấm
 * đồng ý được thì "hai chiều" chỉ còn là cái tên.
 */
export default async function run(check) {
  const [minh, huy, lan] = await Promise.all([
    db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } }),
    db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } }),
    db.user.findFirst({ where: { username: 'lanpham' }, select: { id: true } }),
  ]);
  if (!minh || !huy || !lan) { check('có người dùng mẫu', false, 'thiếu minhdev/huytran/lanpham'); return; }

  const wipe = () => db.friendship.deleteMany({
    where: { OR: [{ requesterId: { in: [minh.id, huy.id, lan.id] } }, { addresseeId: { in: [minh.id, huy.id, lan.id] } }] },
  });
  await wipe();
  await db.notification.deleteMany({ where: { type: 'FRIEND' } });

  const me = await openPage('minhdev');
  const them = await openPage('huytran');
  const anon = await openPage(null);
  const pair = () => db.friendship.findFirst({
    where: { OR: [{ requesterId: minh.id, addresseeId: huy.id }, { requesterId: huy.id, addresseeId: minh.id }] },
    select: { id: true, requesterId: true, status: true },
  });

  try {
    // ── Gửi lời mời từ trang cá nhân ─────────────────────────────────────
    await anon.goto(`${BASE}/u/huytran`, { waitUntil: 'networkidle' });
    await anon.waitForTimeout(700);
    check('trang cá nhân có nút kết bạn', (await anon.locator('text=Kết bạn').count()) > 0);
    check('khách bấm kết bạn thì bị đưa về đăng nhập',
      (await anon.locator('a[href*="/login"]:has-text("Kết bạn")').count()) > 0);

    await me.goto(`${BASE}/u/huytran`, { waitUntil: 'networkidle' });
    await me.waitForTimeout(700);
    check('trang cá nhân có ô đếm bạn bè', (await me.locator('text=bạn bè').count()) > 0);
    await me.locator('button:has-text("Kết bạn")').click();
    await me.waitForTimeout(2500);

    const sent = await pair();
    check('gửi được lời mời', sent?.status === 'PENDING', `đang là ${sent?.status}`);
    check('đúng chiều người gửi', sent?.requesterId === minh.id);
    check('người nhận được báo',
      (await db.notification.count({ where: { userId: huy.id, type: 'FRIEND' } })) === 1);
    check('nút đổi thành đang chờ', (await me.locator('text=Đã gửi lời mời').count()) > 0);

    // Gửi lại lần nữa thì không đẻ thêm hàng
    await me.reload({ waitUntil: 'networkidle' });
    await me.waitForTimeout(700);
    check('không tạo hàng trùng', (await db.friendship.count({ where: { requesterId: minh.id } })) === 1);

    // ── Chỉ người nhận mới đồng ý ────────────────────────────────────────
    // Gọi thẳng server action bằng cách... không làm được từ trình duyệt, nên
    // kiểm bằng giao diện: người gửi KHÔNG có nút đồng ý ở đâu cả.
    await me.goto(`${BASE}/user/friends`, { waitUntil: 'networkidle' });
    await me.waitForTimeout(700);
    check('người gửi không có nút đồng ý',
      (await me.locator('button:has-text("Đồng ý")').count()) === 0);
    check('người gửi thấy lời mời đã gửi',
      (await me.locator('text=Lời mời đã gửi').count()) > 0
      && (await me.locator('button:has-text("Rút lại")').count()) > 0);

    await them.goto(`${BASE}/user/friends`, { waitUntil: 'networkidle' });
    await them.waitForTimeout(700);
    check('người nhận thấy nút đồng ý', (await them.locator('button:has-text("Đồng ý")').count()) > 0);
    await them.locator('button:has-text("Đồng ý")').first().click();
    await them.waitForTimeout(2500);

    const accepted = await pair();
    check('đồng ý xong thành bạn bè', accepted?.status === 'ACCEPTED', `đang là ${accepted?.status}`);
    check('có mốc thời gian kết bạn',
      !!(await db.friendship.findUnique({ where: { id: accepted.id }, select: { acceptedAt: true } }))?.acceptedAt);
    check('người gửi được báo là đã được đồng ý',
      (await db.notification.count({ where: { userId: minh.id, type: 'FRIEND' } })) === 1);

    // ── Đếm hai chiều ────────────────────────────────────────────────────
    await me.goto(`${BASE}/user/friends`, { waitUntil: 'networkidle' });
    await me.waitForTimeout(700);
    check('người gửi thấy bạn trong danh sách',
      (await me.locator('li:has-text("Huy Trần")').count()) > 0);
    await them.goto(`${BASE}/user/friends`, { waitUntil: 'networkidle' });
    await them.waitForTimeout(700);
    check('người nhận cũng thấy bạn trong danh sách',
      (await them.locator('li:has-text("Minh Dev")').count()) > 0);

    await me.goto(`${BASE}/u/huytran`, { waitUntil: 'networkidle' });
    await me.waitForTimeout(700);
    check('trang cá nhân hiện đã là bạn bè', (await me.locator('button:has-text("Bạn bè")').count()) > 0);

    // ── Chặn nhau thì không kết bạn được ─────────────────────────────────
    await wipe();
    await db.block.create({ data: { blockerId: huy.id, blockedId: minh.id }, select: { id: true } });
    await me.goto(`${BASE}/u/huytran`, { waitUntil: 'networkidle' });
    await me.waitForTimeout(700);
    await me.locator('button:has-text("Kết bạn")').click();
    await me.waitForTimeout(2500);
    check('bị chặn thì không gửi được lời mời', (await pair()) === null);
    await db.block.deleteMany({ where: { blockerId: huy.id, blockedId: minh.id } });

    // ── Huỷ kết bạn ──────────────────────────────────────────────────────
    await db.friendship.create({
      data: { requesterId: minh.id, addresseeId: huy.id, status: 'ACCEPTED', acceptedAt: new Date() },
      select: { id: true },
    });
    await me.goto(`${BASE}/u/huytran`, { waitUntil: 'networkidle' });
    await me.waitForTimeout(700);
    me.once('dialog', (d) => d.accept());
    await me.locator('button:has-text("Bạn bè")').click();
    await me.waitForTimeout(2500);
    check('huỷ được kết bạn', (await pair()) === null);

    // ── Người ngoài không đụng được quan hệ của người khác ───────────────
    const row = await db.friendship.create({
      data: { requesterId: huy.id, addresseeId: lan.id },
      select: { id: true },
    });
    await me.goto(`${BASE}/user/friends`, { waitUntil: 'networkidle' });
    await me.waitForTimeout(700);
    check('lời mời của người khác không hiện ở trang mình',
      (await me.locator('li:has-text("Lan Phạm")').count()) === 0);
    check('quan hệ của người khác vẫn còn nguyên',
      (await db.friendship.count({ where: { id: row.id } })) === 1);
  } finally {
    await wipe();
    await db.notification.deleteMany({ where: { type: 'FRIEND' } });
    await db.block.deleteMany({ where: { blockerId: huy.id, blockedId: minh.id } });
  }
}
