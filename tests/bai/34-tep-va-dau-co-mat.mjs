import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const DAU = 'kiemthu-tep';
const DUONG_DAN = 'game-kiem-chi-tiet-tep';
const MA_THAT = 'a'.repeat(64);

/*
 * BA CỘT CÓ DỮ LIỆU MÀ KHÔNG AI ĐỌC.
 *
 * `TepTai.tenTep`, `TepTai.maKiemTra` và `NguoiDung.ghePhutCuoi` nằm trong
 * lược đồ từ đầu — kịch bản gieo dữ liệu còn ghi sẵn hai cột đầu, và lược đồ
 * ghi rõ mã kiểm tra "để người tải đối chiếu sau khi tải xong". Nhưng không có
 * chỗ nào trong mã đọc chúng ra, cũng không có lối nào nhập chúng vào.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.game.deleteMany({ where: { duongDan: DUONG_DAN } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: DAU } } });
  };
  await don();

  let admin;
  try {
    const game = await db.game.create({
      data: {
        ten: 'Game kiểm chi tiết tệp', duongDan: DUONG_DAN,
        trangThai: 'DANG_HIEN', dangLuc: new Date(),
        banTai: { create: [{ heMay: 'JAVA', soHieu: '1.0', moiNhat: true }] },
      },
      select: { id: true, banTai: { select: { id: true } } },
    });
    const banId = game.banTai[0].id;

    // ── Quản trị gắn tệp kèm tên và mã kiểm tra ────────────────────────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    await admin.click('button[aria-label="Mở bản Java ME 1.0"]');

    await admin.fill('input[name="duongDanTep"]', '/tep-mau/kiem-thu.jar');
    await admin.fill('input[name="tenTep"]', 'kiem-thu-1.0.jar');

    /*
     * MÃ HỎNG PHẢI BỊ TỪ CHỐI TRƯỚC.
     *
     * Một mã gõ thiếu mấy ký tự trông vẫn như mã thật, mà người đối chiếu sẽ
     * thấy "không khớp" rồi kết luận tệp bị sửa đổi — tức là ta tự vu cho
     * mình. Gỡ `pattern` khỏi ô nhập vì luật thật phải nằm ở máy chủ.
     */
    await admin.evaluate(() => {
      document.querySelectorAll('input[name="maKiemTra"]').forEach((o) => {
        o.removeAttribute('pattern');
        o.removeAttribute('maxlength');
      });
    });
    await admin.fill('input[name="maKiemTra"]', 'khong-phai-ma-sha256');
    await admin.click('button[aria-label="Gắn tệp vào bản 1.0"]');
    await admin.waitForTimeout(800);

    const soTep = await db.tepTai.count({ where: { banId } });
    kiem('mã kiểm tra sai dạng thì không gắn được tệp', soTep === 0, `có ${soTep} tệp`);
    kiem('và nói rõ phải là 64 ký tự sha256',
      (await admin.locator('text=64 ký tự sha256').count()) > 0);

    /*
     * ── Gắn lại với mã đúng dạng ──────────────────────────────────────
     *
     * Chỉ sửa mỗi ô mã, KHÔNG gõ lại hai ô kia — đó chính là mục kiểm: React
     * 19 tự xoá trắng biểu mẫu sau khi hành động chạy xong, kể cả khi hành
     * động ấy trả về lỗi, nên gõ nhầm một ký tự là mất luôn đường dẫn dài
     * ngoằng vừa dán vào. Ba ô này nay là ô có điều khiển để giữ lại.
     */
    kiem('gửi hỏng thì vẫn giữ nguyên đường dẫn tệp đã gõ',
      (await admin.inputValue('input[name="duongDanTep"]')) === '/tep-mau/kiem-thu.jar',
      await admin.inputValue('input[name="duongDanTep"]'));
    kiem('gửi hỏng thì vẫn giữ nguyên tên tệp đã gõ',
      (await admin.inputValue('input[name="tenTep"]')) === 'kiem-thu-1.0.jar',
      await admin.inputValue('input[name="tenTep"]'));

    await admin.fill('input[name="maKiemTra"]', MA_THAT.toUpperCase());
    await admin.click('button[aria-label="Gắn tệp vào bản 1.0"]');
    const daGan = await doiToi(async () => (await db.tepTai.count({ where: { banId } })) === 1);
    kiem('gắn được tệp kèm tên và mã kiểm tra', daGan);

    const tep = await db.tepTai.findFirst({
      where: { banId }, orderBy: { id: 'asc' },
      select: { tenTep: true, maKiemTra: true },
    });
    kiem('tên tệp lưu đúng', tep.tenTep === 'kiem-thu-1.0.jar', tep.tenTep ?? '');
    // Hạ về chữ thường lúc lưu: sha256 viết hoa hay thường là cùng một mã, mà
    // hai chuỗi khác nhau thì người đối chiếu bằng mắt tưởng là lệch.
    kiem('mã kiểm tra lưu ở dạng chữ thường', tep.maKiemTra === MA_THAT, tep.maKiemTra ?? '');

    // ── Người tải đọc được chúng ở trang game ──────────────────────────
    const p = await moTrang();
    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    await p.click('summary:has-text("Chi tiết tệp"), button:has-text("Chi tiết tệp")')
      .catch(() => {});
    await p.waitForTimeout(300);
    const chu = await p.content();
    kiem('trang game bày tên tệp', chu.includes('kiem-thu-1.0.jar'));
    kiem('trang game bày đủ 64 ký tự mã kiểm tra', chu.includes(MA_THAT));
    await p.close();

    /*
     * ── DẤU "GHÉ LẦN CUỐI" ────────────────────────────────────────────
     *
     * Người coi kho đang phải quyết định có khoá một tài khoản hay không mà
     * chỉ nhìn thấy ngày đăng ký. Tài khoản mở ba năm trước và tài khoản đang
     * rải bài lúc này trông y hệt nhau trên bảng thành viên.
     */
    const mau = await db.nguoiDung.findFirst({
      orderBy: { id: 'asc' }, where: { tenDangNhap: 'huytran' }, select: { matKhauBam: true },
    });
    const ai = await db.nguoiDung.create({
      data: {
        email: `${DAU}@kiemthu.invalid`, tenDangNhap: `${DAU}-nguoi`,
        tenHienThi: 'Người vừa ghé', matKhauBam: mau.matKhauBam,
      },
      select: { id: true, ghePhutCuoi: true },
    });
    kiem('tài khoản mới thì chưa có dấu ghé', ai.ghePhutCuoi === null);

    const q = await moTrangDaDangNhap(`${DAU}-nguoi`, 'thanhvien123');
    await q.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    const daGhi = await doiToi(async () =>
      (await db.nguoiDung.findUnique({ where: { id: ai.id }, select: { ghePhutCuoi: true } }))
        ?.ghePhutCuoi !== null);
    kiem('ghé một cái là có dấu ngay', daGhi);

    /*
     * GHI THƯA — mục này mới là mục đáng canh.
     *
     * Hàm đọc người dùng chạy gần như mỗi lần vẽ một trang. Ghi mỗi lượt thì
     * mỗi lượt xem trang đẻ thêm một lượt ghi vào cùng một hàng, đúng kiểu
     * tranh chấp làm nghẽn cả bảng người dùng.
     */
    const lan1 = (await db.nguoiDung.findUnique({
      where: { id: ai.id }, select: { ghePhutCuoi: true },
    })).ghePhutCuoi;

    for (const dia of ['/', '/duyet', '/thu-vien', '/toi']) {
      await q.goto(GOC + dia, { waitUntil: 'networkidle' });
    }
    await q.waitForTimeout(500);

    const lan2 = (await db.nguoiDung.findUnique({
      where: { id: ai.id }, select: { ghePhutCuoi: true },
    })).ghePhutCuoi;
    kiem('bốn lượt xem trang nữa KHÔNG ghi lại dấu ấy',
      lan1.getTime() === lan2.getTime(), `${lan1.toISOString()} → ${lan2.toISOString()}`);
    await q.close();

    // ── Bảng thành viên bày dấu ấy ra ──────────────────────────────────
    await admin.goto(`${GOC}/quan-tri/thanh-vien`, { waitUntil: 'networkidle' });
    kiem('bảng thành viên có cột ghé lần cuối',
      (await admin.locator('th:has-text("Ghé lần cuối")').count()) > 0);
  } finally {
    if (admin) await admin.close();
    await don();
  }
}
