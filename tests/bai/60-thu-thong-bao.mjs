import { GOC, boNhipDienDan, db, doiToi, moTrangDaDangNhap } from '../tro-giup.mjs';
import { docThan, moThuGia } from '../thu-gia.mjs';

/* Chữ thường hết: lối đăng nhập hạ định danh về chữ thường trước khi tra, mà
   tên đăng nhập thật trong cửa hàng luôn do `thanhDuongDan` sinh ra nên cũng
   chữ thường. Đặt tên có chữ hoa là bài kiểm tự khoá cửa chính mình. */
const TEN = 'kiemthu-thu-tb';

/**
 * BÁO THÔNG BÁO MỚI QUA THƯ.
 *
 * Ba chỗ đáng canh, và cả ba đều là chuyện "đừng làm phiền người ta":
 *
 *   • TẮT ĐƯỢC, và tắt rồi thì phải im thật. Gửi thư cho người đã tắt là kiểu
 *     lỗi khiến người ta chặn luôn tên miền của cửa hàng.
 *   • Thư phải kèm LỐI TẮT ĐI, không thì người nhận chẳng biết tắt ở đâu.
 *   • Thư hỏng KHÔNG được làm hỏng thông báo trong trang: cái chuông là thứ
 *     phải có, lá thư chỉ là thứ nên có.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: TEN } } });
  };
  await don();

  const hom = moThuGia(2525);
  let p;
  try {
    await hom.san;

    const bcrypt = (await import('bcryptjs')).default;
    const bam = await bcrypt.hash('thanhvien123', 10);
    const nguoi = await db.nguoiDung.create({
      data: {
        tenDangNhap: TEN, tenHienThi: 'Người nhận thư báo',
        email: `${TEN}@kiemthu.local`, matKhauBam: bam,
      },
      select: { id: true, thuThongBao: true },
    });
    kiem('công tắc nhận thư bật sẵn cho tài khoản mới', nguoi.thuThongBao === true);

    /*
     * Gọi thẳng `guiThongBao` qua một trang máy chủ thì không tiện, nên dựng
     * thông báo bằng đúng lối người dùng gặp: ban quản trị trả lời một đánh
     * giá. Nhưng bài này chỉ cần biết CÓ THƯ HAY KHÔNG, nên dùng lối rẻ nhất
     * là gọi qua khu quản trị thì thừa — thay vào đó ghi thẳng và gọi hàm
     * không được. Dùng trang cài đặt để đổi công tắc, còn thông báo thì bắn
     * bằng một lượt trả lời thật ở dưới.
     */
    p = await moTrangDaDangNhap(TEN, 'thanhvien123');

    // ── Tắt công tắc ở trang cài đặt ──────────────────────────────────
    await p.goto(`${GOC}/toi/cai-dat`, { waitUntil: 'networkidle' });
    const oTat = p.locator('input[name="thuThongBao"]');
    kiem('trang cài đặt có công tắc nhận thư', (await oTat.count()) === 1);
    if ((await oTat.count()) !== 1) return;

    kiem('công tắc đang bật', await oTat.isChecked());
    await oTat.uncheck();
    await p.click('button:has-text("Lưu hồ sơ")');

    kiem('tắt công tắc thì ghi vào cơ sở dữ liệu', await doiToi(async () =>
      (await db.nguoiDung.findUnique({
        where: { id: nguoi.id }, select: { thuThongBao: true },
      }))?.thuThongBao === false));

    // ── Bật lại ───────────────────────────────────────────────────────
    await p.reload({ waitUntil: 'networkidle' });
    kiem('tải lại trang thì công tắc nhớ đúng trạng thái vừa đặt',
      !(await p.locator('input[name="thuThongBao"]').isChecked()));

    await p.locator('input[name="thuThongBao"]').check();
    await p.click('button:has-text("Lưu hồ sơ")');
    kiem('bật lại được', await doiToi(async () =>
      (await db.nguoiDung.findUnique({
        where: { id: nguoi.id }, select: { thuThongBao: true },
      }))?.thuThongBao === true));

    /* ── Có thông báo thật thì thư phải bay ────────────────────────────
     *
     * Dựng bằng đường người dùng gặp: một người khác trả lời chủ đề của mình.
     */
    const game = await db.game.findFirst({
      where: { trangThai: 'DANG_HIEN' }, select: { id: true, duongDan: true },
    });
    const chuDe = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: nguoi.id,
        tieuDe: `${TEN} chủ đề nhận thư`, noiDung: 'Chờ người khác trả lời.',
      },
      select: { id: true },
    });

    const khac = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    // Bài này đáp HAI lần liên tiếp bằng cùng tài khoản, mà diễn đàn có nhịp
    // nghỉ thật ở máy chủ — xem `boNhipDienDan`.
    const quanTri = await db.nguoiDung.findFirst({
      where: { email: 'admin@sunnystore.local' }, select: { id: true },
    });
    hom.thu.length = 0;
    await khac.goto(`${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`,
      { waitUntil: 'networkidle' });
    await khac.fill('textarea[name="noiDung"]', 'Lời đáp để bắn thông báo.');
    await boNhipDienDan(quanTri.id);
    await khac.click('button:has-text("Gửi")');

    const coThu = await doiToi(async () => hom.thu.length >= 1);
    kiem('có thông báo mới thì thư bay tới', coThu, `${hom.thu.length} thư`);

    if (coThu) {
      const la = hom.thu.find((t) => t.toi === `${TEN}@kiemthu.local`);
      kiem('thư gửi đúng người nhận thông báo', !!la, hom.thu.map((t) => t.toi).join(', '));
      if (la) {
        const chu = docThan(la.than);
        kiem('thư kèm lối tắt đi', chu.includes('/toi/cai-dat'), chu.slice(0, 200));
        kiem('thư trỏ tới đúng chỗ có chuyện xảy ra', chu.includes(chuDe.id));
      }
    }

    /* ── Tắt rồi thì im thật ───────────────────────────────────────────── */
    await db.nguoiDung.update({ where: { id: nguoi.id }, data: { thuThongBao: false } });
    hom.thu.length = 0;
    await khac.fill('textarea[name="noiDung"]', 'Lời đáp thứ hai.');
    await boNhipDienDan(quanTri.id);
    await khac.click('button:has-text("Gửi")');
    await doiToi(async () =>
      (await db.traLoi.count({ where: { chuDeId: chuDe.id } })) === 2);
    await khac.waitForTimeout(1200);

    kiem('tắt rồi thì KHÔNG gửi thư nữa',
      hom.thu.every((t) => t.toi !== `${TEN}@kiemthu.local`),
      hom.thu.map((t) => t.toi).join(', '));
    kiem('nhưng thông báo trong trang vẫn ghi đủ',
      (await db.thongBao.count({ where: { nguoiId: nguoi.id } })) === 2);

    await khac.close();
    await db.chuDe.delete({ where: { id: chuDe.id } });
  } finally {
    await don();
    await p?.close();
    await hom.dong();
  }
}
