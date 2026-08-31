import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Sổ lưu bút trên trang cá nhân.
 *
 * Chỗ đáng kiểm nhất là "lời kín": nó phải bị lọc ngay trong truy vấn, nên mã
 * nguồn trang gửi cho người ngoài KHÔNG được chứa nội dung đó — ẩn bằng CSS
 * thì ai xem mã nguồn cũng đọc được.
 */
export default async function run(check) {
  const owner = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const guest = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!owner || !guest) { check('có người dùng mẫu', false, 'thiếu minhdev/huytran'); return; }

  await db.guestbookEntry.deleteMany({ where: { ownerId: owner.id } });
  await db.notification.deleteMany({ where: { type: 'GUESTBOOK' } });

  // Hồ sơ đã chia tab nên sổ lưu bút không còn nằm sẵn trên trang, phải mở
  // đúng tab của nó — chính là điều mỗi tab chỉ truy vấn phần của mình.
  const url = `${BASE}/u/minhdev?tab=luu-but`;
  const visitor = await openPage('huytran');
  const host = await openPage('minhdev');
  const anon = await openPage(null);
  const admin = await openPage('admin@nova.local', 'admin123');
  // Lời nhắn nào cũng nhận diện theo nội dung: sổ xếp mới trước, bấm "cái đầu
  // tiên" là bấm nhầm sang lời khác ngay khi có thêm hàng mới.
  const row = (page, text) => page.locator('#so-luu-but li').filter({ hasText: text });

  try {
    // ── Ghi sổ ───────────────────────────────────────────────────────────
    await visitor.goto(url, { waitUntil: 'networkidle' });
    await visitor.waitForTimeout(800);
    check('trang cá nhân có mục sổ lưu bút', (await visitor.locator('h2:has-text("Sổ lưu bút")').count()) > 0);
    check('ô ghi sổ có nút emoji/sticker/GIF',
      (await visitor.locator('#so-luu-but button[title="Emoji, sticker & GIF"]').count()) > 0);
    check('ô ghi sổ có nút gửi ảnh', (await visitor.locator('#so-luu-but button[title="Gửi ảnh"]').count()) > 0);

    await visitor.fill('#so-luu-but textarea[name="content"]', 'Ghé qua chào chủ nhà một tiếng');
    await visitor.locator('#so-luu-but button:has-text("Ghi sổ")').click();
    await doiToi(async () => (await db.guestbookEntry.count({ where: { ownerId: owner.id } })) === 1);
    check('ghi được lời nhắn', (await db.guestbookEntry.count({ where: { ownerId: owner.id } })) === 1);
    // Ghi xong ở cơ sở dữ liệu KHÔNG có nghĩa là trang đã dựng lại xong: chờ
    // chính dòng chữ hiện ra rồi mới khẳng định, không thì đây là chỗ đỏ oan.
    await visitor.locator('text=Ghé qua chào chủ nhà').first().waitFor({ timeout: 15000 }).catch(() => {});
    check('lời nhắn hiện trên trang', (await visitor.locator('text=Ghé qua chào chủ nhà').count()) > 0);
    check('chủ nhà nhận thông báo',
      (await db.notification.count({ where: { userId: owner.id, type: 'GUESTBOOK' } })) === 1);

    // Hạn mức: ghi liên tiếp phải bị chặn
    await visitor.fill('#so-luu-but textarea[name="content"]', 'Nhắn thêm câu nữa ngay lập tức');
    await visitor.locator('#so-luu-but button:has-text("Ghi sổ")').click();
    await visitor.waitForTimeout(2000);
    check('ghi liên tiếp bị chặn', (await visitor.locator('text=Chậm thôi').count()) > 0);
    check('lần bị chặn không tạo thêm hàng',
      (await db.guestbookEntry.count({ where: { ownerId: owner.id } })) === 1);

    // ── Lời kín ──────────────────────────────────────────────────────────
    await db.guestbookEntry.create({
      data: { ownerId: owner.id, authorId: guest.id, content: 'LOI-KIN-BI-MAT', private: true },
      select: { id: true },
    });

    await anon.goto(url, { waitUntil: 'networkidle' });
    await anon.waitForTimeout(800);
    const anonHtml = await anon.content();
    check('khách vãng lai không thấy lời kín', !anonHtml.includes('LOI-KIN-BI-MAT'));
    check('khách vãng lai vẫn đọc được lời công khai', anonHtml.includes('Ghé qua chào chủ nhà'));
    check('khách vãng lai không có ô ghi sổ', (await anon.locator('#so-luu-but textarea').count()) === 0);

    const third = await openPage('lanpham');
    await third.goto(url, { waitUntil: 'networkidle' });
    await third.waitForTimeout(800);
    check('người thứ ba không thấy lời kín', !(await third.content()).includes('LOI-KIN-BI-MAT'));

    await host.goto(url, { waitUntil: 'networkidle' });
    await host.waitForTimeout(800);
    check('chủ nhà đọc được lời kín', (await host.content()).includes('LOI-KIN-BI-MAT'));

    // ── Hồi âm ───────────────────────────────────────────────────────────
    await row(host, 'Ghé qua chào').locator('button:has-text("Hồi âm")').click();
    await host.waitForTimeout(400);
    await row(host, 'Ghé qua chào').locator('textarea[name="reply"]').fill('Cảm ơn bạn đã ghé nhé!');
    await row(host, 'Ghé qua chào').locator('button:has-text("Lưu hồi âm")').click();
    await doiToi(async () => (await db.guestbookEntry.findFirst({ where: { ownerId: owner.id }, select: { reply: true } }))?.reply != null);
    const replied = await db.guestbookEntry.findFirst({
      where: { ownerId: owner.id, content: { contains: 'Ghé qua chào' } },
      select: { reply: true, repliedAt: true },
    });
    check('lưu được hồi âm', replied?.reply === 'Cảm ơn bạn đã ghé nhé!', `đang là ${replied?.reply}`);
    check('hồi âm có mốc thời gian', !!replied?.repliedAt);
    check('người viết nhận thông báo hồi âm',
      (await db.notification.count({ where: { userId: guest.id, type: 'GUESTBOOK' } })) === 1);

    await visitor.goto(url, { waitUntil: 'networkidle' });
    await visitor.waitForTimeout(800);
    check('khách không có nút hồi âm', (await visitor.locator('button:has-text("Hồi âm")').count()) === 0);

    // ── Gỡ và phục hồi ───────────────────────────────────────────────────
    const target = await db.guestbookEntry.findFirst({
      where: { ownerId: owner.id, content: { contains: 'Ghé qua chào' } }, select: { id: true },
    });
    await host.reload({ waitUntil: 'networkidle' });
    await host.waitForTimeout(800);
    host.once('dialog', (d) => d.accept());
    await row(host, 'Ghé qua chào').locator('button[title="Gỡ lời nhắn"]').click();
    await doiToi(async () => (await db.guestbookEntry.findUnique({ where: { id: target.id }, select: { hiddenAt: true } }))?.hiddenAt !== null);
    check('gỡ được lời nhắn',
      !!(await db.guestbookEntry.findUnique({ where: { id: target.id }, select: { hiddenAt: true } }))?.hiddenAt);
    check('gỡ chứ không xoá', (await db.guestbookEntry.count({ where: { id: target.id } })) === 1);

    await anon.goto(url, { waitUntil: 'networkidle' });
    await anon.waitForTimeout(800);
    check('gỡ xong người thường không đọc được nữa',
      !(await anon.content()).includes('Ghé qua chào chủ nhà'));

    await admin.goto(url, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(800);
    check('quản trị vẫn thấy lời đã gỡ', (await admin.locator('text=đã gỡ').count()) > 0);
    await row(admin, 'Ghé qua chào').locator('button[title="Phục hồi lời nhắn"]').click();
    await doiToi(async () => (await db.guestbookEntry.findUnique({ where: { id: target.id }, select: { hiddenAt: true } }))?.hiddenAt === null);
    const back = await db.guestbookEntry.findUnique({ where: { id: target.id }, select: { hiddenAt: true } });
    check('quản trị phục hồi được', back?.hiddenAt === null);

    // ── Nội dung là chữ, không phải mã ───────────────────────────────────
    await db.guestbookEntry.create({
      data: { ownerId: owner.id, authorId: guest.id, content: '<img src=x onerror=alert(1)>' },
      select: { id: true },
    });
    await anon.reload({ waitUntil: 'networkidle' });
    await anon.waitForTimeout(800);
    check('không sinh thẻ img từ nội dung lời nhắn',
      (await anon.locator('#so-luu-but img[src="x"]').count()) === 0);
  } finally {
    await db.guestbookEntry.deleteMany({ where: { ownerId: owner.id } });
    await db.notification.deleteMany({ where: { type: 'GUESTBOOK' } });
  }
}
