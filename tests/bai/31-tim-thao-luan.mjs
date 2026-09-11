import { GOC, db, moTrang } from '../tro-giup.mjs';
import { dungChuoiTimChuDe } from '../../src/lib/tim-kiem-const.ts';

const DAU = 'kiemthu-timdd';

/*
 * TÌM TRONG DIỄN ĐÀN.
 *
 * Ô tìm kiếm trước đây chỉ biết tìm GAME. Nhưng một nửa giá trị của kho này
 * nằm ở mấy chủ đề kiểu "bản 1.2 treo ở màn 3" — người gặp đúng lỗi ấy gõ vào
 * ô tìm, không ra gì, rồi mở một chủ đề mới hỏi y hệt.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' },
    where: { trangThai: 'DANG_HIEN' }, select: { id: true, duongDan: true },
  });
  const nguoi = await db.nguoiDung.findFirst({
    orderBy: { id: 'asc' }, where: { tenDangNhap: 'huytran' }, select: { id: true },
  });
  if (!game || !nguoi) { kiem('có game và tài khoản mẫu', false); return; }

  const don = () => db.chuDe.deleteMany({ where: { tieuDe: { startsWith: DAU } } });
  await don();

  try {
    // Tiêu đề mơ hồ, chuyện thật nằm ở THÂN BÀI — đúng kiểu bài mà tìm theo
    // mỗi tiêu đề sẽ không bao giờ ra.
    const than = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: nguoi.id,
        tieuDe: `${DAU} ai giúp mình với`,
        noiDung: 'Chơi tới chỗ con rồng đỏ là máy đứng hình, không bấm được gì nữa.',
        timKiem: dungChuoiTimChuDe({
          tieuDe: `${DAU} ai giúp mình với`,
          noiDung: 'Chơi tới chỗ con rồng đỏ là máy đứng hình, không bấm được gì nữa.',
        }),
      },
      select: { id: true },
    });

    const p = await moTrang();
    const tim = async (q, loai) => {
      await p.goto(`${GOC}/tim?q=${encodeURIComponent(q)}${loai ? `&loai=${loai}` : ''}`,
        { waitUntil: 'networkidle' });
    };

    await tim('đứng hình', 'thao-luan');
    kiem('tìm được chủ đề theo chữ trong thân bài',
      (await p.locator(`text=${DAU} ai giúp mình với`).count()) > 0);

    /*
     * GÕ KHÔNG DẤU CŨNG PHẢI RA.
     *
     * Phần lớn người dùng điện thoại gõ không dấu. Đây đúng là lỗi đã từng có
     * ở ô tìm game, và cột `timKiem` của chủ đề sinh ra để không lặp lại nó.
     */
    await tim('dung hinh', 'thao-luan');
    kiem('gõ không dấu vẫn ra chủ đề ấy',
      (await p.locator(`text=${DAU} ai giúp mình với`).count()) > 0);

    // Khớp MỌI từ, không phải một trong các từ.
    await tim('rong do dung hinh', 'thao-luan');
    kiem('nhiều từ thì phải khớp hết, và vẫn ra',
      (await p.locator(`text=${DAU} ai giúp mình với`).count()) > 0);

    await tim('rong do khong-he-co-chu-nay', 'thao-luan');
    kiem('thiếu một từ thì không ra',
      (await p.locator(`text=${DAU} ai giúp mình với`).count()) === 0);

    // Mỗi kết quả phải nói rõ thuộc game nào — danh sách gom chủ đề mọi game.
    await tim('đứng hình', 'thao-luan');
    const dong = await p.locator('ul[aria-label="Thảo luận khớp"] li').first().innerText();
    kiem('kết quả nói rõ chủ đề thuộc game nào', dong.includes('·'), dong.replace(/\n/g, ' '));

    // Bấm vào là tới thẳng chủ đề.
    await p.locator('ul[aria-label="Thảo luận khớp"] li a').first().click();
    await p.waitForURL(`**/dien-dan/${than.id}`, { timeout: 15_000 }).catch(() => {});
    kiem('bấm vào kết quả thì tới thẳng chủ đề', p.url().includes(than.id), p.url());

    // ── Hai tab và con số trên tab ─────────────────────────────────────
    await tim('đứng hình');
    const tab = p.locator('nav[aria-label="Loại kết quả"] a');
    kiem('trang tìm có hai tab', (await tab.count()) === 2);
    kiem('tab Thảo luận đếm đúng số chủ đề khớp',
      (await tab.nth(1).innerText()).includes('1'), await tab.nth(1).innerText());

    /*
     * Không ra game nào mà CÓ thảo luận khớp thì mời sang đó, đừng mời gửi
     * yêu cầu ngay: rất có thể thứ họ tìm đang nằm trong một cuộc trao đổi.
     */
    kiem('không có game khớp thì mời sang tab thảo luận',
      (await p.locator('a:has-text("thảo luận khớp")').count()) > 0);

    // Chủ đề của game đã gỡ thì không được lọt vào kết quả — bấm vào là 404.
    await db.game.update({ where: { id: game.id }, data: { trangThai: 'DA_GO' } });
    try {
      await tim('đứng hình', 'thao-luan');
      kiem('chủ đề của game đã gỡ không hiện trong kết quả tìm',
        (await p.locator(`text=${DAU} ai giúp mình với`).count()) === 0);
    } finally {
      await db.game.update({ where: { id: game.id }, data: { trangThai: 'DANG_HIEN' } });
    }

    await p.close();
  } finally {
    await don();
  }
}
