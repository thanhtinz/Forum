import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Bộ đếm lệch và điều kiện đua.
 *
 * Hai loại lỗi khác nhau nhưng cùng một hậu quả: con số sai mà KHÔNG có gì kéo
 * về đúng được nữa.
 *
 *   • Bộ đếm: mỗi đường đi tự cộng trừ lấy, mà mỗi chỗ lại quên một kiểu — ẩn
 *     chủ đề thì trừ, hiện lại thì không cộng; xoá chủ đề thì quên trừ trả lời.
 *     Nên mục kiểm ở đây không so "trừ đúng mấy" mà so THẲNG với dữ liệu thật
 *     sau từng thao tác: đó mới là điều kiện phải luôn đúng.
 *
 *   • Đua: hai lần bấm cùng lúc thì cả hai cùng đọc thấy "chưa ai làm" rồi cùng
 *     ghi. Chỗ đau nhất là điểm treo thưởng — trả hai lần trong khi chỉ giữ
 *     một lần, tức là điểm được in ra từ hư không. Hai mục kiểm cuối bấm THẬT
 *     hai lần cùng lúc từ hai trang đã mở sẵn, chứ không bấm nối tiếp.
 */
const DAU = 'kiemthu-bodem';

export default async function run(check) {
  const chu = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const kia = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  const ba = await db.user.findFirst({ where: { username: 'lanpham' }, select: { id: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL' }, select: { id: true, slug: true } });
  if (!chu || !kia || !ba || !forum) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const wipe = async () => {
    await db.thread.deleteMany({ where: { title: { startsWith: DAU } } });
    await db.friendship.deleteMany({
      where: { OR: [{ requesterId: chu.id, addresseeId: ba.id }, { requesterId: ba.id, addresseeId: chu.id }] },
    });
  };
  await wipe();

  /**
   * Điều kiện phải luôn đúng — đếm lại từ dữ liệu thật rồi so với con số đang lưu.
   * Trả về chuỗi mô tả chỗ lệch, hoặc chuỗi rỗng nếu khớp cả.
   */
  const soLech = async (threadIds = []) => {
    const f = await db.forum.findUnique({
      where: { id: forum.id }, select: { threadCount: true, replyCount: true },
    });
    const that = {
      threadCount: await db.thread.count({ where: { forumId: forum.id, status: 'PUBLISHED' } }),
      replyCount: await db.reply.count({
        where: { hidden: false, thread: { forumId: forum.id, status: 'PUBLISHED' } },
      }),
    };
    const loi = [];
    if (f.threadCount !== that.threadCount) loi.push(`mục: số chủ đề ${f.threadCount} ≠ ${that.threadCount}`);
    if (f.replyCount !== that.replyCount) loi.push(`mục: số trả lời ${f.replyCount} ≠ ${that.replyCount}`);
    for (const id of threadIds) {
      const t = await db.thread.findUnique({ where: { id }, select: { replyCount: true } });
      if (!t) continue;
      const n = await db.reply.count({ where: { threadId: id, hidden: false } });
      if (t.replyCount !== n) loi.push(`chủ đề: số trả lời ${t.replyCount} ≠ ${n}`);
    }
    return loi.join('; ');
  };

  /** Ghi con số đúng làm nền, để mục kiểm không dính lệch do bài kiểm khác để lại. */
  const datNen = async () => {
    await db.forum.update({
      where: { id: forum.id },
      data: {
        threadCount: await db.thread.count({ where: { forumId: forum.id, status: 'PUBLISHED' } }),
        replyCount: await db.reply.count({
          where: { hidden: false, thread: { forumId: forum.id, status: 'PUBLISHED' } },
        }),
      },
      select: { id: true },
    });
  };

  const quanTri = await openPage('admin@nova.local', 'admin123');
  const hang = (page, id) => page.locator(`div.p-3:has(a[href$="/${id}"])`);

  try {
    // ── Nền: một chủ đề, ba trả lời trong đó một cái đang ẩn ─────────────
    const t = await db.thread.create({
      data: {
        forumId: forum.id, authorId: chu.id, status: 'PUBLISHED',
        title: `${DAU} chủ đề đếm số`, content: '<p>Nội dung.</p>', lastReplyAt: new Date(),
      },
      select: { id: true },
    });
    for (let i = 1; i <= 3; i++) {
      await db.reply.create({
        data: { threadId: t.id, authorId: kia.id, content: `${DAU} tra loi ${i}`, hidden: i === 3 },
        select: { id: true },
      });
    }
    await db.thread.update({ where: { id: t.id }, data: { replyCount: 2 }, select: { id: true } });
    await datNen();
    check('nền khớp trước khi bắt đầu', (await soLech([t.id])) === '', await soLech([t.id]));

    // ── Ẩn rồi hiện lại từ trang quản trị ────────────────────────────────
    // Đây là lỗi cũ: `setThreadStatus` đổi trạng thái mà không đụng bộ đếm,
    // trong khi nút "Ẩn" của điều hành viên thì có trừ — nên ẩn ở một nơi, hiện
    // lại ở nơi kia là con số hụt vĩnh viễn.
    const moQuanTri = async () => {
      await quanTri.goto(`${BASE}/admin/threads?forum=${forum.slug}`, { waitUntil: 'networkidle' });
      await quanTri.waitForTimeout(600);
    };
    await moQuanTri();
    await hang(quanTri, t.id).locator('button[title="Ẩn chủ đề"]').click();
    await quanTri.waitForTimeout(1500);
    check('ẩn chủ đề rồi thì bộ đếm vẫn khớp', (await soLech([t.id])) === '', await soLech([t.id]));

    await moQuanTri();
    await hang(quanTri, t.id).locator('button[title="Hiện lại"]').click();
    await quanTri.waitForTimeout(1500);
    check('hiện lại chủ đề thì bộ đếm quay về đúng', (await soLech([t.id])) === '', await soLech([t.id]));

    // ── Ẩn / hiện một trả lời ────────────────────────────────────────────
    const mo = async () => {
      await quanTri.goto(`${BASE}/forum/${forum.slug}/${t.id}`, { waitUntil: 'networkidle' });
      await quanTri.waitForTimeout(700);
    };
    await mo();
    await quanTri.locator('button[title="Ẩn trả lời này khỏi mọi người"]').first().click();
    await quanTri.waitForTimeout(1500);
    check('ẩn một trả lời thì cả hai bộ đếm vẫn khớp', (await soLech([t.id])) === '', await soLech([t.id]));

    await mo();
    await quanTri.locator('button[title="Hiện lại trả lời này"]').first().click();
    await quanTri.waitForTimeout(1500);
    check('hiện lại trả lời thì bộ đếm quay về đúng', (await soLech([t.id])) === '', await soLech([t.id]));

    // ── Chủ đề đã ẩn thì không nhận trả lời ──────────────────────────────
    await db.thread.update({ where: { id: t.id }, data: { status: 'HIDDEN' }, select: { id: true } });
    await datNen();
    const truoc = await db.reply.count({ where: { threadId: t.id } });
    const nguoiKhac = await openPage('huytran');
    await nguoiKhac.goto(`${BASE}/forum/${forum.slug}/${t.id}`, { waitUntil: 'networkidle' });
    await nguoiKhac.waitForTimeout(700);
    check('chủ đề đã ẩn thì người thường không vào được',
      (await db.reply.count({ where: { threadId: t.id } })) === truoc);
    await db.thread.update({ where: { id: t.id }, data: { status: 'PUBLISHED' }, select: { id: true } });
    await datNen();

    // ── Xoá chủ đề thì trừ cả trả lời trong nó ───────────────────────────
    await moQuanTri();
    quanTri.once('dialog', (d) => d.accept());
    await hang(quanTri, t.id).locator('button[title="Xoá"]').click();
    await doiToi(async () => (await db.thread.count({ where: { id: t.id } })) === 0);
    check('xoá chủ đề rồi thì chủ đề đó không còn',
      (await db.thread.count({ where: { id: t.id } })) === 0);
    check('xoá chủ đề thì trừ theo cả số trả lời', (await soLech()) === '', await soLech());

    // ── Đua: chọn lời giải hai lần cùng lúc ──────────────────────────────
    // Điểm treo thưởng chỉ bị GIỮ một lần lúc đăng bài, nên trả hai lần là in
    // điểm ra từ hư không. Hai trang đều mở TRƯỚC khi bấm, nên cả hai đều còn
    // thấy nút "Chọn làm lời giải" — đúng tình huống đua thật.
    const thuong = 20;
    const t2 = await db.thread.create({
      data: {
        forumId: forum.id, authorId: chu.id, status: 'PUBLISHED', bountyPoints: thuong,
        title: `${DAU} chủ đề treo thưởng`, content: '<p>Ai giúp với.</p>', lastReplyAt: new Date(),
      },
      select: { id: true },
    });
    await db.reply.create({
      data: { threadId: t2.id, authorId: kia.id, content: `${DAU} loi giai mot` }, select: { id: true },
    });
    await db.reply.create({
      data: { threadId: t2.id, authorId: ba.id, content: `${DAU} loi giai hai` }, select: { id: true },
    });
    await db.thread.update({ where: { id: t2.id }, data: { replyCount: 2 }, select: { id: true } });
    await datNen();

    const tacGiaA = await openPage('minhdev');
    const tacGiaB = await openPage('minhdev');
    for (const p of [tacGiaA, tacGiaB]) {
      await p.goto(`${BASE}/forum/${forum.slug}/${t2.id}`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(700);
    }
    // Nhận diện bài theo NỘI DUNG: khối bài chỉ đánh số theo thứ tự (`bai-1`,
    // `bai-2`…), mà thứ tự thì đổi theo cách sắp xếp.
    const nut = (p, chu) => p.locator('[id^="bai-"]').filter({ hasText: chu })
      .locator('button:has-text("Chọn làm lời giải")');
    const coNut = (await nut(tacGiaA, 'loi giai mot').count()) > 0;
    check('trang chủ đề có nút chọn lời giải', coNut);
    if (coNut) {
      await Promise.all([
        nut(tacGiaA, 'loi giai mot').click().catch(() => {}),
        nut(tacGiaB, 'loi giai hai').click().catch(() => {}),
      ]);
      // Hai người cùng bấm chọn lời giải; chờ tới khi CÓ khoản trả thưởng rồi
      // mới đếm — mục kiểm khẳng định chỉ trả đúng MỘT lần.
      await doiToi(async () => (await db.pointsLog.count({
        where: { reason: 'BOUNTY_RECEIVED', refId: t2.id },
      })) > 0);

      const traThuong = await db.pointsLog.count({
        where: { reason: 'BOUNTY_RECEIVED', refId: t2.id },
      });
      check('điểm treo thưởng chỉ trả đúng một lần', traThuong === 1, `trả ${traThuong} lần`);
      const solved = await db.reply.count({ where: { threadId: t2.id, isSolution: true } });
      check('chỉ một trả lời được chốt làm lời giải', solved === 1, `có ${solved} lời giải`);
    }

    // ── Đua: điểm danh hai lần cùng lúc ──────────────────────────────────
    const homNay = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const dauNgay = new Date(Date.parse(`${homNay}T00:00:00Z`) - 7 * 3600 * 1000);
    const mocCu = (await db.user.findUnique({ where: { id: ba.id }, select: { lastCheckinAt: true } }))?.lastCheckinAt ?? null;
    await db.pointsLog.deleteMany({ where: { userId: ba.id, reason: 'CHECKIN', createdAt: { gte: dauNgay } } });
    await db.user.update({ where: { id: ba.id }, data: { lastCheckinAt: null }, select: { id: true } });

    const dA = await openPage('lanpham');
    const dB = await openPage('lanpham');
    for (const p of [dA, dB]) {
      await p.goto(`${BASE}/user/dashboard`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(700);
    }
    await Promise.all([
      dA.locator('button:has-text("Điểm danh hôm nay")').click().catch(() => {}),
      dB.locator('button:has-text("Điểm danh hôm nay")').click().catch(() => {}),
    ]);
    await dA.waitForTimeout(2500);
    const soLanDiem = await db.pointsLog.count({
      where: { userId: ba.id, reason: 'CHECKIN', createdAt: { gte: dauNgay } },
    });
    check('điểm danh hai lần cùng lúc chỉ ăn điểm một lần', soLanDiem === 1, `ghi ${soLanDiem} lần`);
    await db.user.update({ where: { id: ba.id }, data: { lastCheckinAt: mocCu }, select: { id: true } });

    // ── Huỷ kết bạn phải xoá SẠCH mọi hàng nối hai người ─────────────────
    // Dữ liệu cũ có thể còn hai hàng ngược chiều sinh ra từ lúc hai người bấm
    // "kết bạn" cùng lúc. Xoá theo id thì sót một hàng, mà sót một hàng là album
    // mức "chỉ bạn bè" vẫn mở cho người đã huỷ kết bạn.
    await db.friendship.create({
      data: { requesterId: chu.id, addresseeId: ba.id, status: 'ACCEPTED', acceptedAt: new Date() },
      select: { id: true },
    });
    await db.friendship.create({
      data: { requesterId: ba.id, addresseeId: chu.id, status: 'ACCEPTED', acceptedAt: new Date() },
      select: { id: true },
    });
    const banA = await openPage('minhdev');
    await banA.goto(`${BASE}/u/lanpham`, { waitUntil: 'networkidle' });
    await banA.waitForTimeout(900);
    banA.once('dialog', (d) => d.accept());
    const nutHuy = banA.locator('button:has-text("Bạn bè")').first();
    check('trang cá nhân hiện đúng là đã kết bạn', (await nutHuy.count()) > 0);
    if ((await nutHuy.count()) > 0) {
      await nutHuy.click();
      await doiToi(async () => (await db.friendship.count({
        where: { OR: [{ requesterId: chu.id, addresseeId: ba.id }, { requesterId: ba.id, addresseeId: chu.id }] },
      })) === 0);
    }
    const conLai = await db.friendship.count({
      where: { OR: [{ requesterId: chu.id, addresseeId: ba.id }, { requesterId: ba.id, addresseeId: chu.id }] },
    });
    check('huỷ kết bạn xoá sạch cả hàng ngược chiều', conLai === 0, `còn ${conLai} hàng`);
  } finally {
    await wipe();
    await datNen();
  }
}
