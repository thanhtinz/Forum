import { GOC, db, moTrang } from '../tro-giup.mjs';

/**
 * MỘT GAME MANG NHIỀU HỆ MÁY CÙNG LÚC.
 *
 * Đây là ca dễ vỡ nhất của khung tải: mỗi hệ một dãy số hiệu riêng, một danh
 * sách loại tệp riêng, và riêng iOS thì đi lối khác hẳn. Bài kiểm bấm qua TỪNG
 * hệ rồi soi xem nút dựng ra có đúng loại tệp của hệ ấy không.
 */
export default async function chay(kiem) {
  // Tìm game nhiều hệ nhất trong cửa hàng, không chép cứng tên: đổi dữ liệu mẫu thì
  // bài kiểm vẫn tự tìm được ca đáng kiểm.
  const game = await db.game.findMany({
    where: { trangThai: 'DANG_HIEN' },
    select: { duongDan: true, ten: true, banTai: { select: { heMay: true } } },
  }).then((ds) => ds
    .map((g) => ({ ...g, he: [...new Set(g.banTai.map((b) => b.heMay))] }))
    .sort((a, b) => b.he.length - a.he.length)[0]);

  if (!game || game.he.length < 3) {
    kiem('có game mang nhiều hệ máy để kiểm', false, `nhiều nhất là ${game?.he.length ?? 0} hệ`);
    return;
  }
  kiem('kho có game mang từ ba hệ máy trở lên', true, `${game.ten}: ${game.he.join(', ')}`);

  const p = await moTrang();
  await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });

  const NHAN = { JAVA: 'Java ME', ANDROID: 'Android', IOS: 'iOS', WINDOWS: 'Windows', MAC: 'macOS' };
  const LOAI = {
    JAVA: ['JAR', 'JAD'], ANDROID: ['APK', 'ZIP'], IOS: ['IPA'],
    WINDOWS: ['EXE', 'ZIP'], MAC: ['DMG', 'PKG', 'ZIP'],
  };

  for (const he of game.he) {
    const nut = p.locator(`#tai button:has-text("${NHAN[he]}")`);
    kiem(`có nút chọn hệ ${NHAN[he]}`, (await nut.count()) > 0);
  }

  for (const he of game.he) {
    await p.locator(`#tai button:has-text("${NHAN[he]}")`).click();
    await p.waitForTimeout(400);

    const chu = await p.locator('#tai').textContent();

    if (he === 'IOS') {
      // iOS tải tệp IPA như mọi hệ khác — qua trang tải, cùng lối với hệ khác.
      const soNutTai = await p.locator('#tai a[href^="/tai/"]').count();
      kiem('iOS có nút tải tệp IPA', soNutTai > 0 && chu.includes('Tải IPA'), `đếm được ${soNutTai}`);
      /*
       * Và nói rõ cần công cụ gì mới cài được — giấu đi không làm tệp cài được.
       *
       * Câu nhắc ấy nay nằm ở TAB THÔNG TIN, không còn trong khung tải: trên
       * điện thoại khung tải nằm trên cả hàng tab, nên mỗi khối gấp trong ấy
       * đẩy ảnh chụp với mô tả xuống thêm một nhịp cuộn. Nên đọc chữ của cả
       * trang, đừng đọc riêng khung tải.
       */
      const chuTrang = await p.locator('body').textContent();
      kiem('iOS nhắc rõ cần công cụ ký để cài',
        chuTrang.includes('AltStore') || chuTrang.includes('Sideloadly'),
        chuTrang.slice(0, 200));
    }
    const dungLoai = LOAI[he].some((l) => chu.includes(`Tải ${l}`));
    kiem(`hệ ${NHAN[he]} dựng nút tải đúng loại tệp`, dungLoai,
      LOAI[he].join('/') + ' — đang là: ' + (chu.match(/Tải \w+/g) ?? []).join(', '));

    // Không được lẫn tệp của hệ khác sang: JAR nằm trong khung Windows là dấu
    // hiệu khung tải đang dựng theo cả game thay vì theo hệ đang chọn.
    // (iOS cũng đi qua đúng hai phép kiểm này, không có ngoại lệ nào nữa.)
    const lanSang = Object.entries(LOAI)
      .filter(([k]) => k !== he)
      .flatMap(([, v]) => v)
      .filter((l) => !LOAI[he].includes(l))
      .some((l) => chu.includes(`Tải ${l}`));
    kiem(`hệ ${NHAN[he]} không lẫn tệp của hệ khác`, !lanSang);
  }

  // Dãy chip phải liệt kê ĐỦ số hệ máy game có — đây mới là chỗ nói về hệ máy,
  // sau khi ô "Hệ máy" ở hàng số liệu đã bỏ vì lặp lại đúng thông tin này.
  const soChip = await p.locator('#tai [role="group"] button').count();
  kiem('dãy chip liệt kê đủ mọi hệ máy của game',
    soChip === game.he.length, `đếm được ${soChip}, chờ ${game.he.length}`);

  await p.close();
}
