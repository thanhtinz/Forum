import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';
import { MO_TA_TUOI, napDoTuoi } from '../../src/lib/do-tuoi-const.ts';

const DUONG_DAN = 'game-kiem-do-tuoi';

/**
 * ĐỘ TUỔI KHUYẾN NGHỊ — thang 4+ / 9+ / 12+ / 17+ của App Store.
 *
 * Con số này thuộc loại hỏng mà chẳng ai kêu: nó chỉ sai đúng một chỗ, đúng
 * một lần, với đúng người đang mua game cho con. Nên mấy mục kiểm ở đây canh
 * hai chuyện — nó có mặt ở cả ba chỗ phải có mặt, và số lạ gửi lên thì KHÔNG
 * ghi vào được.
 */
export default async function chay(kiem) {
  const don = async () => { await db.game.deleteMany({ where: { duongDan: DUONG_DAN } }); };
  await don();

  let khach; let admin;
  try {
    /* ── Phép nắn số, đo thẳng trên hàm ───────────────────────────────── */
    kiem('số hợp lệ thì giữ nguyên', napDoTuoi(12) === 12);
    kiem('số lạ thì về mức thấp nhất', napDoTuoi(13) === 4 && napDoTuoi(-1) === 4);
    kiem('bỏ trống cũng về mức thấp nhất', napDoTuoi(null) === 4);

    const game = await db.game.create({
      data: {
        ten: 'Game kiểm độ tuổi', duongDan: DUONG_DAN, doTuoi: 12,
        trangThai: 'DANG_HIEN', dangLuc: new Date(),
        banTai: {
          create: {
            heMay: 'JAVA', soHieu: '1.0', moiNhat: true,
            tep: { create: { loai: 'JAR', duongDan: '/tep-mau/bounce-tales-1.2.jar' } },
          },
        },
      },
      select: { id: true },
    });

    // ── Hàng số liệu ở trang game ─────────────────────────────────────
    khach = await moTrang();
    await khach.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    const soLieu = (await khach.locator('dl').first().textContent() ?? '').toLowerCase();
    kiem('hàng số liệu có ô độ tuổi', soLieu.includes('độ tuổi'), soLieu);
    kiem('hàng số liệu in đúng mức tuổi',
      soLieu.includes(MO_TA_TUOI[12].nhan.toLowerCase()), soLieu);

    /*
     * ── TẤM TẢI MANG HUY HIỆU TUỔI ────────────────────────────────────
     *
     * Đây là nhịp cuối trước khi tệp về máy, nên mức tuổi phải còn nguyên ở
     * đó: người lớn đưa máy cho trẻ con bấm thì chính tấm này là chỗ duy nhất
     * họ còn kịp nhìn.
     */
    await khach.click('[data-viec="tai-dau"]');
    await khach.waitForSelector('dialog[open]', { timeout: 5000 });
    const chuTam = await khach.locator('dialog[open]').textContent();
    kiem('tấm tải mang huy hiệu tuổi', chuTam.includes(MO_TA_TUOI[12].nhan), chuTam.slice(0, 200));
    await khach.keyboard.press('Escape');

    // ── Quản trị đổi được, và số lạ không lọt ─────────────────────────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    kiem('biểu mẫu quản trị có ô chọn độ tuổi',
      (await admin.locator('select[name="doTuoi"]').count()) > 0);
    kiem('ô chọn đang ở đúng mức của game',
      (await admin.locator('select[name="doTuoi"]').inputValue()) === '12');

    await admin.selectOption('select[name="doTuoi"]', '17');
    await admin.click('button:has-text("Lưu thay đổi")');
    const daDoi = await doiToi(async () => {
      const g = await db.game.findUnique({ where: { id: game.id }, select: { doTuoi: true } });
      return g.doTuoi === 17;
    });
    kiem('quản trị đổi được độ tuổi', daDoi);

    /*
     * Gửi thẳng một số ngoài thang.
     *
     * Biểu mẫu chỉ cho chọn bốn mức, nhưng biểu mẫu là thứ sửa được bằng công
     * cụ nhà phát triển trong ba giây. Máy chủ phải tự nắn, chứ không tin vào
     * cái danh sách nó vừa vẽ ra.
     */
    /*
     * TẢI LẠI TRANG TRƯỚC KHI NHÉT SỐ LẠ.
     *
     * Bản trước nhét thẳng ngay sau lượt lưu đầu, và bài kiểm đỏ lúc được lúc
     * không — lần đỏ nào cũng đọc ra đúng 17, tức là số CŨ chứ không phải 99.
     * Lý do: React dựng lại biểu mẫu sau khi việc lưu xong, và lần dựng lại ấy
     * quét sạch cái <option> vừa nhét cùng giá trị đang chọn. Nhét trước lần
     * dựng lại thì thua cuộc đua; nhét sau thì thắng. Trang vừa tải xong thì
     * không còn lượt dựng lại nào đang chờ.
     */
    await admin.reload({ waitUntil: 'networkidle' });
    await admin.evaluate(() => {
      const o = document.querySelector('select[name="doTuoi"]');
      const moi = document.createElement('option');
      moi.value = '99';
      o.appendChild(moi);
      o.value = '99';
    });
    kiem('nhét được số ngoài thang vào biểu mẫu để thử',
      (await admin.locator('select[name="doTuoi"]').inputValue()) === '99');
    await admin.click('button:has-text("Lưu thay đổi")');
    /*
     * ĐỢI ĐIỀU KIỆN, không đợi một con số giây.
     *
     * Bản trước đợi cứng 1,5 giây rồi đọc thẳng. Máy rảnh thì vừa đủ, máy đang
     * bận dựng bản khác thì lượt lưu chưa kịp về — và bài kiểm báo hỏng một
     * chỗ hoàn toàn đúng. Đã đỏ thật một lần vì chuyện ấy.
     */
    const daNan = await doiToi(async () => {
      const g = await db.game.findUnique({ where: { id: game.id }, select: { doTuoi: true } });
      return g.doTuoi === 4;
    });
    const sau = await db.game.findUnique({ where: { id: game.id }, select: { doTuoi: true } });
    kiem('số ngoài thang gửi lên thì bị nắn về mức thấp nhất',
      daNan, `đang là ${sau.doTuoi}`);
  } finally {
    await don();
    for (const p of [khach, admin]) if (p) await p.close();
  }
}
