import { GOC, db, doiToi, moTrang, moTrangDaDangNhap, tuDongXacNhan } from '../tro-giup.mjs';

const TEN = 'kiemthu-don-tac-gia';

/**
 * ĐƠN XIN LÀM TÁC GIẢ.
 *
 * Trước đợt này, hệ thống tác giả có đủ mọi thứ — bảng riêng, hàng chờ duyệt
 * game, trang tác giả công khai — mà KHÔNG có lối nào để thành tác giả: trang
 * mời chỉ nói "nhắn cho ban quản trị", còn khu quản trị chỉ có nút phong quản
 * trị. Một cánh cửa không có tay nắm.
 *
 * Mấy mục kiểm nặng nhất ở đây là mục về QUYỀN và về ĐUA: ai xét được đơn, và
 * hai quản trị cùng bấm một lúc thì có phong hai lần không.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.donTacGia.deleteMany({ where: { nguoi: { tenDangNhap: TEN } } });
    await db.thongBao.deleteMany({ where: { nguoi: { tenDangNhap: TEN } } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: TEN } });
  };
  await don();

  let nguoiGui; let khach; let admin; let thuong;
  try {
    /* Tài khoản mới, mật khẩu băm bằng đúng bộ băm của lối đăng ký thường.
       `bcryptjs` xuất theo lối CommonJS nên phải lấy qua `.default`. */
    const bcrypt = (await import('bcryptjs')).default;
    const nguoi = await db.nguoiDung.create({
      data: {
        tenDangNhap: TEN, tenHienThi: 'Người Xin Làm Tác Giả',
        email: `${TEN}@kiemthu.local`, matKhauBam: await bcrypt.hash('thanhvien123', 10),
      },
      select: { id: true },
    });

    // ── Khách chưa đăng nhập thì trang mời chỉ mời đăng nhập ──────────
    khach = await moTrang();
    await khach.goto(`${GOC}/tac-gia/dang-ky`, { waitUntil: 'networkidle' });
    kiem('khách chưa đăng nhập được mời đăng nhập trước',
      (await khach.locator('a[href="/dang-nhap"]').count()) > 0
      && (await khach.locator('textarea[name="lyDo"]').count()) === 0);

    // ── Thành viên gửi đơn ────────────────────────────────────────────
    nguoiGui = await moTrangDaDangNhap(TEN, 'thanhvien123');
    await nguoiGui.goto(`${GOC}/tac-gia/dang-ky`, { waitUntil: 'networkidle' });
    kiem('thành viên thấy biểu mẫu gửi đơn',
      (await nguoiGui.locator('textarea[name="lyDo"]').count()) > 0);

    // Lý do quá ngắn thì bị chặn — đó là thứ ban quản trị đọc để quyết.
    await nguoiGui.fill('input[name="tenTacGia"]', 'Xưởng Game Nhỏ');
    await nguoiGui.fill('textarea[name="lyDo"]', 'cho mình xin');
    await nguoiGui.click('button:has-text("Gửi đơn")');
    await nguoiGui.waitForTimeout(1200);
    kiem('lý do quá ngắn thì đơn không được ghi',
      (await db.donTacGia.count({ where: { nguoiId: nguoi.id } })) === 0);
    kiem('và nói rõ vì sao bị chặn',
      (await nguoiGui.locator('[role="alert"]').first().textContent() ?? '').includes('ít nhất'));

    await nguoiGui.fill('textarea[name="lyDo"]',
      'Mình làm ba game Java hồi 2008, muốn đăng lại cho ai còn máy Nokia chơi.');
    await nguoiGui.click('button:has-text("Gửi đơn")');
    const daGui = await doiToi(async () =>
      (await db.donTacGia.count({ where: { nguoiId: nguoi.id, trangThai: 'CHO_XEM' } })) === 1);
    kiem('gửi được đơn', daGui);
    kiem('gửi xong thì không còn biểu mẫu, chỉ còn dòng đang chờ',
      (await nguoiGui.locator('textarea[name="lyDo"]').count()) === 0);

    // ── Ai xét được đơn ───────────────────────────────────────────────
    thuong = await moTrangDaDangNhap('huytran', 'thanhvien123');
    const rThuong = await thuong.request.get(`${GOC}/quan-tri/tac-gia`, { maxRedirects: 0 });
    kiem('thành viên thường không vào được khu xét đơn',
      rThuong.status() !== 200, `mã ${rThuong.status()}`);

    const donId = (await db.donTacGia.findFirst({
      where: { nguoiId: nguoi.id }, select: { id: true },
    })).id;

    // ── Trả lại kèm lý do ─────────────────────────────────────────────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/tac-gia`, { waitUntil: 'networkidle' });
    kiem('khu xét đơn bày đơn vừa gửi',
      (await admin.locator('body').textContent()).includes('Xưởng Game Nhỏ'));

    await admin.click('button:has-text("Trả lại")');
    await admin.fill('textarea', 'Kể rõ hơn ba game ấy tên gì giúp mình nhé.');
    await admin.click('button:has-text("Gửi lý do và trả lại")');
    const daTraLai = await doiToi(async () =>
      (await db.donTacGia.findUnique({ where: { id: donId }, select: { trangThai: true } }))
        .trangThai === 'TU_CHOI');
    kiem('quản trị trả lại được đơn', daTraLai);
    kiem('người gửi vẫn là thành viên thường',
      (await db.nguoiDung.findUnique({ where: { id: nguoi.id }, select: { vaiTro: true } }))
        .vaiTro === 'THANH_VIEN');
    kiem('người gửi nhận được thông báo bị trả lại',
      (await db.thongBao.count({ where: { nguoiId: nguoi.id, loai: 'TAC_GIA_BI_TU_CHOI' } })) === 1);

    // Người gửi đọc được lý do, và sửa chính đơn ấy rồi gửi lại.
    await nguoiGui.reload({ waitUntil: 'networkidle' });
    kiem('người gửi đọc được lý do trả lại',
      (await nguoiGui.locator('body').textContent()).includes('Kể rõ hơn ba game ấy'));
    kiem('biểu mẫu giữ nguyên chữ cũ để sửa',
      (await nguoiGui.inputValue('input[name="tenTacGia"]')) === 'Xưởng Game Nhỏ');

    await nguoiGui.fill('textarea[name="lyDo"]',
      'Ba game: Đua Xe Phố, Bắn Ruồi, và Cờ Caro. Bản JAR chạy trên S40.');
    await nguoiGui.click('button:has-text("Gửi đơn")');
    const daGuiLai = await doiToi(async () =>
      (await db.donTacGia.findUnique({ where: { id: donId }, select: { trangThai: true } }))
        .trangThai === 'CHO_XEM');
    kiem('sửa rồi gửi lại được, vẫn là một đơn chứ không đẻ thêm', daGuiLai
      && (await db.donTacGia.count({ where: { nguoiId: nguoi.id } })) === 1);

    // ── Đồng ý ────────────────────────────────────────────────────────
    await admin.reload({ waitUntil: 'networkidle' });
    tuDongXacNhan(admin);
    await admin.click('button:has-text("Đồng ý")');
    const daDuyet = await doiToi(async () =>
      (await db.nguoiDung.findUnique({ where: { id: nguoi.id }, select: { vaiTro: true } }))
        .vaiTro === 'TAC_GIA');
    kiem('đồng ý thì người gửi thành tác giả', daDuyet);

    const sau = await db.nguoiDung.findUnique({
      where: { id: nguoi.id }, select: { tenTacGia: true, gioiThieuTacGia: true },
    });
    kiem('tên tác giả trong đơn được chép sang hồ sơ',
      sau.tenTacGia === 'Xưởng Game Nhỏ', String(sau.tenTacGia));
    kiem('người gửi nhận được thông báo đã duyệt',
      (await db.thongBao.count({ where: { nguoiId: nguoi.id, loai: 'TAC_GIA_DUOC_DUYET' } })) === 1);

    /*
     * XÉT LẠI MỘT ĐƠN ĐÃ XÉT thì không ăn — đây là phép canh chuyện hai quản
     * trị cùng mở hàng chờ rồi cùng bấm. Điều kiện `trangThai: 'CHO_XEM'` nằm
     * trong `where` của lượt ghi, nên người thứ hai nhận `count === 0`.
     */
    const conCho = await db.donTacGia.count({ where: { id: donId, trangThai: 'CHO_XEM' } });
    kiem('đơn đã xét thì rời khỏi hàng chờ', conCho === 0);
    await admin.reload({ waitUntil: 'networkidle' });
    kiem('và khu xét đơn không còn bày nút quyết định cho đơn ấy',
      (await admin.locator('button:has-text("Đồng ý")').count()) === 0);

    // Và trang mời không còn mời gửi đơn nữa: họ đã là tác giả.
    await nguoiGui.goto(`${GOC}/tac-gia/dang-ky`, { waitUntil: 'networkidle' });
    kiem('tác giả mở trang mời thì được đưa thẳng sang bảng của mình',
      nguoiGui.url().includes('/quan-ly'), nguoiGui.url());
  } finally {
    await don();
    for (const p of [nguoiGui, khach, admin, thuong]) if (p) await p.close();
  }
}
