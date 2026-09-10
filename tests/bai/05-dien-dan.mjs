import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const DAU = 'kiemthu-dien-dan';

/** Diễn đàn là MỘT TAB của trang game: đăng được, trả lời được, bộ đếm khớp. */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    where: { trangThai: 'DANG_HIEN' }, select: { id: true, duongDan: true },
  });
  if (!game) { kiem('có game mẫu', false); return; }

  const don = () => db.chuDe.deleteMany({ where: { tieuDe: { startsWith: DAU } } });
  await don();

  try {
    // ── Khách không đăng bài được ──────────────────────────────────────
    const khach = await moTrang();
    await khach.goto(`${GOC}/game/${game.duongDan}/dien-dan/dang`, { waitUntil: 'networkidle' });
    kiem('khách bị đưa sang trang đăng nhập', khach.url().includes('/dang-nhap'), khach.url());
    await khach.close();

    // ── Thành viên đăng chủ đề ─────────────────────────────────────────
    const p = await moTrangDaDangNhap('huytran', 'thanhvien123');
    await p.goto(`${GOC}/game/${game.duongDan}/dien-dan/dang`, { waitUntil: 'networkidle' });
    await p.fill('input[name="tieuDe"]', `${DAU} máy nào chạy được bản này?`);
    await p.fill('textarea[name="noiDung"]', 'Máy mình đời cũ, không biết có chạy nổi không.');
    await p.click('button[type="submit"]');

    const daDang = await doiToi(async () =>
      (await db.chuDe.count({ where: { tieuDe: { startsWith: DAU } } })) === 1);
    kiem('đăng được chủ đề', daDang);

    const chuDe = await db.chuDe.findFirst({
      where: { tieuDe: { startsWith: DAU } }, select: { id: true, gameId: true, soTraLoi: true },
    });
    kiem('chủ đề gắn đúng vào game đang xem', chuDe?.gameId === game.id);

    /*
     * Chờ ĐIỀU HƯỚNG xong hẳn rồi mới đọc địa chỉ.
     *
     * Hàng ghi vào CSDL xuất hiện trước khi trình duyệt kịp chuyển trang, nên
     * đọc `p.url()` ngay sau khi thấy hàng ấy là đọc phải địa chỉ cũ — bài kiểm
     * đỏ trong khi mã hoàn toàn đúng.
     */
    const daChuyen = await p.waitForURL(`**/dien-dan/${chuDe.id}`, { timeout: 15_000 })
      .then(() => true).catch(() => false);
    kiem('đăng xong thì nhảy thẳng vào chủ đề vừa đăng', daChuyen, p.url());

    // ── Trả lời, và bộ đếm phải tăng theo ──────────────────────────────
    await p.fill('textarea[name="noiDung"]', 'Máy mình cùng đời, chạy bình thường nhé.');
    await p.click('button:has-text("Gửi trả lời")');

    const daTraLoi = await doiToi(async () =>
      (await db.traLoi.count({ where: { chuDeId: chuDe.id } })) === 1);
    kiem('trả lời được chủ đề', daTraLoi);

    const sau = await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { soTraLoi: true } });
    kiem('bộ đếm trả lời khớp với số bài thật', sau.soTraLoi === 1, `đếm được ${sau.soTraLoi}`);

    // ── Chủ đề khoá thì không nhận thêm trả lời ────────────────────────
    await db.chuDe.update({ where: { id: chuDe.id }, data: { khoa: true } });
    await p.reload({ waitUntil: 'networkidle' });
    kiem('chủ đề khoá thì mất ô trả lời',
      (await p.locator('textarea[name="noiDung"]').count()) === 0);
    kiem('chủ đề khoá thì nói rõ lý do',
      (await p.locator('text=Chủ đề đã khoá').count()) > 0);

    await p.close();
  } finally {
    await don();
  }
}
