import { GOC, db, moTrang } from '../tro-giup.mjs';

/*
 * TRANG THỂ LOẠI — một gian hàng riêng, không phải một tham số trên URL.
 *
 * Trước đây bấm vào thể loại là ra `/duyet?the-loai=…`: cùng một danh sách dọc
 * với bộ lọc bên cạnh. Người bấm vào "Đua xe" không đi lọc, họ muốn được bày
 * cho xem — App Store và CH Play đều cho thể loại một trang riêng vì thế.
 */
export default async function chay(kiem) {
  const the = await db.theLoai.findFirst({
    orderBy: { thuTu: 'asc' },
    where: { game: { some: { game: { trangThai: 'DANG_HIEN' } } } },
    select: { ten: true, duongDan: true },
  });
  if (!the) { kiem('có thể loại đang có game', false); return; }

  const p = await moTrang();
  try {
    const goc = `${GOC}/the-loai/${the.duongDan}`;
    const r = await p.goto(goc, { waitUntil: 'networkidle' });
    kiem('trang thể loại trả về 200', r.status() === 200, `trả về ${r.status()}`);
    kiem('đầu trang là tên thể loại',
      (await p.locator('h1').first().innerText()).includes(the.ten));

    // Số trên đầu phải là số THẬT, không phải số dòng đang vẽ.
    const tong = await db.game.count({
      where: { trangThai: 'DANG_HIEN', theLoai: { some: { theLoai: { duongDan: the.duongDan } } } },
    });
    kiem('nói đúng số game của thể loại',
      (await p.locator(`text=${tong} game`).count()) > 0, `đếm thật ${tong}`);

    /*
     * BA KỆ CHỈ DỰNG KHI THỂ LOẠI ĐỦ ĐÔNG.
     *
     * Thể loại có ba game thì cả ba kệ bày đúng ba game ấy, khác mỗi thứ tự —
     * nhìn vào tưởng trang bị lặp. Nên ngưỡng là 12 (sức chứa một kệ): dưới
     * ngưỡng, danh sách đầy đủ phía dưới vốn đã bày ra hết. Đếm trước rồi mới
     * khẳng định, chứ không khẳng định suông theo dữ liệu đang có.
     */
    const duDongDeCoKe = tong > 12;
    for (const ke of ['Tải nhiều nhất', 'Mới ra mắt']) {
      kiem(duDongDeCoKe ? `có kệ “${ke}”` : `thể loại nhỏ thì KHÔNG dựng kệ “${ke}”`,
        (await p.locator(`text=${ke}`).count() > 0) === duDongDeCoKe,
        `${tong} game trong thể loại`);
    }
    kiem('có danh sách đầy đủ phía dưới',
      (await p.locator('h2').filter({ hasText: the.ten }).count()) > 0);

    // ── Lọc hệ máy giữ nguyên trang, và về trang 1 ─────────────────────
    await p.goto(`${goc}?he=JAVA&trang=2`, { waitUntil: 'networkidle' });
    // Chờ ĐỊA CHỈ đổi, không chờ mạng lặng: điều hướng phía trình duyệt xong
    // sau khi mạng đã lặng, nên đọc `p.url()` ngay là đọc phải địa chỉ cũ.
    await p.click('a:has-text("Mọi hệ máy")');
    await p.waitForURL((u) => !u.search.includes('he='), { timeout: 15_000 }).catch(() => {});
    kiem('bỏ lọc hệ máy thì về trang 1, không giữ ?trang=2',
      !p.url().includes('trang=2') && !p.url().includes('he='), p.url());

    // Hệ máy bịa trên URL thì coi như không lọc, không phải lỗi.
    const rBia = await p.goto(`${goc}?he=SEGA`, { waitUntil: 'networkidle' });
    kiem('hệ máy bịa trên địa chỉ thì bỏ qua, vẫn ra trang', rBia.status() === 200,
      `trả về ${rBia.status()}`);

    // Trang bịa thì kẹp về trang cuối, không ra danh sách trống.
    await p.goto(`${goc}?trang=99`, { waitUntil: 'networkidle' });
    kiem('?trang=99 kẹp về trang cuối', (await p.locator('section ul li').count()) > 0);

    // ── Thể loại không có thật thì 404 ─────────────────────────────────
    const r404 = await p.goto(`${GOC}/the-loai/the-loai-bia-ra`, { waitUntil: 'domcontentloaded' });
    kiem('thể loại không có thật trả về 404', r404.status() === 404, `trả về ${r404.status()}`);

    /*
     * ── MỌI LỐI VÀO THỂ LOẠI PHẢI TRỎ VỀ ĐÂY ──────────────────────────
     *
     * Để sót một lối trỏ `/duyet?the-loai=` thì người dùng gặp hai trang khác
     * hẳn nhau cho cùng một thể loại, tuỳ họ bấm từ đâu.
     */
    await p.goto(`${GOC}/game`, { waitUntil: 'networkidle' });
    const oThe = p.locator(`a[href="/the-loai/${the.duongDan}"]`);
    kiem('lưới thể loại ở trang Game trỏ sang trang thể loại',
      (await oThe.count()) > 0);

    const g = await db.game.findFirst({
      orderBy: { id: 'asc' },
      where: {
        trangThai: 'DANG_HIEN',
        theLoai: { some: { theLoai: { duongDan: the.duongDan } } },
      },
      select: { duongDan: true },
    });
    await p.goto(`${GOC}/game/${g.duongDan}`, { waitUntil: 'networkidle' });
    kiem('thể loại dưới tên game bấm được',
      (await p.locator(`a[href="/the-loai/${the.duongDan}"]`).count()) > 0);
  } finally {
    await p.close();
  }
}
