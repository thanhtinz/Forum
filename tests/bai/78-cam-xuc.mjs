import { GOC, LOI, db, doiToi, moTrangDaDangNhap, taoAnhPNG, tuDongXacNhan } from '../tro-giup.mjs';
import { NHOM_CAM_XUC, STICKER_MOI_GOI, TAB_CAM_XUC } from '../../src/lib/cam-xuc-const.ts';

const DAU = 'Ktcx';

/**
 * BẢNG CẢM XÚC ba tab — emoji, sticker, ảnh động — cùng ô gửi ảnh.
 *
 * Ba tab là ba nguồn hình khác hẳn nhau, và mỗi nguồn hỏng một kiểu:
 *
 *   • emoji chép sẵn trong mã, chẳng hỏng được, nên chỉ canh nó có mặt;
 *   • sticker do quản trị tải lên — mà `themSticker` là địa chỉ POST công
 *     khai, nên thành viên thường phát lại yêu cầu phải trượt;
 *   • ảnh động đi qua dịch vụ ngoài, và KHOÁ API KHÔNG ĐƯỢC RA TỚI TRÌNH
 *     DUYỆT. Đây là mục nặng nhất bài này: khoá lọt ra thì ai mở xem nguồn
 *     trang cũng lấy được, mà hoá đơn là của cửa hàng.
 *
 * Cộng thêm một chỗ dễ quên: cột `anh` của câu chat đi THẲNG vào thuộc tính
 * `src`, nên nó phải chặn được mấy lược đồ địa chỉ lạ.
 */
