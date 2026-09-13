import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const TEN = 'kiemthu-de-danh';

/**
 * ĐÃ LƯU — game định tải mà chưa tải.
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
    await db.daLuu.deleteMany({ where: { nguoi: { tenDangNhap: TEN } } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: TEN } });
  };
  await don();

  let p; let khach; let admin;
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
    const nutKhach = khach.locator('button[aria-label*="game này"]');
    kiem('khách vẫn thấy nút lưu', (await nutKhach.count()) > 0);
    await nutKhach.first().click();
    await khach.waitForURL('**/dang-nhap**', { timeout: 10_000 }).catch(() => {});
    kiem('khách bấm vào thì được đưa đi đăng nhập', khach.url().includes('/dang-nhap'), khach.url());
    kiem('và mang theo đường về đúng trang game ấy',
      khach.url().includes(encodeURIComponent(`/game/${game.duongDan}`)), khach.url());
    kiem('bấm mà chưa đăng nhập thì KHÔNG ghi gì vào CSDL',
      (await db.daLuu.count({ where: { gameId: game.id } })) === 0);

    /* ── Người đã đăng nhập: bật, tắt, bật lại ─────────────────────────── */
    p = await moTrangDaDangNhap(TEN, 'thanhvien123');
    await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    const nut = p.locator('button[aria-label*="game này"]').first();

    await nut.click();
    kiem('bấm một lần thì game vào danh sách đã lưu', await doiToi(async () =>
      (await db.daLuu.count({ where: { gameId: game.id, nguoiId: nguoi.id } })) === 1));

    await p.goto(`${GOC}/da-luu`, { waitUntil: 'networkidle' });
    kiem('trang Đã lưu bày game vừa đánh dấu',
      (await p.locator(`text=${game.ten}`).count()) > 0);

    /*
     * ── BỎ NGAY TRÊN DANH SÁCH ────────────────────────────────────────
     *
     * Danh sách đã lưu là chỗ người ta ngồi dọn, nên bỏ một game phải là một
     * nhịp — chứ không phải mở trang game rồi bấm lại dấu trang, ba nhịp cho
     * một việc.
     *
     * Nút ấy gọi hàm XOÁ chứ không phải hàm bật/tắt: mượn hàm bật/tắt thì hai
     * cú bấm vội sẽ bỏ rồi thêm lại, và game biến mất xong hiện lên như trêu.
     */
    await p.locator('button[aria-label*="khỏi danh sách"]').first().click();
    kiem('bấm nút trên hàng thì bỏ được ngay tại danh sách', await doiToi(async () =>
      (await db.daLuu.count({ where: { gameId: game.id, nguoiId: nguoi.id } })) === 0));

    // Bấm lại lần nữa trên một hàng đã mất cũng không được đẻ ra hàng mới.
    await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    await p.locator('button[aria-label*="game này"]').first().click();
    await doiToi(async () =>
      (await db.daLuu.count({ where: { gameId: game.id, nguoiId: nguoi.id } })) === 1);

    await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    kiem('mở lại trang game thì nút đang ở trạng thái đã bật',
      (await p.locator('button[aria-pressed="true"]').count()) > 0);

    await p.locator('button[aria-label*="game này"]').first().click();
    kiem('bấm lần nữa thì bỏ khỏi danh sách', await doiToi(async () =>
      (await db.daLuu.count({ where: { gameId: game.id, nguoiId: nguoi.id } })) === 0));

    /*
     * ── GAME ĐÃ LƯU CÓ BẢN CHO HỆ MÁY MỚI THÌ ĐƯỢC BÁO ──────────────────
     *
     * Lý do phổ biến nhất để bấm "lưu lại" thay vì tải ngay là game chưa có
     * bản cho máy mình: thấy game hay mà chỉ có bản Java trong khi máy là
     * Android thì lưu lại là việc duy nhất làm được. Ngày bản Android lên
     * kệ mà không ai nói với họ thì danh sách lưu lại chỉ là chỗ để quên.
     *
     * Chỉ báo khi hệ máy là MỚI: người đã lưu chưa tải bao giờ, nên bản 1.2
     * của một hệ họ vốn không dùng chẳng nói gì với họ cả.
     */
    await db.daLuu.create({
      data: { gameId: game.id, nguoiId: nguoi.id },
      select: { id: true },
    });

    const daCo = await db.banTai.findMany({
      where: { gameId: game.id }, distinct: ['heMay'], select: { heMay: true },
    });
    const heMoi = ['MAC', 'WINDOWS', 'IOS', 'ANDROID', 'JAVA']
      .find((h) => !daCo.some((b) => b.heMay === h));

    if (heMoi) {
      const demTruoc = await db.thongBao.count({ where: { nguoiId: nguoi.id } });

      /*
       * Đi qua ĐÚNG lối quản trị vẫn dùng, không gọi thẳng hàm báo tin: chỗ dễ
       * hỏng nhất không phải bản thân hàm ấy mà là chỗ NỐI — phải hỏi "hệ này
       * đã có bản nào chưa" TRƯỚC khi thêm, vì hỏi sau thì bản vừa thêm cũng
       * tính vào và câu trả lời lúc nào cũng là "có rồi".
       */
      admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
      await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
      await admin.selectOption('select[name="heMay"]', heMoi);
      await admin.fill('input[name="soHieu"]', '9.9');
      await admin.click('button:has-text("Thêm bản tải")');

      kiem('game đã lưu có bản cho hệ máy mới thì người lưu được báo',
        await doiToi(async () =>
          (await db.thongBao.count({ where: { nguoiId: nguoi.id } })) === demTruoc + 1));

      const tin = await db.thongBao.findFirst({
        where: { nguoiId: nguoi.id }, orderBy: { taoLuc: 'desc' },
        select: { tieuDe: true, duongDan: true },
      });
      kiem('tin nhắc đúng hệ máy vừa có bản',
        (tin?.tieuDe ?? '').includes(game.ten), tin?.tieuDe ?? '');
      kiem('và dẫn thẳng về trang game ấy',
        tin?.duongDan === `/game/${game.duongDan}`, tin?.duongDan ?? '');

      await db.banTai.deleteMany({ where: { gameId: game.id, soHieu: '9.9' } });
      await db.thongBao.deleteMany({ where: { nguoiId: nguoi.id } });
    }
    await db.daLuu.deleteMany({ where: { nguoiId: nguoi.id } });

    /*
     * ── HAI CÚ BẤM CÙNG LÚC CHỈ RA MỘT HÀNG ──────────────────────────────
     *
     * Mỗi người mỗi game một khoá duy nhất trong lược đồ, nên cú thứ hai vấp
     * khoá ấy chứ không thêm hàng. Gọi thẳng hai lượt song song để đo đúng
     * chỗ ấy — bấm tay thì không bao giờ nhanh bằng.
     */
    await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    await Promise.all([
      p.locator('button[aria-label*="game này"]').first().click(),
      p.locator('button[aria-label*="game này"]').first().click().catch(() => {}),
    ]);
    await p.waitForTimeout(1200);
    const so = await db.daLuu.count({ where: { gameId: game.id, nguoiId: nguoi.id } });
    kiem('bấm dồn dập vẫn chỉ có nhiều nhất một hàng', so <= 1, `đếm được ${so}`);
  } finally {
    if (p) await p.close();
    if (khach) await khach.close();
    if (admin) await admin.close();
    await don();
  }
}
