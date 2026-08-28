import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Trang cá nhân chia tab: hoạt động, chủ đề, sổ lưu bút.
 *
 * Chia tab không chỉ là chuyện bày biện — mỗi tab chỉ được truy vấn phần của
 * mình. Nên mục kiểm ở đây soi cả hai chiều: tab đang mở có nội dung của nó
 * không, và nội dung của tab KHÁC có bị kéo về sẵn không. Kéo về sẵn thì hai
 * phần ba dữ liệu mỗi lượt xem là công cốc.
 */
const DAU = 'kiemthu-tab';
/** Phải khớp PAGE_SIZE của danh sách chủ đề trong trang cá nhân. */
const CHU_DE_MOI_TRANG = 10;

export default async function run(check) {
  const chu = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true, username: true } });
  const khach = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL' }, select: { id: true } });
  if (!chu || !khach || !forum) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const wipe = async () => {
    await db.thread.deleteMany({ where: { title: { startsWith: DAU } } });
    await db.guestbookEntry.deleteMany({ where: { content: { startsWith: DAU } } });
  };
  await wipe();

  const hoSo = `${BASE}/u/${chu.username}`;
  const p = await openPage('huytran');

  try {
    // Đủ chủ đề cho hơn một trang, và một lời nhắn để nhận ra tab sổ lưu bút.
    for (let i = 1; i <= CHU_DE_MOI_TRANG + 3; i++) {
      await db.thread.create({
        data: {
          forumId: forum.id, authorId: chu.id, status: 'PUBLISHED',
          title: `${DAU} chủ đề số ${i}`, content: '<p>Nội dung.</p>',
          createdAt: new Date(Date.now() - i * 60 * 1000),
          lastReplyAt: new Date(Date.now() - i * 60 * 1000),
        },
        select: { id: true },
      });
    }
    await db.guestbookEntry.create({
      data: { ownerId: chu.id, authorId: khach.id, content: `${DAU} loi nhan de kiem` },
      select: { id: true },
    });

    const mo = async (qs = '') => {
      await p.goto(hoSo + qs, { waitUntil: 'networkidle' });
      await p.waitForTimeout(800);
      return p.content();
    };

    // ── Tab mặc định là hoạt động ────────────────────────────────────────
    let html = await mo();
    check('mở /u/ten là vào tab hoạt động', (await p.locator('ol.card > li').count()) > 0);
    check('tab hoạt động không kéo sẵn sổ lưu bút', !html.includes(`${DAU} loi nhan de kiem`));
    check('có đủ ba tab',
      (await p.locator('nav a[href*="tab=chu-de"]').count()) > 0
      && (await p.locator('nav a[href*="tab=luu-but"]').count()) > 0);

    // ── Tab chủ đề: có phân trang riêng ──────────────────────────────────
    html = await mo('?tab=chu-de');
    check('tab chủ đề hiện danh sách chủ đề', html.includes(`${DAU} chủ đề số 1`));
    check('tab chủ đề không kéo sẵn sổ lưu bút', !html.includes(`${DAU} loi nhan de kiem`));

    // Đếm DÒNG chứ không đếm liên kết: mỗi dòng chủ đề có mấy liên kết (tên
    // người, tiêu đề, khu vực) nên đếm liên kết ra con số chẳng nói lên gì.
    const dem = await p.locator('.card.divide-y > div').count();
    check('tab chủ đề chỉ hiện đúng một trang', dem === CHU_DE_MOI_TRANG, `đếm được ${dem}`);
    check('tab chủ đề có thanh phân trang',
      (await p.locator('a[href*="tab=chu-de"][href*="page=2"]').count()) > 0);

    html = await mo('?tab=chu-de&page=2');
    check('trang hai là bài cũ hơn', html.includes(`${DAU} chủ đề số 13`));
    check('trang hai không lặp lại bài đầu trang một', !html.includes(`${DAU} chủ đề số 1<`));

    // ── Tab sổ lưu bút ───────────────────────────────────────────────────
    html = await mo('?tab=luu-but');
    check('tab sổ lưu bút hiện lời nhắn', html.includes(`${DAU} loi nhan de kiem`));
    check('tab sổ lưu bút không kéo sẵn danh sách chủ đề', !html.includes(`${DAU} chủ đề số 13`));

    // ── Tab bịa ra thì về mặc định, không vỡ trang ───────────────────────
    const r = await p.goto(`${hoSo}?tab=khong-co-tab-nay`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    check('tab bịa ra vẫn mở được trang', r.status() === 200, `trả về ${r.status()}`);
    check('tab bịa ra thì về tab hoạt động', (await p.locator('ol.card > li').count()) > 0);
  } finally {
    await wipe();
  }
}
