import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const DAU = 'kiemthu-yeucau';

/** Yêu cầu game: gửi được, hiện công khai, và quản trị trả lời được. */
export default async function chay(kiem) {
  const don = () => db.yeuCau.deleteMany({ where: { ten: { startsWith: DAU } } });
  await don();

  try {
    // ── Khách chỉ xem, không gửi được ──────────────────────────────────
    const khach = await moTrang();
    await khach.goto(`${GOC}/yeu-cau`, { waitUntil: 'networkidle' });
    kiem('khách được mời đăng nhập',
      (await khach.locator('text=Đăng nhập để gửi yêu cầu').count()) > 0);
    kiem('khách không có ô nhập', (await khach.locator('input[name="ten"]').count()) === 0);
    await khach.close();

    // ── Thành viên gửi ─────────────────────────────────────────────────
    const p = await moTrangDaDangNhap('lanpham', 'thanhvien123');
    await p.goto(`${GOC}/yeu-cau`, { waitUntil: 'networkidle' });
    await p.fill('input[name="ten"]', `${DAU} game bắn máy bay ngày xưa`);
    await p.fill('textarea[name="ghiChu"]', 'Chơi trên Nokia 6300, có con trùm hình con nhện.');
    await p.click('button[type="submit"]');

    const daGui = await doiToi(async () =>
      (await db.yeuCau.count({ where: { ten: { startsWith: DAU } } })) === 1);
    kiem('gửi được yêu cầu', daGui);

    const yc = await db.yeuCau.findFirst({
    orderBy: { id: 'asc' }, where: { ten: { startsWith: DAU } }, select: { id: true, trangThai: true } });
    kiem('yêu cầu mới ở trạng thái chờ xem', yc?.trangThai === 'CHO_XEM', yc?.trangThai);

    await p.reload({ waitUntil: 'networkidle' });
    kiem('yêu cầu hiện ở danh sách công khai',
      (await p.locator(`text=${DAU} game bắn máy bay ngày xưa`).count()) > 0);
    await p.close();

    // ── Quản trị trả lời ───────────────────────────────────────────────
    const admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/yeu-cau`, { waitUntil: 'networkidle' });
    kiem('quản trị thấy yêu cầu vừa gửi',
      (await admin.locator(`text=${DAU} game bắn máy bay ngày xưa`).count()) > 0);

    await admin.locator('select').first().selectOption('DANG_TIM');
    await admin.locator('textarea').first().fill('Đang tìm giúp bạn, vài hôm nữa quay lại nhé.');
    await admin.locator('button:has-text("Lưu")').first().click();

    const daTraLoi = await doiToi(async () => {
      const x = await db.yeuCau.findUnique({ where: { id: yc.id }, select: { trangThai: true, loiNhan: true } });
      return x?.trangThai === 'DANG_TIM' && !!x.loiNhan;
    });
    kiem('quản trị đổi được trạng thái và ghi lời nhắn', daTraLoi);
    await admin.close();

    // ── Lời nhắn hiện công khai ────────────────────────────────────────
    const xem = await moTrang();
    await xem.goto(`${GOC}/yeu-cau`, { waitUntil: 'networkidle' });
    kiem('lời nhắn của ban quản trị hiện công khai',
      (await xem.locator('text=Đang tìm giúp bạn').count()) > 0);
    await xem.close();
  } finally {
    await don();
  }
}
