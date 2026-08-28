import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Danh bạ thành viên: tìm, sắp, lọc người đang online.
 *
 * Mấy mục lọc và sắp xếp đều phải chấm trên DỮ LIỆU chứ không tin chữ trên
 * màn hình: bộ lọc hỏng kiểu "trả về tất cả" vẫn hiện đầy trang, nhìn qua
 * tưởng chạy đúng.
 */
export default async function run(check) {
  const online = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true, username: true } });
  const offline = await db.user.findFirst({ where: { username: 'lanpham' }, select: { id: true, username: true } });
  if (!online || !offline) { check('có dữ liệu mẫu', false, 'thiếu người dùng'); return; }

  // Dựng sẵn trạng thái: một người vừa ghé, một người lâu rồi không thấy.
  const cu = await Promise.all([online.id, offline.id].map((id) =>
    db.user.findUnique({ where: { id }, select: { lastSeenAt: true } })));
  await db.user.update({ where: { id: online.id }, data: { lastSeenAt: new Date() }, select: { id: true } });
  await db.user.update({
    where: { id: offline.id },
    data: { lastSeenAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    select: { id: true },
  });

  const p = await openPage(null);

  try {
    // ── Trang mở được cho cả khách vãng lai ──────────────────────────────
    const r = await p.goto(`${BASE}/thanh-vien`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    check('khách vãng lai xem được danh bạ', r.status() === 200, `trả về ${r.status()}`);
    let html = await p.content();
    check('danh bạ có người', html.includes('minhdev') || html.includes('Minh Dev'));
    check('có lối vào từ menu đầu trang',
      (await p.locator('header a[href="/thanh-vien"]').count()) > 0);

    // ── Lọc người đang online ────────────────────────────────────────────
    await p.goto(`${BASE}/thanh-vien?online=1`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    html = await p.content();
    check('lọc online có người vừa ghé', html.includes(`/u/${online.username}`));
    check('lọc online loại người lâu không thấy', !html.includes(`/u/${offline.username}`));

    // Số đếm trên trang phải khớp với số hàng trong CSDL, không phải số ước.
    const soOnline = await db.user.count({
      where: { status: 'ACTIVE', lastSeenAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
    });
    // Đọc CHỮ hiện ra chứ không đọc mã nguồn: React chèn `<!-- -->` giữa số và
    // chữ nên trong mã nguồn hai phần không dính liền nhau.
    const dongDem = await p.locator('header p, main p').filter({ hasText: 'đang online' }).first().innerText();
    check('con số "đang online" khớp dữ liệu',
      dongDem.replace(/\s+/g, ' ').includes(`${soOnline} đang online`), `CSDL đếm ${soOnline}; trang ghi "${dongDem.trim()}"`);

    // ── Tìm theo tên ─────────────────────────────────────────────────────
    await p.goto(`${BASE}/thanh-vien?q=${offline.username}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    html = await p.content();
    check('tìm đúng người cần tìm', html.includes(`/u/${offline.username}`));
    check('tìm loại người không khớp', !html.includes(`/u/${online.username}`));

    await p.goto(`${BASE}/thanh-vien?q=khong-co-ai-ten-the-nay-dau`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    check('không khớp ai thì báo rõ', (await p.content()).includes('Không tìm thấy ai khớp'));

    // ── Sắp xếp ──────────────────────────────────────────────────────────
    // Người nhiều điểm nhất trong CSDL phải đứng đầu khi sắp theo điểm.
    const giau = await db.user.findFirst({
      where: { status: 'ACTIVE' }, orderBy: { points: 'desc' }, select: { username: true },
    });
    await p.goto(`${BASE}/thanh-vien?sort=points`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    const dau = await p.locator('a[href^="/u/"]').first().getAttribute('href');
    check('sắp theo điểm thì người nhiều điểm nhất đứng đầu',
      dau === `/u/${giau.username}`, `đứng đầu là ${dau}`);

    await p.goto(`${BASE}/thanh-vien?sort=bia-ra`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    check('tham số sắp xếp bịa ra thì về mặc định', (await p.content()).includes('Hoạt động gần đây'));

    // ── Giữ lựa chọn khi đổi một thứ ─────────────────────────────────────
    await p.goto(`${BASE}/thanh-vien?sort=karma&online=1`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    const nutTim = await p.locator('a[href*="/thanh-vien?"]').evaluateAll((els) =>
      els.map((e) => e.getAttribute('href')));
    check('đổi cách sắp vẫn giữ bộ lọc online',
      nutTim.some((h) => h.includes('online=1') && h.includes('sort=points')),
      JSON.stringify(nutTim.slice(0, 6)));
  } finally {
    // Trả lại dấu hoạt động như trước để bài kiểm khác không lệ thuộc vào đây.
    await db.user.update({ where: { id: online.id }, data: { lastSeenAt: cu[0].lastSeenAt }, select: { id: true } });
    await db.user.update({ where: { id: offline.id }, data: { lastSeenAt: cu[1].lastSeenAt }, select: { id: true } });
  }
}
