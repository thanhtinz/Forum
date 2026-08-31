import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Khu vực diễn đàn khoá bằng huy hiệu.
 *
 * Khoá cả XEM lẫn ĐĂNG: chưa có huy hiệu thì không thấy chủ đề bên trong —
 * kể cả đi thẳng bằng đường dẫn chủ đề, kể cả qua các bảng tin gộp toàn trang
 * (mới nhất, sôi nổi, tìm kiếm…) — và cũng không mở được chủ đề mới ở đó, dù
 * `postAccess` của khu vực có để "Ai cũng đăng được". Có huy hiệu rồi thì cả
 * hai việc đều mở ra cùng lúc. Khu vực vẫn hiện tên trong danh sách chung —
 * không giấu sự tồn tại của nó, chỉ nội dung là bị chắn.
 */
export default async function run(check) {
  const [a, b] = await Promise.all([
    db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } }),
    db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } }),
  ]);
  if (!a || !b) { check('có dữ liệu mẫu', false, 'thiếu minhdev hoặc huytran'); return; }

  const medal = await db.medal.create({
    data: { slug: `khu-vuc-kiem-${Date.now()}`, name: 'Cấp Bậc Ẩn Sĩ', icon: '🗝️' },
    select: { id: true, name: true },
  });
  const forum = await db.forum.create({
    data: {
      slug: `khu-can-huy-hieu-${Date.now()}`, name: 'Hội Kín Ẩn Sĩ', order: 999,
      requiredMedalId: medal.id,
    },
  });
  const thread = await db.thread.create({
    data: {
      forumId: forum.id, authorId: a.id, status: 'PUBLISHED',
      title: 'Bí mật của Ẩn Sĩ', content: 'Nội dung riêng tư không được lộ ra ngoài.',
    },
  });
  await db.forum.update({ where: { id: forum.id }, data: { threadCount: 1 } });

  // ── Chưa có huy hiệu: xem khu vực bị chặn ───────────────────────────────
  const pB = await openPage('huytran');
  await pB.goto(`${BASE}/forum/${forum.slug}`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  const chuKhoa = await pB.locator('main').innerText();
  check('chưa có huy hiệu thì thấy lời nhắc khoá, không thấy tên khu vực đề',
    chuKhoa.includes('không công khai') && chuKhoa.includes(medal.name));
  check('không lộ tiêu đề chủ đề bên trong', !chuKhoa.includes('Bí mật của Ẩn Sĩ'));

  // Đi thẳng bằng đường dẫn chủ đề cũng bị chặn y hệt.
  await pB.goto(`${BASE}/forum/${forum.slug}/${thread.id}`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  const chuThreadKhoa = await pB.locator('main').innerText();
  check('vào thẳng đường dẫn chủ đề cũng bị chặn', chuThreadKhoa.includes('không công khai'));
  check('không lộ nội dung chủ đề qua đường dẫn trực tiếp',
    !chuThreadKhoa.includes('Nội dung riêng tư'));

  // Trang chủ vẫn hiện TÊN khu vực (không giấu sự tồn tại) nhưng không lộ bài mới nhất.
  await pB.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  const chuTrangChu = await pB.locator('main').innerText();
  check('trang chủ vẫn hiện tên khu vực khoá', chuTrangChu.includes('Hội Kín Ẩn Sĩ'));
  check('trang chủ không lộ tiêu đề bài mới nhất của khu vực khoá',
    !chuTrangChu.includes('Bí mật của Ẩn Sĩ'));

  // Tìm kiếm không trả về chủ đề trong khu vực khoá — dùng cụm từ đặc trưng
  // trong THÂN bài chứ không phải tiêu đề: tiêu đề còn bị ô nhập và câu "Không
  // tìm thấy… cho <tiêu đề>" lặp lại nguyên văn, dò theo nó sẽ luôn khớp giả.
  const timKiem = await pB.evaluate(async ([base]) => {
    const r = await fetch(`${base}/search?q=${encodeURIComponent('không được lộ ra ngoài')}`);
    return r.status === 200 ? await r.text() : '';
  }, [BASE]);
  check('tìm kiếm không trả về chủ đề trong khu vực khoá',
    !timKiem.includes('Bí mật của Ẩn Sĩ') && timKiem.includes('Không tìm thấy'));

  // Chưa có huy hiệu thì cũng không đăng được — trang "đăng chủ đề mới" là
  // đường dẫn RIÊNG, phải tự kiểm chứ không ăn theo trang xem. Trước khi sửa,
  // trang này chỉ hỏi `postAccess`/`minLevel`, không hỏi gì tới huy hiệu, nên
  // ai đoán ra đường dẫn `/forum/<slug>/new` là đăng thẳng vào một khu vực mà
  // chính họ không xem nổi.
  await pB.goto(`${BASE}/forum/${forum.slug}/new`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  const chuDangKhoa = await pB.locator('main').innerText();
  check('chưa có huy hiệu thì trang đăng chủ đề cũng báo cần huy hiệu',
    chuDangKhoa.includes(medal.name));
  check('chưa có huy hiệu thì KHÔNG thấy ô nhập tiêu đề',
    (await pB.locator('input[name="title"]').count()) === 0);

  // ── Có huy hiệu rồi: xem được bình thường ───────────────────────────────
  await db.userMedal.create({ data: { userId: b.id, medalId: medal.id } });
  await pB.goto(`${BASE}/forum/${forum.slug}`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  const chuMo = await pB.locator('main').innerText();
  check('có huy hiệu rồi thì xem được khu vực bình thường',
    chuMo.includes('Bí mật của Ẩn Sĩ') && !chuMo.includes('không công khai'));

  await pB.goto(`${BASE}/forum/${forum.slug}/${thread.id}`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  const chuThreadMo = await pB.locator('main').innerText();
  check('có huy hiệu rồi thì xem được chủ đề bên trong',
    chuThreadMo.includes('Nội dung riêng tư không được lộ ra ngoài'));

  await pB.goto(`${BASE}/forum/${forum.slug}/new`, { waitUntil: 'networkidle' });
  await pB.waitForTimeout(900);
  check('có huy hiệu rồi thì đăng chủ đề mới được luôn',
    (await pB.locator('input[name="title"]').count()) > 0);

  // ── Điều hành viên site bỏ qua khoá dù chưa có huy hiệu ─────────────────
  await db.user.update({ where: { id: a.id }, data: { role: 'MODERATOR' } });
  const pA = await openPage('minhdev');
  await pA.goto(`${BASE}/forum/${forum.slug}`, { waitUntil: 'networkidle' });
  await pA.waitForTimeout(900);
  const chuMod = await pA.locator('main').innerText();
  check('điều hành viên toàn site xem được dù chưa có huy hiệu',
    chuMod.includes('Bí mật của Ẩn Sĩ'));

  // ── Khách vãng lai cũng bị chặn ──────────────────────────────────────────
  const khachRes = await fetch(`${BASE}/forum/${forum.slug}`);
  const khachHtml = await khachRes.text();
  check('khách vãng lai cũng bị chặn, không lộ nội dung',
    !khachHtml.includes('Bí mật của Ẩn Sĩ'));

  await db.user.update({ where: { id: a.id }, data: { role: 'USER' } });
  await db.forum.delete({ where: { id: forum.id } });
  await db.medal.delete({ where: { id: medal.id } });
}