export default async function chay(kiem) {
  // ── Phần thuần ─────────────────────────────────────────────────────
  kiem('bảng cảm xúc đúng ba tab', TAB_CAM_XUC.length === 3);
  kiem('ba tab đúng là emoji, sticker, gif',
    TAB_CAM_XUC.map((t) => t.ma).join(',') === 'emoji,sticker,gif');
  kiem('có emoji để bày', NHOM_CAM_XUC.length >= 3
    && NHOM_CAM_XUC.every((n) => n.hinh.length > 0));

  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true, ten: true },
  });
  if (!game) { kiem('có game mẫu', false); return; }

  const thuKy = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  if (!thuKy) { kiem('có thành viên mẫu', false); return; }

  const don = async () => {
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: DAU } }, select: { id: true },
    });
    await db.traLoi.deleteMany({ where: { chuDeId: { in: cu.map((c) => c.id) } } });
    await db.chuDe.deleteMany({ where: { id: { in: cu.map((c) => c.id) } } });
    await db.tinNhanChat.deleteMany({ where: { noiDung: { contains: DAU } } });
    await db.tinNhanChat.deleteMany({ where: { anh: { contains: '/ktcx-' } } });
    await db.goiSticker.deleteMany({ where: { ten: { startsWith: DAU } } });
    await db.caiDat.deleteMany({ where: { khoa: 'anh-dong' } });
  };
  await don();

  let admin, thuong;
  try {
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    thuong = await moTrangDaDangNhap('anhthu', 'thanhvien123');

    /*
     * ── GÓI STICKER: MỞ GÓI, NÉM HÌNH VÀO ────────────────────────────
     */
    await admin.goto(`${GOC}/quan-tri/sticker`, { waitUntil: 'networkidle' });
    await admin.fill('input[name="ten"]', `${DAU} Bộ thử`);
    await admin.click('button:has-text("Mở gói mới")');
    const daMo = await doiToi(async () =>
      (await db.goiSticker.count({ where: { ten: `${DAU} Bộ thử` } })) === 1);
    kiem('quản trị mở được gói sticker', daMo);

    const goi = await db.goiSticker.findFirst({
      where: { ten: `${DAU} Bộ thử` }, select: { id: true },
    });

    await admin.goto(`${GOC}/quan-tri/sticker`, { waitUntil: 'networkidle' });
    await admin.setInputFiles(`input[aria-label="Thêm hình vào gói ${DAU} Bộ thử"]`, {
      name: 'ktcx-hinh.png', mimeType: 'image/png', buffer: taoAnhPNG(80, 80),
    });
    const daThem = await doiToi(async () =>
      (await db.sticker.count({ where: { goiId: goi.id } })) === 1);
    kiem('tải được hình vào gói', daThem);

    const hinh = await db.sticker.findFirst({
      where: { goiId: goi.id }, select: { id: true, anh: true },
    });
    kiem('hình nằm trong ngăn sticker của kho, không lẫn ngăn khác',
      !!hinh && hinh.anh.includes('/sticker/'), hinh?.anh ?? '');

    /*
     * ── CỬA CỦA KHU QUẢN TRỊ ─────────────────────────────────────────
     *
     * Cổng ảnh `sticker` và hàm `themSticker` đều là địa chỉ công khai.
     */
    const maAnh = await thuong.evaluate(async () => {
      const fd = new FormData();
      fd.set('cho', 'sticker');
      fd.set('tep', new File([new Uint8Array(64)], 'a.png', { type: 'image/png' }));
      const r = await fetch('/api/tai-anh', { method: 'POST', body: fd });
      return r.status;
    });
    kiem('thành viên thường không tải được ảnh vào ngăn sticker',
      maAnh === 403, `máy trả ${maAnh}`);

    /*
     * ── BẢNG CẢM XÚC TRONG Ô CHAT ────────────────────────────────────
     */
    const dia = `${GOC}/game/${game.duongDan}/dien-dan`;
    await thuong.goto(dia, { waitUntil: 'networkidle' });
    await thuong.click('button[aria-label="Mở bảng cảm xúc"]');
    const bang = thuong.locator('div[role="dialog"][aria-label="Bảng cảm xúc"]');
    kiem('ô chat có nút mặt cười, bấm ra bảng', (await bang.count()) === 1);
    kiem('bảng bày đủ ba tab',
      (await bang.locator('button:text-is("Emoji")').count()) === 1
      && (await bang.locator('button:text-is("Sticker")').count()) === 1
      && (await bang.locator('button:text-is("GIF")').count()) === 1);

    const mot = NHOM_CAM_XUC[0].hinh[0];
    await bang.locator(`button[aria-label="${mot}"]`).first().click();
    kiem('bấm emoji thì nó vào ô gõ',
      (await thuong.inputValue('input[aria-label="Gõ một câu"]')) === mot);
    kiem('bấm emoji xong bảng VẪN mở, vì người ta hay gõ liền mấy cái',
      (await bang.count()) === 1);

    // ── Tab sticker: bấm là gửi luôn ──────────────────────────────────
    await thuong.fill('input[aria-label="Gõ một câu"]', '');
    await bang.locator('button:text-is("Sticker")').click();
    await thuong.waitForSelector(`div[role="dialog"] img[src="${hinh.anh}"]`, { timeout: 8000 });
    await thuong.locator(`div[role="dialog"] button:has(img[src="${hinh.anh}"])`).click();
    const daGuiSticker = await doiToi(async () =>
      (await db.tinNhanChat.count({ where: { gameId: game.id, anh: hinh.anh } })) === 1);
    kiem('gửi được sticker, và câu không cần chữ nào', daGuiSticker);
    kiem('gửi sticker xong thì bảng đóng lại',
      (await thuong.locator('div[role="dialog"][aria-label="Bảng cảm xúc"]').count()) === 0);

    /*
     * ── CÙNG BẢNG ẤY Ở Ô SOẠN BÀI DIỄN ĐÀN ───────────────────────────
     *
     * Ô soạn bài lưu Markdown, nên sticker phải vào dưới dạng một dòng ảnh
     * Markdown chứ không phải một địa chỉ trần — vào sai thì bài đăng ra hiện
     * một dòng chữ dài thay vì tấm hình.
     */
    await thuong.goto(`${GOC}/game/${game.duongDan}/dien-dan/dang`,
      { waitUntil: 'networkidle' });
    await thuong.click('button[aria-label="Mở bảng cảm xúc"]');
    await thuong.locator(`div[role="dialog"] button[aria-label="${mot}"]`).first().click();
    kiem('ô soạn bài cũng có bảng cảm xúc, bấm emoji là chữ vào ô',
      (await thuong.inputValue('textarea[name="noiDung"]')).includes(mot));

    await thuong.locator('div[role="dialog"] button:text-is("Sticker")').click();
    await thuong.waitForSelector(`div[role="dialog"] img[src="${hinh.anh}"]`, { timeout: 8000 });
    await thuong.locator(`div[role="dialog"] button:has(img[src="${hinh.anh}"])`).click();
    kiem('sticker vào ô soạn bài dưới dạng ảnh Markdown, không phải địa chỉ trần',
      (await thuong.inputValue('textarea[name="noiDung"]')).includes(`![](${hinh.anh})`),
      await thuong.inputValue('textarea[name="noiDung"]'));

    /*
     * ── Ô TRẢ LỜI VÀ Ô SỬA BÀI CŨNG PHẢI CÓ ──────────────────────────
     *
     * Ba chỗ gõ chữ trong một chủ đề — viết bài mới, trả lời, sửa lại — mà chỗ
     * có chỗ không thì người dùng học được rằng "cửa hàng này lúc có lúc
     * không". Ô SỬA là chỗ dễ sót nhất: nó vốn là một ô chữ trần.
     */
    const chuDe = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: thuKy.id,
        tieuDe: `${DAU} chủ đề để sửa`, noiDung: 'Nội dung ban đầu.',
      },
      select: { id: true },
    });
    await thuong.goto(`${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`,
      { waitUntil: 'networkidle' });
    kiem('ô trả lời trong chủ đề có nút mặt cười',
      (await thuong.locator('button[aria-label="Mở bảng cảm xúc"]').count()) >= 1);

    await thuong.click('button:text-is("Sửa bài")');
    kiem('mở ô sửa bài thì có thêm một nút mặt cười nữa',
      (await thuong.locator('button[aria-label="Mở bảng cảm xúc"]').count()) >= 2);
    kiem('và ô sửa cũng có nút chèn ảnh như lúc viết',
      (await thuong.locator('button[aria-label="Chèn ảnh"]').count()) >= 2);

    /*
     * ── TAB GIF CHƯA CẤU HÌNH THÌ NÓI THẲNG ──────────────────────────
     *
     * Không trả lưới rỗng: rỗng trông y như "không tìm thấy gì", và quản trị
     * sẽ đi sửa nhầm chỗ.
     */
    await thuong.goto(dia, { waitUntil: 'networkidle' });
    await thuong.click('button[aria-label="Mở bảng cảm xúc"]');
    await thuong.locator('div[role="dialog"] button:text-is("GIF")').click();
    const chuGif = await thuong.waitForSelector(`div[role="dialog"] ${LOI}`, { timeout: 8000 })
      .then((h) => h.innerText()).catch(() => '');
    kiem('chưa gắn khoá thì tab GIF nói rõ là chưa bật',
      chuGif.includes('chưa gắn khoá'), chuGif);

    // ── Quản trị gắn khoá ở khu cài đặt ───────────────────────────────
    await admin.goto(`${GOC}/quan-tri/cai-dat/anh-dong`, { waitUntil: 'networkidle' });
    await admin.fill('input[name="nhaCungCap"]', 'khong-co-nha-nay');
    await admin.fill('input[name="khoaApi"]', 'KHOA-BI-MAT-KHONG-DUOC-LO');
    await admin.click('button[type="submit"]');
    await admin.waitForSelector(LOI, { timeout: 5000 }).catch(() => {});
    kiem('nhà cung cấp lạ thì bị chối',
      (await db.caiDat.count({ where: { khoa: 'anh-dong' } })) === 0);

    await admin.fill('input[name="nhaCungCap"]', 'tenor');
    await admin.fill('input[name="khoaApi"]', 'KHOA-BI-MAT-KHONG-DUOC-LO');
    await admin.click('button[type="submit"]');
    const daLuu = await doiToi(async () =>
      (await db.caiDat.count({ where: { khoa: 'anh-dong' } })) === 1);
    kiem('quản trị gắn được khoá dịch vụ ảnh động', daLuu);

    const hang = await db.caiDat.findUnique({ where: { khoa: 'anh-dong' } });
    kiem('khoá lưu đúng vào nhóm cấu hình',
      hang?.giaTri?.khoaApi === 'KHOA-BI-MAT-KHONG-DUOC-LO');

    /*
     * ── KHOÁ KHÔNG BAO GIỜ RA TỚI TRÌNH DUYỆT ────────────────────────
     *
     * Quét cả mã trang lẫn mọi tệp kịch bản trang ấy nạp về — khoá lọt vào một
     * gói kịch bản cũng hệt như in thẳng ra trang.
     */
    await admin.goto(`${GOC}/quan-tri/cai-dat/anh-dong`, { waitUntil: 'networkidle' });
    kiem('trang cài đặt không in khoá ra, chỉ nói là "đã có"',
      !(await admin.content()).includes('KHOA-BI-MAT-KHONG-DUOC-LO'));

    const tepJs = [];
    thuong.on('response', (tl) => {
      if (tl.url().endsWith('.js')) tepJs.push(tl);
    });
    await thuong.goto(dia, { waitUntil: 'networkidle' });
    await thuong.click('button[aria-label="Mở bảng cảm xúc"]');
    await thuong.locator('div[role="dialog"] button:text-is("GIF")').click();
    await thuong.waitForTimeout(2500);

    let loMaTrang = (await thuong.content()).includes('KHOA-BI-MAT-KHONG-DUOC-LO');
    for (const tl of tepJs) {
      const than = await tl.text().catch(() => '');
      if (than.includes('KHOA-BI-MAT-KHONG-DUOC-LO')) loMaTrang = true;
    }
    kiem('khoá KHÔNG lọt ra mã trang hay bất kỳ tệp kịch bản nào', !loMaTrang);
    kiem('có quét thật, không phải quét rỗng', tepJs.length > 0, `${tepJs.length} tệp js`);

    /*
     * ── ẢNH TRONG CÂU CHAT PHẢI QUA CỬA ──────────────────────────────
     *
     * Cột `anh` đi thẳng vào thuộc tính `src`. Bắt lấy yêu cầu gửi thật rồi
     * thay địa chỉ bằng một lược đồ khác — lọt thì đó là chỗ nhét mã vào một
     * thẻ bày cho cả phòng xem.
     */
    let donHang = null;
    thuong.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      const than = yc.postData();
      if (!than || !than.includes(hinh.anh)) return;
      donHang = { dia: yc.url(), dau, than };
    });

    await thuong.goto(dia, { waitUntil: 'networkidle' });
    await thuong.click('button[aria-label="Mở bảng cảm xúc"]');
    await thuong.locator('div[role="dialog"] button:text-is("Sticker")').click();
    await thuong.waitForSelector(`div[role="dialog"] img[src="${hinh.anh}"]`, { timeout: 8000 });
    await thuong.locator(`div[role="dialog"] button:has(img[src="${hinh.anh}"])`).click();
    await thuong.waitForTimeout(1500);
    kiem('bắt được yêu cầu gửi sticker để phát lại', !!donHang?.than);

    if (donHang) {
      const truoc = await db.tinNhanChat.count({ where: { gameId: game.id } });
      const ma = await thuong.evaluate(async ({ dia: d, dau, than }) => {
        const r = await fetch(d, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, { ...donHang, than: donHang.than.split(hinh.anh).join('javascript:alert(1)') });
      await thuong.waitForTimeout(1500);
      kiem('địa chỉ ảnh mang lược đồ lạ thì không vào được phòng chat',
        (await db.tinNhanChat.count({
          where: { gameId: game.id, anh: { contains: 'javascript' } },
        })) === 0, `máy trả ${ma}`);
      kiem('và câu ấy không lọt vào phòng dưới dạng nào khác',
        (await db.tinNhanChat.count({ where: { gameId: game.id } })) === truoc);
    }

    // ── Gỡ cả gói thì câu đã gửi vẫn còn hình của nó ───────────────────
    const soCauCoAnh = await db.tinNhanChat.count({ where: { anh: hinh.anh } });
    await admin.goto(`${GOC}/quan-tri/sticker`, { waitUntil: 'networkidle' });
    tuDongXacNhan(admin);
    await admin.click(`button[aria-label="Gỡ gói ${DAU} Bộ thử"]`);
    const daGo = await doiToi(async () =>
      (await db.goiSticker.count({ where: { id: goi.id } })) === 0);
    kiem('gỡ được cả gói, hình trong gói đi theo', daGo
      && (await db.sticker.count({ where: { goiId: goi.id } })) === 0);
    kiem('nhưng câu chat đã gửi vẫn giữ nguyên hình của nó',
      (await db.tinNhanChat.count({ where: { anh: hinh.anh } })) === soCauCoAnh
      && soCauCoAnh > 0);

    kiem(`mỗi gói chặn ở ${STICKER_MOI_GOI} hình`, STICKER_MOI_GOI > 0);
  } finally {
    if (admin) await admin.close();
    if (thuong) await thuong.close();
    await don();
  }
}
