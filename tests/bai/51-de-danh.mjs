import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const TEN = 'kiemthu-de-danh';

/**
 * ĐỂ DÀNH — game định tải mà chưa tải.
 *
 * Cửa hàng vốn chỉ ghi việc đã XẢY RA (`LuotTai`). Người mở cửa hàng lúc đang
 * đi đường, mạng yếu, máy hết chỗ, hay gặp game chỉ có bản Java trong khi máy
 * họ là Android — họ cần một chỗ đánh dấu để tối về mở lại, chứ không phải
 * một nút tải ngay bây giờ.
 *
 * Mục kiểm nặng nhất ở đây là chuyện ĐUA và chuyện QUYỀN: bấm hai lần thật
 * nhanh không được đẻ ra hai hàng, và khách chưa đăng nhập không được ghi gì
 * vào danh sách của người khác.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.deDanh.deleteMany({ where: { nguoi: { tenDangNhap: TEN } } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: TEN } });
  };
  await don();

  let p; let khach;
  try {
    const game = await db.game.findFirst({
      where: { trangThai: 'DANG_HIEN' },
      orderBy: { id: 'asc' },
      select: { id: true, duongDan: true, ten: true },
    });
    if (!game) { kiem('có game mẫu để kiểm', false); return; }

    const bcrypt = (await import('bcryptjs')).default;
    const nguoi = await db.nguoiDung.create({
      data: {
        tenDangNhap: TEN, tenHienThi: 'Người Để Dành',
        email: `${TEN}@kiemthu.local`, matKhauBam: await bcrypt.hash('thanhvien123', 10),
      },
      select: { id: true },
    });

    /* ── Khách chưa đăng nhập: thấy nút, bấm thì được mời đăng nhập ────── */
    khach = await moTrang();
    await khach.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    const nutKhach = khach.locator('button[aria-label*="dành"]');
    kiem('khách vẫn thấy nút để dành', (await nutKhach.count()) > 0);
    await nutKhach.first().click();
    await khach.waitForURL('**/dang-nhap**', { timeout: 10_000 }).catch(() => {});
    kiem('khách bấm vào thì được đưa đi đăng nhập', khach.url().includes('/dang-nhap'), khach.url());
    kiem('và mang theo đường về đúng trang game ấy',
      khach.url().includes(encodeURIComponent(`/game/${game.duongDan}`)), khach.url());
    kiem('bấm mà chưa đăng nhập thì KHÔNG ghi gì vào CSDL',
      (await db.deDanh.count({ where: { gameId: game.id } })) === 0);

    /* ── Người đã đăng nhập: bật, tắt, bật lại ─────────────────────────── */
    p = await moTrangDaDangNhap(TEN, 'thanhvien123');
    await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    const nut = p.locator('button[aria-label*="dành"]').first();

    await nut.click();
    kiem('bấm một lần thì game vào danh sách để dành', await doiToi(async () =>
      (await db.deDanh.count({ where: { gameId: game.id, nguoiId: nguoi.id } })) === 1));

    await p.goto(`${GOC}/de-danh`, { waitUntil: 'networkidle' });
    kiem('trang Để dành bày game vừa đánh dấu',
      (await p.locator(`text=${game.ten}`).count()) > 0);

    await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    kiem('mở lại trang game thì nút đang ở trạng thái đã bật',
      (await p.locator('button[aria-pressed="true"]').count()) > 0);

    await p.locator('button[aria-label*="dành"]').first().click();
    kiem('bấm lần nữa thì bỏ khỏi danh sách', await doiToi(async () =>
      (await db.deDanh.count({ where: { gameId: game.id, nguoiId: nguoi.id } })) === 0));

    /*
     * ── HAI CÚ BẤM CÙNG LÚC CHỈ RA MỘT HÀNG ──────────────────────────────
     *
     * Mỗi người mỗi game một khoá duy nhất trong lược đồ, nên cú thứ hai vấp
     * khoá ấy chứ không thêm hàng. Gọi thẳng hai lượt song song để đo đúng
     * chỗ ấy — bấm tay thì không bao giờ nhanh bằng.
     */
    await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    await Promise.all([
      p.locator('button[aria-label*="dành"]').first().click(),
      p.locator('button[aria-label*="dành"]').first().click().catch(() => {}),
    ]);
    await p.waitForTimeout(1200);
    const so = await db.deDanh.count({ where: { gameId: game.id, nguoiId: nguoi.id } });
    kiem('bấm dồn dập vẫn chỉ có nhiều nhất một hàng', so <= 1, `đếm được ${so}`);
  } finally {
    if (p) await p.close();
    if (khach) await khach.close();
    await don();
  }
}
