import { GOC, db, doiToi, moTrang } from '../tro-giup.mjs';

const DAU = 'kiemthu-chandk';

/*
 * LỐI ĐĂNG KÝ LÀ MỘT ENDPOINT CÔNG KHAI.
 *
 * Lối đăng nhập vốn đã có cửa chặn dò mật khẩu, nhưng lối ĐĂNG KÝ thì không:
 * một kịch bản bắn liên tục dựng được hàng nghìn tài khoản, mỗi cái ngốn một
 * lượt bcrypt của máy chủ, rồi đem đi rải bài trên diễn đàn.
 *
 * Bài này cũng canh mấy trần độ dài — trước đây lối đăng ký chỉ có sàn, trong
 * khi trang Cài đặt chặn tên hiển thị ở 40 ký tự. Hai cửa vào cùng một cột mà
 * hai luật khác nhau thì kiểu gì cũng có ngày lệch.
 */
export default async function chay(kiem) {
  const don = () => db.nguoiDung.deleteMany({ where: { email: { contains: DAU } } });
  const donDem = () => db.lanHong.deleteMany({ where: { khoa: { startsWith: 'dk:' } } });
  await don();
  await donDem();

  const p = await moTrang();
  const guiDangKy = async (email, ten, matKhau) => {
    await p.goto(`${GOC}/dang-ky`, { waitUntil: 'networkidle' });
    /*
     * GỠ `maxlength` KHỎI Ô NHẬP TRƯỚC KHI ĐIỀN.
     *
     * Ô nhập có `maxLength={40}`, nên nếu cứ điền thẳng thì chính trình duyệt
     * cắt chuỗi hộ — và bài kiểm hoá ra chỉ kiểm mỗi trình duyệt. Nhưng thuộc
     * tính ấy là thứ ai cũng gỡ được bằng một dòng trong bảng điều khiển, hoặc
     * bỏ qua hẳn bằng cách gửi thẳng vào server action. Luật thật phải nằm ở
     * máy chủ, nên phải gỡ nó ra mới kiểm được luật thật.
     */
    await p.evaluate(() => {
      document.querySelectorAll('input').forEach((o) => {
        o.removeAttribute('maxlength');
        o.removeAttribute('minlength');
      });
    });
    await p.fill('input[name="email"]', email);
    await p.fill('input[name="tenHienThi"]', ten);
    await p.fill('input[name="matKhau"]', matKhau);
    await p.click('button[type="submit"]');
    await p.waitForTimeout(700);
  };

  /** Thoát ra, vì mở tài khoản xong là đăng nhập luôn và `/dang-ky` sẽ đá về trang chủ. */
  const thoatRa = async () => {
    await p.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    const nut = p.locator('button:has-text("Đăng xuất")');
    if ((await nut.count()) > 0) {
      await nut.click();
      await p.waitForURL(`${GOC}/`, { timeout: 15_000 }).catch(() => {});
    }
  };

  try {
    // ── Trần độ dài tên hiển thị ───────────────────────────────────────
    await guiDangKy(`${DAU}-dai@kiemthu.invalid`, 'M'.repeat(500), 'matkhau12345');
    const daTao = await db.nguoiDung.count({ where: { email: `${DAU}-dai@kiemthu.invalid` } });
    kiem('tên hiển thị dài quá thì không mở được tài khoản', daTao === 0, `tạo ${daTao} hàng`);
    kiem('và nói rõ vì sao', (await p.locator('text=Tên hiển thị dài quá').count()) > 0);

    // ── Trần độ dài mật khẩu ───────────────────────────────────────────
    await guiDangKy(`${DAU}-mk@kiemthu.invalid`, 'Người kiểm', 'x'.repeat(5000));
    const daTao2 = await db.nguoiDung.count({ where: { email: `${DAU}-mk@kiemthu.invalid` } });
    kiem('mật khẩu dài quá thì không chạy bcrypt', daTao2 === 0, `tạo ${daTao2} hàng`);

    /*
     * ── Mở quá năm tài khoản trong mười lăm phút thì bị chặn ───────────
     *
     * Đếm lượt MỞ ĐƯỢC, không đếm lượt gõ sai — nên hai lượt hỏng ở trên không
     * được tính vào hạn ngạch. Mục kiểm này cũng canh đúng điều ấy: nếu đếm cả
     * lượt hỏng thì tới cái thứ tư là đã bị chặn rồi.
     */
    for (let i = 0; i < 5; i++) {
      await guiDangKy(`${DAU}-${i}@kiemthu.invalid`, `Người kiểm ${i}`, 'matkhau12345');
      await thoatRa();
    }
    const moDuoc = await db.nguoiDung.count({ where: { email: { contains: `${DAU}-` } } });
    kiem('năm tài khoản đầu mở được bình thường', moDuoc === 5, `mở được ${moDuoc}`);

    await guiDangKy(`${DAU}-thu6@kiemthu.invalid`, 'Người kiểm sáu', 'matkhau12345');
    const thu6 = await db.nguoiDung.count({ where: { email: `${DAU}-thu6@kiemthu.invalid` } });
    kiem('cái thứ sáu bị chặn', thu6 === 0, `tạo ${thu6} hàng`);
    kiem('và nói rõ phải chờ bao lâu',
      (await p.locator('text=Thử lại sau').count()) > 0);

    /*
     * Cửa chặn hỏi TRƯỚC khi chạm bcrypt: nếu nó nằm sau, thì mỗi lượt bị chặn
     * vẫn ngốn một nhân CPU — tức là chặn cũng như không.
     */
    const conChan = await db.lanHong.findFirst({
      where: { khoa: { startsWith: 'dk:' } }, select: { soLan: true, camDen: true },
    });
    kiem('cửa chặn ghi đủ năm lượt rồi mới cấm',
      conChan?.soLan === 5 && conChan.camDen !== null, `${conChan?.soLan} lượt`);

    // ── Năm tài khoản cùng tên hiển thị phải ra năm tên đăng nhập khác nhau ──
    const ten = await db.nguoiDung.findMany({
      where: { email: { contains: `${DAU}-` } },
      orderBy: { id: 'asc' }, select: { tenDangNhap: true },
    });
    kiem('mỗi tài khoản một tên đăng nhập riêng',
      new Set(ten.map((t) => t.tenDangNhap)).size === ten.length,
      ten.map((t) => t.tenDangNhap).join(', '));
  } finally {
    await p.close();
    await don();
    await donDem();
  }
}
