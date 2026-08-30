import { BASE, db, doiToi, openPage } from '../helpers.mjs';

/**
 * Luồng đăng game: AI soạn xong thì nằm ở NHÁP, người sửa lại, rồi mới duyệt.
 *
 * Chỗ hỏng là mất thật ở đây có hai:
 *  • Nháp mà lọt ra mặt tiền — nghĩa là chữ máy viết chưa ai đọc đã có người
 *    đọc. Cả cái thanh duyệt sinh ra chỉ để chặn đúng việc này.
 *  • Bấm "Duyệt & đăng" mà `publishedAt` không được ghi — game lên nhưng xếp
 *    sai chỗ ở mọi danh sách sắp theo ngày đăng.
 *
 * Không kiểm phần AI: bài 45 đã lo phân quyền và SSRF, còn chất lượng chữ thì
 * không có đáp án đúng để mà so.
 */
export default async function run(check) {
  const slug = 'ca-kiem-duyet-dang';
  await db.game.deleteMany({ where: { slug } });
  const game = await db.game.create({
    data: { slug, title: 'Game kiểm duyệt đăng', status: 'DRAFT' },
    select: { id: true },
  });

  const admin = await openPage('admin@nova.local', 'admin123');
  const khach = await openPage(null);

  try {
    // ── Nháp thì khách không thấy ────────────────────────────────────────
    await khach.goto(`${BASE}/games/${slug}`, { waitUntil: 'domcontentloaded' });
    await khach.waitForTimeout(600);
    const thanNhap = await khach.locator('body').innerText();
    check('game nháp không hiện với khách',
      !thanNhap.includes('Game kiểm duyệt đăng'), thanNhap.slice(0, 80));

    // ── Thanh duyệt trên trang sửa ───────────────────────────────────────
    const trangSua = `${BASE}/admin/games/${game.id}`;
    await admin.goto(trangSua, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(700);
    check('trang sửa game báo đang là bản nháp',
      (await admin.locator('text=Bản nháp').count()) > 0);
    check('có nút duyệt & đăng',
      (await admin.locator('button:has-text("Duyệt & đăng")').count()) > 0);
    check('nháp thì chưa có nút rút về nháp',
      (await admin.locator('button:has-text("Rút về nháp")').count()) === 0);

    // ── Duyệt & đăng ─────────────────────────────────────────────────────
    await admin.locator('button:has-text("Duyệt & đăng")').click();
    await doiToi(async () =>
      (await db.game.findUnique({ where: { id: game.id }, select: { status: true } }))?.status === 'PUBLISHED');
    const sauDuyet = await db.game.findUnique({
      where: { id: game.id }, select: { status: true, publishedAt: true },
    });
    check('bấm duyệt thì game chuyển sang đang hiện', sauDuyet?.status === 'PUBLISHED', `đang là ${sauDuyet?.status}`);
    check('duyệt thì ghi luôn ngày đăng', !!sauDuyet?.publishedAt, String(sauDuyet?.publishedAt));

    await khach.goto(`${BASE}/games/${slug}`, { waitUntil: 'domcontentloaded' });
    await khach.waitForTimeout(600);
    check('đăng rồi thì khách xem được',
      (await khach.locator('body').innerText()).includes('Game kiểm duyệt đăng'));

    // ── Rút về nháp ──────────────────────────────────────────────────────
    await admin.goto(trangSua, { waitUntil: 'networkidle' });
    await admin.waitForTimeout(700);
    check('đăng rồi thì thanh đổi sang trạng thái đang hiện',
      (await admin.locator('text=Đang hiện').count()) > 0);
    check('đăng rồi thì không còn nút duyệt nữa',
      (await admin.locator('button:has-text("Duyệt & đăng")').count()) === 0);

    await admin.locator('button:has-text("Rút về nháp")').click();
    await doiToi(async () =>
      (await db.game.findUnique({ where: { id: game.id }, select: { status: true } }))?.status === 'DRAFT');
    const sauRut = await db.game.findUnique({
      where: { id: game.id }, select: { status: true, publishedAt: true },
    });
    check('rút được về nháp', sauRut?.status === 'DRAFT', `đang là ${sauRut?.status}`);
    // Nháp là thứ chưa đăng, nên không được còn ngày đăng — huy hiệu "mới" và
    // điểm trending đều đọc cột này, để sót là hai chỗ ấy nói dối.
    check('rút về nháp thì xoá luôn ngày đăng', sauRut?.publishedAt === null, String(sauRut?.publishedAt));

    await khach.goto(`${BASE}/games/${slug}`, { waitUntil: 'domcontentloaded' });
    await khach.waitForTimeout(600);
    check('rút về nháp thì khách hết xem được',
      !(await khach.locator('body').innerText()).includes('Game kiểm duyệt đăng'));

    // ── Người thường không đổi được trạng thái ───────────────────────────
    const thuong = await openPage('huytran');
    await thuong.goto(trangSua, { waitUntil: 'domcontentloaded' });
    await thuong.waitForTimeout(700);
    check('người thường không vào được trang sửa game',
      !thuong.url().includes('/admin/games/'), thuong.url());
  } finally {
    await db.game.deleteMany({ where: { slug } });
  }
}
