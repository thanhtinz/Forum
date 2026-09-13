import fs from 'node:fs';
import { join } from 'node:path';
import { GOC, LOI, db, doiToi, moTrang, moTrangDaDangNhap, taoAnhPNG } from '../tro-giup.mjs';
import { DAI_DIEN_TOI_THIEU } from '../../src/lib/luat-anh-const.ts';

const TEN = 'kiemthu-dd';
const EMAIL = 'kiemthu-dd@sunnystore.local';
const MAT_KHAU = 'thanhvien123';

/*
 * Chỗ tệp rơi xuống khi cửa hàng chưa cấu hình kho R2 — xem `kho.ts`. Bài kiểm
 * chạy trên máy dựng nên luôn đi lối này; nhờ vậy soi được tận tệp trên đĩa,
 * thứ không soi được nếu ảnh bay thẳng lên một thùng ngoài mạng.
 */
const TREN_DIA = join(process.cwd(), 'tai-len');

/**
 * Ảnh đại diện: TẢI LÊN, không dán địa chỉ.
 *
 * Trước đợt này đây là ô gõ tay một đường dẫn `https://…`, chỗ cuối cùng trong
 * cửa hàng còn bắt người dùng tự đi tìm nơi đặt ảnh. Hai cái hại của lối cũ
 * đều thuộc loại không ai thấy ngay: ảnh nằm ở máy chủ người khác thì hôm nào
 * họ xoá là mặt người dùng thủng một lỗ trên mọi bài viết cũ, và mỗi lượt vẽ
 * một bài lại gửi địa chỉ IP của người đọc sang một máy chủ lạ.
 *
 * Mục đáng canh nhất ở đây là DỌN TẤM CŨ, và canh cả hai chiều: đổi ảnh thì
 * tấm cũ phải đi, nhưng một địa chỉ NGƯỜI DÙNG TỰ DÁN từ thời trước thì tuyệt
 * đối không được đụng vào — nó có thể đang trỏ vào biểu tượng của một game.
 */
