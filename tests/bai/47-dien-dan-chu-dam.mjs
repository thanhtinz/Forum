import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const DUONG_DAN = 'game-kiem-dien-dan-dam';

/**
 * DIỄN ĐÀN VIẾT ĐƯỢC CHỮ ĐẬM, DANH SÁCH VÀ ẢNH.
 *
 * Trước đợt này bài diễn đàn lưu và in ra dạng chữ trần, trong khi cửa hàng đã
 * có sẵn cả bộ dựng Markdown lẫn cổng nhận ảnh cho diễn đàn — cổng ấy có cửa
 * chặn đếm lượt, có phép soi ruột tệp, có bài kiểm riêng, mà tới giờ chưa nơi
 * nào gọi tới. Diễn đàn của một cửa hàng game cũ sống bằng mấy bài kể cách
 * vượt màn và báo lỗi, mà hai loại bài ấy cần đúng những thứ chữ trần không
 * có: ảnh chụp lúc kẹt, danh sách các bước, khối mã cho dòng cấu hình.
 *
 * Mục kiểm quan trọng nhất là mục CUỐI: bộ dựng bật `html: false`, nên một thẻ
 * `script` gõ tay trong bài phải ra chữ thường, không ra thẻ. Diễn đàn là chỗ
 * người LẠ gửi chữ vào trang của mình — chỗ này mà hở thì hở toàn bộ.
 */
export default async function chay(kiem) {
  const don = async () => { await db.game.deleteMany({ where: { duongDan: DUONG_DAN } }); };
  await don();

  let p;
  try {
    const nguoi = await db.nguoiDung.findFirst({
      where: { tenDangNhap: 'minhdev' }, select: { id: true },
    });
    const game = await db.game.create({
      data: { ten: 'Game kiểm diễn đàn', duongDan: DUONG_DAN, trangThai: 'DANG_HIEN', dangLuc: new Date() },
      select: { id: true },
    });

    /*
     * Bài dựng sẵn bằng Prisma, mang đủ mấy thứ Markdown và một thẻ `script`.
     * Dựng qua trình duyệt thì chậm hơn mà không kiểm được gì thêm ở đây —
     * phần gửi bài đã có bài kiểm riêng.
     */
    const chuDe = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: nguoi.id,
        tieuDe: 'Kẹt ở màn ba, ai giúp với',
        noiDung: 'Mình kẹt ở **màn ba** chỗ cái thùng.\n\n'
          + '- Nhảy lên bục\n- Đẩy thùng sang phải\n\n'
          + 'Máy báo `IllegalStateException` rồi thoát.\n\n'
          + '<script>window.__hong = 1</script>',
        traLoiCuoiLuc: new Date(),
      },
      select: { id: true },
    });
    await db.traLoi.create({
      data: {
        chuDeId: chuDe.id, nguoiId: nguoi.id,
        noiDung: 'Thử **tắt âm** rồi vào lại xem sao.',
      },
    });

    p = await moTrang();
    await p.goto(`${GOC}/game/${DUONG_DAN}/dien-dan/${chuDe.id}`, { waitUntil: 'networkidle' });

    kiem('bài chủ đề dựng từ Markdown',
      (await p.locator('.chu-dam strong', { hasText: 'màn ba' }).count()) > 0);
    kiem('danh sách trong bài ra danh sách thật',
      (await p.locator('.chu-dam li').count()) >= 2);
    kiem('khối mã trong bài ra thẻ mã',
      (await p.locator('.chu-dam code', { hasText: 'IllegalStateException' }).count()) > 0);
    kiem('lời đáp cũng dựng từ Markdown',
      (await p.locator('.chu-dam strong', { hasText: 'tắt âm' }).count()) > 0);

    /* ── Thẻ gõ tay phải ra CHỮ, không ra thẻ ────────────────────────── */
    /*
     * Đếm thẻ `script` NẰM TRONG khối bài, không đếm cả trang.
     *
     * Bản đầu của mục kiểm này đếm mọi thẻ `script` mang chữ `__hong` và báo
     * đỏ — hoá ra Next nhét nguyên liệu dựng trang vào một thẻ `script` của
     * nó, mà nguyên liệu ấy chứa bài viết ở dạng CHUỖI. Chuỗi trong nguyên
     * liệu thì không chạy được; chỗ phải canh là khối bài đã dựng ra.
     */
    const coThe = await p.evaluate(() => document.querySelectorAll('.chu-dam script').length);
    kiem('thẻ script gõ tay trong bài KHÔNG thành thẻ thật', coThe === 0, `đếm được ${coThe}`);
    kiem('và nó hiện ra thành chữ cho người đọc thấy',
      (await p.locator('.chu-dam').first().textContent() ?? '').includes('<script>'));
    const daChay = await p.evaluate(() => window.__hong ?? null);
    kiem('mã trong bài không chạy được', daChay === null, String(daChay));

    /* ── Ô soạn bài có hàng nút, và là hàng nút GỌN ──────────────────── */
    const nguoiDung = await moTrangDaDangNhap('minhdev', 'thanhvien123');
    try {
      await nguoiDung.goto(`${GOC}/game/${DUONG_DAN}/dien-dan/${chuDe.id}`, { waitUntil: 'networkidle' });
      kiem('ô trả lời có nút chữ đậm',
        (await nguoiDung.locator('button[aria-label="Đậm"]').count()) > 0);
      kiem('ô trả lời có nút chèn ảnh',
        (await nguoiDung.locator('button[aria-label="Chèn ảnh"]').count()) > 0);
      /*
       * Hàng nút gọn thì KHÔNG có menu bảng và menu kiểu chữ: ô trả lời cao
       * bốn dòng, mà hàng nút đầy đủ mười bốn nút thì cao gần bằng chính ô chữ.
       */
      kiem('hàng nút ở diễn đàn là hàng nút gọn',
        (await nguoiDung.locator('summary:has-text("Kiểu chữ")').count()) === 0
        && (await nguoiDung.locator('summary:has-text("Chèn bảng")').count()) === 0);

      // Và gửi được một lời đáp có Markdown, từ đầu tới cuối bằng trình duyệt.
      await nguoiDung.fill('textarea[name="noiDung"]', 'Cảm ơn, **đã qua** được rồi.');
      await nguoiDung.click('button:has-text("Gửi trả lời")');
      const daGui = await doiToi(async () =>
        (await db.traLoi.count({ where: { chuDeId: chuDe.id } })) === 2);
      kiem('gửi được lời đáp từ trình soạn thảo', daGui);
      if (daGui) {
        await nguoiDung.reload({ waitUntil: 'networkidle' });
        kiem('lời đáp vừa gửi hiện ra với chữ đậm',
          (await nguoiDung.locator('.chu-dam strong', { hasText: 'đã qua' }).count()) > 0);
      }
    } finally {
      await nguoiDung.close();
    }
  } finally {
    await don();
    if (p) await p.close();
  }
}
