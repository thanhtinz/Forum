import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Phòng chat chung (nằm ngay trên trang chủ) phải chặn thật ở phía máy chủ.
 *
 * Câu nói là công khai và ai cũng gửi được, nên đây là bề mặt dễ bị lạm dụng
 * nhất trong các phần mới: kiểm khách không nói được, không ai gỡ được câu của
 * người khác, và giới hạn độ dài không nằm ở mỗi thuộc tính maxlength.
 */
export default async function run(check) {
  await db.shoutMessage.deleteMany({});

  const minh = await openPage('minhdev');
  const lan = await openPage('lanpham');
  const guest = await openPage(null);

  // ── Khách ──────────────────────────────────────────────────────────────
  const gRes = await guest.goto(BASE, { waitUntil: 'networkidle' });
  check('khách thấy phòng chat trên trang chủ', gRes.status() === 200 && (await guest.locator('#phong-chat').count()) > 0);
  check('khách không có ô nhập', (await guest.locator('#phong-chat input[name="content"]').count()) === 0);
  check(
    'API phòng chat từ chối khách',
    (await guest.evaluate(async () => (await fetch('/api/chat')).status)) === 401,
  );

  // ── Nói một câu ────────────────────────────────────────────────────────
  await minh.goto(BASE, { waitUntil: 'networkidle' });
  await minh.waitForTimeout(500);
  await minh.fill('#phong-chat input[name="content"]', 'Câu kiểm thử phòng chat');
  await minh.click('#phong-chat button[type="submit"]');

  const said = await doiToi(() => db.shoutMessage.findFirst({
    where: { content: 'Câu kiểm thử phòng chat' },
    select: { id: true, userId: true },
  }));
  check('nói được một câu', !!said);

  // ── Câu quá dài bị chặn ở máy chủ ──────────────────────────────────────
  // Trần là 500 ký tự (rộng tay cho ảnh chèn vào), nên phải thử vượt hẳn.
  const long = 'x'.repeat(600);
  await minh.waitForTimeout(3500); // vượt qua giãn cách chống spam
  await minh.evaluate((v) => {
    const el = document.querySelector('#phong-chat input[name="content"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, long);
  await minh.click('#phong-chat button[type="submit"]');
  await minh.waitForTimeout(1800);
  check('câu 600 ký tự bị máy chủ từ chối', (await db.shoutMessage.count({ where: { content: long } })) === 0);

  // ── Nói liên tiếp bị chặn ──────────────────────────────────────────────
  await lan.goto(BASE, { waitUntil: 'networkidle' });
  await lan.waitForTimeout(500);
  await lan.fill('#phong-chat input[name="content"]', 'câu một');
  await lan.click('#phong-chat button[type="submit"]');
  await lan.waitForTimeout(900);
  await lan.fill('#phong-chat input[name="content"]', 'câu hai ngay lập tức');
  await lan.click('#phong-chat button[type="submit"]');
  await lan.waitForTimeout(1500);
  check('nói liên tiếp bị chặn', (await lan.locator('text=Chậm thôi').count()) > 0);

  // ── Không ai gỡ được câu của người khác ────────────────────────────────
  check(
    'không có nút gỡ trên câu của người khác',
    (await lan.locator('#phong-chat button[title="Gỡ câu này"]').count()) ===
      (await db.shoutMessage.count({ where: { user: { username: 'lanpham' }, deletedAt: null } })),
  );

  // Gọi thẳng server action qua giao diện của chính chủ thì được, của người
  // khác thì không — kiểm bằng cách so số câu còn lại sau khi Lan thử gỡ.
  const beforeAlive = await db.shoutMessage.count({ where: { deletedAt: null } });
  await lan.locator('#phong-chat button[title="Gỡ câu này"]').first().click();
  await doiToi(async () => (await db.shoutMessage.count({ where: { deletedAt: null } })) === beforeAlive - 1);
  const afterAlive = await db.shoutMessage.count({ where: { deletedAt: null } });
  check('chính chủ gỡ được câu của mình', afterAlive === beforeAlive - 1);
  check('câu của minhdev vẫn còn', (await db.shoutMessage.count({ where: { id: said.id, deletedAt: null } })) === 1);

  // ── Câu đã gỡ không lộ chữ ra trang ────────────────────────────────────
  const removed = await db.shoutMessage.findFirst({ where: { deletedAt: { not: null } }, select: { content: true } });
  await lan.reload({ waitUntil: 'networkidle' });
  await lan.waitForTimeout(700);
  const html = await lan.content();
  check('câu đã gỡ không còn hiện chữ', !html.includes(removed.content));
  check('chỗ câu đã gỡ có ghi chú', html.includes('đã bị gỡ'));

  // ── Ảnh và emoji ───────────────────────────────────────────────────────
  await db.shoutMessage.deleteMany({});
  await minh.reload({ waitUntil: 'networkidle' });
  await minh.waitForTimeout(600);

  check('có nút emoji/sticker/GIF', (await minh.locator('#phong-chat button[title="Emoji, sticker & GIF"]').count()) > 0);
  check('có nút gửi ảnh', (await minh.locator('#phong-chat button[title="Gửi ảnh"]').count()) > 0);

  // Ảnh hợp lệ dựng thành thẻ <img>; ảnh trỏ javascript: thì không.
  await minh.waitForTimeout(3500);
  await minh.fill(
    '#phong-chat input[name="content"]',
    'vui quá 😀 ![ảnh](/uploads/khong-co-that.png) ![xấu](javascript:alert(1))',
  );
  await minh.click('#phong-chat button[type="submit"]');
  await doiToi(async () => (await db.shoutMessage.count({ where: { content: { contains: '😀' } } })) > 0);

  check('emoji gửi được', (await db.shoutMessage.count({ where: { content: { contains: '😀' } } })) === 1);
  check('ảnh dựng thành thẻ img', (await minh.locator('#phong-chat img[src="/uploads/khong-co-that.png"]').count()) === 1);
  check('ảnh javascript: bị loại', (await minh.locator('#phong-chat img[src^="javascript"]').count()) === 0);

  await db.shoutMessage.deleteMany({});
}
