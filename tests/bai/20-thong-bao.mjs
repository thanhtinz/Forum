import { GOC, db, doiToi, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * Thông báo: sinh ra đúng lúc, tới đúng người, và SỐNG LÂU HƠN thứ sinh ra nó.
 *
 * Mục cuối là mục đáng giá nhất và cũng là quyết định lược đồ khó thấy nhất:
 * `ThongBao` chốt sẵn câu chữ chứ không trỏ khoá ngoại sang nội dung gốc, nên
 * "bài của bạn đã bị gỡ" vẫn còn sau khi bài ấy biến mất. Trỏ khoá ngoại kèm
 * `Cascade` thì thông báo chết cùng bài, và người nhận không bao giờ biết
 * chuyện gì đã xảy ra.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    where: { trangThai: 'DANG_HIEN' }, select: { id: true, duongDan: true },
  });
  const [a, b] = await Promise.all([
    db.nguoiDung.findFirst({ where: { tenDangNhap: 'anhthu' }, select: { id: true } }),
    db.nguoiDung.findFirst({ where: { tenDangNhap: 'minhdev' }, select: { id: true } }),
  ]);
  if (!game || !a || !b) { kiem('có dữ liệu mẫu', false); return; }

  const DAU = 'Bài kiểm thông báo';
  await don(DAU, a.id, b.id, game.id);

  let pA, pB, admin;
  try {
    pA = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    pB = await moTrangDaDangNhap('minhdev', 'thanhvien123');

    // ── Có người trả lời chủ đề của A ─────────────────────────────────
    const chuDe = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: a.id,
        tieuDe: `${DAU} — chủ đề của Anh Thư`, noiDung: 'Nội dung để có người đáp.',
      },
      select: { id: true },
    });
    const dia = `${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`;

    await pB.goto(dia, { waitUntil: 'networkidle' });
    await pB.fill('textarea[name="noiDung"]', 'Tôi trả lời một câu.');
    await pB.click('button:has-text("Gửi trả lời")');

    const coTin = await doiToi(async () =>
      (await db.thongBao.count({ where: { nguoiId: a.id, loai: 'TRA_LOI_CHU_DE' } })) === 1);
    kiem('trả lời chủ đề thì chủ đề chủ nhận được thông báo', coTin);

    kiem('người trả lời KHÔNG tự nhận thông báo',
      (await db.thongBao.count({ where: { nguoiId: b.id } })) === 0);

    // ── Trả lời chủ đề CỦA CHÍNH MÌNH thì không tự báo ─────────────────
    await pA.goto(dia, { waitUntil: 'networkidle' });
    await pA.fill('textarea[name="noiDung"]', 'Tôi tự trả lời bài của tôi.');
    await pA.click('button:has-text("Gửi trả lời")');
    await pA.waitForTimeout(1800);
    kiem('trả lời bài của chính mình thì không tự gửi thông báo',
      (await db.thongBao.count({ where: { nguoiId: a.id } })) === 1);

    // ── Chuông và trang thông báo ─────────────────────────────────────
    await pA.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    kiem('chuông hiện số chưa đọc',
      (await pA.locator('a[aria-label^="Thông báo, 1 chưa đọc"]').count()) > 0);

    await pA.goto(`${GOC}/thong-bao`, { waitUntil: 'networkidle' });
    const chu = await pA.locator('main').textContent();
    kiem('trang thông báo hiện tin', chu.includes('đã trả lời chủ đề của bạn'), chu.slice(0, 120));
    kiem('tin nói rõ chủ đề nào', chu.includes(`${DAU} — chủ đề của Anh Thư`));

    // Mở trang rồi thì con số trên chuông về không.
    const daDoc = await doiToi(async () =>
      (await db.thongBao.count({ where: { nguoiId: a.id, daDoc: false } })) === 0);
    kiem('mở trang thông báo thì đánh dấu đã đọc', daDoc);

    await pA.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    kiem('đọc rồi thì chuông hết số',
      (await pA.locator('a[aria-label="Thông báo"]').count()) > 0);

    // ── Quản trị đáp đánh giá ─────────────────────────────────────────
    await db.danhGia.deleteMany({ where: { gameId: game.id, nguoiId: a.id } });
    const dg = await db.danhGia.create({
      data: { gameId: game.id, nguoiId: a.id, sao: 2, noiDung: `${DAU} — đánh giá của Anh Thư.` },
      select: { id: true },
    });

    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/danh-gia`, { waitUntil: 'networkidle' });
    await admin.locator('li', { hasText: `${DAU} — đánh giá của Anh Thư.` })
      .locator('button:has-text("Trả lời bài này")').click();
    await admin.fill('textarea[aria-label="Lời trả lời của cửa hàng"]', 'Cảm ơn bạn, bản sau sẽ vá.');
    await admin.click('button:has-text("Lưu lời trả lời")');

    const tinDap = await doiToi(async () =>
      (await db.thongBao.count({ where: { nguoiId: a.id, loai: 'DAP_DANH_GIA' } })) === 1);
    kiem('cửa hàng đáp đánh giá thì người viết nhận được thông báo', tinDap);

    /*
     * Gỡ nội dung: thông báo phải SỐNG LÂU HƠN nội dung.
     *
     * Phải đổi sang bộ lọc "Tất cả": đáp xong thì bài ấy rời khỏi danh sách
     * mặc định "Chưa trả lời", nên tìm nó ở đó là tìm mãi không thấy.
     */
    await admin.goto(`${GOC}/quan-tri/danh-gia?loc=`, { waitUntil: 'networkidle' });
    admin.once('dialog', (d) => d.accept());
    await admin.locator('li', { hasText: `${DAU} — đánh giá của Anh Thư.` })
      .locator('button:has-text("Xoá bài này")').click();

    const daGo = await doiToi(async () =>
      (await db.danhGia.count({ where: { id: dg.id } })) === 0);
    kiem('quản trị gỡ được đánh giá', daGo);

    const tinGo = await doiToi(async () =>
      (await db.thongBao.count({ where: { nguoiId: a.id, loai: 'GO_NOI_DUNG' } })) === 1);
    kiem('gỡ nội dung thì báo cho người viết', tinGo);

    const tin = await db.thongBao.findFirst({
      where: { nguoiId: a.id, loai: 'GO_NOI_DUNG' },
      select: { tieuDe: true, duongDan: true },
    });
    kiem('thông báo "đã gỡ" còn nguyên sau khi nội dung biến mất',
      tin?.tieuDe === 'Đánh giá của bạn đã bị gỡ', JSON.stringify(tin));
    kiem('thông báo "đã gỡ" không dẫn đi đâu cả', tin?.duongDan == null, `dẫn tới ${tin?.duongDan}`);

    // ── Đánh dấu đã đọc hết, rồi xoá mục đã đọc ───────────────────────
    await pA.goto(`${GOC}/thong-bao`, { waitUntil: 'networkidle' });
    await pA.reload({ waitUntil: 'networkidle' });
    kiem('có nút xoá mục đã đọc',
      (await pA.locator('button:has-text("Xoá mục đã đọc")').count()) > 0);

    pA.once('dialog', (d) => d.accept());
    await pA.click('button:has-text("Xoá mục đã đọc")');
    const sach = await doiToi(async () =>
      (await db.thongBao.count({ where: { nguoiId: a.id } })) === 0);
    kiem('xoá được mục đã đọc', sach);

    // ── Thông báo của người khác thì không đụng tới được ──────────────
    await db.thongBao.create({
      data: { nguoiId: b.id, loai: 'TRA_LOI_CHU_DE', tieuDe: `${DAU} — tin của Minh` },
      select: { id: true },
    });
    await pA.goto(`${GOC}/thong-bao`, { waitUntil: 'networkidle' });
    kiem('không thấy thông báo của người khác',
      !(await pA.locator('main').textContent()).includes('tin của Minh'));
    kiem('và tin ấy vẫn còn nguyên bên kia',
      (await db.thongBao.count({ where: { nguoiId: b.id } })) === 1);
  } finally {
    await don(DAU, a?.id, b?.id, game?.id);
    await pA?.close();
    await pB?.close();
    await admin?.close();
  }
}

async function don(dau, aId, bId, gameId) {
  await db.chuDe.deleteMany({ where: { tieuDe: { startsWith: dau } } });
  for (const id of [aId, bId].filter(Boolean)) {
    await db.thongBao.deleteMany({ where: { nguoiId: id } });
    if (gameId) await db.danhGia.deleteMany({ where: { gameId, nguoiId: id } });
  }
  if (gameId) {
    const gom = await db.danhGia.aggregate({
      where: { gameId }, _sum: { sao: true }, _count: { _all: true },
    });
    await db.game.update({
      where: { id: gameId },
      data: { tongSao: gom._sum.sao ?? 0, soLuotDanhGia: gom._count._all },
      select: { id: true },
    });
  }
}
