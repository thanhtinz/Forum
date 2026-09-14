import { GOC, LOI, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';
import { LOAI, MUC } from '../../src/lib/quyen-rieng-tu-const.ts';

/**
 * Quyền riêng tư của game — bảng "App Privacy" của cửa hàng.
 *
 * Mục đáng canh nhất là BA TRẠNG THÁI, vì hai trong ba rất dễ bị gộp làm một:
 *
 *   • chưa khai            → người tải KHÔNG BIẾT GÌ;
 *   • khai rồi, không tích → "game này không thu thập dữ liệu nào", một LỜI HỨA;
 *   • khai rồi, có tích    → bảng dữ liệu.
 *
 * Gộp hai cái đầu là biến sự im lặng của nhà phát triển thành một lời hứa
 * chẳng ai từng nói ra — mà người đọc thì tin vào đúng câu ấy để quyết định có
 * tải hay không.
 *
 * Và một mục quyền: hàm lưu nằm trong tệp `'use server'`, tức là địa chỉ POST
 * công khai — thành viên thường gọi thẳng vào phải trượt.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' },
    where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true, khaiQuyenRiengTu: true },
  });
  if (!game) { kiem('có dữ liệu mẫu', false); return; }

  /*
   * DỰNG LẠI CẢ LỜI KHAI CŨ, không chỉ cái công tắc.
   *
   * Dữ liệu mẫu nay có game khai sẵn quyền riêng tư. Bài này xoá sạch bảng của
   * game ấy để thử, nên nếu chỉ dựng lại `khaiQuyenRiengTu` thì chạy một lượt
   * là mất luôn lời khai mẫu — cửa hàng mẫu thủng một mục mà phải chạy lại
   * seed mới biết, và bài kiểm nào đọc tới đó sau này sẽ đỏ vì một lý do
   * chẳng liên quan gì tới nó.
   */
  const khaiCu = await db.duLieuThuThap.findMany({
    where: { gameId: game.id }, select: { loai: true, muc: true },
  });
  const traLai = async () => {
    await db.duLieuThuThap.deleteMany({ where: { gameId: game.id } });
    if (khaiCu.length > 0) {
      await db.duLieuThuThap.createMany({
        data: khaiCu.map((k) => ({ gameId: game.id, loai: k.loai, muc: k.muc })),
      });
    }
    await db.game.update({
      where: { id: game.id }, data: { khaiQuyenRiengTu: game.khaiQuyenRiengTu },
    });
  };
  await traLai();
  await db.game.update({ where: { id: game.id }, data: { khaiQuyenRiengTu: false } });

  let admin, thuong, khach;
  try {
    khach = await moTrang();

    // ── Chưa khai: nói thẳng là chưa ai cho biết ──────────────────────
    await khach.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    kiem('trang game có khối Quyền riêng tư',
      (await khach.locator('h2:has-text("Quyền riêng tư")').count()) === 1);
    kiem('chưa khai thì nói rõ là nhà phát triển CHƯA cho biết',
      (await khach.locator('text=/chưa cho biết/').count()) > 0);
    kiem('và KHÔNG nói hộ rằng game không thu thập gì',
      (await khach.locator('text=/không thu thập dữ liệu nào/').count()) === 0);

    // ── Khai rồi mà không tích ô nào = lời hứa "không thu thập gì" ────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });

    const oTich = admin.locator('input[name^="o-"]');
    kiem('bảng khai có đủ mười nhóm nhân ba mức',
      (await oTich.count()) === LOAI.length * MUC.length,
      `đếm được ${await oTich.count()}`);

    await admin.click('button:has-text("Lưu quyền riêng tư")');
    const daKhai = await doiToi(async () =>
      (await db.game.findUnique({ where: { id: game.id }, select: { khaiQuyenRiengTu: true } }))
        ?.khaiQuyenRiengTu === true);
    kiem('bấm lưu mà không tích ô nào vẫn tính là ĐÃ KHAI', daKhai);
    kiem('và không sinh ra hàng dữ liệu nào',
      (await db.duLieuThuThap.count({ where: { gameId: game.id } })) === 0);

    await khach.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    kiem('khai rỗng thì trang game nói game không thu thập dữ liệu nào',
      (await khach.locator('text=/không thu thập dữ liệu nào/').count()) > 0);

    // ── Tích mấy ô rồi lưu ────────────────────────────────────────────
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    await admin.check('input[name="o-VI_TRI-THEO_DOI"]');
    await admin.check('input[name="o-CHAN_DOAN-KHONG_LIEN_KET"]');
    await admin.click('button:has-text("Lưu quyền riêng tư")');
    const daGhi = await doiToi(async () =>
      (await db.duLieuThuThap.count({ where: { gameId: game.id } })) === 2);
    kiem('tích hai ô thì ghi đúng hai hàng', daGhi,
      `${await db.duLieuThuThap.count({ where: { gameId: game.id } })} hàng`);

    await khach.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    kiem('trang game bày đúng nhóm vừa khai',
      (await khach.locator('text=Vị trí').count()) > 0
      && (await khach.locator('text=Chẩn đoán').count()) > 0);
    kiem('và xếp mức nặng nhất lên trước',
      (await khach.locator('text=/Dữ liệu dùng để theo dõi bạn/').count()) > 0);

    // ── Bỏ tích rồi lưu lại thì lời khai cũ phải RÚT ĐƯỢC ─────────────
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    await admin.uncheck('input[name="o-VI_TRI-THEO_DOI"]');
    await admin.click('button:has-text("Lưu quyền riêng tư")');
    const daRut = await doiToi(async () =>
      (await db.duLieuThuThap.count({ where: { gameId: game.id, loai: 'VI_TRI' } })) === 0);
    kiem('bỏ tích thì lời khai cũ bị rút, không nằm lại', daRut);
    kiem('ô còn tích thì vẫn còn',
      (await db.duLieuThuThap.count({ where: { gameId: game.id, loai: 'CHAN_DOAN' } })) === 1);

    // ── Lưu hai lần liền không đẻ hàng trùng ──────────────────────────
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    await admin.click('button:has-text("Lưu quyền riêng tư")');
    await admin.waitForTimeout(1500);
    kiem('lưu lại lần nữa không đẻ hàng trùng',
      (await db.duLieuThuThap.count({ where: { gameId: game.id } })) === 1);

    /*
     * ── Thành viên thường PHÁT LẠI yêu cầu lưu ────────────────────────
     *
     * `luuQuyenRiengTu` là một địa chỉ POST công khai. Bảng này là thứ người
     * tải dựa vào để quyết định có tải hay không, nên ai cũng sửa được thì nó
     * còn tệ hơn là không có bảng nào.
     */
    thuong = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    let donHang = null;
    admin.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      delete dau.cookie;
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });
    await admin.check('input[name="o-DANH_BA-LIEN_KET"]');
    await admin.click('button:has-text("Lưu quyền riêng tư")');
    await doiToi(async () => !!donHang);
    kiem('bắt được yêu cầu lưu để phát lại', !!donHang?.than);

    if (donHang) {
      /*
       * CHỜ CÚ LƯU CỦA QUẢN TRỊ XONG HẲN rồi mới đếm mốc.
       *
       * `doiToi` ở trên chỉ chờ yêu cầu được GỬI ĐI, không chờ máy chủ ghi
       * xong. Đếm ngay lúc ấy là lấy phải con số trước khi hàng của quản trị
       * kịp vào bảng, rồi lát sau nó vào — và mục kiểm báo "thành viên thường
       * ghi được", một lỗ hổng bảo mật không hề tồn tại. Đã đỏ đúng kiểu ấy
       * một lần lúc dựng bài này.
       */
      await doiToi(async () =>
        (await db.duLieuThuThap.count({ where: { gameId: game.id, loai: 'DANH_BA' } })) === 1);
      const truoc = await db.duLieuThuThap.count({ where: { gameId: game.id } });
      const ma = await thuong.evaluate(async ({ dia, dau, than }) => {
        const r = await fetch(dia, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, donHang);
      await thuong.waitForTimeout(1200);
      const sau = await db.duLieuThuThap.count({ where: { gameId: game.id } });
      kiem('thành viên thường phát lại yêu cầu lưu thì không ăn',
        sau === truoc, `máy trả ${ma}, ${truoc} → ${sau}`);
    }
  } finally {
    if (admin) await admin.close();
    if (thuong) await thuong.close();
    if (khach) await khach.close();
    await traLai();
  }
}
