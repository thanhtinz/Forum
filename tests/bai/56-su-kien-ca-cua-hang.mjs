import { GOC, db, moTrang } from '../tro-giup.mjs';

const DUONG_DAN = 'kiemthu-su-kien-chung';
const DAU = 'Kiểm sự kiện chung';

/**
 * KỆ SỰ KIỆN NGOÀI TRANG HÔM NAY.
 *
 * Sự kiện là thứ hết hạn nhanh nhất trên cửa hàng, mà nó chỉ sống trong trang
 * của đúng một game — ai không mở đúng trang ấy trong đúng mấy ngày ấy thì
 * không bao giờ biết. Kệ ngoài trang Hôm nay là chỗ chữa việc đó, và vì nó
 * TRỘN sự kiện của nhiều game nên phải canh mấy chỗ rò rỉ:
 *
 *   • sự kiện của game chưa duyệt / đã gỡ không được lọt ra;
 *   • sự kiện đang tắt không được lọt ra;
 *   • sự kiện đã tàn và sự kiện chưa mở đều không thuộc về kệ này.
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
              moTaNgan: 'Cái này phải hiện trên kệ.',
              batDau: new Date(nay - 2 * ngay), ketThuc: new Date(nay + 3 * ngay),
            },
            {
              loai: 'MUA_MOI', tieuDe: `${DAU} sắp mở`,
              moTaNgan: 'Chưa tới ngày nên chưa thuộc về kệ này.',
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
    await p.goto(GOC, { waitUntil: 'networkidle' });
    const chu = await p.locator('main').textContent();

    kiem('trang Hôm nay có kệ sự kiện đang diễn ra',
      chu.includes(`${DAU} đang chạy`), chu.slice(0, 200));
    kiem('sự kiện chưa tới ngày mở thì KHÔNG lên kệ', !chu.includes(`${DAU} sắp mở`));
    kiem('sự kiện đang tắt thì KHÔNG bày', !chu.includes(`${DAU} đang tắt`));
    kiem('sự kiện đã tàn thì KHÔNG bày', !chu.includes(`${DAU} đã tàn`));
    kiem('sự kiện của game chưa duyệt KHÔNG rò ra cửa hàng',
      !chu.includes(`${DAU} của game chưa duyệt`));

    // Kệ trộn nhiều game nên thẻ phải nói rõ nó của game nào.
    kiem('thẻ trên kệ nói rõ sự kiện của game nào', chu.includes(gameHien.ten));

    kiem('thẻ trỏ đúng trang sự kiện của nó',
      (await p.locator(`a[href^="/game/${DUONG_DAN}/su-kien/"]`).count()) >= 1);

    /* Không có trang "tất cả sự kiện", nên đầu mục kệ này không được hứa hẹn
       một lối đi không tồn tại. */
    kiem('không còn lối nào trỏ tới trang sự kiện riêng',
      (await p.locator('a[href="/su-kien"]').count()) === 0);
  } finally {
    await don();
    await p?.close();
  }
}
