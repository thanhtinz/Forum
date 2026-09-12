import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const DUONG_DAN = 'game-kiem-soan-thao';

/*
 * TRÌNH SOẠN THẢO MÔ TẢ GAME.
 *
 * Thứ lưu xuống CSDL là Markdown, không phải HTML. Lý do nằm ở mục kiểm quan
 * trọng nhất bài này: bộ dựng bật `html: false`, nên thẻ gõ tay bị escape
 * thành chữ thường. An toàn theo THIẾT KẾ, chứ không phải an toàn nhờ nhớ lọc
 * — mà quên lọc đúng một lần là một lỗ chèn mã.
 */
export default async function chay(kiem) {
  const don = () => db.game.deleteMany({ where: { duongDan: DUONG_DAN } });
  await don();

  let admin;
  try {
    const game = await db.game.create({
      data: {
        ten: 'Game kiểm soạn thảo', duongDan: DUONG_DAN,
        trangThai: 'DANG_HIEN', dangLuc: new Date(),
      },
      select: { id: true },
    });

    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });

    kiem('ô giới thiệu có thanh công cụ',
      (await admin.locator('button[aria-label="Đậm"]').count()) > 0);

    // ── Thanh công cụ bọc đúng đoạn đang chọn ──────────────────────────
    const o = admin.locator('textarea[name="gioiThieu"]');
    await o.fill('Bóng đỏ lăn qua mười hai màn');
    await o.evaluate((e) => e.setSelectionRange(0, 7));
    await admin.click('button[aria-label="Đậm"]');
    kiem('bấm Đậm thì bọc đúng đoạn đang chọn',
      (await o.inputValue()) === '**Bóng đỏ** lăn qua mười hai màn', await o.inputValue());

    /*
     * Bôi đen nhiều dòng rồi bấm "danh sách" thì phải ra NHIỀU gạch đầu dòng,
     * không phải một gạch ở dòng đầu. Đây là chỗ mấy thanh công cụ tự viết
     * hay làm sai nhất, và người soạn phát hiện ra bằng cách gõ lại tay.
     */
    await o.fill('Một\nHai\nBa');
    await o.evaluate((e) => e.setSelectionRange(0, e.value.length));
    await admin.click('button[aria-label="Danh sách"]');
    kiem('bôi đen ba dòng thì ra ba gạch đầu dòng',
      (await o.inputValue()) === '- Một\n- Hai\n- Ba', JSON.stringify(await o.inputValue()));

    // Bấm lần nữa là GỠ ra, không phải chồng thêm một lớp gạch nữa.
    await o.evaluate((e) => e.setSelectionRange(0, e.value.length));
    await admin.click('button[aria-label="Danh sách"]');
    kiem('bấm lần nữa thì gỡ gạch đầu dòng ra',
      (await o.inputValue()) === 'Một\nHai\nBa', JSON.stringify(await o.inputValue()));

    // ── Xem trước dựng bằng đúng bộ dựng của trang game ────────────────
    await o.fill('## Cách chơi\n\nBấm **trái** và *phải*.\n\n- Nhảy bằng phím giữa\n- Ăn vật phẩm');
    await admin.click('button[title="Xem trước"]');
    await admin.waitForTimeout(1200);
    const xem = admin.locator('.chu-dam').first();
    kiem('xem trước dựng ra đầu đề thật',
      (await xem.locator('h2:has-text("Cách chơi")').count()) > 0);
    kiem('xem trước dựng ra chữ đậm thật',
      (await xem.locator('strong:has-text("trái")').count()) > 0);
    kiem('xem trước dựng ra danh sách thật',
      (await xem.locator('li').count()) === 2);

    // Bấm lại là tắt ô xem trước — nay nó là nút BẬT/TẮT, không phải hai nút.
    await admin.click('button[title="Xem trước"]');
    await admin.waitForTimeout(300);

    await chayThem(kiem, admin, o);

    /*
     * ── THẺ HTML GÕ TAY PHẢI THÀNH CHỮ, KHÔNG THÀNH THẺ ───────────────
     *
     * Mục kiểm quan trọng nhất của cả bài. Nếu chỗ này hỏng thì bất kỳ ai sửa
     * được mô tả game cũng chèn được mã chạy trên trình duyệt người xem.
     */
    const doc = '<img src=x onerror=alert(1)> và <script>alert(2)</script>';
    await o.fill(doc);
    // Nhắm ĐÚNG nút của biểu mẫu thông tin game: trang này còn hai biểu mẫu
    // nữa đứng trước (ảnh chụp, bản tải), nên `button[type=submit]` trần bấm
    // nhầm sang biểu mẫu khác — và bài kiểm đỏ ở chỗ chẳng liên quan.
    await admin.click('button:has-text("Lưu thay đổi")');

    const daLuu = await doiToi(async () =>
      (await db.game.findUnique({ where: { id: game.id }, select: { gioiThieu: true } }))
        ?.gioiThieu === doc);
    kiem('lưu xuống CSDL đúng nguyên văn Markdown', daLuu);

    const p = await moTrang();
    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });

    kiem('thẻ <script> KHÔNG lọt vào trang',
      (await p.locator('.chu-dam script').count()) === 0);
    kiem('thẻ <img onerror> KHÔNG lọt vào trang',
      (await p.locator('.chu-dam img').count()) === 0);
    kiem('mà hiện ra thành chữ cho người đọc thấy',
      (await p.locator('text=onerror=alert(1)').count()) > 0);

    // ── Markdown thật thì vẫn dựng thành thẻ thật ──────────────────────
    await db.game.update({
      where: { id: game.id },
      data: { gioiThieu: '## Giới thiệu\n\nMột **quả bóng đỏ**.\n\n- Màn một\n- Màn hai' },
    });
    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    const khoi = p.locator('.chu-dam').first();
    kiem('trang game dựng đầu đề từ Markdown',
      (await khoi.locator('h2:has-text("Giới thiệu")').count()) > 0);
    kiem('trang game dựng chữ đậm từ Markdown',
      (await khoi.locator('strong:has-text("quả bóng đỏ")').count()) > 0);
    kiem('trang game dựng danh sách từ Markdown',
      (await khoi.locator('li').count()) === 2);

    /*
     * Thẻ mô tả của trang phải là chữ TRẦN: in `**đậm**` vào kết quả tìm kiếm
     * của Google thì hai dấu sao ấy hiện nguyên trên đó.
     */
    const moTa = await p.locator('meta[name="description"]').getAttribute('content');
    kiem('thẻ mô tả gỡ hết ký hiệu Markdown',
      !!moTa && !moTa.includes('**') && !moTa.includes('##') && moTa.includes('quả bóng đỏ'),
      moTa ?? '(không có)');

    /*
     * Liên kết ra ngoài phải mang `rel="noopener"`. Thiếu nó thì trang đích
     * với tay được vào `window.opener` và tự đổi địa chỉ trang này sang một
     * trang giả — người dùng quay lại tab cũ là đã ở chỗ khác mà không biết.
     */
    await db.game.update({
      where: { id: game.id },
      data: { gioiThieu: 'Xem thêm ở [trang chủ](https://vi-du-ngoai.test/a).' },
    });
    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    const rel = await p.locator('.chu-dam a').first().getAttribute('rel');
    kiem('liên kết ra ngoài mang rel noopener', (rel ?? '').includes('noopener'), rel ?? '');

    // Địa chỉ `javascript:` thì không được thành liên kết.
    await db.game.update({
      where: { id: game.id },
      data: { gioiThieu: 'Bấm [vào đây](javascript:alert(1)) đi.' },
    });
    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    const dia = await p.locator('.chu-dam a').count() > 0
      ? await p.locator('.chu-dam a').first().getAttribute('href')
      : null;
    kiem('địa chỉ javascript: không thành liên kết',
      dia === null || !dia.toLowerCase().startsWith('javascript:'), dia ?? '(không dựng liên kết)');

    await p.close();
  } finally {
    if (admin) await admin.close();
    await don();
  }
}

