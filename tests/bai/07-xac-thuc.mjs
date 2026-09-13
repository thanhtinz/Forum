import { GOC, db, doiToi, moTrang } from '../tro-giup.mjs';
import { docThan, moThuGia } from '../thu-gia.mjs';
import { donMa } from '../../src/lib/ma-xac-minh-const.ts';

const EMAIL = 'kiemthu-dangky@sunnystore.local';

/** Đăng ký, đăng nhập, đăng xuất — và phiên phải chết thật khi đăng xuất. */
export default async function chay(kiem) {
  const don = async () => {
    await db.nguoiDung.deleteMany({ where: { email: EMAIL } });
    await db.maXacMinh.deleteMany({ where: { email: EMAIL } });
  };
  await don();

  // Mã xác minh đi qua thư, nên phải có chỗ hứng — xem `thu-gia.mjs`.
  const hom = moThuGia(2525);
  try {
    await hom.san;
    const p = await moTrang();

    // ── Đăng ký, bước một: gửi hồ sơ, nhận mã qua thư ───────────────────
    await p.goto(`${GOC}/dang-ky`, { waitUntil: 'networkidle' });
    await p.fill('input[name="tenHienThi"]', 'Người Kiểm Thử');
    await p.fill('input[name="email"]', EMAIL);
    await p.fill('input[name="matKhau"]', 'matkhaudai123');
    await p.click('button[type="submit"]');
    await p.waitForURL((u) => u.pathname.startsWith('/xac-minh'), { timeout: 15_000 })
      .catch(() => {});

    /*
     * CHƯA GÕ MÃ THÌ CHƯA CÓ TÀI KHOẢN NÀO.
     *
     * Đây là chỗ đáng canh nhất của cả luồng: dựng sẵn tài khoản rồi đánh dấu
     * "chưa xác minh" là để người lạ chiếm chỗ một địa chỉ email họ không sở
     * hữu — chủ thật tới sau bị chối vì email đã có người dùng.
     */
    kiem('gửi hồ sơ xong mà CHƯA gõ mã thì chưa có tài khoản nào',
      (await db.nguoiDung.count({ where: { email: EMAIL } })) === 0);
    kiem('hồ sơ nằm chờ trong hàng mã',
      (await db.maXacMinh.count({ where: { email: EMAIL, viec: 'DANG_KY' } })) === 1);

    // ── Bước hai: lấy mã trong thư rồi gõ vào ───────────────────────────
    const coThu = await doiToi(async () => hom.thu.length >= 1);
    kiem('thư xác minh bay tới', coThu, `${hom.thu.length} thư`);
    if (!coThu) return;

    const ma = donMa((docThan(hom.thu[0].than).match(/\n\s*(\d{3}\s?\d{3})\s*\n/) ?? [])[1] ?? '');
    kiem('thư mang một mã sáu số', ma.length === 6, ma);

    await p.fill('input[name="ma"]', ma);
    await p.click('button[type="submit"]');

    const daTao = await doiToi(async () =>
      (await db.nguoiDung.count({ where: { email: EMAIL } })) === 1);
    kiem('gõ đúng mã thì tài khoản mới ra đời', daTao);

    /*
     * Chờ ĐIỀU HƯỚNG xong hẳn, đừng chỉ chờ hàng trong CSDL.
     *
     * `xacMinhDangKy` tạo tài khoản TRƯỚC rồi mới mở phiên và đặt cookie, nên
     * hàng người dùng xuất hiện sớm hơn cookie vài chục mili giây. Đi thẳng
     * sang trang khác ngay lúc ấy là đi với tư cách khách — bài kiểm đỏ trong
     * khi mã hoàn toàn đúng, mà lại chỉ đỏ lúc chạy cả bộ nên rất khó lần ra.
     */
    await p.waitForURL((u) => !u.pathname.startsWith('/xac-minh'), { timeout: 15_000 })
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

    /*
     * GỬI HỎNG THÌ CHỮ VỪA GÕ PHẢI CÒN NGUYÊN.
     *
     * React 19 xoá trắng biểu mẫu sau khi một `action` chạy xong — kể cả khi
     * hàm ấy trả về lỗi. Nghĩa là gõ sai mật khẩu một lần là mất luôn cả ô
     * tên đăng nhập, phải gõ lại từ đầu mới đọc nổi câu báo lỗi. Ô nhập tự giữ
     * lấy chữ (`ONhapGiu`) chặn đúng chuyện ấy; phép kiểm này canh để nó không
     * lặng lẽ quay lại lúc ai đó dựng lại biểu mẫu.
     *
     * Riêng ô MẬT KHẨU thì để nó trống lại là đúng: không ai muốn mật khẩu gõ
     * hỏng nằm lại trên màn hình, mà trình duyệt cũng tự điền lại được.
     */
    kiem('gửi hỏng thì ô tên đăng nhập vẫn còn chữ vừa gõ',
      (await p.inputValue('input[name="dinhDanh"]')) === EMAIL);

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
    await hom.dong();
  }
}
