import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Trang "Đang online".
 *
 * Trang này gộp hai nguồn dễ lẫn nên mục kiểm soi đúng chỗ nối:
 *   • `User.lastSeenAt` quyết định AI hiện lên — quá cửa sổ 15 phút là rơi ra,
 *   • `PresenceHere` quyết định DÒNG "đang ở đâu" — cửa sổ ngắn hơn nhiều, nên
 *     có người online mà không có chỗ đứng, và dòng ấy phải biến mất chứ không
 *     được giữ chỗ cũ.
 *
 * Mục nặng nhất: chủ đề đã ẩn thì KHÔNG được lộ tiêu đề ra đây. Ghép tên chỗ
 * đứng mà quên lọc trạng thái là biến trang này thành lối lách xem tên những
 * chủ đề đã bị gỡ.
 */
const DAU = 'kiemthu-online';

export default async function run(check) {
  const ai = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const toi = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL', requiredMedalId: null }, select: { id: true, slug: true } });
  if (!ai || !toi || !forum) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const wipe = async () => {
    await db.thread.deleteMany({ where: { title: { startsWith: DAU } } });
    await db.presenceHere.deleteMany({ where: { userId: { in: [ai.id, toi.id] } } });
  };
  await wipe();

  // `lastSeenAt` là trạng thái thật của người dùng, phải trả lại như cũ.
  const cu = Object.fromEntries(
    (await db.user.findMany({ where: { id: { in: [ai.id, toi.id] } }, select: { id: true, lastSeenAt: true } }))
      .map((u) => [u.id, u.lastSeenAt]),
  );

  const p = await openPage('huytran');
  const trang = `${BASE}/online`;

  try {
    const chuDe = await db.thread.create({
      data: {
        forumId: forum.id, authorId: ai.id, status: 'PUBLISHED',
        title: `${DAU} chủ đề đang mở`, content: '<p>Nội dung.</p>', lastReplyAt: new Date(),
      },
      select: { id: true },
    });

    const bay = async (qs = '') => {
      await p.goto(trang + qs, { waitUntil: 'networkidle' });
      await p.waitForTimeout(700);
      return p.locator('[data-online]').innerText();
    };

    // ── Vừa hoạt động thì có mặt trong danh sách ─────────────────────────
    await db.user.update({ where: { id: ai.id }, data: { lastSeenAt: new Date() }, select: { id: true } });
    let ds = await bay();
    check('người vừa hoạt động thì hiện ở danh sách', ds.includes('Minh Dev'));

    // ── Đang xem một chủ đề thì ghi rõ đang xem gì ───────────────────────
    await db.presenceHere.upsert({
      where: { userId_scope: { userId: ai.id, scope: `thread:${chuDe.id}` } },
      create: { userId: ai.id, scope: `thread:${chuDe.id}` },
      update: { at: new Date() },
      select: { userId: true },
    });
    ds = await bay();
    check('ghi rõ đang xem chủ đề nào', ds.includes(`${DAU} chủ đề đang mở`));
    check('tên chủ đề là liên kết mở được',
      (await p.locator(`[data-online] a[href*="/forum/${forum.slug}/${chuDe.id}"]`).count()) > 0);

    // ── Chủ đề bị ẩn thì KHÔNG lộ tiêu đề ────────────────────────────────
    await db.thread.update({ where: { id: chuDe.id }, data: { status: 'HIDDEN' }, select: { id: true } });
    ds = await bay();
    check('người vẫn còn trong danh sách', ds.includes('Minh Dev'));
    check('chủ đề đã ẩn KHÔNG lộ tiêu đề ra đây', !ds.includes(`${DAU} chủ đề đang mở`));
    await db.thread.update({ where: { id: chuDe.id }, data: { status: 'PUBLISHED' }, select: { id: true } });

    // ── Dấu chỗ đứng cũ thì bỏ dòng "đang ở đâu", người vẫn còn ──────────
    await db.presenceHere.update({
      where: { userId_scope: { userId: ai.id, scope: `thread:${chuDe.id}` } },
      data: { at: new Date(Date.now() - 10 * 60 * 1000) },
      select: { userId: true },
    });
    ds = await bay();
    check('dấu chỗ đứng cũ thì hết ghi đang xem gì', !ds.includes(`${DAU} chủ đề đang mở`));
    check('nhưng người thì vẫn còn online', ds.includes('Minh Dev'));

    // ── Ở phòng chat ─────────────────────────────────────────────────────
    await db.presenceHere.upsert({
      where: { userId_scope: { userId: ai.id, scope: 'chat' } },
      create: { userId: ai.id, scope: 'chat' },
      update: { at: new Date() },
      select: { userId: true },
    });
    ds = await bay();
    check('ghi rõ đang ở phòng chat', ds.includes('phòng chat'));

    // ── Quá cửa sổ 15 phút thì rơi khỏi danh sách ────────────────────────
    await db.user.update({
      where: { id: ai.id }, data: { lastSeenAt: new Date(Date.now() - 30 * 60 * 1000) }, select: { id: true },
    });
    ds = await bay();
    check('quá 15 phút thì rơi khỏi danh sách', !ds.includes('Minh Dev'));

    // ── Lọc ban điều hành ────────────────────────────────────────────────
    await db.user.update({ where: { id: ai.id }, data: { lastSeenAt: new Date() }, select: { id: true } });
    ds = await bay('?loc=dieu-hanh');
    check('lọc ban điều hành bỏ thành viên thường', !ds.includes('Minh Dev'));

    // ── Lối vào từ cột bên ───────────────────────────────────────────────
    await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(700);
    check('ô cộng đồng ở cột bên dẫn sang trang này',
      (await p.locator('a[href="/online"]').count()) > 0);

    // ── Chấm xanh trên trang cá nhân ─────────────────────────────────────
    // Chấm nằm TRONG khung avatar, không phải lơ lửng bên ngoài: avatar tròn
    // thì khung bao nó vuông, dán chấm vào góc khung là chấm rơi ra ngoài vành.
    await db.user.update({ where: { id: ai.id }, data: { lastSeenAt: new Date() }, select: { id: true } });
    await p.goto(`${BASE}/u/minhdev`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const chamHoSo = await p.evaluate(() => {
      const c = document.querySelector('[aria-label="Đang trực tuyến"]');
      if (!c) return null;
      const a = c.parentElement.getBoundingClientRect();
      const r = c.getBoundingClientRect();
      return { trong: r.right <= a.right + 1 && r.bottom <= a.bottom + 1, canhCham: Math.round(r.width), canhAvatar: Math.round(a.width) };
    });
    check('trang cá nhân có chấm xanh khi đang online', !!chamHoSo, String(chamHoSo));
    check('chấm nằm gọn trong khung avatar', chamHoSo?.trong === true, JSON.stringify(chamHoSo));
    check('chấm không to quá so với avatar',
      !!chamHoSo && chamHoSo.canhCham <= chamHoSo.canhAvatar * 0.32, JSON.stringify(chamHoSo));

    await db.user.update({
      where: { id: ai.id }, data: { lastSeenAt: new Date(Date.now() - 60 * 60 * 1000) }, select: { id: true },
    });
    await p.goto(`${BASE}/u/minhdev`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    check('rời đi quá lâu thì hết chấm xanh',
      (await p.locator('[aria-label="Đang trực tuyến"]').count()) === 0);

    // ── Khách vãng lai vẫn xem được ──────────────────────────────────────
    const khach = await openPage(null);
    const r = await khach.goto(trang, { waitUntil: 'networkidle' });
    check('khách vãng lai vẫn mở được trang', r.status() === 200, `trả về ${r.status()}`);
  } finally {
    await wipe();
    for (const [id, lastSeenAt] of Object.entries(cu)) {
      await db.user.update({ where: { id }, data: { lastSeenAt }, select: { id: true } });
    }
  }
}
