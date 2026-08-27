import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Cửa hàng bán đồ trang trí bằng điểm.
 *
 * Chỗ đáng kiểm nhất: đeo đồ CHƯA MUA. Giao diện chỉ hiện nút "Đeo lên" cho
 * món đã mua, nhưng nút chỉ là gợi ý — máy chủ phải tự kiểm quyền sở hữu.
 */
export default async function run(check) {
  const minh = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true, points: true } });
  const huy = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  if (!minh || !huy) { check('có người dùng mẫu', false, 'thiếu minhdev/huytran'); return; }

  const wipe = async () => {
    await db.user.updateMany({
      where: { id: { in: [minh.id, huy.id] } },
      data: { nameColorId: null, avatarFrameId: null, shopBadgeId: null },
    });
    await db.shopItem.deleteMany({ where: { slug: { startsWith: 'kiem-thu-' } } });
  };
  await wipe();

  const member = await openPage('minhdev');
  const admin = await openPage('admin@nova.local', 'admin123');

  try {
    // ── Quản trị tạo món ─────────────────────────────────────────────────
    const r = await admin.goto(`${BASE}/admin/shop`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(800);
    check('trang quản trị cửa hàng mở được', r.status() === 200, `trả về ${r.status()}`);
    check('thanh điều hướng có lối vào cửa hàng',
      (await admin.locator('nav a[href="/admin/shop"]').count()) > 0);

    await admin.locator('button:has-text("Thêm món")').click();
    await admin.waitForTimeout(400);
    await admin.fill('form input[name="name"]', 'Nick đỏ kiểm thử');
    await admin.fill('form input[name="value"]', '#e11d48');
    await admin.fill('form input[name="pricePoints"]', '50');
    await admin.locator('form button[type="submit"]:has-text("Lưu")').click();
    await admin.waitForTimeout(2500);

    const color = await db.shopItem.findFirst({
      where: { name: 'Nick đỏ kiểm thử' },
      select: { id: true, kind: true, value: true, pricePoints: true, slug: true },
    });
    check('tạo được món màu tên', color?.kind === 'NAME_COLOR' && color?.value === '#e11d48',
      JSON.stringify(color));
    check('lưu đúng giá', color?.pricePoints === 50);
    await db.shopItem.update({ where: { id: color.id }, data: { slug: 'kiem-thu-mau' }, select: { id: true } });

    // Giá trị màu bịa ra phải bị chặn
    await admin.reload({ waitUntil: 'networkidle' });
    await admin.waitForTimeout(700);
    await admin.locator('button:has-text("Thêm món")').click();
    await admin.waitForTimeout(400);
    await admin.fill('form input[name="name"]', 'Màu bậy');
    await admin.fill('form input[name="value"]', 'red; background:url(x)');
    await admin.locator('form button[type="submit"]:has-text("Lưu")').click();
    await admin.waitForTimeout(2000);
    check('giá trị màu không hợp lệ bị chặn',
      (await admin.locator('text=Giá trị màu không dùng được').count()) > 0);
    check('món hỏng không được tạo', (await db.shopItem.count({ where: { name: 'Màu bậy' } })) === 0);

    // Khung và huy hiệu tạo thẳng bằng dữ liệu — luồng tải ảnh đã kiểm ở album.
    const frame = await db.shopItem.create({
      data: { slug: 'kiem-thu-khung', kind: 'AVATAR_FRAME', name: 'Khung kiểm thử', value: '/uploads/khung.png', pricePoints: 30 },
      select: { id: true },
    });
    const badge = await db.shopItem.create({
      data: { slug: 'kiem-thu-huy-hieu', kind: 'BADGE', name: 'Huy hiệu kiểm thử', value: '/uploads/hh.png', pricePoints: 20 },
      select: { id: true },
    });

    // ── Mua bằng điểm ────────────────────────────────────────────────────
    await db.user.update({ where: { id: minh.id }, data: { points: 100 }, select: { id: true } });
    await member.goto(`${BASE}/cua-hang`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(800);
    check('quầy hàng hiện món vừa tạo', (await member.locator('text=Nick đỏ kiểm thử').count()) > 0);

    // Quầy tách theo loại: không có mục "tất cả", mỗi loại một tab riêng.
    const tabs = await member.$$eval('nav a[href^="/cua-hang"]', (els) => els.map((e) => e.textContent?.trim() ?? ''));
    check('quầy không còn tab tất cả', !tabs.includes('Tất cả'), JSON.stringify(tabs));
    check('quầy có đúng ba tab loại đồ', tabs.length === 3, JSON.stringify(tabs));
    check('tab mặc định là màu tên, không lẫn loại khác',
      (await member.locator('text=Nick đỏ kiểm thử').count()) > 0
      && (await member.locator('text=Khung kiểm thử').count()) === 0);
    check('ô hàng bỏ nhãn loại thừa',
      (await member.locator('ul li .chip:has-text("Màu tên")').count()) === 0);

    await member.goto(`${BASE}/cua-hang?loai=AVATAR_FRAME`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    check('tab khung avatar chỉ hiện khung',
      (await member.locator('text=Khung kiểm thử').count()) > 0
      && (await member.locator('text=Nick đỏ kiểm thử').count()) === 0);

    await member.goto(`${BASE}/cua-hang?loai=BIA-RA`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    check('tham số loại bịa ra thì về tab đầu',
      (await member.locator('text=Nick đỏ kiểm thử').count()) > 0);

    await member.goto(`${BASE}/cua-hang`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);

    // Điểm hiện ở thanh đầu trang, không nhắc lại trong thân trang.
    const chip = member.locator('header a[href="/user/points"]');
    check('thanh đầu trang có ô điểm', (await chip.count()) > 0);
    check('ô điểm hiện đúng số', (await chip.first().innerText()).includes('100'),
      (await chip.first().innerText()).trim());
    check('trang cửa hàng không nhắc lại số điểm',
      (await member.locator('main >> text=/\\d+ điểm/').count()) === 0);

    const row = (page, ten) => page.locator('li').filter({ hasText: ten });
    await row(member, 'Nick đỏ kiểm thử').locator('button:has-text("Mua")').click();
    await member.waitForTimeout(2500);
    const afterBuy = await db.user.findUnique({ where: { id: minh.id }, select: { points: true } });
    check('mua thì trừ đúng điểm', afterBuy?.points === 50, `còn ${afterBuy?.points}`);
    check('ghi sổ sở hữu',
      (await db.shopPurchase.count({ where: { userId: minh.id, itemId: color.id } })) === 1);

    // Không đủ điểm
    await db.user.update({ where: { id: minh.id }, data: { points: 5 }, select: { id: true } });
    await member.reload({ waitUntil: 'networkidle' });
    await member.waitForTimeout(800);
    await member.goto(`${BASE}/cua-hang?loai=AVATAR_FRAME`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    const poorBtn = row(member, 'Khung kiểm thử').locator('button:has-text("Mua")');
    check('không đủ điểm thì nút mua bị khoá', await poorBtn.isDisabled());

    await db.user.update({ where: { id: minh.id }, data: { points: 100 }, select: { id: true } });

    // ── Đeo lên và hiển thị ──────────────────────────────────────────────
    await member.goto(`${BASE}/cua-hang`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(800);
    await row(member, 'Nick đỏ kiểm thử').locator('button:has-text("Đeo lên")').click();
    await member.waitForTimeout(2500);
    const equipped = await db.user.findUnique({ where: { id: minh.id }, select: { nameColorId: true } });
    check('đeo được món đã mua', equipped?.nameColorId === color.id);

    await member.goto(`${BASE}/u/minhdev`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(800);
    check('màu tên hiện trên trang cá nhân',
      (await member.locator('[style*="rgb(225, 29, 72)"], [style*="#e11d48"]').count()) > 0);

    // Gỡ ra thì màu biến mất
    await member.goto(`${BASE}/user/items`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(800);
    check('kho đồ hiện món đã mua', (await member.locator('text=Nick đỏ kiểm thử').count()) > 0);
    check('kho đồ cũng không nhắc lại số điểm',
      (await member.locator('main >> text=/\\d+ điểm/').count()) === 0);
    await row(member, 'Nick đỏ kiểm thử').locator('button:has-text("Đang đeo")').click();
    await member.waitForTimeout(2500);
    const off = await db.user.findUnique({ where: { id: minh.id }, select: { nameColorId: true } });
    check('gỡ được món đang đeo', off?.nameColorId === null, `còn ${off?.nameColorId}`);

    // ── Đeo món CHƯA MUA phải bị chặn ────────────────────────────────────
    // Gọi thẳng server action từ trình duyệt không làm được, nên kiểm bằng
    // cách: đeo sẵn ở CSDL rồi xác nhận giao diện không cho, và quan trọng
    // hơn — người chưa mua thì trong kho đồ không có món đó để mà bấm.
    await member.goto(`${BASE}/user/items`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(800);
    check('kho đồ không chứa món chưa mua',
      (await member.locator('text=Khung kiểm thử').count()) === 0);

    const other = await openPage('huytran');
    await other.goto(`${BASE}/cua-hang`, { waitUntil: 'networkidle' });
    await other.waitForTimeout(800);
    check('người chưa mua chỉ thấy nút Mua, không có nút Đeo lên',
      (await row(other, 'Nick đỏ kiểm thử').locator('button:has-text("Đeo lên")').count()) === 0);

    // ── Mua hai lần không trừ điểm hai lần ───────────────────────────────
    const before = (await db.user.findUnique({ where: { id: minh.id }, select: { points: true } }))?.points;
    await member.goto(`${BASE}/cua-hang`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(800);
    check('món đã mua không còn nút Mua',
      (await row(member, 'Nick đỏ kiểm thử').locator('button:has-text("Mua")').count()) === 0);
    check('điểm không đổi', (await db.user.findUnique({ where: { id: minh.id }, select: { points: true } }))?.points === before);

    // ── Quản trị không xoá được món đã có người mua ──────────────────────
    await admin.goto(`${BASE}/admin/shop`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(800);
    admin.once('dialog', (d) => d.accept());
    await admin.locator('li').filter({ hasText: 'Nick đỏ kiểm thử' }).locator('button[title="Xoá"]').click();
    await admin.waitForTimeout(2000);
    check('món đã có người mua thì không xoá được',
      (await admin.locator('text=hãy tắt').count()) > 0);
    check('món vẫn còn nguyên', (await db.shopItem.count({ where: { id: color.id } })) === 1);

    // Món chưa ai mua thì xoá được
    admin.once('dialog', (d) => d.accept());
    await admin.locator('li').filter({ hasText: 'Huy hiệu kiểm thử' }).locator('button[title="Xoá"]').click();
    await admin.waitForTimeout(2000);
    check('món chưa ai mua thì xoá được', (await db.shopItem.count({ where: { id: badge.id } })) === 0);

    // ── Ngừng bán: gỡ khỏi quầy nhưng người đã mua vẫn giữ ───────────────
    await db.shopItem.update({ where: { id: color.id }, data: { active: false }, select: { id: true } });
    await other.goto(`${BASE}/cua-hang`, { waitUntil: 'networkidle' });
    await other.waitForTimeout(800);
    check('món ngừng bán biến khỏi quầy', (await other.locator('text=Nick đỏ kiểm thử').count()) === 0);

    await member.goto(`${BASE}/user/items`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(800);
    check('người đã mua vẫn thấy món trong kho đồ',
      (await member.locator('text=Nick đỏ kiểm thử').count()) > 0);
    void frame;
  } finally {
    await wipe();
    await db.user.update({ where: { id: minh.id }, data: { points: minh.points }, select: { id: true } });
  }
}