/*
 * Mấy nút mới của thanh công cụ. Tách thành hàm riêng vì bài trên đã dài, mà
 * phần này kiểm một thứ khác hẳn: không phải Markdown dựng ra gì, mà là thanh
 * công cụ CHÈN ĐÚNG ký hiệu gì vào ô.
 */
export async function chayThem(kiem, admin, o) {
  // Gạch ngang chữ
  await o.fill('bỏ đi');
  await o.evaluate((e) => e.setSelectionRange(0, e.value.length));
  await admin.click('button[aria-label="Gạch ngang chữ"]');
  kiem('nút gạch ngang bọc ~~', (await o.inputValue()) === '~~bỏ đi~~', await o.inputValue());

  // Bấm lần nữa thì GỠ ra, không chồng thêm lớp nữa.
  await o.evaluate((e) => e.setSelectionRange(2, e.value.length - 2));
  await admin.click('button[aria-label="Gạch ngang chữ"]');
  kiem('bấm lần nữa thì gỡ ~~ ra', (await o.inputValue()) === 'bỏ đi', await o.inputValue());

  // Đầu đề: đổi cấp phải THAY cấp cũ, không cộng dồn thành "## # Tên"
  await o.fill('Tên mục');
  await o.evaluate((e) => e.setSelectionRange(0, 0));
  await admin.click('summary:has-text("Kiểu chữ")');
  await admin.click('button:has-text("Đầu đề lớn")');
  kiem('chọn đầu đề lớn thì thêm một dấu thăng',
    (await o.inputValue()) === '# Tên mục', await o.inputValue());

  await admin.click('summary:has-text("Kiểu chữ")');
  await admin.click('button:has-text("Đầu đề vừa")');
  kiem('đổi cấp đầu đề thì THAY cấp cũ, không cộng dồn',
    (await o.inputValue()) === '## Tên mục', await o.inputValue());

  // Bảng
  await o.fill('');
  await admin.click('summary[aria-label="Chèn bảng"]');
  await admin.click('button[aria-label="Bảng 2 hàng 3 cột"]');
  const bang = await o.inputValue();
  kiem('chèn bảng ra đúng số cột', (bang.match(/\|/g) ?? []).length >= 16, JSON.stringify(bang));
  kiem('bảng có hàng vạch ngăn', bang.includes('| --- | --- | --- |'), JSON.stringify(bang));
}
