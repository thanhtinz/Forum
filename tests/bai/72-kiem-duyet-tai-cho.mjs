import { GOC, LOI, db, doiToi, moTrangDaDangNhap, tuDongXacNhan } from '../tro-giup.mjs';

const TIEU_DE = 'Kiểm thử kiểm duyệt tại chỗ';

/**
 * Kiểm duyệt NGAY TRONG chủ đề, không phải sang khu quản trị.
 *
 * Người trực đọc được một chủ đề hỏng là lúc họ đang ĐỌC NÓ. Bắt nhớ tên chủ
 * đề rồi sang khu quản trị lọc lại là ba bước thừa — mà bảng bên ấy lại không
 * gỡ nổi MỘT lời đáp, nên gặp một bài xấu giữa chủ đề thì chỉ còn đường ngồi
 * đợi ai đó bấm báo xấu.
 *
 * Mục nặng nhất vẫn là QUYỀN: mấy nút này chỉ là lối đi, còn cửa thì nằm trong
 * `batBuocQuanTri` của từng hàm. Thành viên thường phát lại yêu cầu phải trượt
 * — không thì bày nút ra đây thành mở toang cả phần kiểm duyệt.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  const nguoiThuong = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  if (!game || !nguoiThuong) { kiem('có dữ liệu mẫu', false); return; }

  const don = async () => {
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: TIEU_DE } }, select: { id: true },
    });
    const id = cu.map((c) => c.id);
    await db.theoDoiChuDe.deleteMany({ where: { chuDeId: { in: id } } });
    await db.traLoi.deleteMany({ where: { chuDeId: { in: id } } });
    await db.chuDe.deleteMany({ where: { id: { in: id } } });
    await db.thongBao.deleteMany({ where: { chiTiet: { contains: TIEU_DE } } });
  };
  await don();

  let admin, thuong;
  try {
    const tao = async () => {
      const c = await db.chuDe.create({
        data: {
          gameId: game.id, nguoiId: nguoiThuong.id,
          tieuDe: TIEU_DE, noiDung: 'Nội dung để kiểm.', soTraLoi: 1,
        },
        select: { id: true },
      });
      const t = await db.traLoi.create({
        data: { chuDeId: c.id, nguoiId: nguoiThuong.id, noiDung: 'Lời đáp để gỡ.' },
        select: { id: true },
      });
      return { c, t };
    };

    let { c: chuDe, t: traLoi } = await tao();
    const dia = (id) => `${GOC}/game/${game.duongDan}/dien-dan/${id}`;

    // ── Thành viên thường không thấy thanh kiểm duyệt ──────────────────
    thuong = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    await thuong.goto(dia(chuDe.id), { waitUntil: 'networkidle' });
    kiem('thành viên thường không thấy thanh kiểm duyệt',
      (await thuong.locator('text=Xoá chủ đề').count()) === 0);
    kiem('và không thấy nút gỡ bài của người khác',
      (await thuong.locator('button:has-text("Gỡ bài")').count()) === 0);

    // ── Quản trị ghim / khoá ngay tại chỗ ─────────────────────────────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(dia(chuDe.id), { waitUntil: 'networkidle' });
    kiem('quản trị thấy thanh kiểm duyệt trong chủ đề',
      (await admin.locator('button:has-text("Ghim")').count()) === 1
      && (await admin.locator('button:has-text("Khoá")').count()) === 1);

    await admin.click('button:has-text("Ghim")');
    const daGhim = await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { ghim: true } }))?.ghim === true);
    kiem('ghim được ngay trong chủ đề', daGhim);

    await admin.goto(dia(chuDe.id), { waitUntil: 'networkidle' });
    kiem('ghim rồi thì nút đổi thành Bỏ ghim',
      (await admin.locator('button:has-text("Bỏ ghim")').count()) === 1);

    await admin.click('button:has-text("Khoá")');
    const daKhoa = await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { khoa: true } }))?.khoa === true);
    kiem('khoá được ngay trong chủ đề', daKhoa);

    // ── Gỡ một lời đáp ────────────────────────────────────────────────
    await admin.goto(dia(chuDe.id), { waitUntil: 'networkidle' });
    tuDongXacNhan(admin);
    await admin.click('button:has-text("Gỡ bài")');
    const daGo = await doiToi(async () =>
      (await db.traLoi.count({ where: { id: traLoi.id } })) === 0);
    kiem('gỡ được một lời đáp ngay trong chủ đề', daGo);

    const con = await db.chuDe.findUnique({
      where: { id: chuDe.id }, select: { soTraLoi: true },
    });
    kiem('và con số đếm sẵn khớp lại, không lệch vĩnh viễn',
      con?.soTraLoi === 0, String(con?.soTraLoi));

    const tin = await db.thongBao.findFirst({
      where: { nguoiId: nguoiThuong.id, loai: 'GO_NOI_DUNG' },
      orderBy: { taoLuc: 'desc' }, select: { tieuDe: true },
    });
    kiem('người viết được báo là bài đã bị gỡ',
      (tin?.tieuDe ?? '').includes('lời đáp'), tin?.tieuDe ?? '');

    /*
     * ── XOÁ CHỦ ĐỀ XONG THÌ PHẢI RỜI KHỎI TRANG ẤY ────────────────────
     *
     * Đang đứng trên chính trang vừa bị xoá, nên ở lại là lần tải sau gặp 404
     * — người trực tưởng thao tác hỏng rồi bấm lại.
     */
    await admin.goto(dia(chuDe.id), { waitUntil: 'networkidle' });
    tuDongXacNhan(admin);
    await admin.click('button:has-text("Xoá chủ đề")');
    const daXoa = await doiToi(async () =>
      (await db.chuDe.count({ where: { id: chuDe.id } })) === 0);
    kiem('xoá được chủ đề ngay trong chính nó', daXoa);

    const veDanhSach = await doiToi(async () =>
      admin.url().endsWith('/dien-dan'));
    kiem('xoá xong thì quay về danh sách chủ đề, không nằm lại trang 404',
      veDanhSach, admin.url());

    /*
     * ── THÀNH VIÊN THƯỜNG PHÁT LẠI YÊU CẦU THÌ TRƯỢT ──────────────────
     *
     * Mấy nút vừa thêm chỉ là lối đi; cửa nằm trong `batBuocQuanTri` của từng
     * hàm. Bày nút mà quên cửa là mở toang cả phần kiểm duyệt.
     */
    ({ c: chuDe, t: traLoi } = await tao());
    let donHang = null;
    admin.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      delete dau.cookie;
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });
    await admin.goto(dia(chuDe.id), { waitUntil: 'networkidle' });
    await admin.click('button:has-text("Ghim")');
    await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { ghim: true } }))?.ghim === true);
    kiem('bắt được yêu cầu ghim để phát lại', !!donHang?.than);

    if (donHang) {
      const ma = await thuong.evaluate(async ({ dia: d, dau, than }) => {
        const r = await fetch(d, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, donHang);
      await thuong.waitForTimeout(1200);
      const sau = await db.chuDe.findUnique({
        where: { id: chuDe.id }, select: { ghim: true },
      });
      kiem('thành viên thường phát lại yêu cầu ghim thì không ăn',
        sau?.ghim === true, `máy trả ${ma}, ghim = ${sau?.ghim}`);
    }
  } finally {
    if (admin) await admin.close();
    if (thuong) await thuong.close();
    await don();
  }
}
