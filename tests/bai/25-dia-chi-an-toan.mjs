import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * Địa chỉ tệp và ảnh: câu kiểm phải PHÂN TÍCH, không so đầu chuỗi.
 *
 * Bản trước viết `x.startsWith('/')` với ý "đường dẫn trong nhà". Nhưng
 * `//vi-du.test/x` cũng bắt đầu bằng `/` mà trình duyệt đọc là MÁY CHỦ KHÁC,
 * và `/\vi-du.test/x` cũng vậy vì gạch ngược bị coi như gạch xuôi.
 *
 * Chỗ đau nhất là cổng `/api/tai/…`: nó chuyển hướng tới địa chỉ ấy, nên một
 * đường dẫn kiểu `//…` biến liên kết mang tên miền cửa hàng thành liên kết dẫn
 * đi bất cứ đâu — đúng thứ dùng để lừa người khác bấm.
 */
export default async function chay(kiem) {
  const TEN = 'Game kiểm địa chỉ';
  await don(TEN);

  let admin, p;
  try {
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');

    const game = await db.game.create({
      data: {
        ten: TEN, duongDan: 'game-kiem-dia-chi', trangThai: 'DANG_HIEN', dangLuc: new Date(),
        banTai: { create: { heMay: 'JAVA', soHieu: '1.0', moiNhat: true } },
      },
      select: { id: true },
    });
    const ban = await db.banTai.findFirst({
      where: { gameId: game.id }, orderBy: { id: 'asc' }, select: { id: true, soHieu: true },
    });

    // ── Mấy kiểu viết lách qua được câu kiểm cũ ───────────────────────
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    await admin.click(`button[aria-label="Mở bản Java ME ${ban.soHieu}"]`);

    // Ô dán địa chỉ nay nằm trong khối gấp, vì lối thường là TẢI TỆP LÊN.
    await admin.click('summary:has-text("Hoặc dán địa chỉ")');

    const thuGan = async (dia) => {
      await admin.fill('input[name="duongDanTep"]', dia);
      await admin.click(`button[aria-label="Gắn tệp vào bản ${ban.soHieu}"]`);
      await admin.waitForTimeout(900);
      return db.tepTai.count({ where: { banId: ban.id } });
    };

    for (const xau of ['//vi-du-xau.test/x.jar', '/\\vi-du-xau.test/x.jar', 'javascript:alert(1)', 'http://vi-du-xau.test/x.jar']) {
      const so = await thuGan(xau);
      kiem(`chặn được địa chỉ tệp ${JSON.stringify(xau)}`, so === 0, `gắn được ${so} tệp`);
    }

    // Địa chỉ thật thì vẫn phải gắn được — chặn quá tay cũng là hỏng.
    const soThat = await thuGan('/tep-mau/bounce-tales-1.2.jar');
    kiem('địa chỉ trong nhà hợp lệ vẫn gắn được', soThat === 1, `gắn được ${soThat}`);

    // ── Cổng tải tự chặn lấy, dù CSDL có hàng bẩn ─────────────────────
    /*
     * Ghi thẳng một địa chỉ xấu vào CSDL, bỏ qua lối nhập.
     *
     * Đây mới là phép thử thật: hàng bẩn có thể tới từ một lượt nhập tay, một
     * bản khôi phục cũ, hay chính lối nhập mà bản trước quên kiểm. Cổng tải
     * phải tự đứng vững, không dựa vào việc dữ liệu đã sạch sẵn.
     */
    const tep = await db.tepTai.findFirst({
      where: { banId: ban.id }, orderBy: { id: 'asc' }, select: { id: true },
    });
    await db.tepTai.update({
      where: { id: tep.id }, data: { duongDan: '//vi-du-xau.test/x.jar' }, select: { id: true },
    });

    p = await moTrang();
    const r = await fetch(`${GOC}/api/tai/${tep.id}`, { redirect: 'manual' });
    const diNoiKhac = (r.headers.get('location') ?? '').includes('vi-du-xau.test');
    kiem('cổng tải KHÔNG chuyển hướng ra máy chủ lạ', !diNoiKhac,
      `trả ${r.status}, dẫn tới ${r.headers.get('location')}`);
    kiem('địa chỉ hỏng thì cổng tải trả 404', r.status === 404, `trả ${r.status}`);

    // ── Địa chỉ sạch thì vẫn tải được như thường ──────────────────────
    await db.tepTai.update({
      where: { id: tep.id }, data: { duongDan: '/tep-mau/bounce-tales-1.2.jar' }, select: { id: true },
    });
    const r2 = await fetch(`${GOC}/api/tai/${tep.id}`, { redirect: 'manual' });
    kiem('tệp hợp lệ vẫn chuyển hướng bình thường',
      r2.status === 302 && (r2.headers.get('location') ?? '').includes('/tep-mau/'),
      `trả ${r2.status}, dẫn tới ${r2.headers.get('location')}`);

    const daDem = await doiToi(async () =>
      (await db.game.findUnique({ where: { id: game.id }, select: { soLuotTai: true } }))
        ?.soLuotTai >= 1);
    kiem('lượt tải hợp lệ vẫn được đếm', daDem);

    // ── Ảnh đại diện ở cài đặt tài khoản cũng chặn y vậy ──────────────
    const nguoi = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    await nguoi.goto(`${GOC}/toi/cai-dat`, { waitUntil: 'networkidle' });
    await nguoi.fill('input[name="anh"]', '//vi-du-xau.test/a.png');
    await nguoi.click('button:has-text("Lưu hồ sơ")');
    await nguoi.waitForTimeout(900);
    const anh = (await db.nguoiDung.findFirst({
      where: { tenDangNhap: 'anhthu' }, select: { anh: true },
    }))?.anh;
    kiem('ảnh đại diện cũng chặn địa chỉ lách', anh == null, `lưu thành ${anh}`);
    await nguoi.close();

    /*
     * ── Bản dựng KHÔNG được đòi cơ sở dữ liệu ─────────────────────────
     *
     * Sơ đồ trang từng bị Next dựng sẵn lúc `next build`, nên bản dựng đòi
     * phải có CSDL sống — CSDL chập một nhịp là đổ cả lượt dựng, với một câu
     * lỗi chẳng nhắc gì tới sơ đồ trang. Cách duy nhất canh được từ đây là
     * xem nó có phải tuyến động hay không.
     */
    const sm = await fetch(`${GOC}/sitemap.xml`);
    kiem('sơ đồ trang dựng theo từng lượt hỏi, không dựng sẵn lúc build',
      !/max-age=\d{3,}/.test(sm.headers.get('cache-control') ?? ''),
      `cache-control: ${sm.headers.get('cache-control')}`);
  } finally {
    await don(TEN);
    await db.nguoiDung.updateMany({ where: { tenDangNhap: 'anhthu' }, data: { anh: null } });
    await admin?.close();
    await p?.close();
  }
}

async function don(ten) {
  await db.game.deleteMany({ where: { ten } });
}
