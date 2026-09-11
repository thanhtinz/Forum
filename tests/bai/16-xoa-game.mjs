import { GOC, db, doiToi, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * XOÁ HẲN MỘT GAME — thao tác không lùi lại được, nên kiểm kỹ nhất.
 *
 * Ba điều phải đúng:
 *   1. Gõ SAI tên thì KHÔNG xoá gì cả. Đây là chốt chặn duy nhất, và nó nằm ở
 *      máy chủ chứ không phải ở nút bị làm mờ trên trình duyệt.
 *   2. Gõ đúng thì mọi thứ treo vào game đi theo — bản tải, tệp, ảnh, đánh
 *      giá, chủ đề, lượt tải. Sót lại một bảng là rác không ai trỏ tới được.
 *   3. Thành viên thường gọi thẳng endpoint thì không ăn.
 *
 * Bài này tự dựng lấy một game riêng để xoá, không đụng vào dữ liệu mẫu.
 */
export default async function chay(kiem) {
  const nguoi = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  if (!nguoi) { kiem('có dữ liệu mẫu', false); return; }

  const TEN = 'Game dựng để kiểm xoá';
  await don(TEN);

  let admin, thuong;
  try {
    // Dựng một game đủ mọi thứ treo vào, để xem cascade có quét sạch không.
    const game = await db.game.create({
      data: {
        ten: TEN, duongDan: 'game-dung-de-kiem-xoa', trangThai: 'DANG_HIEN',
        dangLuc: new Date(),
        banTai: {
          create: {
            heMay: 'JAVA', soHieu: '1.0', moiNhat: true,
            tep: { create: { loai: 'JAR', duongDan: '/tep-mau/kiem.jar' } },
          },
        },
        anhChup: { create: { duongDan: '/anh-kiem/x.jpg', thuTu: 10 } },
        danhGia: { create: { nguoiId: nguoi.id, sao: 4, noiDung: 'Bài để kiểm xoá theo.' } },
        chuDe: {
          create: {
            nguoiId: nguoi.id, tieuDe: 'Chủ đề để kiểm xoá theo', noiDung: 'x',
            soTraLoi: 1,
            traLoi: { create: { nguoiId: nguoi.id, noiDung: 'y' } },
          },
        },
        luotTai: { create: { nguoiId: nguoi.id, heMay: 'JAVA', soHieu: '1.0' } },
      },
      select: { id: true, duongDan: true },
    });

    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    thuong = await moTrangDaDangNhap('anhthu', 'thanhvien123');

    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    await admin.click('button:has-text("Xoá hẳn game này")');
    kiem('khu nguy hiểm mở ra và nói rõ sẽ xoá những gì',
      (await admin.locator('text=đánh giá và').count()) > 0);

    // ── Gõ SAI tên: nút phải chịu tắt, và game còn nguyên ──────────────
    await admin.fill('input[aria-label="Gõ lại tên game"]', 'Tên sai bét');
    const nutXoa = admin.locator('button:has-text("Xoá hẳn")');
    kiem('gõ sai tên thì nút xoá bị tắt', await nutXoa.isDisabled());
    kiem('gõ sai tên thì game vẫn còn',
      (await db.game.count({ where: { id: game.id } })) === 1);

    /*
     * Nút bị tắt chỉ là lớp đỡ ở trình duyệt. Chốt chặn THẬT nằm ở máy chủ,
     * nên gọi thẳng hàm với tên sai để xem nó có chịu dừng không — đây mới là
     * thứ đứng giữa một cú bấm nhầm và cả một game biến mất.
     */
    await admin.evaluate(() => {
      const o = document.querySelector('input[aria-label="Gõ lại tên game"]');
      const dat = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      dat.call(o, 'Tên sai bét');
      o.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await admin.evaluate(() => {
      document.querySelectorAll('button').forEach((b) => {
        if (b.textContent.trim().startsWith('Xoá hẳn')) { b.disabled = false; b.click(); }
      });
    });
    await admin.waitForTimeout(1500);
    kiem('máy chủ cũng chặn khi tên không khớp',
      (await db.game.count({ where: { id: game.id } })) === 1);

    // ── Gõ ĐÚNG tên: xoá thật ──────────────────────────────────────────
    await admin.reload({ waitUntil: 'networkidle' });
    await admin.click('button:has-text("Xoá hẳn game này")');
    await admin.fill('input[aria-label="Gõ lại tên game"]', TEN);
    await admin.click('button:has-text("Xoá hẳn")');

    const daXoa = await doiToi(async () =>
      (await db.game.count({ where: { id: game.id } })) === 0);
    kiem('gõ đúng tên thì xoá được game', daXoa);
    kiem('xoá xong thì quay về danh sách game',
      admin.url().endsWith('/quan-tri/game'), admin.url());

    // ── Mọi thứ treo vào game phải đi theo ─────────────────────────────
    const [ban, anh, dg, cd, tl, lt] = await Promise.all([
      db.banTai.count({ where: { gameId: game.id } }),
      db.anhChup.count({ where: { gameId: game.id } }),
      db.danhGia.count({ where: { gameId: game.id } }),
      db.chuDe.count({ where: { gameId: game.id } }),
      db.traLoi.count({ where: { chuDe: { gameId: game.id } } }),
      db.luotTai.count({ where: { gameId: game.id } }),
    ]);
    kiem('bản tải đi theo', ban === 0, `còn ${ban}`);
    kiem('ảnh chụp đi theo', anh === 0, `còn ${anh}`);
    kiem('đánh giá đi theo', dg === 0, `còn ${dg}`);
    kiem('chủ đề đi theo', cd === 0, `còn ${cd}`);
    kiem('lời đáp trong chủ đề đi theo', tl === 0, `còn ${tl}`);
    kiem('lượt tải đi theo', lt === 0, `còn ${lt}`);

    const r = await thuong.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'domcontentloaded' });
    kiem('trang game đã xoá trả về 404', r.status() === 404, `trả về ${r.status()}`);
  } finally {
    await don(TEN);
    await admin?.close();
    await thuong?.close();
  }
}

async function don(ten) {
  await db.game.deleteMany({ where: { ten } });
}
