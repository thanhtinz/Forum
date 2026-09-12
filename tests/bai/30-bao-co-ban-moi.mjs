import { GOC, db, doiToi, moTrangDaDangNhap, tuDongXacNhan } from '../tro-giup.mjs';

const DAU = 'kiemthu-banmoi';
const DUONG_DAN = 'game-kiem-bao-ban-moi';

/*
 * ĐẨY TIN "CÓ BẢN MỚI" TỚI NGƯỜI ĐÃ TẢI.
 *
 * Trang "Bản cập nhật" vốn đã tính đúng danh sách này, nhưng nó chỉ hiện ra
 * cho ai tự nhớ mà mở — trong khi đúng người cần biết lại là người tải một
 * bản về máy rồi để đấy hàng tháng. Bài này canh phần đẩy tin.
 *
 * Dựng game riêng chứ không mượn game có sẵn: bài này đổi cờ `moiNhat`, mà cờ
 * ấy là thứ trang game và trang cập nhật đều đọc — sửa nhầm lên game thật thì
 * mấy bài sau đỏ mà không hiểu vì sao.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.thongBao.deleteMany({ where: { nguoi: { tenDangNhap: { startsWith: DAU } } } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: DAU } } });
    await db.game.deleteMany({ where: { duongDan: DUONG_DAN } });
  };
  await don();

  let admin;
  try {
    const game = await db.game.create({
      data: {
        ten: 'Game kiểm báo bản mới', duongDan: DUONG_DAN, trangThai: 'DANG_HIEN',
        dangLuc: new Date(),
        banTai: {
          create: [
            { heMay: 'JAVA', soHieu: '1.0', moiNhat: true },
            { heMay: 'JAVA', soHieu: '2.0', moiNhat: false },
          ],
        },
      },
      select: { id: true, ten: true },
    });

    // Hai người: một đang giữ bản 1.0, một đã giữ sẵn bản 2.0.
    const nguoiCu = await db.nguoiDung.create({
      data: {
        email: `${DAU}-cu@kiemthu.invalid`, tenDangNhap: `${DAU}-cu`,
        tenHienThi: 'Người giữ bản cũ', matKhauBam: 'khong-dung-de-dang-nhap',
      },
      select: { id: true },
    });
    const nguoiMoi = await db.nguoiDung.create({
      data: {
        email: `${DAU}-moi@kiemthu.invalid`, tenDangNhap: `${DAU}-moi`,
        tenHienThi: 'Người đã có bản mới', matKhauBam: 'khong-dung-de-dang-nhap',
      },
      select: { id: true },
    });
    await db.luotTai.createMany({
      data: [
        { gameId: game.id, nguoiId: nguoiCu.id, heMay: 'JAVA', soHieu: '1.0' },
        { gameId: game.id, nguoiId: nguoiMoi.id, heMay: 'JAVA', soHieu: '2.0' },
      ],
    });

    const demCua = (id) => db.thongBao.count({ where: { nguoiId: id, loai: 'GAME_CO_BAN_MOI' } });

    // ── Quản trị đặt bản 2.0 làm bản mới nhất ──────────────────────────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    tuDongXacNhan(admin);
    await admin.click('button:has-text("Đặt mới nhất")');

    const daBao = await doiToi(async () => (await demCua(nguoiCu.id)) === 1);
    kiem('người đang giữ bản cũ được báo có bản mới', daBao);

    /*
     * Người ĐÃ có đúng bản ấy thì không được báo.
     *
     * Điều kiện "số hiệu khác" nằm trong `where` của truy vấn chứ không lọc
     * sau: lọc sau thì hạn ngạch 500 người bị đếm cả những hàng sẽ bỏ đi, nên
     * game nào vừa có nhiều người tải đúng bản mới sẽ ăn hết hạn ngạch và
     * người dùng bản cũ — đúng người cần báo — lại không được báo.
     */
    const soThua = await demCua(nguoiMoi.id);
    kiem('người đã có sẵn bản ấy thì không bị làm phiền', soThua === 0, `nhận ${soThua} tin`);

    const tin = await db.thongBao.findFirst({
      where: { nguoiId: nguoiCu.id, loai: 'GAME_CO_BAN_MOI' },
      orderBy: { id: 'desc' },
      select: { tieuDe: true, chiTiet: true, duongDan: true, daDoc: true },
    });
    kiem('tin nói rõ game nào và bản mấy',
      tin.tieuDe.includes(game.ten) && tin.tieuDe.includes('2.0'), tin.tieuDe);
    kiem('tin nói rõ bản mới ấy cho hệ máy nào',
      (tin.chiTiet ?? '').includes('Java'), tin.chiTiet ?? '');
    kiem('bấm vào tin thì tới thẳng trang game',
      tin.duongDan === `/game/${DUONG_DAN}`, tin.duongDan ?? '');
    kiem('tin mới thì chưa đọc', tin.daDoc === false);

    /*
     * BẬT LẠI CỜ KHÔNG ĐƯỢC BÁO LẦN NỮA.
     *
     * Cờ "bản mới nhất" là thứ quản trị bật tắt được, và bật nhầm rồi bật lại
     * là chuyện thường ngày. Không chặn thì mỗi lần bật là một lượt tin y hệt,
     * và cái chuông mất hết giá trị.
     */
    await admin.reload({ waitUntil: 'networkidle' });
    tuDongXacNhan(admin);
    // Bản 1.0 giờ mới là bản KHÔNG mang cờ, nên nút của nó là nút đặt lại.
    await admin.click('button:has-text("Đặt mới nhất")');
    await doiToi(async () =>
      (await db.banTai.count({ where: { gameId: game.id, soHieu: '1.0', moiNhat: true } })) === 1);

    await admin.reload({ waitUntil: 'networkidle' });
    tuDongXacNhan(admin);
    await admin.click('button:has-text("Đặt mới nhất")');
    await doiToi(async () =>
      (await db.banTai.count({ where: { gameId: game.id, soHieu: '2.0', moiNhat: true } })) === 1);

    const soLan = await demCua(nguoiCu.id);
    kiem('đặt lại đúng bản ấy thì không báo trùng', soLan === 1, `nhận ${soLan} tin`);

    /*
     * Người giữ bản 1.0 nay lại thành người "đang có bản mới nhất" ở lượt đặt
     * giữa chừng, nên phải nhận đúng MỘT tin về bản 1.0 nữa — không nhiều hơn.
     */
    const tinVe10 = await db.thongBao.count({
      where: { nguoiId: nguoiMoi.id, loai: 'GAME_CO_BAN_MOI', tieuDe: { contains: '1.0' } },
    });
    kiem('người giữ bản 2.0 được báo khi 1.0 lên làm bản mới nhất',
      tinVe10 === 1, `nhận ${tinVe10} tin`);
  } finally {
    if (admin) await admin.close();
    await don();
  }
}
