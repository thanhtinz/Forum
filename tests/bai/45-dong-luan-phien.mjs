import { GOC, db, moTrang } from '../tro-giup.mjs';

const DUONG_DAN = 'game-kiem-luan-phien';

/**
 * DÒNG LUÂN PHIÊN dưới tên game.
 *
 * Một dòng, mấy giây đổi nội dung: tên hãng, rồi từng thể loại. Thứ dễ hỏng ở
 * đây không phải phép xoay — nó chạy hay không thì nhìn là thấy — mà là hai
 * chuyện lặng lẽ hơn:
 *
 *   • MỌI MỤC phải nằm trong DOM cùng lúc, kẻo máy tìm và bộ đọc màn hình chỉ
 *     thấy đúng mục đang hiện.
 *   • BẤM VÀO PHẢI ĐI ĐÚNG CHỖ. Nếu xoay không dừng lúc trỏ chuột chạm vào thì
 *     chữ đổi ngay dưới ngón tay đang hạ xuống — bấm "Nokia" mà mở ra trang
 *     "Phiêu lưu". Lỗi ấy chỉ hiện ra đúng một phần tư số lần bấm.
 */
export default async function chay(kiem) {
  const don = async () => { await db.game.deleteMany({ where: { duongDan: DUONG_DAN } }); };
  await don();

  const p = await moTrang();
  try {
    const theLoai = await db.theLoai.findMany({
      orderBy: { thuTu: 'asc' }, take: 2, select: { id: true, ten: true, duongDan: true },
    });
    await db.game.create({
      data: {
        ten: 'Game kiểm luân phiên', duongDan: DUONG_DAN,
        nhaPhatTrien: 'Hãng Kiểm Thử', trangThai: 'DANG_HIEN', dangLuc: new Date(),
        theLoai: { create: theLoai.map((t) => ({ theLoaiId: t.id })) },
      },
    });

    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    const dong = p.locator('header:has(h1) p.grid a');

    kiem('mọi mục đều nằm trong trang cùng lúc', (await dong.count()) === 3,
      `đếm được ${await dong.count()}`);

    const dich = await dong.evaluateAll((o) => o.map((x) => x.getAttribute('href')));
    kiem('mục tên hãng trỏ đúng trang hãng',
      dich[0] === `/nha-phat-trien/${encodeURIComponent('Hãng Kiểm Thử')}`, String(dich[0]));
    kiem('mấy mục thể loại trỏ đúng gian của nó',
      dich[1] === `/the-loai/${theLoai[0].duongDan}`
      && dich[2] === `/the-loai/${theLoai[1].duongDan}`, dich.join(' | '));

    /** Mục nào đang hiện — đọc độ mờ thật, không đoán theo lớp CSS. */
    const dangHien = () => dong.evaluateAll(
      (o) => o.map((x) => Number(getComputedStyle(x).opacity) > 0.5));

    const dau = await dangHien();
    kiem('chỉ một mục hiện mỗi lúc', dau.filter(Boolean).length === 1, JSON.stringify(dau));
    kiem('mục đầu tiên là tên hãng', dau[0] === true, JSON.stringify(dau));

    // Chờ qua một nhịp rồi xem nó có đổi sang mục sau.
    await p.waitForTimeout(4200);
    const sau = await dangHien();
    kiem('mấy giây sau thì đổi sang mục kế tiếp',
      sau[1] === true && sau.filter(Boolean).length === 1, JSON.stringify(sau));

    /*
     * DỪNG XOAY KHI TRỎ CHUỘT CHẠM VÀO.
     *
     * Rê chuột vào dòng, chờ HƠN một nhịp, rồi soi lại: vẫn phải là đúng mục
     * cũ. Không dừng thì cú bấm ngay sau đó rơi vào một mục khác.
     */
    await p.locator('header:has(h1) p.grid').hover();
    await p.waitForTimeout(4200);
    const khiRe = await dangHien();
    kiem('rê chuột vào thì dừng xoay', khiRe[1] === true, JSON.stringify(khiRe));

    // Và bấm vào mục đang hiện thì đi đúng chỗ của NÓ.
    await dong.nth(1).click();
    await p.waitForURL(`**/the-loai/${theLoai[0].duongDan}`, { timeout: 10000 });
    kiem('bấm vào mục đang hiện thì đi đúng đường dẫn của mục ấy',
      p.url().includes(`/the-loai/${theLoai[0].duongDan}`), p.url());
  } finally {
    await don();
    await p.close();
  }
}
