import { GOC, db, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * TẤM TẢI — bấm "Tải về" là mở ra chứ không tải thẳng.
 *
 * Ở cửa hàng game cũ, nhịp dừng lại một cái này cần hơn hẳn một cửa hàng
 * thường: tải nhầm bản JAR về máy Android là mất công tải lại từ đầu trên một
 * đường truyền vốn đã chậm. Nên tấm bày lại tên game, hệ máy, dãy bản, và để
 * người ta tự chọn bản rồi mới bấm.
 *
 * Mục kiểm quan trọng nhất: mở tấm KHÔNG phải là tải. Một tấm hiện ra mà đằng
 * sau lượt tải vẫn chạy thì nó chỉ là một tấm rèm.
 */
export default async function chay(kiem) {
  const p = await moTrang();
  let nguoi; let dauVet = null;
  try {
    const game = await db.game.findFirst({
      where: { trangThai: 'DANG_HIEN', banTai: { some: { tep: { some: {} } } } },
      orderBy: { id: 'asc' },
      select: {
        id: true, ten: true, duongDan: true, nhaPhatTrien: true,
        banTai: { select: { heMay: true, soHieu: true, tep: { select: { id: true, loai: true } } } },
      },
    });
    if (!game) { kiem('có game mẫu để tải', false); return; }

    await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });

    kiem('chưa bấm thì chưa có tấm nào mở',
      (await p.locator('dialog[open]').count()) === 0);

    await p.click('[data-viec="tai-dau"]');
    await p.waitForSelector('dialog[open]', { timeout: 5000 });

    const chu = await p.locator('dialog[open]').textContent();
    kiem('tấm tải bày lại tên game', chu.includes(game.ten), chu.slice(0, 200));
    kiem('tấm tải nói rõ bản nào', /Bản \S+/.test(chu), chu.slice(0, 200));
    kiem('có nút tải của từng bản',
      (await p.locator('dialog[open] a[href^="/tai/"]').count()) > 0);

    /*
     * KHÁCH VÃNG LAI ĐƯỢC NÓI THẲNG CÁI HỌ SẮP MẤT.
     *
     * Vẫn tải được — bắt đăng nhập mới cho tải là thói của mấy trang chia sẻ
     * tệp, không phải của một cửa hàng. Nhưng phải nói rõ game sẽ không vào
     * thư viện, vì đó đúng là thứ người ta chỉ phát hiện ra sau, lúc đi tìm
     * lại game đã tải mà không thấy đâu.
     */
    kiem('khách chưa đăng nhập được nhắc là game không vào thư viện',
      chu.includes('thư viện'), chu.slice(0, 300));

    // ── Mở tấm KHÔNG phải là tải: chưa bấm nút nào thì vẫn đứng ở trang ──
    kiem('mở tấm rồi vẫn đứng ở trang game',
      new URL(p.url()).pathname === `/game/${game.duongDan}`, p.url());

    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
    kiem('bấm Esc thì tấm đóng lại', (await p.locator('dialog[open]').count()) === 0);
    kiem('đóng tấm rồi vẫn đứng nguyên trang game',
      new URL(p.url()).pathname === `/game/${game.duongDan}`, p.url());

    // ── Bấm nút tải của một bản thì mới sang trang tải ───────────────────
    await p.click('[data-viec="tai-dau"]');
    await p.waitForSelector('dialog[open]', { timeout: 5000 });
    await p.locator('dialog[open] a[href^="/tai/"]').first().click();
    await p.waitForURL('**/tai/**', { timeout: 10000 });
    kiem('bấm nút tải của một bản thì sang trang tải', p.url().includes('/tai/'), p.url());

    // ── Người đã đăng nhập thì tấm in tên tài khoản ───────────────────
    nguoi = await moTrangDaDangNhap('minhdev', 'thanhvien123');
    await nguoi.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    await nguoi.click('[data-viec="tai-dau"]');
    await nguoi.waitForSelector('dialog[open]', { timeout: 5000 });
    const chuNguoi = await nguoi.locator('dialog[open]').textContent();
    kiem('tấm in tài khoản của người đang đăng nhập',
      chuNguoi.includes('minhdev') || chuNguoi.includes('tài khoản'), chuNguoi.slice(0, 300));
    kiem('và không còn nhắc chuyện chưa đăng nhập',
      !chuNguoi.includes('chưa đăng nhập'), chuNguoi.slice(0, 300));
    await nguoi.keyboard.press('Escape');

    /*
     * ── ĐÃ TẢI RỒI THÌ NÚT ĐỔI SANG BIỂU TƯỢNG ĐÁM MÂY ────────────────
     *
     * Đúng thứ App Store bày cho ứng dụng đã tải rồi xoá đi: không còn viên
     * thuốc chữ "Get" mà là một đám mây có mũi tên xuống. Nó nói được câu mà
     * chữ "Tải về" không nói nổi — máy này từng có game ấy, đây là lấy LẠI.
     */
    await nguoi.keyboard.press('Escape');
    const ai = await db.nguoiDung.findUnique({
      where: { tenDangNhap: 'minhdev' }, select: { id: true },
    });
    const banDau = game.banTai[0];
    dauVet = await db.luotTai.create({
      data: {
        gameId: game.id, nguoiId: ai.id,
        heMay: banDau.heMay, soHieu: banDau.soHieu,
      },
      select: { id: true },
    });

    await nguoi.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    const nutDaTai = nguoi.locator('[data-viec="tai-dau"][data-da-tai="1"]');
    kiem('game đã tải thì nút đầu trang thành biểu tượng đám mây',
      (await nutDaTai.count()) === 1);
    kiem('và không còn chữ "Tải về" trên nút ấy',
      ((await nutDaTai.textContent()) ?? '').trim() === '');
    kiem('nút ấy vẫn nói được mình là gì cho bộ đọc màn hình',
      ((await nutDaTai.getAttribute('aria-label')) ?? '').includes('Tải lại'));

    await db.luotTai.delete({ where: { id: dauVet.id } });
    dauVet = null;
    await nguoi.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    kiem('chưa tải bao giờ thì vẫn là nút chữ "Tải về"',
      (await nguoi.locator('[data-viec="tai-dau"][data-da-tai="1"]').count()) === 0
      && ((await nguoi.locator('[data-viec="tai-dau"]').first().textContent()) ?? '')
        .includes('Tải về'));
  } finally {
    await p.close();
    if (nguoi) await nguoi.close();
    // Dấu vết dựng tay phải dọn, kẻo thư viện của `minhdev` mọc thêm một game
    // và bài kiểm nào đếm thư viện sẽ đỏ vì chuyện chẳng liên quan.
    if (dauVet) await db.luotTai.delete({ where: { id: dauVet.id } }).catch(() => {});
  }
}
