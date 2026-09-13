import { GOC, db, moTrang } from '../tro-giup.mjs';

const DUONG_DAN = 'kiemthu-anh-he-may';

/**
 * ẢNH CHỤP GẮN THEO HỆ MÁY.
 *
 * Cùng một game, bản Java ME là màn 176×208 hai màu còn bản Android là đồ hoạ
 * dựng lại — bày lẫn vào nhau thì người cầm máy Android tưởng mình sắp tải
 * đúng cái màn hình cũ kỹ kia. App Store giải bằng chỗ đổi giữa ảnh iPhone,
 * iPad, Mac; đây là bản tương đương.
 *
 * Hai chỗ dễ hỏng nhất, và bài này canh cả hai: ảnh KHÔNG gắn hệ máy phải hiện
 * ở mọi lựa chọn (không thì game cũ chỉ có một bộ ảnh chung sẽ trống trơn khi
 * bấm lọc), và tấm xem to phải đếm theo danh sách ĐÃ LỌC — đếm hai danh sách
 * bằng một con số thì bấm tấm thứ hai của Android lại mở ra một ảnh Java.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.game.deleteMany({ where: { duongDan: DUONG_DAN } });
  };
  await don();

  const p = await moTrang();
  try {
    const game = await db.game.create({
      data: {
        ten: 'Game kiểm ảnh theo hệ', duongDan: DUONG_DAN,
        trangThai: 'DANG_HIEN', dangLuc: new Date(),
        banTai: {
          create: [
            { heMay: 'JAVA', soHieu: '1.0', moiNhat: true },
            { heMay: 'ANDROID', soHieu: '2.0', moiNhat: true },
          ],
        },
        anhChup: {
          create: [
            { duongDan: '/anh-chia-se.png', chuThich: 'Ảnh Java', heMay: 'JAVA', thuTu: 10 },
            { duongDan: '/anh-chia-se.png', chuThich: 'Ảnh Android', heMay: 'ANDROID', thuTu: 20 },
            { duongDan: '/anh-chia-se.png', chuThich: 'Ảnh dùng chung', thuTu: 30 },
          ],
        },
      },
      select: { id: true },
    });

    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    const ke = p.locator('section[aria-label="Ảnh và phim trong game"] img');
    const chip = p.locator('[aria-label="Chọn hệ máy của ảnh"] button');

    kiem('có dãy chip chọn hệ máy khi ảnh thuộc nhiều hệ',
      (await chip.count()) === 3, `đếm được ${await chip.count()}`);
    kiem('mặc định bày đủ cả ba tấm', (await ke.count()) === 3, `đếm được ${await ke.count()}`);

    await p.locator('[aria-label="Chọn hệ máy của ảnh"] button:has-text("Android")').click();
    await p.waitForTimeout(300);
    const sauLoc = await ke.evaluateAll((els) => els.map((e) => e.getAttribute('alt')));
    kiem('lọc Android thì bỏ ảnh của hệ khác',
      !sauLoc.includes('Ảnh Java'), JSON.stringify(sauLoc));
    kiem('nhưng vẫn giữ ảnh dùng chung',
      sauLoc.includes('Ảnh Android') && sauLoc.includes('Ảnh dùng chung'), JSON.stringify(sauLoc));

    /*
     * Bấm tấm ĐẦU TIÊN sau khi lọc: tấm xem to phải mở đúng ảnh ấy. Trước khi
     * sửa, nó tra vào danh sách gốc nên mở nhầm sang ảnh Java.
     */
    await ke.first().click();
    await p.waitForSelector('dialog[open]', { timeout: 5000 });
    const altTo = await p.locator('dialog[open] img').first().getAttribute('alt');
    kiem('tấm xem to mở đúng ảnh vừa bấm trong danh sách đã lọc',
      altTo === sauLoc[0], `${altTo} ≠ ${sauLoc[0]}`);
    await p.keyboard.press('Escape');

    /* ── Game chỉ có một bộ ảnh chung thì KHÔNG bày chip ─────────────── */
    await db.anhChup.deleteMany({ where: { gameId: game.id, heMay: { not: null } } });
    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    kiem('ảnh không gắn hệ máy thì không bày dãy chip',
      (await p.locator('[aria-label="Chọn hệ máy của ảnh"]').count()) === 0);
    kiem('và tấm ảnh chung vẫn hiện',
      (await p.locator('section[aria-label="Ảnh và phim trong game"] img').count()) === 1);
  } finally {
    await p.close();
    await don();
  }
}
