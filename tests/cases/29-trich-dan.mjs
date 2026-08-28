import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Trả lời kèm trích dẫn.
 *
 * Hai đường khác nhau nên phải kiểm cả hai: trả lời thì trích ngay tại chỗ bằng
 * nút, còn bài mở đầu thì đi qua địa chỉ vì ô soạn nằm tận cuối trang.
 *
 * Mục đáng giá nhất: phần ẩn [hide] KHÔNG được lọt vào trích dẫn. Trích là chép
 * nội dung ra một chỗ ai cũng đọc được — quên chặn ở đây thì mọi khoá đặt ở
 * trang chủ đề thành vô nghĩa, chỉ cần một người trích là lộ.
 */
const DAU = 'kiemthu-trichdan';
const BIMAT = 'PHANAN-KHONGDUOCTRICH-9z';

export default async function run(check) {
  const chu = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const nguoi2 = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL' }, select: { id: true, slug: true } });
  if (!chu || !nguoi2 || !forum) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const wipe = () => db.thread.deleteMany({ where: { title: { startsWith: DAU } } });
  await wipe();

  try {
    const chuDe = await db.thread.create({
      data: {
        forumId: forum.id, authorId: chu.id, status: 'PUBLISHED',
        // Tiêu đề cố ý KHÔNG chứa chữ "trích dẫn": mục kiểm cuối đếm liên kết
        // theo chữ ấy, tiêu đề trùng chữ là bắt nhầm chính nó.
        title: `${DAU} chu de mau`,
        content: `<p>Phần công khai của bài mở đầu.</p><!--hide--><p>${BIMAT}</p><!--/hide-->`,
        lastReplyAt: new Date(),
      },
      select: { id: true },
    });
    await db.reply.create({
      data: { threadId: chuDe.id, authorId: chu.id, content: 'Cau tra loi cua Minh de di trich dan' },
      select: { id: true },
    });

    const url = `${BASE}/forum/${forum.slug}/${chuDe.id}`;
    const p = await openPage('huytran');
    const khach = await openPage(null);

    // ── Trích dẫn một trả lời: mồi ngay tại chỗ ─────────────────────────
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    check('trả lời có nút trích dẫn',
      (await p.locator('button:has-text("Trích dẫn")').count()) > 0);

    await p.locator('button:has-text("Trích dẫn")').first().click();
    await p.waitForTimeout(600);
    const oSoan = p.locator('textarea[name="content"]').first();
    const moi = await oSoan.inputValue();
    check('ô soạn được mồi sẵn mã trích dẫn', moi.startsWith('[quote='), JSON.stringify(moi.slice(0, 40)));
    check('trích dẫn có nội dung bài được trích', moi.includes('Cau tra loi cua Minh'));
    check('trích dẫn ghi tên người được trích', moi.includes('Minh Dev'));
    check('chừa chỗ trống cho người trả lời gõ tiếp', moi.trimEnd().endsWith('[/quote]'));

    // Gửi đi thì phải dựng ra khối trích dẫn thật.
    await oSoan.fill(`${moi}Minh cung nghi vay nhe`);
    await p.locator('form button[type="submit"]').first().click();
    const daDang = await doiToi(() => db.reply.findFirst({
      where: { threadId: chuDe.id, authorId: nguoi2.id }, select: { content: true },
    }));
    check('gửi được trả lời có trích dẫn', !!daDang);
    check('nội dung lưu đúng mã trích dẫn', daDang?.content.includes('[quote='));

    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const html = await p.content();
    // Trả lời lưu dạng chữ thuần nên khối trích dẫn do ReplyContent dựng, không
    // phải khối `prose` của BBCode.
    check('trang dựng ra khối trích dẫn', (await p.locator('blockquote').count()) > 0);
    // Bỏ thẻ <script> trước khi soi: `next dev` nhét gói dữ liệu RSC vào đó,
    // trong gói ấy có nội dung THÔ của trả lời nên `[quote=` vẫn còn — bản
    // production thì không có. Ta đang kiểm phần người đọc nhìn thấy.
    const thay = await p.evaluate(() => {
      const clone = document.body.cloneNode(true);
      clone.querySelectorAll('script').forEach((x) => x.remove());
      return clone.textContent ?? '';
    });
    check('không còn thấy ngoặc vuông của mã', !thay.includes('[quote='));
    check('khối trích dẫn ghi tên người được trích',
      (await p.locator('blockquote:has-text("Minh Dev")').count()) > 0);

    // ── Trích dẫn bài mở đầu: đi qua địa chỉ ────────────────────────────
    await p.goto(`${url}?td=md`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const moiMoDau = await p.locator('textarea[name="content"]').last().inputValue();
    check('vào bằng liên kết trích dẫn thì ô soạn có sẵn nội dung', moiMoDau.startsWith('[quote='));
    check('trích đúng bài mở đầu', moiMoDau.includes('Phần công khai của bài mở đầu'));

    // ── Phần ẩn không được lọt vào trích dẫn ────────────────────────────
    check('phần ẩn KHÔNG lọt vào trích dẫn bài mở đầu', !moiMoDau.includes(BIMAT));

    // ── Tham số lạ thì bỏ qua, ô soạn để trống ──────────────────────────
    await p.goto(`${url}?td=bia-ra`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    check('tham số trích dẫn lạ thì ô soạn để trống',
      (await p.locator('textarea[name="content"]').last().inputValue()) === '');

    // ── Khách vãng lai không có nút trích dẫn ───────────────────────────
    await khach.goto(url, { waitUntil: 'networkidle' });
    await khach.waitForTimeout(800);
    const nutKhach = await khach.locator('button:has-text("Trích dẫn")').count();
    const linkKhach = await khach.locator('a:has-text("Trích dẫn")').count();
    check('khách vãng lai không thấy nút trích dẫn', nutKhach === 0 && linkKhach === 0,
      `nút ${nutKhach}, liên kết ${linkKhach}`);
  } finally {
    await wipe();
  }
}
