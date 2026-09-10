import { GOC, db, doiToi, moTrang } from '../tro-giup.mjs';

const EMAIL = 'kiemthu-dangky@nova.local';

/** Đăng ký, đăng nhập, đăng xuất — và phiên phải chết thật khi đăng xuất. */
export default async function chay(kiem) {
  const don = () => db.nguoiDung.deleteMany({ where: { email: EMAIL } });
  await don();

  try {
    const p = await moTrang();

    // ── Đăng ký ────────────────────────────────────────────────────────
    await p.goto(`${GOC}/dang-ky`, { waitUntil: 'networkidle' });
    await p.fill('input[name="tenHienThi"]', 'Người Kiểm Thử');
    await p.fill('input[name="email"]', EMAIL);
    await p.fill('input[name="matKhau"]', 'matkhaudai123');
    await p.click('button[type="submit"]');

    const daTao = await doiToi(async () =>
      (await db.nguoiDung.count({ where: { email: EMAIL } })) === 1);
    kiem('đăng ký tạo được tài khoản', daTao);

    /*
     * Chờ ĐIỀU HƯỚNG xong hẳn, đừng chỉ chờ hàng trong CSDL.
     *
     * `dangKy` tạo tài khoản TRƯỚC rồi mới mở phiên và đặt cookie, nên hàng
     * người dùng xuất hiện sớm hơn cookie vài chục mili giây. Đi thẳng sang
     * trang khác ngay lúc ấy là đi với tư cách khách — bài kiểm đỏ trong khi
     * mã hoàn toàn đúng, mà lại chỉ đỏ lúc chạy cả bộ nên rất khó lần ra.
     */
    await p.waitForURL((u) => !u.pathname.startsWith('/dang-ky'), { timeout: 15_000 })
      .catch(() => {});

    const moi = await db.nguoiDung.findUnique({
      where: { email: EMAIL }, select: { matKhauBam: true, tenDangNhap: true, vaiTro: true },
    });
    kiem('mật khẩu được băm, không lưu thô',
      !!moi && moi.matKhauBam.startsWith('$2') && !moi.matKhauBam.includes('matkhaudai123'));
    kiem('tài khoản mới là thành viên thường, không phải quản trị',
      moi?.vaiTro === 'THANH_VIEN', moi?.vaiTro);
    kiem('tự sinh tên đăng nhập từ tên hiển thị',
      moi?.tenDangNhap === 'nguoi-kiem-thu', moi?.tenDangNhap);

    // ── Đăng ký xong là đã đăng nhập ───────────────────────────────────
    await p.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    kiem('đăng ký xong thì đã đăng nhập luôn',
      (await p.locator('text=Người Kiểm Thử').count()) > 0);

    // ── Đăng xuất ──────────────────────────────────────────────────────
    await p.click('button:has-text("Đăng xuất")');
    await doiToi(async () => (await db.phien.count({ where: { nguoi: { email: EMAIL } } })) === 0);
    await p.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    kiem('đăng xuất rồi thì thành khách',
      (await p.locator('text=Bạn chưa đăng nhập').count()) > 0);

    const conPhien = await db.phien.count({ where: { nguoi: { email: EMAIL } } });
    kiem('đăng xuất thì phiên bị xoá khỏi CSDL', conPhien === 0, `còn ${conPhien} phiên`);

    // ── Sai mật khẩu ───────────────────────────────────────────────────
    await p.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
    await p.fill('input[name="dinhDanh"]', EMAIL);
    await p.fill('input[name="matKhau"]', 'sai-be-bet');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(1800);
    kiem('sai mật khẩu thì báo lỗi và không cho vào',
      (await p.locator('[role="alert"]').count()) > 0 && p.url().includes('/dang-nhap'));

    // Câu báo lỗi KHÔNG được nói tài khoản có tồn tại hay không, kẻo thành
    // công cụ dò xem ai đã đăng ký ở đây.
    const loi = await p.locator('[role="alert"]').first().textContent();
    kiem('câu báo lỗi không tiết lộ tài khoản có tồn tại hay không',
      !!loi && !/không tồn tại|chưa đăng ký|không có tài khoản/i.test(loi), loi ?? '');

    // ── Trùng email ────────────────────────────────────────────────────
    await p.goto(`${GOC}/dang-ky`, { waitUntil: 'networkidle' });
    await p.fill('input[name="tenHienThi"]', 'Trùng Email');
    await p.fill('input[name="email"]', EMAIL);
    await p.fill('input[name="matKhau"]', 'matkhaudai123');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(1800);
    const so = await db.nguoiDung.count({ where: { email: EMAIL } });
    kiem('không tạo được hai tài khoản cùng email', so === 1, `đếm được ${so}`);

    await p.close();
  } finally {
    await don();
  }
}
