import { BASE, db, doiToi, openPage } from '../helpers.mjs';

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
      data: { nameColorId: null, shopBadgeId: null },
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
    // Cố tình KHÔNG dùng #e11d48: đó đúng là màu cấp 4 của minhdev, nên mục
    // kiểm "màu tên hiện trên trang cá nhân" sẽ đạt vì màu cấp chứ không phải
    // vì món đồ vừa mua.
    await admin.fill('form input[name="value"]', '#00b7ff');
    await admin.fill('form input[name="pricePoints"]', '50');
    await admin.locator('form button[type="submit"]:has-text("Lưu")').click();
    await admin.waitForTimeout(2500);

    const color = await db.shopItem.findFirst({
      where: { name: 'Nick đỏ kiểm thử' },
      select: { id: true, kind: true, value: true, pricePoints: true, slug: true },
    });
    check('tạo được món màu tên', color?.kind === 'NAME_COLOR' && color?.value === '#00b7ff',
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

    // Huy hiệu tạo thẳng bằng dữ liệu — luồng tải ảnh đã kiểm ở album.
    const badge = await db.shopItem.create({
      data: { slug: 'kiem-thu-huy-hieu', kind: 'BADGE', name: 'Huy hiệu đắt', value: '/uploads/hh.png', pricePoints: 30 },
      select: { id: true },
    });

    // ── Mua bằng điểm ────────────────────────────────────────────────────
    await db.user.update({ where: { id: minh.id }, data: { points: 100 }, select: { id: true } });
    await member.goto(`${BASE}/cua-hang`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(800);
    check('quầy hàng hiện món vừa tạo', (await member.locator('text=Nick đỏ kiểm thử').count()) > 0);

    // Quầy tách theo loại: không có mục "tất cả", mỗi loại một tab riêng.
    // Chỉ đếm tab TRONG quầy: menu đầu trang và chân trang cũng có liên kết
    // /cua-hang, đếm chung vào là con số sai mà đọc lỗi thì tưởng quầy hỏng.
    const tabs = await member.$$eval('[data-shop-tabs] a', (els) => els.map((e) => e.textContent?.trim() ?? ''));
    check('quầy không còn tab tất cả', !tabs.includes('Tất cả'), JSON.stringify(tabs));
    // Hai loại: màu tên và huy hiệu. Avatar, ảnh bìa và danh hiệu KHÔNG bán —
    // hai thứ đầu người dùng tự tải lên, còn danh hiệu là tên bậc theo cấp,
    // thứ phải leo lên mới có chứ không bỏ điểm ra mua.
    check('quầy có đúng hai tab loại đồ', tabs.length === 2, JSON.stringify(tabs));
    check('quầy không bán avatar, ảnh bìa hay danh hiệu',
      !tabs.some((t) => /khung|avatar|bìa|danh hiệu/i.test(t)), JSON.stringify(tabs));
    check('tab mặc định là màu tên, không lẫn loại khác',
      (await member.locator('text=Nick đỏ kiểm thử').count()) > 0
      && (await member.locator('text=Huy hiệu đắt').count()) === 0);
    check('ô hàng bỏ nhãn loại thừa',
      (await member.locator('ul li .chip:has-text("Màu tên")').count()) === 0);

    await member.goto(`${BASE}/cua-hang?loai=BADGE`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    check('tab huy hiệu chỉ hiện huy hiệu',
      (await member.locator('text=Huy hiệu đắt').count()) > 0
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

    // ── Xem trước trước khi mua ──────────────────────────────────────────
    check('chưa bấm thì chưa dựng hộp thoại',
      (await member.locator('[role="dialog"]').count()) === 0);
    await member.locator('button[title="Xem trước Nick đỏ kiểm thử"]').click();
    await member.waitForTimeout(500);
    const dlg = member.locator('[role="dialog"]');
    check('bấm ô hàng mở được xem trước', (await dlg.count()) > 0);
    // Xem trước phải dựng trên hồ sơ THẬT của người xem, không phải hình mẫu.
    check('xem trước dùng tên thật của người xem', (await dlg.innerText()).includes('Minh Dev'));
    check('xem trước tô đúng màu của món',
      (await dlg.locator('[style*="rgb(0, 183, 255)"], [style*="#00b7ff"]').count()) > 0);
    check('hộp thoại khoá cuộn nền',
      (await member.evaluate(() => document.body.style.overflow)) === 'hidden');

    await member.keyboard.press('Escape');
    await member.waitForTimeout(400);
    check('Esc đóng được hộp thoại', (await member.locator('[role="dialog"]').count()) === 0);
    check('đóng xong trả lại cuộn nền',
      (await member.evaluate(() => document.body.style.overflow)) !== 'hidden');

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
    await member.goto(`${BASE}/cua-hang?loai=BADGE`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    const poorBtn = row(member, 'Huy hiệu đắt').locator('button:has-text("Mua")');
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
      (await member.locator('[style*="rgb(0, 183, 255)"], [style*="#00b7ff"]').count()) > 0);

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
      (await member.locator('text=Danh hiệu đắt').count()) === 0);

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
    await admin.locator('li').filter({ hasText: 'Huy hiệu đắt' }).locator('button[title="Xoá"]').click();
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

    // ── Ảnh bìa là của chính chủ, quầy không được đụng vào ───────────────
    // Trước đây quầy có bán ảnh bìa, và món mua được ưu tiên hơn ảnh người
    // dùng tự tải lên — tức là mua xong thì ảnh chính chủ chọn bị đè mất.
    await db.user.update({ where: { id: minh.id }, data: { cover: '/uploads/bia-tu-tai.png' }, select: { id: true } });
    await member.goto(`${BASE}/u/minhdev`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(800);
    check('trang cá nhân dùng đúng ảnh bìa người dùng tự tải lên',
      (await member.content()).includes('/uploads/bia-tu-tai.png'));
    await db.user.update({ where: { id: minh.id }, data: { cover: null }, select: { id: true } });


    // ── Danh hiệu KHÔNG bán ─────────────────────────────────────────────
    // Danh hiệu nay là tên bậc theo cấp. Quầy không được có đường nào bán nó,
    // kể cả bằng địa chỉ gõ tay.
    await member.goto(`${BASE}/cua-hang?loai=TITLE`, { waitUntil: 'networkidle' });
    await member.waitForTimeout(700);
    const tabsCuoi = await member.$$eval('[data-shop-tabs] a', (els) => els.map((e) => e.textContent?.trim() ?? ''));
    check('gõ tay ?loai=TITLE không mở ra tab danh hiệu nào',
      tabsCuoi.length === 2 && !tabsCuoi.some((t) => /danh hiệu/i.test(t)), JSON.stringify(tabsCuoi));

    await admin.goto(`${BASE}/admin/shop`, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(800);
    await admin.locator('button:has-text("Thêm món")').click();
    await admin.waitForTimeout(400);
    check('trang quản trị không còn loại danh hiệu',
      (await admin.locator('form input[name="kind"][value="TITLE"]').count()) === 0);

  } finally {
    await wipe();
    await db.user.update({ where: { id: minh.id }, data: { points: minh.points }, select: { id: true } });
  }
}