export default async function chay(kiem) {
  const don = async () => { await db.nguoiDung.deleteMany({ where: { email: EMAIL } }); };
  await don();

  let p, khach;
  try {
    const mau = await db.nguoiDung.findFirst({
      where: { tenDangNhap: 'anhthu' }, select: { matKhauBam: true },
    });
    if (!mau) { kiem('có dữ liệu mẫu', false); return; }

    const toi = await db.nguoiDung.create({
      data: {
        email: EMAIL, tenDangNhap: TEN, tenHienThi: 'Người Đổi Ảnh',
        matKhauBam: mau.matKhauBam,
      },
      select: { id: true },
    });

    p = await moTrangDaDangNhap(EMAIL, MAT_KHAU);
    await p.goto(`${GOC}/toi/cai-dat`, { waitUntil: 'networkidle' });

    kiem('trang cài đặt có ô chọn tệp ảnh đại diện',
      (await p.locator('input[type="file"][accept*="image"]').count()) >= 1);
    kiem('KHÔNG còn ô gõ tay địa chỉ ảnh',
      (await p.locator('input[name="anh"]:not([type="hidden"])').count()) === 0);

    // ── Ảnh bé quá thì chối, và chối trước khi cất ────────────────────
    await p.setInputFiles('input[type="file"][accept*="image"]', {
      name: 'be.png', mimeType: 'image/png',
      buffer: taoAnhPNG(DAI_DIEN_TOI_THIEU - 40, DAI_DIEN_TOI_THIEU - 40),
    });
    await p.waitForSelector(`${LOI}:has-text("nhỏ quá")`, { timeout: 15_000 }).catch(() => {});
    kiem('ảnh nhỏ hơn sàn thì bị chối',
      (await p.locator(`${LOI}:has-text("nhỏ quá")`).count()) > 0);

    // ── Ảnh đủ cỡ thì lên, và địa chỉ trả về là ĐỊA CHỈ TRONG NHÀ ─────
    await p.setInputFiles('input[type="file"][accept*="image"]', {
      name: 'vua.png', mimeType: 'image/png',
      buffer: taoAnhPNG(DAI_DIEN_TOI_THIEU + 8, DAI_DIEN_TOI_THIEU + 8),
    });
    const daNap = await doiToi(async () =>
      !!(await p.inputValue('input[name="anh"]')));
    kiem('ảnh đủ cỡ thì tải lên được', daNap);

    const dia1 = await p.inputValue('input[name="anh"]');
    kiem('ảnh nằm trong kho của cửa hàng, không phải máy chủ lạ',
      dia1.includes('/dai-dien/'), dia1);

    await p.click('button:has-text("Lưu hồ sơ")');
    const daLuu = await doiToi(async () =>
      (await db.nguoiDung.findUnique({ where: { id: toi.id }, select: { anh: true } }))?.anh === dia1);
    kiem('lưu hồ sơ thì địa chỉ ảnh vào cơ sở dữ liệu', daLuu, dia1);

    const tep1 = join(TREN_DIA, dia1.slice(dia1.indexOf('/dai-dien/') + 1));
    kiem('tệp ảnh nằm thật trong kho', fs.existsSync(tep1), tep1);

    // ── Đổi ảnh thì tấm cũ phải đi ────────────────────────────────────
    await p.goto(`${GOC}/toi/cai-dat`, { waitUntil: 'networkidle' });
    await p.setInputFiles('input[type="file"][accept*="image"]', {
      name: 'moi.png', mimeType: 'image/png',
      buffer: taoAnhPNG(DAI_DIEN_TOI_THIEU + 24, DAI_DIEN_TOI_THIEU + 24),
    });
    await doiToi(async () => (await p.inputValue('input[name="anh"]')) !== dia1);
    const dia2 = await p.inputValue('input[name="anh"]');
    await p.click('button:has-text("Lưu hồ sơ")');
    await doiToi(async () =>
      (await db.nguoiDung.findUnique({ where: { id: toi.id }, select: { anh: true } }))?.anh === dia2);

    const daDon = await doiToi(async () => !fs.existsSync(tep1));
    kiem('đổi ảnh thì tấm cũ được dọn khỏi kho', daDon);
    kiem('tấm mới thì vẫn còn',
      fs.existsSync(join(TREN_DIA, dia2.slice(dia2.indexOf('/dai-dien/') + 1))));

    /*
     * ── ĐỊA CHỈ NGƯỜI DÙNG TỰ DÁN TỪ THỜI TRƯỚC THÌ KHÔNG ĐỤNG ────────
     *
     * Mấy hàng cũ trong cơ sở dữ liệu có thể chứa bất cứ đường dẫn nào người
     * dùng từng gõ vào — kể cả địa chỉ biểu tượng của một game trong chính kho
     * này. Dọn bừa theo tiền tố kho thì một người đổi ảnh là gỡ mất biểu tượng
     * của game ấy, mà chẳng ai lần ra được vì sao.
     */
    const anhGame = await db.game.findFirst({
      orderBy: { id: 'asc' }, where: { icon: { not: null } }, select: { id: true, icon: true },
    });
    if (anhGame?.icon) {
      await db.nguoiDung.update({ where: { id: toi.id }, data: { anh: anhGame.icon } });
      await p.goto(`${GOC}/toi/cai-dat`, { waitUntil: 'networkidle' });
      await p.setInputFiles('input[type="file"][accept*="image"]', {
        name: 'thay.png', mimeType: 'image/png',
        buffer: taoAnhPNG(DAI_DIEN_TOI_THIEU + 32, DAI_DIEN_TOI_THIEU + 32),
      });
      await doiToi(async () => (await p.inputValue('input[name="anh"]')).includes('/dai-dien/'));
      await p.click('button:has-text("Lưu hồ sơ")');
      await doiToi(async () =>
        ((await db.nguoiDung.findUnique({ where: { id: toi.id }, select: { anh: true } }))?.anh ?? '')
          .includes('/dai-dien/'));

      const conIcon = await db.game.findUnique({
        where: { id: anhGame.id }, select: { icon: true },
      });
      kiem('biểu tượng game KHÔNG bị dọn theo khi người dùng đổi ảnh',
        conIcon?.icon === anhGame.icon);
    }

    // ── Khách thì không tải ảnh lên được ──────────────────────────────
    khach = await moTrang();
    await khach.goto(`${GOC}/`, { waitUntil: 'networkidle' });
    const ma = await khach.evaluate(async () => {
      const fd = new FormData();
      fd.set('cho', 'dai-dien');
      fd.set('tep', new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' }));
      const r = await fetch('/api/tai-anh', { method: 'POST', body: fd });
      return r.status;
    });
    kiem('khách chưa đăng nhập thì không tải ảnh đại diện lên được', ma === 401, String(ma));
  } finally {
    if (p) await p.close();
    if (khach) await khach.close();
    await don();
  }
}
