import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Mã [hide]: phải trả lời chủ đề mới đọc được phần ẩn.
 *
 * Chỗ đáng kiểm nhất: phần ẩn phải bị CẮT ở máy chủ. Che bằng CSS thì ai bấm
 * "xem nguồn trang" cũng đọc được, mà nội dung hay được giấu ở đây lại đúng
 * là thứ người ta muốn giấu nhất — liên kết tải về.
 *
 * Chủ đề và trả lời đều tạo thẳng bằng dữ liệu, nội dung dựng đúng dạng mà
 * `bbcodeToHtml` sinh ra. Đi qua ô soạn thì vướng hạn mức đăng bài — hạn mức
 * giữ trong bộ nhớ máy chủ nên xoá hàng ở CSDL không gỡ được, chạy bộ kiểm
 * hai lần liền nhau là lần sau không tạo nổi chủ đề và mọi mục sau sai lây.
 */
const BIMAT = 'LINK-TAI-BI-AN-9x7';
const TITLE = 'Kiểm thử nội dung ẩn cho anh em';
/** Đúng dạng bbcodeToHtml sinh ra cho `[hide]…[/hide]`. */
const CONTENT = `<p>Bản mới đây nhé, tải về dùng thử:</p><!--hide--><p>${BIMAT}</p><!--/hide-->`;

export default async function run(check) {
  const author = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const reader = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL' }, select: { id: true, slug: true } });
  if (!author || !reader || !forum) { check('có dữ liệu mẫu', false, 'thiếu người dùng hoặc chuyên mục'); return; }

  const wipe = () => db.thread.deleteMany({ where: { title: { startsWith: 'Kiểm thử nội dung ẩn' } } });
  await wipe();

  const poster = await openPage('minhdev');
  const guest = await openPage('huytran');
  const anon = await openPage(null);

  try {
    const thread = await db.thread.create({
      data: {
        forumId: forum.id, authorId: author.id, status: 'PUBLISHED',
        title: TITLE, content: CONTENT, lastReplyAt: new Date(),
      },
      select: { id: true },
    });
    const threadUrl = `${BASE}/forum/${forum.slug}/${thread.id}`;

    // ── Người chưa trả lời: không được thấy, kể cả trong mã nguồn ─────────
    await guest.goto(threadUrl, { waitUntil: 'networkidle' });
    await guest.waitForTimeout(800);
    const guestHtml = await guest.content();
    check('người chưa trả lời không thấy phần ẩn', !guestHtml.includes(BIMAT));
    check('người chưa trả lời được nhắc phải trả lời', guestHtml.includes('trả lời chủ đề để xem'));
    check('phần không ẩn vẫn đọc được', guestHtml.includes('Bản mới đây nhé'));

    await anon.goto(threadUrl, { waitUntil: 'networkidle' });
    await anon.waitForTimeout(800);
    check('khách vãng lai không thấy phần ẩn', !(await anon.content()).includes(BIMAT));

    // ── Chủ chủ đề luôn thấy bài của chính mình ──────────────────────────
    await poster.goto(threadUrl, { waitUntil: 'networkidle' });
    await poster.waitForTimeout(800);
    check('chủ chủ đề vẫn đọc được phần ẩn của mình', (await poster.content()).includes(BIMAT));

    // ── Trích ngắn ở các DANH SÁCH cũng không được lọt ───────────────────
    // Đây là chỗ đã lộ thật một lần: trích ngắn dựng bằng plainText(), mà hàm
    // đó bóc mọi thứ khớp `<...>` nên hai mốc <!--hide--> biến mất, để lại
    // đúng phần chữ đáng lẽ phải giấu. Trang chi tiết kín mà danh sách hở thì
    // cũng như không giấu gì.
    /**
     * Lấy mã trang BỎ các thẻ <script>.
     *
     * Vẫn là kiểm ở mức mã nguồn — che bằng CSS thì chuỗi còn nguyên ở đây và
     * bị bắt — nhưng bỏ qua gói dữ liệu RSC mà `next dev` nhét vào script.
     * Gói đó chứa hàng thô của truy vấn và CHỈ có ở chế độ dev: đã dựng bản
     * production rồi kiểm lại, cả mã trang lẫn gói đều không còn chuỗi này.
     */
    const markup = (page) => page.evaluate(() => {
      const clone = document.documentElement.cloneNode(true);
      clone.querySelectorAll('script').forEach((s) => s.remove());
      return clone.innerHTML;
    });

    for (const [ten, url] of [
      ['danh sách chủ đề của box', `${BASE}/forum/${forum.slug}`],
      ['trang chủ', `${BASE}/`],
      ['kết quả tìm kiếm', `${BASE}/search?q=${encodeURIComponent(TITLE)}&tab=threads`],
    ]) {
      await guest.goto(url, { waitUntil: 'networkidle' });
      await guest.waitForTimeout(700);
      const html = await markup(guest);
      check(`trích ngắn ở ${ten} không lọt phần ẩn`, !html.includes(BIMAT));
      // Và vẫn phải thấy chủ đề đó — không phải "an toàn vì trang trống".
      check(`${ten} vẫn có chủ đề`, html.includes(TITLE));
    }

    // ── Trả lời xong thì mở ra ───────────────────────────────────────────
    await db.reply.create({
      data: { threadId: thread.id, authorId: reader.id, content: 'Cảm ơn bạn, mình lấy về thử xem sao' },
      select: { id: true },
    });
    await guest.goto(threadUrl, { waitUntil: 'networkidle' });
    await guest.waitForTimeout(800);
    check('trả lời xong thì thấy phần ẩn', (await guest.content()).includes(BIMAT));
  } finally {
    await wipe();
  }
}
