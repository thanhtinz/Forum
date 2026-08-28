import { BASE, db, openPage } from '../helpers.mjs';

/**
 * `[hide=…]`: khối ẩn mở theo đúng điều kiện người đăng đặt.
 *
 * Trước đây khối ẩn chỉ có một kiểu "trả lời mới xem được", trong khi trang
 * đăng bài viết đã có sẵn cả dãy mức khoá. Bộ kiểm này đi qua từng mức, và mức
 * nào cũng phải kiểm ở mức MÃ NGUỒN: che bằng CSS thì chuỗi còn nguyên trong
 * trang, ai bấm "xem nguồn" cũng đọc được — mà thứ hay giấu ở đây đúng là thứ
 * người ta muốn giấu nhất.
 *
 * Chủ đề tạo thẳng bằng dữ liệu: đi qua ô soạn thì vướng hạn mức đăng bài, mà
 * hạn mức giữ trong bộ nhớ máy chủ nên xoá hàng ở CSDL không gỡ được.
 */
const TITLE_PREFIX = 'Kiểm thử hide điều kiện';

export default async function run(check) {
  const author = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const reader = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true, points: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL' }, select: { id: true, slug: true } });
  if (!author || !reader || !forum) { check('có dữ liệu mẫu', false, 'thiếu người dùng hoặc chuyên mục'); return; }

  const wipe = async () => {
    await db.thread.deleteMany({ where: { title: { startsWith: TITLE_PREFIX } } });
  };
  await wipe();

  /**
   * Khối ẩn viết đúng dạng `bbcodeToHtml` sinh ra: mốc mở mang theo điều kiện.
   * Mục cuối của bộ kiểm này đi qua ô soạn thật để chắc BBCode dựng ra đúng
   * chuỗi ấy — ở đây dựng tay cho khỏi phải chạy mã TypeScript từ tệp .mjs.
   */
  const khoiAn = (dieuKien, ruot) =>
    `<!--hide${dieuKien ? `:${dieuKien}` : ''}--><p>${ruot}</p><!--/hide-->`;

  const taoChuDe = async (ten, noiDung, extra = {}) => db.thread.create({
    data: {
      forumId: forum.id, authorId: author.id, status: 'PUBLISHED',
      title: `${TITLE_PREFIX} — ${ten}`,
      content: noiDung, lastReplyAt: new Date(), ...extra,
    },
    select: { id: true },
  });

  const guest = await openPage('huytran');
  const url = (t) => `${BASE}/forum/${forum.slug}/${t.id}`;
  const xem = async (t) => {
    await guest.goto(url(t), { waitUntil: 'networkidle' });
    await guest.waitForTimeout(700);
    return guest.content();
  };

  try {
    // ── Mốc lượt thích: chưa đủ thì khoá, đủ thì mở ──────────────────────
    const BIMAT_THICH = 'BIMAT-MOC-THICH-1';
    const tThich = await taoChuDe('mốc thích', `<p>Xem đi:</p>${khoiAn('likegoal:5', BIMAT_THICH)}`, { likeCount: 2 });
    let html = await xem(tThich);
    check('mốc thích chưa đủ thì còn khoá', !html.includes(BIMAT_THICH));
    check('có nhắc còn thiếu bao nhiêu lượt thích', html.includes('đủ 5 lượt thích'));

    await db.thread.update({ where: { id: tThich.id }, data: { likeCount: 5 } });
    html = await xem(tThich);
    check('đủ mốc thích thì mở', html.includes(BIMAT_THICH));

    // ── Mốc trả lời ──────────────────────────────────────────────────────
    const BIMAT_TL = 'BIMAT-MOC-TRALOI-2';
    const tTraLoi = await taoChuDe('mốc trả lời', khoiAn('replygoal:3', BIMAT_TL), { replyCount: 1 });
    html = await xem(tTraLoi);
    check('mốc trả lời chưa đủ thì còn khoá', !html.includes(BIMAT_TL));

    await db.thread.update({ where: { id: tTraLoi.id }, data: { replyCount: 3 } });
    html = await xem(tTraLoi);
    check('đủ mốc trả lời thì mở', html.includes(BIMAT_TL));

    // ── Cấp thành viên ───────────────────────────────────────────────────
    const BIMAT_CAP = 'BIMAT-CAP-3';
    const capCu = (await db.user.findUnique({ where: { id: reader.id }, select: { level: true } })).level;
    const tCap = await taoChuDe('cấp', khoiAn('level:9', BIMAT_CAP));
    html = await xem(tCap);
    check('chưa đủ cấp thì còn khoá', !html.includes(BIMAT_CAP));
    check('có nhắc cần cấp mấy', html.includes('cấp 9'));

    await db.user.update({ where: { id: reader.id }, data: { level: 9 } });
    html = await xem(tCap);
    check('đủ cấp thì mở', html.includes(BIMAT_CAP));
    await db.user.update({ where: { id: reader.id }, data: { level: capCu } });

    // ── Cần đăng nhập ────────────────────────────────────────────────────
    const BIMAT_DN = 'BIMAT-DANG-NHAP-4';
    const tDangNhap = await taoChuDe('đăng nhập', khoiAn('login', BIMAT_DN));
    const anon = await openPage(null);
    await anon.goto(url(tDangNhap), { waitUntil: 'networkidle' });
    await anon.waitForTimeout(700);
    check('khách vãng lai không thấy', !(await anon.content()).includes(BIMAT_DN));
    check('đã đăng nhập thì thấy', (await xem(tDangNhap)).includes(BIMAT_DN));

    // ── Trả bằng điểm ────────────────────────────────────────────────────
    const BIMAT_DIEM = 'BIMAT-TRA-DIEM-5';
    const GIA = 30;
    await db.user.update({ where: { id: reader.id }, data: { points: 500 } });
    const tDiem = await taoChuDe('điểm', khoiAn(`points:${GIA}`, BIMAT_DIEM));
    html = await xem(tDiem);
    check('chưa trả điểm thì còn khoá', !html.includes(BIMAT_DIEM));
    check('có nút mở khoá bằng điểm', html.includes('Dùng điểm để mở khoá'));

    const truoc = (await db.user.findUnique({ where: { id: reader.id }, select: { points: true } })).points;
    const diemTacGiaTruoc = (await db.user.findUnique({ where: { id: author.id }, select: { points: true } })).points;
    await guest.click('button:has-text("Dùng điểm để mở khoá")');
    await guest.waitForTimeout(2500);
    html = await guest.content();
    check('trả điểm xong thì mở', html.includes(BIMAT_DIEM));

    const sau = (await db.user.findUnique({ where: { id: reader.id }, select: { points: true } })).points;
    check('trừ đúng số điểm', sau === truoc - GIA, `trước ${truoc}, sau ${sau}`);
    const diemTacGiaSau = (await db.user.findUnique({ where: { id: author.id }, select: { points: true } })).points;
    check('người đăng được chia điểm', diemTacGiaSau > diemTacGiaTruoc);
    const so = await db.threadHideUnlock.count({ where: { userId: reader.id, threadId: tDiem.id } });
    check('ghi đúng một hàng sổ mở khoá', so === 1);

    // Vào lại không bị đòi tiếp — sổ quyền phải có tác dụng.
    html = await xem(tDiem);
    const lai = (await db.user.findUnique({ where: { id: reader.id }, select: { points: true } })).points;
    check('vào lại vẫn mở, không trừ thêm', html.includes(BIMAT_DIEM) && lai === sau);

    // ── Người đăng luôn đọc được bài của chính mình ──────────────────────
    const poster = await openPage('minhdev');
    await poster.goto(url(tDiem), { waitUntil: 'networkidle' });
    await poster.waitForTimeout(700);
    check('người đăng không phải trả điểm cho bài mình', (await poster.content()).includes(BIMAT_DIEM));

    // ── Không tham số vẫn là nếp cũ: trả lời mới xem được ────────────────
    const BIMAT_CU = 'BIMAT-KIEU-CU-6';
    const tCu = await taoChuDe('kiểu cũ', khoiAn('', BIMAT_CU));
    check('không tham số thì vẫn đòi trả lời', !(await xem(tCu)).includes(BIMAT_CU));
    await db.reply.create({
      data: { threadId: tCu.id, authorId: reader.id, content: 'Cảm ơn bạn nhé' }, select: { id: true },
    });
    check('trả lời xong thì mở', (await xem(tCu)).includes(BIMAT_CU));

    // ── Trích ngắn ở danh sách không được lọt mức nào ────────────────────
    const markup = () => guest.evaluate(() => {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll('script').forEach((s) => s.remove());
      return clone.innerHTML;
    });
    await guest.goto(`${BASE}/forum/${forum.slug}`, { waitUntil: 'networkidle' });
    await guest.waitForTimeout(700);
    const ds = await markup();
    check('trích ngắn ở danh sách không lọt khối ẩn nào',
      ![BIMAT_THICH, BIMAT_TL, BIMAT_CAP, BIMAT_DN, BIMAT_CU].some((s) => ds.includes(s)));

    // ── BBCode gõ tay có dựng ra đúng mốc không ──────────────────────────
    // Mọi mục trên đều dựng sẵn mốc trong CSDL, nên nếu bộ đọc `[hide=…]` hỏng
    // thì không mục nào kêu. Đi qua ô SỬA BÀI để chạy thật một lượt — sửa bài
    // không vướng hạn mức đăng, khác với đăng mới.
    const BIMAT_GO = 'BIMAT-GO-TAY-7';
    await poster.goto(`${BASE}/forum/${forum.slug}/${tCu.id}/edit`, { waitUntil: 'networkidle' });
    await poster.fill('textarea[name="content"]',
      `Bản mới đây:\n\n[hide=diem:45]${BIMAT_GO}[/hide]`);
    await poster.click('button[type="submit"]');
    await poster.waitForTimeout(2500);

    const daLuu = await db.thread.findUnique({ where: { id: tCu.id }, select: { content: true } });
    check('BBCode [hide=diem:45] dựng ra mốc có điều kiện',
      daLuu.content.includes('<!--hide:points:45-->'), daLuu.content.slice(0, 120));
    const xemLai = await xem(tCu);
    check('gõ tay xong thì khối ẩn khoá đúng bằng điểm',
      !xemLai.includes(BIMAT_GO) && xemLai.includes('mở khoá bằng 45 điểm'));
  } finally {
    await wipe();
  }
}
