import { GOC, db, doiToi, moTrang, moTrangDaDangNhap, tuDongXacNhan } from '../tro-giup.mjs';

const DAU = 'kiemthu-khoa';

/*
 * KHOÁ TÀI KHOẢN VÀ ĐỔI VAI TRÒ.
 *
 * Chuỗi kiểm duyệt trước đây cụt ở chỗ gỡ bài: người rải bài quay lại rải
 * tiếp, và người bán hàng chỉ còn cách gỡ từng bài một, mãi. Cột `khoa` vốn đã
 * được canh ở mọi lối vào, chỉ thiếu cái nút bật nó.
 *
 * Ba mục nguy hiểm nhất phải canh, vì mỗi cái hỏng là hỏng vĩnh viễn:
 *   • tự phong mình làm quản trị;
 *   • khoá nốt người quản trị cuối cùng;
 *   • người bị khoá vẫn dùng được phiên đang mở.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.phien.deleteMany({ where: { nguoi: { tenDangNhap: { startsWith: DAU } } } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: DAU } } });
  };
  await don();

  // Băm của "thanhvien123" — dùng lại đúng mật khẩu mấy bài khác đang dùng.
  const mau = await db.nguoiDung.findFirst({
    orderBy: { id: 'asc' }, where: { tenDangNhap: 'huytran' }, select: { matKhauBam: true },
  });
  if (!mau) { kiem('có tài khoản mẫu để chép mật khẩu', false); return; }

  let admin;
  try {
    const nan = await db.nguoiDung.create({
      data: {
        email: `${DAU}-nan@kiemthu.invalid`, tenDangNhap: `${DAU}-nan`,
        tenHienThi: 'Người bị khoá', matKhauBam: mau.matKhauBam,
      },
      select: { id: true },
    });

    // ── Người ấy đang đăng nhập bình thường ────────────────────────────
    const p = await moTrangDaDangNhap(`${DAU}-nan`, 'thanhvien123');
    await p.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    kiem('trước khi khoá thì vào được trang cá nhân',
      (await p.locator('button:has-text("Đăng xuất")').count()) > 0, p.url());

    // ── Quản trị khoá tài khoản ấy ─────────────────────────────────────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/thanh-vien`, { waitUntil: 'networkidle' });
    tuDongXacNhan(admin);
    await admin.click(`button[aria-label="Khoá Người bị khoá"]`);

    const daKhoa = await doiToi(async () =>
      (await db.nguoiDung.findUnique({ where: { id: nan.id }, select: { khoa: true } }))?.khoa === true);
    kiem('khoá được tài khoản', daKhoa);

    /*
     * PHIÊN ĐANG MỞ PHẢI CHẾT THEO.
     *
     * Khoá mà phiên cũ vẫn dùng được thì việc khoá gần như vô nghĩa: kẻ rải
     * bài đang mở sẵn tab, họ có cần đăng nhập lại đâu.
     */
    const conPhien = await db.phien.count({ where: { nguoiId: nan.id } });
    kiem('khoá xong thì mọi phiên đang mở bị đóng', conPhien === 0, `còn ${conPhien} phiên`);

    /*
     * `/toi` KHÔNG đá ai đi đâu cả — nó nằm ở thanh tab đáy, và bấm vào mà bị
     * văng sang trang khác thì lần sau người ta không dám bấm nữa. Nên dấu
     * hiệu đúng là: người bị khoá bị coi như KHÁCH ngay lượt tải kế tiếp.
     */
    await p.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    kiem('người bị khoá lập tức bị coi như khách',
      (await p.locator('text=Bạn chưa đăng nhập').count()) > 0
      && (await p.locator('button:has-text("Đăng xuất")').count()) === 0, p.url());

    // ── Và không đăng nhập lại được, có nói rõ lý do ───────────────────
    await p.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
    await p.fill('input[name="dinhDanh"]', `${DAU}-nan`);
    await p.fill('input[name="matKhau"]', 'thanhvien123');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(800);
    kiem('người bị khoá không đăng nhập lại được', p.url().includes('/dang-nhap'), p.url());
    kiem('và được nói rõ là đang bị khoá',
      (await p.locator('text=đang bị khoá').count()) > 0);
    await p.close();

    // ── Mở khoá thì vào lại được ───────────────────────────────────────
    await admin.reload({ waitUntil: 'networkidle' });
    await admin.click(`button[aria-label="Mở khoá Người bị khoá"]`);
    const daMo = await doiToi(async () =>
      (await db.nguoiDung.findUnique({ where: { id: nan.id }, select: { khoa: true } }))?.khoa === false);
    kiem('mở khoá được', daMo);

    const q = await moTrangDaDangNhap(`${DAU}-nan`, 'thanhvien123');
    await q.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    kiem('mở khoá xong thì đăng nhập lại được',
      (await q.locator('button:has-text("Đăng xuất")').count()) > 0, q.url());

    /*
     * ── THÀNH VIÊN THƯỜNG GỌI THẲNG ENDPOINT THÌ KHÔNG ĂN THUA ────────
     *
     * Đây là mục quan trọng nhất của cả bài: hai hàm này là địa chỉ POST công
     * khai, và nếu quyền chỉ nằm ở chỗ giấu cái nút đi thì ai cũng tự phong
     * mình làm quản trị được.
     */
    await q.evaluate(async (dia) => {
      const fd = new FormData();
      await fetch(dia, { method: 'POST', body: fd }).catch(() => {});
    }, `${GOC}/quan-tri/thanh-vien`);
    await new Promise((r) => setTimeout(r, 1200));

    /*
     * Đo HẬU QUẢ, không đo mã HTTP.
     *
     * Next trả 500 cho một POST trần vào địa chỉ trang ("Failed to find Server
     * Action") — đó là chuyện của khung, không phải của luật phân quyền. Bắt
     * bẻ con số ấy là kiểm nhầm thứ, và bài kiểm sẽ đỏ mỗi lần Next đổi cách
     * trả lời. Thứ phải đúng là: KHÔNG có gì trong CSDL đổi.
     */
    const sau = await db.nguoiDung.findUnique({
      where: { id: nan.id }, select: { vaiTro: true, khoa: true },
    });
    kiem('gọi thẳng vào khu quản trị không tự phong được quản trị',
      sau.vaiTro === 'THANH_VIEN', sau.vaiTro);
    kiem('và cũng không khoá được ai', sau.khoa === false);
    await q.close();

    /*
     * ── KHÔNG KHOÁ ĐƯỢC MỘT QUẢN TRỊ ──────────────────────────────────
     *
     * Muốn chặn một quản trị thì phải hạ quyền trước, và phép hạ quyền có luật
     * riêng canh số quản trị còn lại. Hai bước, mỗi bước một luật.
     */
    await db.nguoiDung.update({ where: { id: nan.id }, data: { vaiTro: 'QUAN_TRI' } });
    await admin.reload({ waitUntil: 'networkidle' });
    kiem('quản trị viên thì không hiện nút khoá',
      (await admin.locator('button[aria-label="Khoá Người bị khoá"]').count()) === 0);

    // ── Không hạ được người quản trị cuối cùng ─────────────────────────
    await db.nguoiDung.update({ where: { id: nan.id }, data: { vaiTro: 'THANH_VIEN' } });
    const soQuanTri = await db.nguoiDung.count({ where: { vaiTro: 'QUAN_TRI' } });
    if (soQuanTri === 1) {
      const chinhAdmin = await db.nguoiDung.findFirst({
        where: { vaiTro: 'QUAN_TRI' }, orderBy: { id: 'asc' }, select: { tenHienThi: true },
      });
      await admin.reload({ waitUntil: 'networkidle' });
      kiem('quản trị duy nhất không tự hạ quyền mình được — nút ấy không có',
        (await admin.locator(`button[aria-label="Hạ quyền ${chinhAdmin.tenHienThi}"]`).count()) === 0);
    }
  } finally {
    if (admin) await admin.close();
    await don();
  }
}
