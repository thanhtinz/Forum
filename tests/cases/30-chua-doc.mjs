import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Trang "Chưa đọc".
 *
 * Điều kiện chưa đọc so hai cột ở hai bảng nên phải viết SQL thô; mục kiểm ở
 * đây soi đúng những chỗ SQL thô dễ sai:
 *   • mở chủ đề rồi thì nó phải RỜI danh sách (mốc riêng từng chủ đề),
 *   • bấm "đã đọc hết" thì danh sách trống (mốc chung),
 *   • có trả lời mới sau khi đã đọc thì nó QUAY LẠI danh sách,
 *   • tổng đếm phải khớp với số dòng thật, vì đếm sai thì thanh phân trang
 *     chỉ ra những trang trống.
 */
const DAU = 'kiemthu-chuadoc';
/** Phải khớp NEW_PER_PAGE trong src/lib/new-threads.ts. */
const MOI_TRANG = 20;

export default async function run(check) {
  const chu = await db.user.findFirst({ where: { username: 'minhdev' }, select: { id: true } });
  const toi = await db.user.findFirst({ where: { username: 'huytran' }, select: { id: true } });
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL' }, select: { id: true, slug: true } });
  if (!chu || !toi || !forum) { check('có dữ liệu mẫu', false, 'thiếu dữ liệu'); return; }

  const wipe = async () => {
    await db.thread.deleteMany({ where: { title: { startsWith: DAU } } });
  };
  await wipe();

  // Mốc "đã đọc hết" là trạng thái sẵn có của người dùng, phải trả lại như cũ
  // kẻo làm hỏng những mục kiểm khác.
  const mocCu = (await db.user.findUnique({ where: { id: toi.id }, select: { forumReadAt: true } }))?.forumReadAt ?? null;

  try {
    // Bắt đầu từ nền sạch: đánh dấu đã đọc hết mọi thứ có trước.
    const moc = new Date();
    await db.user.update({ where: { id: toi.id }, data: { forumReadAt: moc }, select: { id: true } });
    await db.threadRead.deleteMany({ where: { userId: toi.id } });

    // Mốc hoạt động phải nằm giữa hai lần "đã đọc hết": sau mốc đầu (để tính
    // là chưa đọc) và trước lần bấm ở cuối bài kiểm (để nó quét sạch được).
    // Nên đặt cách mốc đầu vài phần trăm giây — vẫn đủ tách thứ tự các chủ đề
    // mà chắc chắn nằm trước lần bấm cuối, xảy ra sau đó hàng chục giây.
    const lapChuDe = async (so) => db.thread.create({
      data: {
        forumId: forum.id, authorId: chu.id, status: 'PUBLISHED',
        title: `${DAU} chủ đề số ${so}`, content: '<p>Nội dung.</p>',
        lastReplyAt: new Date(moc.getTime() + so * 10),
      },
      select: { id: true },
    });

    const p = await openPage('huytran');
    const khach = await openPage(null);
    const trang = `${BASE}/chua-doc`;

    // Chỉ đọc chữ TRONG khối danh sách. Cả trang thì còn có cột bên phải
    // ("Chủ đề sôi nổi") cũng nhắc tên chủ đề, soi cả trang là bắt nhầm nó.
    const mo = async (qs = '') => {
      await p.goto(trang + qs, { waitUntil: 'networkidle' });
      await p.waitForTimeout(700);
      return p.locator('[data-chua-doc]').innerText();
    };
    const tomTat = () => p.locator('h1:has-text("Chưa đọc") + p').innerText();
    const soDong = () => p.locator('[data-chua-doc] .retro-stripe > div').count();

    // ── Nền sạch: không còn gì chưa đọc ─────────────────────────────────
    let html = await mo();
    check('đọc hết rồi thì danh sách trống', (await soDong()) === 0, `đếm được ${await soDong()}`);
    check('trống thì có lời nhắn', html.includes('Không còn chủ đề nào chưa đọc'));

    // ── Có bài mới thì hiện lên ─────────────────────────────────────────
    const a = await lapChuDe(1);
    const b = await lapChuDe(2);
    html = await mo();
    check('chủ đề mới lập hiện ở danh sách chưa đọc', html.includes(`${DAU} chủ đề số 1`));
    check('đếm đúng số chủ đề chưa đọc', (await soDong()) === 2, `đếm được ${await soDong()}`);
    check('dòng tóm tắt ghi đúng số', (await tomTat()).includes('2 chủ đề mới'), await tomTat());

    // ── Mở một chủ đề thì nó rời danh sách ──────────────────────────────
    await p.goto(`${BASE}/forum/${forum.slug}/${b.id}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    html = await mo();
    check('chủ đề đã mở thì rời danh sách', !html.includes(`${DAU} chủ đề số 2`));
    check('chủ đề chưa mở thì vẫn còn', html.includes(`${DAU} chủ đề số 1`));

    // ── Có trả lời mới thì quay lại danh sách ───────────────────────────
    await db.reply.create({
      data: { threadId: b.id, authorId: chu.id, content: 'Tra loi moi sau khi da doc' },
      select: { id: true },
    });
    await db.thread.update({ where: { id: b.id }, data: { lastReplyAt: new Date() }, select: { id: true } });
    html = await mo();
    check('có trả lời mới thì chủ đề quay lại danh sách', html.includes(`${DAU} chủ đề số 2`));

    // ── Lọc "đang theo dõi" ─────────────────────────────────────────────
    await db.threadFollow.create({ data: { threadId: a.id, userId: toi.id }, select: { id: true } });
    html = await mo('?loc=theo-doi');
    check('lọc theo dõi chỉ hiện chủ đề đang theo dõi', html.includes(`${DAU} chủ đề số 1`));
    check('lọc theo dõi bỏ chủ đề không theo dõi', !html.includes(`${DAU} chủ đề số 2`));

    // ── Phân trang: tổng đếm phải khớp số dòng thật ─────────────────────
    for (let i = 3; i <= MOI_TRANG + 5; i++) await lapChuDe(i);
    await mo();
    const dong1 = await soDong();
    check('trang đầu đúng một trang', dong1 === MOI_TRANG, `đếm được ${dong1}`);
    check('có thanh phân trang', (await p.locator('a[href*="page=2"]').count()) > 0);

    await mo('?page=2');
    const dong2 = await soDong();
    check('trang hai có dòng', dong2 > 0, `đếm được ${dong2}`);
    // Đếm sai thì trang cuối trống trơn — đây là mục kiểm chính của SQL thô.
    check('trang hai không rỗng dù đếm tổng nói là có', dong2 > 0);

    // ── "Đã đọc hết" quét sạch danh sách ────────────────────────────────
    await mo();
    await p.locator('button:has-text("Đã đọc hết")').first().click();
    await p.waitForTimeout(1200);
    await mo();
    check('bấm đã đọc hết thì danh sách trống', (await soDong()) === 0, `còn ${await soDong()}`);

    // ── Khách vãng lai bị đưa về đăng nhập ──────────────────────────────
    await khach.goto(trang, { waitUntil: 'networkidle' });
    await khach.waitForTimeout(600);
    check('khách vãng lai bị đưa sang đăng nhập', khach.url().includes('/login'), khach.url());
  } finally {
    await wipe();
    await db.threadRead.deleteMany({ where: { userId: toi.id } });
    await db.user.update({ where: { id: toi.id }, data: { forumReadAt: mocCu }, select: { id: true } });
  }
}
