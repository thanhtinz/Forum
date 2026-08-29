import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Bảng yêu cầu game.
 *
 * Chỗ đáng kiểm nhất là bộ đếm lượt muốn: nó được ghi sẵn trên hàng yêu cầu
 * nên phải luôn khớp với số hàng phiếu thật, kể cả khi người dùng bấm rồi bỏ.
 */
export default async function run(check) {
  const minh = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const game = await db.game.findFirst({ where: { status: 'PUBLISHED' }, select: { slug: true } });
  if (!minh || !game) { check('có dữ liệu mẫu', false, 'thiếu minhdev hoặc game'); return; }

  await db.gameRequest.deleteMany({});
  await db.notification.deleteMany({ where: { title: { contains: 'Yêu cầu game' } } });

  const url = `${BASE}/games/yeu-cau`;
  const member = await openPage('minhdev');
  const other = await openPage('huytran');
  const admin = await openPage('admin@nova.local', 'admin123');
  const anon = await openPage(null);

  try {
    // ── Lối vào và gửi yêu cầu ───────────────────────────────────────────
    await member.goto(`${BASE}/games`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    check('kho game có lối vào yêu cầu game',
      (await member.locator('a[href="/games/yeu-cau"]').count()) > 0);

    await member.goto(url, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    await member.fill('input[name="title"]', 'Chinh Phục Vũ Môn 128x160');
    await member.fill('textarea[name="note"]', 'Bản Việt hoá cho Nokia S40 nhé');
    await member.locator('button:has-text("Gửi yêu cầu")').click();
    await doiToi(async () => (await db.gameRequest.count()) > 0);

    const req = await db.gameRequest.findFirst({ select: { id: true, title: true, status: true } });
    check('gửi được yêu cầu', req?.title === 'Chinh Phục Vũ Môn 128x160', `đang là ${req?.title}`);
    check('trạng thái ban đầu là chờ duyệt', req?.status === 'PENDING');
    check('yêu cầu hiện trên bảng', (await member.locator('text=Chinh Phục Vũ Môn').count()) > 0);

    // Xin trùng tên thì cộng phiếu chứ không đẻ thêm dòng
    await other.goto(url, { waitUntil: 'networkidle' });
    await other.waitForTimeout(700);
    await other.fill('input[name="title"]', 'chinh phục vũ môn 128x160');
    await other.locator('button:has-text("Gửi yêu cầu")').click();
    await other.waitForTimeout(2500);
    check('xin trùng tên không tạo dòng mới', (await db.gameRequest.count()) === 1);
    check('xin trùng tên được tính thành một lượt muốn',
      (await db.gameRequest.findUnique({ where: { id: req.id }, select: { voteCount: true } }))?.voteCount === 1);

    // ── Bấm ủng hộ / bỏ ──────────────────────────────────────────────────
    await member.reload({ waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    await member.locator('button[title="Tôi cũng muốn game này"]').first().click();
    await doiToi(async () => (await db.gameRequest.findUnique({ where: { id: req.id }, select: { voteCount: true } }))?.voteCount === 2);
    check('bấm ủng hộ tăng phiếu',
      (await db.gameRequest.findUnique({ where: { id: req.id }, select: { voteCount: true } }))?.voteCount === 2);

    await member.locator('button[title="Bỏ lượt muốn"]').first().click();
    await doiToi(async () => (await db.gameRequest.findUnique({ where: { id: req.id }, select: { voteCount: true } }))?.voteCount === 1);
    const count = (await db.gameRequest.findUnique({ where: { id: req.id }, select: { voteCount: true } }))?.voteCount;
    const rows = await db.gameRequestVote.count({ where: { requestId: req.id } });
    check('bấm lại thì bỏ phiếu', count === 1, `còn ${count}`);
    check('bộ đếm khớp số hàng phiếu', count === rows, `${count} vs ${rows}`);

    // ── Khách vãng lai ───────────────────────────────────────────────────
    await anon.goto(url, { waitUntil: 'networkidle' });
    await anon.waitForTimeout(700);
    check('khách đọc được bảng yêu cầu', (await anon.locator('text=Chinh Phục Vũ Môn').count()) > 0);
    check('khách không có ô gửi yêu cầu', (await anon.locator('input[name="title"]').count()) === 0);

    // ── Chỉ quản trị mới xử lý ───────────────────────────────────────────
    await member.reload({ waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    check('thành viên không thấy nút xử lý',
      (await member.locator('button:has-text("Xử lý")').count()) === 0);

    await admin.goto(url, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(700);
    check('quản trị thấy nút xử lý', (await admin.locator('button:has-text("Xử lý")').count()) > 0);
    await admin.locator('button:has-text("Xử lý")').first().click();
    await admin.waitForTimeout(400);
    // Ô chọn trạng thái ẩn đi (sr-only) để tự vẽ nhãn, nên phải bấm vào nhãn.
    await admin.locator('form label:has-text("Đã có game")').click();
    await admin.fill('input[name="gameSlug"]', game.slug);
    await admin.fill('input[name="adminNote"]', 'Đã lên kho rồi nhé bạn');
    await admin.locator('button:has-text("Lưu")').first().click();
    await doiToi(async () => (await db.gameRequest.findUnique({ where: { id: req.id }, select: { handledAt: true } }))?.handledAt !== null);

    const done = await db.gameRequest.findUnique({
      where: { id: req.id }, select: { status: true, adminNote: true, gameId: true, handledAt: true },
    });
    check('quản trị đổi được trạng thái', done?.status === 'DONE', `đang là ${done?.status}`);
    check('gắn được game theo slug', !!done?.gameId);
    check('lưu lời nhắn và mốc xử lý', !!done?.adminNote && !!done?.handledAt);
    check('người xin nhận thông báo',
      (await db.notification.count({ where: { userId: minh.id, title: { contains: 'Yêu cầu game' } } })) === 1);

    // Slug bịa ra thì phải báo lỗi chứ không âm thầm bỏ qua
    await admin.reload({ waitUntil: 'networkidle' });
    await admin.waitForTimeout(700);
    await admin.locator('button:has-text("Xử lý")').first().click();
    await admin.waitForTimeout(400);
    await admin.fill('input[name="gameSlug"]', 'khong-co-game-nay');
    await admin.locator('button:has-text("Lưu")').first().click();
    await admin.waitForTimeout(2000);
    check('slug không tồn tại thì báo lỗi',
      (await admin.locator('text=Không có game nào mang slug').count()) > 0);

    // ── Đã xử lý xong thì khoá nút ủng hộ ────────────────────────────────
    await member.reload({ waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    check('yêu cầu đã xong thì khoá nút ủng hộ',
      await member.locator('button[title="Yêu cầu đã xử lý xong"]').first().isDisabled());

    // ── Rút yêu cầu ──────────────────────────────────────────────────────
    await db.gameRequest.update({ where: { id: req.id }, data: { status: 'PENDING' }, select: { id: true } });
    await other.goto(url, { waitUntil: 'networkidle' });
    await other.waitForTimeout(700);
    check('người khác không có nút rút', (await other.locator('button[title="Rút yêu cầu"]').count()) === 0);

    await member.reload({ waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    member.once('dialog', (d) => d.accept());
    await member.locator('button[title="Rút yêu cầu"]').first().click();
    await doiToi(async () => (await db.gameRequest.count()) === 0);
    check('chủ yêu cầu rút được', (await db.gameRequest.count()) === 0);
    check('rút xong phiếu đi theo', (await db.gameRequestVote.count()) === 0);

    // ── Hạn mức mỗi ngày ─────────────────────────────────────────────────
    for (let i = 0; i < 5; i++) {
      await db.gameRequest.create({ data: { userId: minh.id, title: `Game thu ${i}` }, select: { id: true } });
    }
    await member.goto(url, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    await member.fill('input[name="title"]', 'Game vuot han muc');
    await member.locator('button:has-text("Gửi yêu cầu")').click();
    await member.waitForTimeout(2000);
    check('quá hạn mức ngày thì bị chặn', (await member.locator('text=yêu cầu hôm nay rồi').count()) > 0);
    check('lần bị chặn không tạo thêm', (await db.gameRequest.count()) === 5);
  } finally {
    await db.gameRequest.deleteMany({});
    await db.notification.deleteMany({ where: { title: { contains: 'Yêu cầu game' } } });
  }
}
