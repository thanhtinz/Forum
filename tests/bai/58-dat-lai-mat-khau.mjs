import { GOC, db, doiToi, moTrang, moTrangDaDangNhap, tuDongXacNhan } from '../tro-giup.mjs';
import { HAN_MA_GIO, chiaCum, donMa } from '../../src/lib/dat-lai-const.ts';

const TEN = 'kiemthu-datlai';
const CU = 'thanhvien123';
const MOI = 'matkhaumoi456';

/**
 * ĐẶT LẠI MẬT KHẨU BẰNG MÃ.
 *
 * Trước đợt này, ai quên mật khẩu là khoá cứng vĩnh viễn — `doiMatKhau` chỉ
 * chạy khi đang đăng nhập được, mà ban quản trị cũng không có lệnh nào cứu.
 *
 * Đây là lối vào một cột mật khẩu, nên mấy mục đáng canh nhất đều là chuyện an
 * toàn: mã dùng được đúng một lần, mã hết hạn thì thôi, phát mã mới thì mã cũ
 * chết, và ĐỔI XONG PHẢI ĐÁ SẠCH mọi phiên đang mở — người ta đặt lại mật khẩu
 * thường vì nghi có kẻ đang ngồi trong tài khoản, mà kẻ ấy giữ cookie chứ có
 * cần biết mật khẩu đâu.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: TEN } } });
  };
  await don();

  let admin; let nanNhan; let khach;
  try {
    /* ── Phần thuần: cắt cụm cho dễ đọc, gõ kiểu nào cũng nhận ───────── */
    kiem('mã chia cụm cho dễ đọc', chiaCum('abcdefgh') === 'abcd-efgh');
    kiem('bỏ gạch nối và khoảng trắng lúc nhận vào',
      donMa(' abcd-efgh ') === 'abcdefgh');
    kiem('mã chia cụm rồi dọn lại thì ra đúng mã gốc',
      donMa(chiaCum('xyz123ABC')) === 'xyz123ABC');

    const bcrypt = (await import('bcryptjs')).default;
    const nguoi = await db.nguoiDung.create({
      data: {
        tenDangNhap: TEN, tenHienThi: 'Người quên mật khẩu',
        email: `${TEN}@kiemthu.local`, matKhauBam: await bcrypt.hash(CU, 10),
      },
      select: { id: true },
    });

    /* ── Khách chưa đăng nhập KHÔNG tự phát mã cho mình được ─────────── */
    khach = await moTrang();
    await khach.goto(`${GOC}/quen-mat-khau`, { waitUntil: 'networkidle' });
    kiem('trang quên mật khẩu nói rõ phải xin ban quản trị',
      (await khach.locator('main').textContent()).includes('ban quản trị'));
    kiem('trang quên mật khẩu KHÔNG có ô nhập email để tự xin mã',
      (await khach.locator('main input').count()) === 0);

    /* ── Ban quản trị phát mã ─────────────────────────────────────────── */
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    // Trang thành viên xếp theo ngày tạo giảm dần, nên người vừa dựng nằm ngay
    // đầu trang một — không cần ô tìm.
    await admin.goto(`${GOC}/quan-tri/thanh-vien`, { waitUntil: 'networkidle' });
    tuDongXacNhan(admin);
    await admin.click(`button[aria-label="Phát mã đặt lại mật khẩu cho Người quên mật khẩu"]`);
    const oMa = admin.locator('input[aria-label="Đường dẫn đặt lại mật khẩu của Người quên mật khẩu"]');
    await oMa.waitFor({ timeout: 10000 });
    const duongDan = await oMa.inputValue();
    kiem('phát mã thì hiện ra một đường dẫn bấm là vào',
      duongDan.includes('/dat-lai-mat-khau?ma='), duongDan);
    const maHien = decodeURIComponent(duongDan.split('ma=')[1] ?? '');
    kiem('đường dẫn mang đúng một mã đọc được', maHien.length > 20, maHien);

    const trongKho = await db.maDatLai.findFirst({
      where: { nguoiId: nguoi.id }, select: { ma: true, dungLuc: true, hetHan: true },
    });
    kiem('cơ sở dữ liệu chỉ giữ bản BĂM, không giữ mã thật',
      !!trongKho && trongKho.ma !== donMa(maHien) && !trongKho.ma.includes(donMa(maHien).slice(0, 12)),
      trongKho?.ma?.slice(0, 16));
    kiem(`mã hết hạn sau chừng ${HAN_MA_GIO} giờ`,
      Math.abs(trongKho.hetHan.getTime() - Date.now() - HAN_MA_GIO * 3600000) < 120000);

    /* ── Mã sai thì không ăn ──────────────────────────────────────────── */
    const doiMatKhau = async (p, ma, mk) => {
      await p.goto(`${GOC}/dat-lai-mat-khau`, { waitUntil: 'networkidle' });
      await p.fill('input[name="ma"]', ma);
      await p.fill('input[name="matKhau"]', mk);
      await p.fill('input[name="nhacLai"]', mk);
      await p.click('button:has-text("Đặt lại mật khẩu")');
      await p.waitForTimeout(900);
    };

    await doiMatKhau(khach, 'khong-phai-ma-that-dau', 'batkydauma1');
    const sauMaSai = await db.nguoiDung.findUnique({
      where: { id: nguoi.id }, select: { matKhauBam: true },
    });
    kiem('mã bịa thì không đổi được mật khẩu',
      await bcrypt.compare(CU, sauMaSai.matKhauBam));

    /* ── Hai ô mật khẩu lệch nhau thì chặn, và mã CHƯA bị tiêu ────────── */
    await khach.goto(`${GOC}/dat-lai-mat-khau`, { waitUntil: 'networkidle' });
    await khach.fill('input[name="ma"]', maHien);
    await khach.fill('input[name="matKhau"]', MOI);
    await khach.fill('input[name="nhacLai"]', `${MOI}-lech`);
    await khach.click('button:has-text("Đặt lại mật khẩu")');
    await khach.waitForTimeout(700);
    kiem('gõ lệch hai ô mật khẩu thì bị chặn',
      (await db.maDatLai.count({ where: { nguoiId: nguoi.id, dungLuc: null } })) === 1);

    /* ── Mở sẵn một phiên của nạn nhân để xem có bị đá không ──────────── */
    nanNhan = await moTrangDaDangNhap(TEN, CU);
    await nanNhan.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    kiem('nạn nhân đang đăng nhập được trước khi đặt lại',
      !nanNhan.url().includes('/dang-nhap'), nanNhan.url());
    const soPhienTruoc = await db.phien.count({ where: { nguoiId: nguoi.id } });
    kiem('có phiên đang mở để mà đá', soPhienTruoc >= 1, `${soPhienTruoc}`);

    /* ── Đổi thật ─────────────────────────────────────────────────────── */
    await doiMatKhau(khach, maHien, MOI);
    kiem('đổi xong thì màn hình báo đã đổi',
      (await khach.locator('text=Đã đổi mật khẩu').count()) > 0);

    const sau = await db.nguoiDung.findUnique({
      where: { id: nguoi.id }, select: { matKhauBam: true },
    });
    kiem('mật khẩu mới có hiệu lực', await bcrypt.compare(MOI, sau.matKhauBam));
    kiem('mật khẩu cũ hết dùng được', !(await bcrypt.compare(CU, sau.matKhauBam)));

    kiem('đổi xong thì mọi phiên đang mở bị đóng sạch', await doiToi(async () =>
      (await db.phien.count({ where: { nguoiId: nguoi.id } })) === 0));

    /*
     * Mở lại trang tài khoản trên máy nạn nhân: nó phải hiện lời mời đăng
     * nhập, tức là cookie cũ không còn mở được cửa nào nữa.
     *
     * Xét theo NỘI DUNG chứ không chờ bị đá sang trang đăng nhập — `/toi` cố ý
     * không đá ai đi đâu cả, vì nó nằm ở thanh tab đáy và bấm vào mà bị văng
     * thì lần sau người ta không dám bấm nữa. Bản đầu của bài này chờ một cú
     * chuyển trang không bao giờ tới, rồi báo hỏng một chỗ hoàn toàn đúng.
     */
    await nanNhan.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    const chuToi = await nanNhan.locator('main').textContent();
    kiem('thiết bị đang đăng nhập bị đá ra thật',
      chuToi.includes('Bạn chưa đăng nhập'), chuToi.slice(0, 120));

    /* ── Mã đã dùng thì chết hẳn ──────────────────────────────────────── */
    await doiMatKhau(khach, maHien, 'matkhauthuba789');
    const sauLanHai = await db.nguoiDung.findUnique({
      where: { id: nguoi.id }, select: { matKhauBam: true },
    });
    kiem('dùng lại mã cũ lần hai thì không ăn',
      await bcrypt.compare(MOI, sauLanHai.matKhauBam));

    /* ── Phát mã mới thì mã chưa dùng trước đó chết ───────────────────── */
    await admin.reload({ waitUntil: 'networkidle' });
    tuDongXacNhan(admin);
    await admin.click(`button[aria-label="Phát mã đặt lại mật khẩu cho Người quên mật khẩu"]`);
    const oMa2 = admin.locator('input[aria-label="Đường dẫn đặt lại mật khẩu của Người quên mật khẩu"]');
    await oMa2.waitFor({ timeout: 10000 });
    const ma2 = decodeURIComponent((await oMa2.inputValue()).split('ma=')[1] ?? '');
    kiem('mã lần hai khác mã lần đầu', donMa(ma2) !== donMa(maHien));

    const chuaDung = await db.maDatLai.count({ where: { nguoiId: nguoi.id, dungLuc: null } });
    kiem('mỗi người chỉ có đúng một mã còn sống', chuaDung <= 1, `${chuaDung}`);

    /* ── Mã điền sẵn qua địa chỉ thì dùng được ngay ───────────────────── */
    await khach.goto(`${GOC}/dat-lai-mat-khau?ma=${encodeURIComponent(ma2)}`,
      { waitUntil: 'networkidle' });
    kiem('mở đường dẫn thì ô mã đã điền sẵn',
      (await khach.locator('input[name="ma"]').inputValue()) === ma2);

    /* ── Mã hết hạn thì thôi ──────────────────────────────────────────── */
    await db.maDatLai.updateMany({
      where: { nguoiId: nguoi.id, dungLuc: null },
      data: { hetHan: new Date(Date.now() - 1000) },
    });
    await doiMatKhau(khach, ma2, 'matkhauhethan999');
    const sauHetHan = await db.nguoiDung.findUnique({
      where: { id: nguoi.id }, select: { matKhauBam: true },
    });
    kiem('mã hết hạn thì không đổi được', await bcrypt.compare(MOI, sauHetHan.matKhauBam));

    /* ── Tài khoản bị khoá thì không phát mã ──────────────────────────── */
    await db.nguoiDung.update({ where: { id: nguoi.id }, data: { khoa: true } });
    await admin.reload({ waitUntil: 'networkidle' });
    kiem('tài khoản đang khoá thì không mời phát mã',
      (await admin.locator(`button[aria-label="Phát mã đặt lại mật khẩu cho Người quên mật khẩu"]`)
        .count()) === 0);
  } finally {
    await don();
    for (const p of [admin, nanNhan, khach]) if (p) await p.close();
  }
}
