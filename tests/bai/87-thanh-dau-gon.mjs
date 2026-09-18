import { GOC, db, moTrang } from '../tro-giup.mjs';

const CHON = '[data-viec="dau-gon"]';

/**
 * THANH ĐẦU THU GỌN của trang game.
 *
 * Cuộn xuống đủ sâu thì biểu tượng, tên game và nút tải thu lại thành một hàng
 * mỏng dính trên đỉnh — đúng lối App Store. Trang game ở đây rất dài, nên
 * người đọc tới mục đánh giá rồi quyết định tải mà không có thanh này thì phải
 * cuộn ngược lên tận đầu trang mới thấy cái nút.
 *
 * Mục canh nặng nhất là CHỖ DÍNH. `position: sticky` chỉ dính trong phạm vi
 * thẻ cha, và bản đầu tôi đặt nhầm nó vào một khối kết thúc ngay sau phần đầu
 * — nên nó trôi đi mất cùng phần đầu, đo ra `top: -994px`. Nhìn ảnh chụp chỉ
 * thấy "thanh không hiện", không thấy vì sao. Nên bài này ĐO toạ độ chứ không
 * chỉ hỏi thanh có mặt hay không.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { ten: true, duongDan: true },
  });
  if (!game) { kiem('có game mẫu', false); return; }

  let p;
  try {
    p = await moTrang();
    const doc = () => p.evaluate((c) => {
      const el = document.querySelector(c);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), cao: Math.round(r.height), mo: getComputedStyle(el).opacity };
    }, CHON);

    for (const [khoKhung, co] of [['điện thoại', { width: 430, height: 932 }],
                                  ['máy bàn', { width: 1280, height: 900 }]]) {
      await p.setViewportSize(co);
      await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });

      const dau = await doc();
      kiem(`${khoKhung}: thanh gọn có trong trang`, dau !== null);
      kiem(`${khoKhung}: chưa cuộn thì nó ẩn hẳn`,
        dau && dau.mo === '0' && dau.cao <= 2, JSON.stringify(dau));

      await p.evaluate(() => window.scrollTo(0, 1400));
      await p.waitForTimeout(800);

      const sau = await doc();
      kiem(`${khoKhung}: cuộn xuống thì nó hiện ra`, sau && sau.mo === '1', JSON.stringify(sau));

      /*
       * DÍNH NGAY DƯỚI THANH TRÊN, không chồng lên nó và không hở khe.
       *
       * Con số 63 là chiều cao thanh trên, khai ở `--cao-thanh-tren`. Đo lại ở
       * đây chứ không chép con số: lệch nhau là có một khe hở để nội dung trôi
       * qua, hoặc thanh này chui xuống dưới thanh kia.
       */
      const caoThanhTren = await p.evaluate(() => {
        const el = document.querySelector('header.kinh-tren');
        return el ? Math.round(el.getBoundingClientRect().height) : -1;
      });
      kiem(`${khoKhung}: dính đúng ngay dưới thanh trên`,
        sau && Math.abs(sau.top - caoThanhTren) <= 1,
        `thanh gọn ở ${sau?.top}, thanh trên cao ${caoThanhTren}`);

      kiem(`${khoKhung}: nó mang tên game`,
        (await p.locator(`${CHON}`).innerText()).includes(game.ten));
      kiem(`${khoKhung}: và có nút tải trỏ đúng chỗ`,
        (await p.locator(`${CHON} a[href="/game/${game.duongDan}#tai"]`).count()) === 1);

      // Cuộn ngược lên thì nó phải thu lại — một thanh hiện ra rồi không chịu
      // biến đi là ăn mất một dải màn hình ở đúng chỗ chật nhất.
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(800);
      const ve = await doc();
      kiem(`${khoKhung}: cuộn ngược lên đầu thì nó ẩn lại`,
        ve && ve.mo === '0', JSON.stringify(ve));
    }
  } finally {
    if (p) await p.close();
  }
}
