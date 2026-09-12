import { GOC, db, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';
import { SU_KIEN_TREN_TRANG } from '../../src/lib/su-kien-const.ts';

const DUONG_DAN = 'game-kiem-su-kien';
const NGAY = 24 * 60 * 60 * 1000;

/**
 * SỰ KIỆN TRONG GAME — mục "In-App Events" của App Store.
 *
 * Thứ dễ hỏng nhất ở đây là THỜI GIAN: một sự kiện hết hạn còn nằm trên trang
 * game thì tệ hơn hẳn là không có sự kiện nào, vì nó nói với người xem rằng
 * trang này lâu rồi không ai ngó tới. Mà lỗi ấy không bao giờ lộ ra lúc vừa
 * viết xong — nó lộ sau vài tuần, khi không ai còn nhìn nữa.
 */
export default async function chay(kiem) {
  const don = async () => { await db.game.deleteMany({ where: { duongDan: DUONG_DAN } }); };
  await don();

  let khach; let admin; let nguoiLa;
  try {
    const gio = Date.now();
    const game = await db.game.create({
      data: {
        ten: 'Game kiểm sự kiện', duongDan: DUONG_DAN,
        trangThai: 'DANG_HIEN', dangLuc: new Date(),
        suKien: {
          create: [
            {
              loai: 'CAP_NHAT_LON', tieuDe: 'Bản Việt hoá đang chạy',
              moTaNgan: 'Toàn bộ lời thoại đã dịch', noiDung: 'Chi tiết **bản Việt hoá**.',
              batDau: new Date(gio - NGAY), ketThuc: new Date(gio + NGAY),
            },
            {
              loai: 'THI_DAU', tieuDe: 'Giải đấu đã xong',
              moTaNgan: 'Giải tháng trước',
              batDau: new Date(gio - 30 * NGAY), ketThuc: new Date(gio - NGAY),
            },
            {
              loai: 'MUA_MOI', tieuDe: 'Mùa mới đang tắt',
              moTaNgan: 'Chưa tới lúc bày ra', hien: false,
              batDau: new Date(gio - NGAY), ketThuc: new Date(gio + NGAY),
            },
          ],
        },
      },
      select: { id: true, suKien: { select: { id: true, tieuDe: true } } },
    });
    const dangChay = game.suKien.find((s) => s.tieuDe === 'Bản Việt hoá đang chạy');
    const hetHan = game.suKien.find((s) => s.tieuDe === 'Giải đấu đã xong');
    const dangTat = game.suKien.find((s) => s.tieuDe === 'Mùa mới đang tắt');

    khach = await moTrang();
    await khach.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    const chu = await khach.locator('body').textContent();

    kiem('trang game bày sự kiện đang chạy', chu.includes('Bản Việt hoá đang chạy'));
    kiem('sự kiện đã hết hạn thì KHÔNG bày', !chu.includes('Giải đấu đã xong'), chu.slice(0, 200));
    kiem('sự kiện đang tắt thì KHÔNG bày', !chu.includes('Mùa mới đang tắt'));
    kiem('thẻ sự kiện có huy hiệu loại', chu.includes('Cập nhật lớn'));
    kiem('không bày quá trần sự kiện một trang',
      (await khach.locator(`a[href^="/game/${DUONG_DAN}/su-kien/"]`).count()) <= SU_KIEN_TREN_TRANG);

    // ── Trang riêng của sự kiện ───────────────────────────────────────
    await khach.click(`a[href="/game/${DUONG_DAN}/su-kien/${dangChay.id}"]`);
    await khach.waitForURL(`**/su-kien/${dangChay.id}`);
    const chuSk = await khach.locator('body').textContent();
    kiem('trang sự kiện hiện tiêu đề', chuSk.includes('Bản Việt hoá đang chạy'));
    kiem('trang sự kiện dựng chữ đậm từ Markdown',
      (await khach.locator('.chu-dam strong').count()) > 0);
    kiem('trang sự kiện có đường về trang game',
      (await khach.locator(`a[href="/game/${DUONG_DAN}"]`).count()) > 0);

    /*
     * Sự kiện ĐANG TẮT không được mở thẳng bằng địa chỉ.
     *
     * Giấu cái thẻ đi mà vẫn mở được trang là giấu hụt: người bày hàng tắt một
     * sự kiện vì nó chưa tới lúc bày, mà địa chỉ thì đoán ra được từ danh sách
     * cũ hoặc từ máy tìm.
     */
    const rTat = await khach.request.get(`${GOC}/game/${DUONG_DAN}/su-kien/${dangTat.id}`);
    kiem('sự kiện đang tắt thì trang riêng trả 404', rTat.status() === 404, `mã ${rTat.status()}`);

    // Sự kiện hết hạn vẫn xem lại được bằng địa chỉ — chỉ thôi bày ở trang game.
    const rHet = await khach.request.get(`${GOC}/game/${DUONG_DAN}/su-kien/${hetHan.id}`);
    kiem('sự kiện đã hết hạn vẫn mở lại được bằng địa chỉ', rHet.status() === 200, `mã ${rHet.status()}`);

    // ── Ai sửa được ───────────────────────────────────────────────────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    const chuQt = await admin.locator('body').textContent();
    kiem('khu quản trị bày đủ cả sự kiện hết hạn lẫn đang tắt',
      chuQt.includes('Giải đấu đã xong') && chuQt.includes('Mùa mới đang tắt'));
    kiem('khu quản trị nói rõ cái nào hết hạn', chuQt.includes('đã hết hạn'));

    // Ngày kết thúc trước ngày bắt đầu thì phải bị chặn ngay lúc nhập.
    await admin.fill('input[name="tieuDe"]', 'Sự kiện ngược ngày');
    await admin.fill('input[name="moTaNgan"]', 'Kết thúc trước khi bắt đầu');
    await admin.fill('input[name="batDau"]', '2030-01-10T10:00');
    await admin.fill('input[name="ketThuc"]', '2030-01-05T10:00');
    await admin.click('button:has-text("Thêm sự kiện")');
    await admin.waitForTimeout(1200);
    kiem('ngày kết thúc trước ngày bắt đầu thì bị chặn',
      (await db.suKien.count({ where: { gameId: game.id, tieuDe: 'Sự kiện ngược ngày' } })) === 0);
    kiem('và nói rõ vì sao bị chặn',
      (await admin.locator('[role="alert"]').first().textContent() ?? '').includes('sau ngày bắt đầu'));

    /*
     * Thành viên thường gọi thẳng endpoint thì không ăn.
     *
     * Mọi hàm export trong tệp `'use server'` là một địa chỉ POST công khai,
     * nên "không thấy nút" không phải là chặn. Ở đây gọi qua trang quản trị mà
     * người thường không mở được — mục kiểm là họ không vào tới nơi.
     */
    nguoiLa = await moTrangDaDangNhap('huytran', 'thanhvien123');
    const rLa = await nguoiLa.request.get(`${GOC}/quan-tri/game/${game.id}`, { maxRedirects: 0 });
    kiem('thành viên thường không vào được trang quản trị game',
      rLa.status() !== 200, `mã ${rLa.status()}`);
  } finally {
    await don();
    for (const p of [khach, admin, nguoiLa]) if (p) await p.close();
  }
}
