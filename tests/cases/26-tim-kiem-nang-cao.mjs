import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Tìm kiếm chủ đề có bộ lọc.
 *
 * Bộ lọc hỏng theo kiểu "bỏ qua điều kiện" vẫn trả về đầy kết quả, nhìn qua
 * tưởng chạy đúng — nên mục nào cũng phải kiểm cả hai chiều: thứ đáng ra PHẢI
 * thấy có thấy không, và thứ đáng ra KHÔNG được thấy có lọt vào không.
 */
const TU_KHOA = 'zylophonekiemthu';

export default async function run(check) {
  const a = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true, username: true } });
  const b = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true, username: true } });
  const boxes = await db.forum.findMany({ take: 2, orderBy: { name: 'asc' }, select: { id: true, slug: true, name: true } });
  if (!a || !b || boxes.length < 2) { check('có dữ liệu mẫu', false, 'thiếu người dùng hoặc khu vực'); return; }
  const [box1, box2] = boxes;

  const wipe = () => db.thread.deleteMany({ where: { title: { contains: TU_KHOA } } });
  await wipe();

  const ngay = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const mk = (ten, data) => db.thread.create({
    data: {
      title: `${ten} ${TU_KHOA}`, content: '<p>Nội dung kiểm thử tìm kiếm.</p>',
      status: 'PUBLISHED', ...data,
    },
    select: { id: true },
  });

  try {
    // Bốn chủ đề khác nhau ở đúng một chiều mỗi cái, để mỗi bộ lọc tách được.
    const cuBox1 = await mk('Bài cũ của Minh ở box một', {
      forumId: box1.id, authorId: a.id, createdAt: ngay(200), lastReplyAt: ngay(200), replyCount: 1, viewCount: 5,
    });
    const moiBox1 = await mk('Bài mới của Huy ở box một', {
      forumId: box1.id, authorId: b.id, createdAt: ngay(1), lastReplyAt: ngay(1), replyCount: 50, viewCount: 10,
    });
    const moiBox2 = await mk('Bài mới của Minh ở box hai', {
      forumId: box2.id, authorId: a.id, createdAt: ngay(2), lastReplyAt: ngay(2), replyCount: 2, viewCount: 900,
    });
    const daGiai = await mk('Bài đã có lời giải của Minh', {
      forumId: box1.id, authorId: a.id, createdAt: ngay(3), lastReplyAt: ngay(3), replyCount: 3, viewCount: 20,
    });
    const traLoi = await db.reply.create({
      data: { threadId: daGiai.id, authorId: b.id, content: 'Câu trả lời đúng đây' }, select: { id: true },
    });
    await db.thread.update({ where: { id: daGiai.id }, data: { solvedReplyId: traLoi.id }, select: { id: true } });

    const p = await openPage(null);
    /**
     * Chỉ lấy phần KẾT QUẢ, không lấy cả trang.
     *
     * Cột bên của trang tìm kiếm cũng liệt kê chủ đề mới nhất, nên soi cả trang
     * thì id nào cũng "có mặt" — mục kiểm loại trừ sẽ đỏ oan mà đọc lỗi lại
     * tưởng bộ lọc hỏng.
     */
    const mo = async (qs) => {
      await p.goto(`${BASE}/search?${qs}`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(700);
      return p.locator('[data-ket-qua]').innerHTML();
    };
    const co = (html, t) => html.includes(t.id);

    // ── Không lọc: thấy cả bốn ───────────────────────────────────────────
    let html = await mo(`q=${TU_KHOA}`);
    check('không lọc thì thấy đủ bốn chủ đề',
      [cuBox1, moiBox1, moiBox2, daGiai].every((t) => co(html, t)));
    check('chưa lọc thì không hiện dấu "đang lọc"', !html.includes('đang lọc'));

    // ── Lọc theo khu vực ─────────────────────────────────────────────────
    html = await mo(`q=${TU_KHOA}&box=${box1.slug}`);
    check('lọc khu vực: giữ bài trong khu đó', co(html, cuBox1) && co(html, moiBox1));
    check('lọc khu vực: loại bài khu khác', !co(html, moiBox2));
    // Dấu "đang lọc" nằm ở bảng lọc phía trên, không nằm trong vùng kết quả.
    check('có lọc thì hiện dấu "đang lọc"', (await p.content()).includes('đang lọc'));

    // ── Lọc theo người lập ───────────────────────────────────────────────
    html = await mo(`q=${TU_KHOA}&tacgia=${a.username}`);
    check('lọc tác giả: giữ bài của người đó', co(html, cuBox1) && co(html, moiBox2));
    check('lọc tác giả: loại bài người khác', !co(html, moiBox1));

    html = await mo(`q=${TU_KHOA}&tacgia=khong-co-nguoi-nay`);
    check('tên tác giả không có thật thì ra rỗng',
      [cuBox1, moiBox1, moiBox2, daGiai].every((t) => !co(html, t)));

    // ── Lọc theo thời gian ───────────────────────────────────────────────
    html = await mo(`q=${TU_KHOA}&khi=week`);
    check('lọc 7 ngày: giữ bài mới', co(html, moiBox1) && co(html, moiBox2));
    check('lọc 7 ngày: loại bài cũ', !co(html, cuBox1));

    // ── Chỉ bài đã có lời giải ───────────────────────────────────────────
    html = await mo(`q=${TU_KHOA}&giai=1`);
    check('lọc lời giải: giữ bài đã giải', co(html, daGiai));
    check('lọc lời giải: loại bài chưa giải', !co(html, moiBox1));

    // ── Sắp xếp ──────────────────────────────────────────────────────────
    const thuTu = async (qs) => {
      await p.goto(`${BASE}/search?${qs}`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(700);
      return p.locator('[data-ket-qua] a[href*="/forum/"]').evaluateAll((els) =>
        els.map((e) => e.getAttribute('href') ?? '').filter((h) => /\/forum\/[^/]+\/[a-z0-9]+$/i.test(h)));
    };
    let ds = await thuTu(`q=${TU_KHOA}&sap=replies`);
    check('sắp theo trả lời: bài nhiều trả lời nhất đứng đầu',
      ds[0]?.includes(moiBox1.id), JSON.stringify(ds.slice(0, 2)));

    ds = await thuTu(`q=${TU_KHOA}&sap=views`);
    check('sắp theo lượt xem: bài nhiều lượt xem nhất đứng đầu',
      ds[0]?.includes(moiBox2.id), JSON.stringify(ds.slice(0, 2)));

    // ── Ghép nhiều bộ lọc ────────────────────────────────────────────────
    html = await mo(`q=${TU_KHOA}&box=${box1.slug}&tacgia=${a.username}&khi=week`);
    check('ghép ba bộ lọc: chỉ còn bài thoả cả ba',
      co(html, daGiai) && !co(html, cuBox1) && !co(html, moiBox1) && !co(html, moiBox2));

    // ── Giữ bộ lọc khi sang tab khác và khi phân trang ────────────────────
    const link = await p.locator('a[href*="tab=users"]').first().getAttribute('href');
    check('đổi tab vẫn giữ bộ lọc', !!link && link.includes('box=') && link.includes('tacgia='), String(link));

    // Tham số bịa ra thì bỏ qua chứ không vỡ trang.
    const r = await p.goto(`${BASE}/search?q=${TU_KHOA}&khi=bia&sap=bia`, { waitUntil: 'networkidle' });
    check('tham số lọc bịa ra vẫn mở được trang', r.status() === 200, `trả về ${r.status()}`);
    await p.waitForTimeout(600);
    const htmlBia = await p.locator('[data-ket-qua]').innerHTML();
    check('tham số bịa ra thì coi như không lọc',
      [cuBox1, moiBox1, moiBox2, daGiai].every((t) => co(htmlBia, t)));
  } finally {
    await wipe();
  }
}
