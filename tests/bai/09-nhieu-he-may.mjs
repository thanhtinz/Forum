import { GOC, db, moTrang } from '../tro-giup.mjs';

/**
 * MỘT GAME MANG NHIỀU HỆ MÁY CÙNG LÚC.
 *
 * Đây là ca dễ vỡ nhất của khung tải: mỗi hệ một dãy số hiệu riêng, một danh
 * sách loại tệp riêng, và riêng iOS thì đi lối khác hẳn. Bài kiểm bấm qua TỪNG
 * hệ rồi soi xem nút dựng ra có đúng loại tệp của hệ ấy không.
 */
export default async function chay(kiem) {
  // Tìm game nhiều hệ nhất trong kho, không chép cứng tên: đổi dữ liệu mẫu thì
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
  const LOAI = { JAVA: ['JAR', 'JAD'], ANDROID: ['APK', 'ZIP'], WINDOWS: ['EXE', 'ZIP'], MAC: ['DMG', 'PKG', 'ZIP'] };

  for (const he of game.he) {
    const nut = p.locator(`#tai button:has-text("${NHAN[he]}")`);
    kiem(`có nút chọn hệ ${NHAN[he]}`, (await nut.count()) > 0);
  }

  for (const he of game.he) {
    await p.locator(`#tai button:has-text("${NHAN[he]}")`).click();
    await p.waitForTimeout(400);

    if (he === 'IOS') {
      /*
       * iOS KHÔNG được có nút tải tệp.
       * iPhone chưa bẻ khoá không cài nổi IPA lấy từ web, nên dựng nút tải ở
       * đây là hứa với người dùng một thứ họ chắc chắn không dùng được.
       */
      const soNutTai = await p.locator('#tai a[href^="/api/tai/"]').count();
      kiem('iOS không dựng nút tải tệp', soNutTai === 0, `đếm được ${soNutTai}`);
      kiem('iOS dẫn sang App Store',
        (await p.locator('#tai a:has-text("App Store")').count()) > 0);
      kiem('iOS nói rõ vì sao không tải thẳng được',
        (await p.locator('#tai').textContent()).includes('bẻ khoá'));
      continue;
    }

    const chu = await p.locator('#tai').textContent();
    const dungLoai = LOAI[he].some((l) => chu.includes(`Tải ${l}`));
    kiem(`hệ ${NHAN[he]} dựng nút tải đúng loại tệp`, dungLoai,
      LOAI[he].join('/') + ' — đang là: ' + (chu.match(/Tải \w+/g) ?? []).join(', '));

    // Không được lẫn tệp của hệ khác sang: JAR nằm trong khung Windows là dấu
    // hiệu khung tải đang dựng theo cả game thay vì theo hệ đang chọn.
    const lanSang = Object.entries(LOAI)
      .filter(([k]) => k !== he)
      .flatMap(([, v]) => v)
      .filter((l) => !LOAI[he].includes(l))
      .some((l) => chu.includes(`Tải ${l}`));
    kiem(`hệ ${NHAN[he]} không lẫn tệp của hệ khác`, !lanSang);
  }

  // Huy hiệu hệ máy ở hàng số liệu phải đếm đủ, không nói dối là chỉ có một hệ.
  const soLieu = await p.locator('dl').first().textContent();
  kiem('hàng số liệu nói đúng số hệ máy còn lại',
    soLieu.includes(`${game.he.length - 1} hệ nữa`), soLieu);

  await p.close();
}
