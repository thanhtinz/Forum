import { GOC, db, moTrang } from '../tro-giup.mjs';

const DUONG_DAN = 'kiemthu-su-kien-chung';
const DAU = 'Kiểm sự kiện chung';

/**
 * TRANG SỰ KIỆN CHUNG và kệ sự kiện ngoài trang Hôm nay.
 *
 * Sự kiện là thứ hết hạn nhanh nhất trên cửa hàng, mà trước đợt này nó chỉ sống
 * trong trang của đúng một game — ai không mở đúng trang ấy trong đúng mấy ngày
 * ấy thì không bao giờ biết. Bài này canh ba chuyện dễ sai nhất khi trộn sự
 * kiện của nhiều game vào một chỗ:
 *
 *   • sự kiện của game ĐÃ GỠ không được rò ra;
 *   • sự kiện đang TẮT không được rò ra;
 *   • đang diễn ra và sắp tới phải nằm đúng nhóm, không lẫn.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.game.deleteMany({ where: { duongDan: { startsWith: DUONG_DAN } } });
  };
  await don();

  let p;
  try {
    const nay = Date.now();
    const ngay = 86400000;

    const gameHien = await db.game.create({
      data: {
        ten: `${DAU} game đang bày`, duongDan: DUONG_DAN, trangThai: 'DANG_HIEN',
        dangLuc: new Date(),
        suKien: {
          create: [
            {
              loai: 'THI_DAU', tieuDe: `${DAU} đang chạy`,
              moTaNgan: 'Cái này phải hiện ở nhóm đang diễn ra.',
              batDau: new Date(nay - 2 * ngay), ketThuc: new Date(nay + 3 * ngay),
            },
            {
              loai: 'MUA_MOI', tieuDe: `${DAU} sắp mở`,
              moTaNgan: 'Cái này phải hiện ở nhóm sắp tới.',
              batDau: new Date(nay + 5 * ngay), ketThuc: new Date(nay + 20 * ngay),
            },
            {
              loai: 'RA_MAT', tieuDe: `${DAU} đang tắt`,
              moTaNgan: 'Cái này không được hiện ở đâu cả.',
              hien: false,
              batDau: new Date(nay - ngay), ketThuc: new Date(nay + 3 * ngay),
            },
            {
              loai: 'DAC_BIET', tieuDe: `${DAU} đã tàn`,
              moTaNgan: 'Cái này cũng không được hiện.',
              batDau: new Date(nay - 9 * ngay), ketThuc: new Date(nay - ngay),
            },
          ],
        },
      },
      select: { id: true, ten: true },
    });

    // Game ĐANG CHỜ DUYỆT: sự kiện của nó không được lọt ra cửa hàng.
    await db.game.create({
      data: {
        ten: `${DAU} game chưa duyệt`, duongDan: `${DUONG_DAN}-an`, trangThai: 'CHO_DUYET',
        suKien: {
          create: [{
            loai: 'THI_DAU', tieuDe: `${DAU} của game chưa duyệt`,
            moTaNgan: 'Không được rò ra cửa hàng.',
            batDau: new Date(nay - ngay), ketThuc: new Date(nay + 3 * ngay),
          }],
        },
      },
      select: { id: true },
    });

    p = await moTrang();
    await p.goto(`${GOC}/su-kien`, { waitUntil: 'networkidle' });
    const chu = await p.locator('main').textContent();

    kiem('trang sự kiện bày sự kiện đang chạy', chu.includes(`${DAU} đang chạy`));
    kiem('trang sự kiện bày sự kiện sắp mở', chu.includes(`${DAU} sắp mở`));
    kiem('sự kiện đang tắt thì KHÔNG bày', !chu.includes(`${DAU} đang tắt`));
    kiem('sự kiện đã tàn thì KHÔNG bày', !chu.includes(`${DAU} đã tàn`));
    kiem('sự kiện của game chưa duyệt KHÔNG rò ra cửa hàng',
      !chu.includes(`${DAU} của game chưa duyệt`), chu.slice(0, 200));

    /*
     * Đúng NHÓM, không chỉ đúng trang: hai nhóm trả lời hai câu khác nhau —
     * "vào chơi được ngay" với "nhớ mà quay lại" — nên xếp nhầm nhóm còn tệ
     * hơn không xếp.
     */
    const nhomDang = p.locator('h2:text-is("Đang diễn ra")').locator('xpath=following-sibling::ul[1]');
    const nhomSap = p.locator('h2:text-is("Sắp tới")').locator('xpath=following-sibling::ul[1]');
    kiem('sự kiện đang chạy nằm trong nhóm "Đang diễn ra"',
      (await nhomDang.getByText(`${DAU} đang chạy`).count()) > 0);
    kiem('sự kiện sắp mở nằm trong nhóm "Sắp tới"',
      (await nhomSap.getByText(`${DAU} sắp mở`).count()) > 0);
    kiem('nhóm "Đang diễn ra" không lẫn sự kiện chưa mở',
      (await nhomDang.getByText(`${DAU} sắp mở`).count()) === 0);

    // Thẻ ở đây phải nói rõ sự kiện thuộc game nào — khác thẻ trong trang game.
    kiem('thẻ nói rõ sự kiện của game nào', chu.includes(gameHien.ten));

    const dich = p.locator(`a[href="/game/${DUONG_DAN}/su-kien/"]`);
    kiem('mỗi thẻ trỏ đúng trang sự kiện của nó',
      (await p.locator(`a[href^="/game/${DUONG_DAN}/su-kien/"]`).count()) >= 2,
      `${await dich.count()}`);

    // ── Kệ ngoài trang Hôm nay ────────────────────────────────────────
    await p.goto(GOC, { waitUntil: 'networkidle' });
    const chuChu = await p.locator('main').textContent();
    kiem('trang Hôm nay có kệ sự kiện đang diễn ra',
      chuChu.includes(`${DAU} đang chạy`), chuChu.slice(0, 200));
    kiem('kệ ngoài trang Hôm nay không bày sự kiện chưa mở',
      !chuChu.includes(`${DAU} sắp mở`));
    kiem('kệ có lối sang trang sự kiện',
      (await p.locator('a[href="/su-kien"]').count()) > 0);
  } finally {
    await don();
    await p?.close();
  }
}
