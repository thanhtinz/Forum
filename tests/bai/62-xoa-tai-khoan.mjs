import { db, doiToi, GOC, LOI, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';
import { CAU_XAC_NHAN, TEN_DA_XOA, emailDaXoa } from '../../src/lib/xoa-tai-khoan-const.ts';

const EMAIL = 'kiemthu-xoa@sunnystore.local';
const TEN = 'kiemthu-xoa';
const TIEU_DE = 'Chủ đề của người sắp đi';
// Mượn nguyên bản băm mật khẩu của một tài khoản mẫu, nên mật khẩu cũng
// chính là mật khẩu của tài khoản ấy.
const MAT_KHAU = 'thanhvien123';

/**
 * Người dùng tự xoá tài khoản.
 *
 * Việc này KHÔNG lùi lại được, nên bài kiểm canh hai đầu ngược nhau:
 *
 *   • XOÁ PHẢI XOÁ THẬT — email, mật khẩu, ảnh, tên, quyền, danh sách đã lưu
 *     và hộp thông báo đều phải đi, và mọi phiên còn mở phải chết ngay. Chùi
 *     nửa vời thì người ta tưởng mình đã rời đi mà thật ra chưa.
 *   • VÀ KHÔNG ĐƯỢC XOÁ NHẦM — gõ sai mật khẩu hay sai câu xác nhận thì tài
 *     khoản phải còn nguyên vẹn, không sứt một chữ nào.
 *
 * Mục nặng ký nhất là CHỮ CỦA NGƯỜI KHÁC: một chủ đề do người sắp đi mở ra,
 * có lời đáp của người khác trong đó. Xoá hẳn hàng người dùng là lời đáp ấy
 * biến mất theo — người thứ hai chẳng làm gì cả mà mất bài.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' }, select: { id: true },
  });
  const nguoiKhac = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  if (!game || !nguoiKhac) { kiem('có dữ liệu mẫu', false); return; }

  /*
   * DỌN PHẢI LẦN RA ĐƯỢC CẢ HÀNG ĐÃ BỊ CHÙI.
   *
   * Bài này cố ý xoá một tài khoản, mà xoá xong thì email lẫn tên đăng nhập
   * đều không còn là thứ bài kiểm đặt ra nữa — tìm theo hai cột ấy là bỏ sót
   * đúng cái hàng mình vừa tạo. Nên lần theo CHỦ ĐỀ, vì tiêu đề của nó không
   * bị chùi. Để sót thì lượt chạy sau có thêm một chủ đề lạ trong diễn đàn, và
   * mấy bài đếm bài viết sẽ đỏ vì một lý do chẳng liên quan gì tới chúng.
   */
  const don = async () => {
    const cuaChuDe = await db.chuDe.findMany({
      where: { tieuDe: TIEU_DE }, select: { id: true, nguoiId: true },
    });
    await db.traLoi.deleteMany({ where: { chuDeId: { in: cuaChuDe.map((c) => c.id) } } });
    await db.chuDe.deleteMany({ where: { tieuDe: TIEU_DE } });

    const id = new Set(cuaChuDe.map((c) => c.nguoiId));
    const theoTen = await db.nguoiDung.findMany({
      where: { OR: [{ email: EMAIL }, { tenDangNhap: TEN }] }, select: { id: true },
    });
    for (const n of theoTen) id.add(n.id);
    if (id.size) await db.nguoiDung.deleteMany({ where: { id: { in: [...id] } } });
  };
  await don();

  let p, khach;
  try {
    // Mở tài khoản thẳng trong CSDL: luồng đăng ký đã có bài 07 canh rồi, ở
    // đây chỉ cần một tài khoản đăng nhập được.
    const mau = await db.nguoiDung.findFirst({
      where: { tenDangNhap: 'anhthu' }, select: { matKhauBam: true },
    });
    const toi = await db.nguoiDung.create({
      data: {
        email: EMAIL, tenDangNhap: TEN, tenHienThi: 'Người Sắp Đi',
        anh: 'https://vi-du.test/anh.png', matKhauBam: mau.matKhauBam,
        tenTacGia: 'Hãng Sắp Đóng',
      },
      select: { id: true },
    });

    // Một chủ đề của người sắp đi, có lời đáp của NGƯỜI KHÁC trong đó.
    const chuDe = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: toi.id,
        tieuDe: TIEU_DE, noiDung: 'Nội dung để kiểm.', soTraLoi: 1,
        traLoi: { create: { nguoiId: nguoiKhac.id, noiDung: 'Lời đáp của người khác.' } },
      },
      select: { id: true },
    });
    await db.daLuu.create({ data: { nguoiId: toi.id, gameId: game.id } });
    await db.thongBao.create({
      data: { nguoiId: toi.id, loai: 'TRA_LOI_CHU_DE', tieuDe: 'Thông báo kiểm thử', duongDan: '/' },
    });

    p = await moTrangDaDangNhap(EMAIL, MAT_KHAU);

    // ── Vùng nguy hiểm phải GẤP LẠI SẴN ───────────────────────────────
    await p.goto(`${GOC}/toi/cai-dat`, { waitUntil: 'networkidle' });
    const vung = p.locator('details[data-viec="vung-nguy-hiem"]');
    kiem('trang cài đặt có vùng xoá tài khoản', (await vung.count()) === 1);
    kiem('vùng nguy hiểm gấp lại sẵn, không bày nút đỏ ra ngay',
      (await vung.evaluate((e) => e.open)) === false);

    await vung.locator('summary').click();

    // ── Sai mật khẩu thì KHÔNG xoá ────────────────────────────────────
    await p.fill('input[name="matKhau"]', 'sai-be-bet');
    await p.fill('input[name="xacNhan"]', CAU_XAC_NHAN);
    await p.click('button:has-text("Xoá tài khoản của tôi")');
    await p.waitForSelector(LOI, { timeout: 8000 }).catch(() => {});
    let con = await db.nguoiDung.findUnique({
      where: { id: toi.id }, select: { email: true, xoaLuc: true },
    });
    kiem('gõ sai mật khẩu thì tài khoản còn nguyên',
      con?.email === EMAIL && con?.xoaLuc === null);

    // ── Sai câu xác nhận thì cũng KHÔNG xoá ───────────────────────────
    await p.fill('input[name="matKhau"]', MAT_KHAU);
    await p.fill('input[name="xacNhan"]', 'xoá đi');
    await p.click('button:has-text("Xoá tài khoản của tôi")');
    await p.waitForTimeout(1500);
    con = await db.nguoiDung.findUnique({
      where: { id: toi.id }, select: { email: true, xoaLuc: true },
    });
    kiem('gõ sai câu xác nhận thì tài khoản còn nguyên',
      con?.email === EMAIL && con?.xoaLuc === null);

    /*
     * ── QUẢN TRỊ VIÊN CUỐI CÙNG THÌ KHÔNG ĐƯỢC ĐI ─────────────────────
     *
     * Không có chốt này thì người quản trị duy nhất tự xoá mình là cửa hàng
     * còn lại KHÔNG AI mở nổi khu quản trị — không duyệt được game, không gỡ
     * được bài xấu, mà cũng chẳng có đường nào tự phong quyền lại.
     *
     * Phép thử đòi bài kiểm tạm hạ quyền mấy quản trị viên thật xuống, nên cất
     * lại danh sách và dựng lại NGAY sau khi đo xong, chứ không đợi tới
     * `finally` — mỗi mili giây cửa hàng không có quản trị là một mili giây
     * mấy bài kiểm khác có thể vấp phải.
     */
    const quanTriThat = await db.nguoiDung.findMany({
      where: { vaiTro: 'QUAN_TRI', xoaLuc: null }, select: { id: true },
    });
    await db.nguoiDung.updateMany({
      where: { id: { in: quanTriThat.map((q) => q.id) } }, data: { vaiTro: 'THANH_VIEN' },
    });
    await db.nguoiDung.update({ where: { id: toi.id }, data: { vaiTro: 'QUAN_TRI' } });
    try {
      await p.goto(`${GOC}/toi/cai-dat`, { waitUntil: 'networkidle' });
      await p.locator('details[data-viec="vung-nguy-hiem"] summary').click();
      await p.fill('input[name="matKhau"]', MAT_KHAU);
      await p.fill('input[name="xacNhan"]', CAU_XAC_NHAN);
      await p.click('button:has-text("Xoá tài khoản của tôi")');
      // Chờ ĐÚNG CÂU BÁO LỖI ấy, không chờ "có ô báo lỗi nào đó": dưới kia
      // bài kiểm dựng lại quyền quản trị, mà dựng lại trong lúc `xoaTaiKhoan`
      // còn đang đọc quyền thì hàm ấy thấy một thành viên thường và xoá thật.
      await p.waitForSelector(`${LOI}:has-text("quản trị viên cuối cùng")`, { timeout: 15_000 })
        .catch(() => {});

      const conDo = await db.nguoiDung.findUnique({
        where: { id: toi.id }, select: { xoaLuc: true },
      });
      kiem('quản trị viên cuối cùng thì không xoá được mình', conDo?.xoaLuc === null);
      kiem('và trang nói rõ vì sao',
        (await p.locator(`${LOI}:has-text("quản trị viên cuối cùng")`).count()) > 0);
    } finally {
      await db.nguoiDung.update({ where: { id: toi.id }, data: { vaiTro: 'THANH_VIEN' } });
      await db.nguoiDung.updateMany({
        where: { id: { in: quanTriThat.map((q) => q.id) } }, data: { vaiTro: 'QUAN_TRI' },
      });
    }

    await p.goto(`${GOC}/toi/cai-dat`, { waitUntil: 'networkidle' });
    await p.locator('details[data-viec="vung-nguy-hiem"] summary').click();

    // ── Gõ đúng cả hai thì đi thật ────────────────────────────────────
    await p.fill('input[name="matKhau"]', MAT_KHAU);
    await p.fill('input[name="xacNhan"]', CAU_XAC_NHAN);
    await p.click('button:has-text("Xoá tài khoản của tôi")');

    const daXoa = await doiToi(async () =>
      (await db.nguoiDung.findUnique({ where: { id: toi.id }, select: { xoaLuc: true } }))
        ?.xoaLuc !== null);
    kiem('gõ đúng cả hai thì tài khoản bị xoá', daXoa);

    await p.waitForURL((u) => u.pathname === '/tam-biet', { timeout: 15_000 }).catch(() => {});
    kiem('xoá xong thì đáp xuống trang tạm biệt', p.url().includes('/tam-biet'), p.url());

    const sau = await db.nguoiDung.findUnique({
      where: { id: toi.id },
      select: {
        email: true, tenDangNhap: true, tenHienThi: true, anh: true, matKhauBam: true,
        vaiTro: true, thuThongBao: true, tenTacGia: true,
      },
    });
    kiem('email bị chùi', sau?.email === emailDaXoa(toi.id), sau?.email);
    kiem('tên hiển thị thành tên người đã đi', sau?.tenHienThi === TEN_DA_XOA);
    kiem('ảnh đại diện đi hẳn', sau?.anh === null);
    kiem('tên hãng của tác giả cũng đi', sau?.tenTacGia === null);
    kiem('tắt luôn đường gửi thư', sau?.thuThongBao === false);
    kiem('mật khẩu cũ không còn nằm trong hàng', sau?.matKhauBam !== mau.matKhauBam);

    kiem('mọi phiên bị đóng', (await db.phien.count({ where: { nguoiId: toi.id } })) === 0);
    kiem('danh sách đã lưu đi theo',
      (await db.daLuu.count({ where: { nguoiId: toi.id } })) === 0);
    kiem('hộp thông báo đi theo',
      (await db.thongBao.count({ where: { nguoiId: toi.id } })) === 0);

    /*
     * CHỮ CỦA NGƯỜI KHÁC PHẢI CÒN.
     *
     * Đây là mục đắt nhất bài này. Xoá hẳn hàng người dùng thì Prisma dắt theo
     * cả chủ đề, và lời đáp của người khác trong chủ đề ấy chết chùm — một
     * người rời đi mà người thứ hai mất bài.
     */
    kiem('chủ đề cũ vẫn còn',
      (await db.chuDe.count({ where: { id: chuDe.id } })) === 1);
    kiem('LỜI ĐÁP CỦA NGƯỜI KHÁC vẫn còn',
      (await db.traLoi.count({ where: { chuDeId: chuDe.id, nguoiId: nguoiKhac.id } })) === 1);

    // ── Đi rồi thì không quay lại được ────────────────────────────────
    khach = await moTrang();
    await khach.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
    await khach.fill('input[name="dinhDanh"]', EMAIL);
    await khach.fill('input[name="matKhau"]', MAT_KHAU);
    await khach.click('button[type="submit"]');
    await khach.waitForTimeout(2000);
    kiem('mật khẩu cũ không đăng nhập lại được',
      khach.url().includes('/dang-nhap')
      && (await khach.locator(LOI).count()) > 0);

    // Soi MÃ TRẢ VỀ chứ không soi chữ trên trang: chữ của trang 404 đổi lúc
    // nào cũng được, còn mã 404 thì đúng là thứ đang cần bảo đảm.
    const traLoi = await khach.goto(`${GOC}/thanh-vien/${TEN}`, { waitUntil: 'networkidle' });
    kiem('trang hồ sơ cũ trả về 404', traLoi?.status() === 404, String(traLoi?.status()));

    // Phiên cũ trên máy người vừa đi cũng phải chết, không đợi hết hạn.
    await p.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    kiem('phiên đang mở hoá thành khách ngay',
      (await p.locator('text=Bạn chưa đăng nhập').count()) > 0);
  } finally {
    if (p) await p.close();
    if (khach) await khach.close();
    await don();
  }
}
