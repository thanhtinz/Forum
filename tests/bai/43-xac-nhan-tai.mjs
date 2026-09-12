import { GOC, db, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * TẤM XÁC NHẬN TRƯỚC KHI TẢI.
 *
 * App Store không cài thẳng khi bấm "Get" — nó bày lại tên game, tên hãng và
 * tài khoản đang dùng rồi mới xin một cú xác nhận nữa. Ở cửa hàng game cũ thì
 * nhịp ấy còn cần hơn: tải nhầm bản JAR về máy Android là mất công tải lại từ
 * đầu trên một đường truyền vốn đã chậm.
 *
 * Mục kiểm quan trọng nhất nằm ở cuối bài: bấm nút mà CHƯA xác nhận thì không
 * được rời trang. Một tấm xác nhận hiện ra nhưng đằng sau lượt tải vẫn chạy
 * thì nó chỉ là một tấm rèm.
 */
export default async function chay(kiem) {
  const p = await moTrang();
  let nguoi;
  try {
    const game = await db.game.findFirst({
      where: { trangThai: 'DANG_HIEN', banTai: { some: { tep: { some: {} } } } },
      orderBy: { id: 'asc' },
      select: {
        ten: true, duongDan: true, nhaPhatTrien: true,
        banTai: { select: { heMay: true, soHieu: true, tep: { select: { id: true, loai: true } } } },
      },
    });
    if (!game) { kiem('có game mẫu để tải', false); return; }

    await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });

    kiem('chưa bấm thì chưa có tấm nào mở',
      (await p.locator('dialog[open]').count()) === 0);

    await p.click('#tai a.nut-cai-dam');
    await p.waitForSelector('dialog[open]', { timeout: 5000 });

    const chu = await p.locator('dialog[open]').textContent();
    kiem('tấm xác nhận mang tên cửa hàng', chu.includes('SunnyStore'));
    kiem('tấm xác nhận bày lại tên game', chu.includes(game.ten), chu.slice(0, 200));
    kiem('tấm xác nhận nói rõ hệ máy và số hiệu bản',
      /bản \S+/.test(chu) && /Java ME|Android|iOS|Windows|macOS/.test(chu), chu.slice(0, 200));
    kiem('có nút xác nhận', (await p.locator('dialog[open] button:has-text("Xác nhận tải")').count()) > 0);

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

    // ── Bấm nút mà chưa xác nhận thì KHÔNG được rời trang ──────────────
    kiem('chưa xác nhận thì vẫn đứng ở trang game',
      new URL(p.url()).pathname === `/game/${game.duongDan}`, p.url());

    // Đóng lại cũng vậy: đóng tấm không phải là tải.
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
    kiem('bấm Esc thì tấm đóng lại', (await p.locator('dialog[open]').count()) === 0);
    kiem('đóng tấm rồi vẫn đứng nguyên trang game',
      new URL(p.url()).pathname === `/game/${game.duongDan}`, p.url());

    // ── Xác nhận thì mới sang trang tải ───────────────────────────────
    await p.click('#tai a.nut-cai-dam');
    await p.waitForSelector('dialog[open]', { timeout: 5000 });
    await p.click('dialog[open] button:has-text("Xác nhận tải")');
    await p.waitForURL('**/tai/**', { timeout: 10000 });
    kiem('xác nhận rồi thì sang trang tải', p.url().includes('/tai/'), p.url());

    // ── Người đã đăng nhập thì tấm in tên tài khoản ───────────────────
    nguoi = await moTrangDaDangNhap('minhdev', 'thanhvien123');
    await nguoi.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    await nguoi.click('#tai a.nut-cai-dam');
    await nguoi.waitForSelector('dialog[open]', { timeout: 5000 });
    const chuNguoi = await nguoi.locator('dialog[open]').textContent();
    kiem('tấm in tài khoản của người đang đăng nhập',
      chuNguoi.includes('Tài khoản'), chuNguoi.slice(0, 300));
    kiem('và không còn nhắc chuyện chưa đăng nhập',
      !chuNguoi.includes('Chưa đăng nhập'), chuNguoi.slice(0, 300));
  } finally {
    await p.close();
    if (nguoi) await nguoi.close();
  }
}
