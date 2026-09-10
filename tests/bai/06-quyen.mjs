import { GOC, db, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * QUYỀN — bài kiểm quan trọng nhất của cả bộ.
 *
 * Mọi hàm export trong tệp `'use server'` là một địa chỉ POST CÔNG KHAI. Khung
 * `/quan-tri` chặn được GIAO DIỆN, nhưng kẻ gọi thẳng vào server action thì
 * không đi qua khung nào cả. Nên ở đây kiểm CẢ HAI lớp: giao diện có chặn
 * không, và việc thật có xảy ra không.
 */
export default async function chay(kiem) {
  // ── Lớp một: giao diện ────────────────────────────────────────────────
  const khach = await moTrang();
  await khach.goto(`${GOC}/quan-tri`, { waitUntil: 'networkidle' });
  kiem('khách không vào được khu quản trị', khach.url().includes('/dang-nhap'), khach.url());

  await khach.goto(`${GOC}/thu-vien`, { waitUntil: 'networkidle' });
  kiem('khách không xem được thư viện', khach.url().includes('/dang-nhap'), khach.url());
  await khach.close();

  const thuong = await moTrangDaDangNhap('minhdev', 'thanhvien123');
  await thuong.goto(`${GOC}/quan-tri`, { waitUntil: 'networkidle' });
  kiem('thành viên thường bị đá khỏi khu quản trị',
    !thuong.url().includes('/quan-tri'), thuong.url());

  await thuong.goto(`${GOC}/quan-tri/game`, { waitUntil: 'networkidle' });
  kiem('thành viên thường không vào được trang quản lý game',
    !thuong.url().includes('/quan-tri'), thuong.url());

  // ── Lớp hai: gọi THẲNG vào server action ─────────────────────────────
  //
  // Gửi một biểu mẫu tạo game với tư cách thành viên thường. Nếu lớp chặn chỉ
  // nằm ở khung giao diện thì cú này lọt, và kho mọc thêm một game.
  const truoc = await db.game.count();
  await thuong.evaluate(async (goc) => {
    const fd = new FormData();
    fd.set('ten', 'Game lẽ ra không được tạo');
    await fetch(`${goc}/quan-tri/game/moi`, { method: 'POST', body: fd }).catch(() => {});
  }, GOC);
  await new Promise((r) => setTimeout(r, 1500));
  const sau = await db.game.count();
  kiem('gọi thẳng vào server action cũng không tạo được game',
    sau === truoc, `trước ${truoc}, sau ${sau}`);

  const lot = await db.game.findFirst({
    where: { ten: 'Game lẽ ra không được tạo' }, select: { id: true },
  });
  kiem('không có game lạ nào lọt vào kho', !lot);

  await thuong.close();

  // ── Quản trị thì vào được ────────────────────────────────────────────
  const admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
  await admin.goto(`${GOC}/quan-tri`, { waitUntil: 'networkidle' });
  kiem('quản trị viên vào được khu quản trị', admin.url().includes('/quan-tri'), admin.url());
  kiem('trang tổng quan có số liệu', (await admin.locator('text=Game đang hiện').count()) > 0);
  await admin.close();
}
