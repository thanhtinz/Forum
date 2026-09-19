import { GOC, LOI, boNhipDienDan, db, doiToi, moTrangDaDangNhap, tuDongXacNhan } from '../tro-giup.mjs';
import { MUC_CHUNG, TEN_TOI_DA } from '../../src/lib/chuyen-muc-const.ts';

const DAU = 'Ktmuc';

/**
 * CHUYÊN MỤC DIỄN ĐÀN — dựng một lần ở khu quản trị, dùng cho mọi game.
 *
 * Cả tính năng đứng trên đúng một câu: **bảng chuyên mục dùng chung, còn con
 * số thì của riêng từng game**. Câu ấy sai thì sai lặng lẽ — bảng vẫn hiện,
 * vẫn bấm được, chỉ là con số của game này lại đếm cả chuyện của game kia. Nên
 * mấy mục nặng nhất ở đây là mục ĐẾM CHÉO GIỮA HAI GAME.
 *
 * Mấy chỗ đáng canh khác:
 *   • `luuChuyenMuc` là địa chỉ POST công khai — thành viên thường phát lại
 *     yêu cầu phải trượt, không thì ai cũng dựng được mục cho cả cửa hàng;
 *   • cổng ảnh `chuyen-muc` chỉ mở cho quản trị;
 *   • xoá một mục thì chủ đề bên trong KHÔNG được biến mất theo — bên trong là
 *     bài của hàng chục người khác;
 *   • mã `chung` là của mục dựng sẵn, không cho một mục thật chiếm mất.
 */
export default async function chay(kiem) {
  const game = await db.game.findMany({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    take: 2, select: { id: true, duongDan: true },
  });
  if (game.length < 2) { kiem('có hai game mẫu', false); return; }
  const [gA, gB] = game;
  const nguoi = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  if (!nguoi) { kiem('có thành viên mẫu', false); return; }

  const don = async () => {
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: DAU } }, select: { id: true },
    });
    const id = cu.map((c) => c.id);
    await db.traLoi.deleteMany({ where: { chuDeId: { in: id } } });
    await db.theoDoiChuDe.deleteMany({ where: { chuDeId: { in: id } } });
    await db.chuDe.deleteMany({ where: { id: { in: id } } });
    await db.chuyenMuc.deleteMany({ where: { ten: { startsWith: DAU } } });
  };
  await don();

  let admin, thuong;
  try {
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    thuong = await moTrangDaDangNhap('anhthu', 'thanhvien123');

    // ── Quản trị dựng chuyên mục qua biểu mẫu ─────────────────────────
    await admin.goto(`${GOC}/quan-tri/chuyen-muc`, { waitUntil: 'networkidle' });
    await admin.fill('input[name="ten"]', `${DAU} Hỏi đáp`);
    await admin.fill('input[name="moTa"]', 'Kẹt màn nào thì hỏi ở đây');
    await admin.click('button:has-text("Thêm chuyên mục")');
    const daTao = await doiToi(async () =>
      (await db.chuyenMuc.count({ where: { ten: `${DAU} Hỏi đáp` } })) === 1);
    kiem('quản trị dựng được chuyên mục', daTao);

    const muc = await db.chuyenMuc.findFirst({
      where: { ten: `${DAU} Hỏi đáp` },
      select: { id: true, duongDan: true, moTa: true },
    });
    kiem('bỏ trống đường dẫn thì tự suy ra từ tên',
      muc?.duongDan === 'ktmuc-hoi-dap', muc?.duongDan ?? '');

    /*
     * ── MÃ `chung` LÀ CỦA MỤC DỰNG SẴN ───────────────────────────────
     *
     * Lọt một mục thật mang đúng mã ấy thì `?muc=chung` trỏ vào hai chỗ, và
     * mấy chủ đề chưa xếp mục không còn lối nào mở ra.
     */
    await admin.fill('input[name="ten"]', `${DAU} Chiếm chỗ`);
    await admin.fill('input[name="duongDan"]', MUC_CHUNG);
    await admin.click('button:has-text("Thêm chuyên mục")');
    await admin.waitForSelector(LOI, { timeout: 5000 }).catch(() => {});
    kiem(`không ai chiếm được mã “${MUC_CHUNG}” của mục dựng sẵn`,
      (await db.chuyenMuc.count({ where: { duongDan: MUC_CHUNG } })) === 0);

    // ── Trùng tên thì chối ────────────────────────────────────────────
    await admin.goto(`${GOC}/quan-tri/chuyen-muc`, { waitUntil: 'networkidle' });
    await admin.fill('input[name="ten"]', `${DAU} hỏi đáp`);
    await admin.click('button:has-text("Thêm chuyên mục")');
    await admin.waitForSelector(LOI, { timeout: 5000 }).catch(() => {});
    kiem('trùng tên (không kể hoa thường) thì chối',
      (await db.chuyenMuc.count({ where: { ten: { startsWith: DAU } } })) === 1);

    kiem(`tên dài quá ${TEN_TOI_DA} chữ thì ô nhập chặn sẵn`,
      (await admin.getAttribute('input[name="ten"]', 'maxlength')) === String(TEN_TOI_DA));

    /*
     * ── THÀNH VIÊN THƯỜNG PHÁT LẠI YÊU CẦU ───────────────────────────
     *
     * Giao diện không bày lối, nhưng `luuChuyenMuc` là một địa chỉ POST công
     * khai. Lọt thì ai cũng dựng được chuyên mục cho cả cửa hàng.
     */
    let donHang = null;
    admin.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      delete dau.cookie;
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });
    await admin.goto(`${GOC}/quan-tri/chuyen-muc`, { waitUntil: 'networkidle' });
    await admin.fill('input[name="ten"]', `${DAU} Mẹo hay`);
    await admin.click('button:has-text("Thêm chuyên mục")');
    await doiToi(async () =>
      (await db.chuyenMuc.count({ where: { ten: { startsWith: DAU } } })) === 2);
    kiem('bắt được yêu cầu dựng mục để phát lại', !!donHang?.than);

    if (donHang) {
      await db.chuyenMuc.deleteMany({ where: { ten: `${DAU} Mẹo hay` } });
      const ma = await thuong.evaluate(async ({ dia, dau, than }) => {
        const r = await fetch(dia, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, donHang);
      await thuong.waitForTimeout(1200);
      kiem('thành viên thường phát lại thì không dựng được chuyên mục',
        (await db.chuyenMuc.count({ where: { ten: `${DAU} Mẹo hay` } })) === 0,
        `máy trả ${ma}`);
    }

    // ── Cổng ảnh của chuyên mục chỉ mở cho quản trị ───────────────────
    const maAnh = await thuong.evaluate(async () => {
      const fd = new FormData();
      fd.set('cho', 'chuyen-muc');
      fd.set('tep', new File([new Uint8Array(64)], 'a.png', { type: 'image/png' }));
      const r = await fetch('/api/tai-anh', { method: 'POST', body: fd });
      return r.status;
    });
    kiem('thành viên thường không tải được ảnh chuyên mục', maAnh === 403, `máy trả ${maAnh}`);

    /*
     * ── BẢNG CHUNG, CON SỐ RIÊNG ─────────────────────────────────────
     *
     * Đây là mục nặng nhất của cả bài: hai game, cùng một chuyên mục, mà số
     * chủ đề phải đếm riêng. Quên `gameId` trong phép đếm thì bảng vẫn hiện
     * đẹp đẽ ở cả hai nơi, chỉ là cùng một con số — nhìn bằng mắt không ra.
     */
    const taoChuDe = async (gameId, so, mucId) => {
      for (let i = 0; i < so; i++) {
        const c = await db.chuDe.create({
          data: {
            gameId, nguoiId: nguoi.id, chuyenMucId: mucId,
            tieuDe: `${DAU} chuyện ${gameId.slice(0, 4)} ${i}`, noiDung: 'Nội dung kiểm thử.',
            soTraLoi: 1,
          },
          select: { id: true },
        });
        await db.traLoi.create({
          data: { chuDeId: c.id, nguoiId: nguoi.id, noiDung: 'Một lời đáp.' },
          select: { id: true },
        });
      }
    };
    await taoChuDe(gA.id, 3, muc.id);
    await taoChuDe(gB.id, 1, muc.id);

    const hang = (p) => p.locator(`section[aria-label="Chuyên mục"] li:has-text("${DAU} Hỏi đáp")`);

    await thuong.goto(`${GOC}/game/${gA.duongDan}/dien-dan`, { waitUntil: 'networkidle' });
    kiem('diễn đàn game nào cũng bày bảng chuyên mục',
      (await thuong.locator('section[aria-label="Chuyên mục"]').count()) === 1);
    const chuA = await hang(thuong).innerText();
    kiem('mô tả của mục hiện ngay trong bảng', chuA.includes('Kẹt màn nào thì hỏi ở đây'));
    /*
     * So con số ĐI LIỀN với cái nhãn của nó, không so số trần trong cả ô chữ.
     *
     * Ô chữ này còn mang tên mục, dòng mô tả và cả "3 phút trước" của cột bài
     * mới — bắt số trần thì một con số lạc ở đâu đó cũng làm mục kiểm xanh,
     * mà xanh kiểu ấy thì nó không còn canh gì nữa.
     */
    const soCua = (chu, nhan) => {
      const m = chu.match(new RegExp(`(\\d+)\\s*\\n\\s*${nhan}`));
      return m ? Number(m[1]) : null;
    };
    kiem('game A đếm đúng 3 chủ đề của riêng nó',
      soCua(chuA, 'chủ đề') === 3, chuA.replace(/\n/g, ' | '));
    kiem('số bài cộng cả lời đáp, ra 6',
      soCua(chuA, 'bài') === 6, chuA.replace(/\n/g, ' | '));

    await thuong.goto(`${GOC}/game/${gB.duongDan}/dien-dan`, { waitUntil: 'networkidle' });
    const chuB = await hang(thuong).innerText();
    kiem('vẫn đúng bảng chuyên mục ấy ở game B',
      (await hang(thuong).count()) === 1);
    kiem('nhưng game B đếm riêng, ra 1 chủ đề và 2 bài',
      soCua(chuB, 'chủ đề') === 1 && soCua(chuB, 'bài') === 2,
      chuB.replace(/\n/g, ' | '));

    // ── Bấm vào mục thì chỉ ra chuyện của game đang xem ───────────────
    await thuong.goto(`${GOC}/game/${gA.duongDan}/dien-dan?muc=${muc.duongDan}`,
      { waitUntil: 'networkidle' });
    kiem('vào trong mục thì đầu trang là tên mục',
      (await thuong.locator(`h2:text("${DAU} Hỏi đáp")`).count()) === 1);
    kiem('trong mục chỉ có chủ đề của game đang xem',
      (await thuong.locator('ul[aria-label="Danh sách chủ đề"] > li').count()) === 3);
    kiem('vào trong mục rồi thì thôi bày lại cả bảng mục lục',
      (await thuong.locator('section[aria-label="Chuyên mục"]').count()) === 0);

    // ── Mã lạ thì coi như chưa chọn mục nào, không phải trang trống ───
    await thuong.goto(`${GOC}/game/${gA.duongDan}/dien-dan?muc=khong-co-muc-nay`,
      { waitUntil: 'networkidle' });
    kiem('mã mục lạ thì lùi về cửa diễn đàn, không ra trang trống',
      (await thuong.locator('section[aria-label="Chuyên mục"]').count()) === 1);

    // ── Đăng bài chọn được mục ────────────────────────────────────────
    await thuong.goto(`${GOC}/game/${gA.duongDan}/dien-dan/dang`, { waitUntil: 'networkidle' });
    await thuong.selectOption('select[name="chuyenMuc"]', muc.duongDan);
    await thuong.fill('input[name="tieuDe"]', `${DAU} bài đăng qua biểu mẫu`);
    await thuong.fill('textarea[name="noiDung"]', 'Nội dung đủ dài cho phép kiểm.');
    // Nhịp nghỉ diễn đàn đếm theo NGƯỜI trên toàn cửa hàng, nên bài kiểm
    // chạy trước có thể vừa đăng bằng chính tài khoản này. Xem `boNhipDienDan`.
    await boNhipDienDan(nguoi.id);
    await thuong.click('button:has-text("Đăng chủ đề")');
    const daDang = await doiToi(async () =>
      (await db.chuDe.count({
        where: { tieuDe: `${DAU} bài đăng qua biểu mẫu`, chuyenMucId: muc.id },
      })) === 1);
    kiem('đăng bài xếp được vào chuyên mục đã chọn', daDang);

    /*
     * ── XOÁ MỤC THÌ BÀI Ở LẠI ────────────────────────────────────────
     *
     * Lược đồ để `SetNull`. Lỡ tay để `Cascade` thì một cú bấm ở khu quản trị
     * cuốn theo cả cuộc trò chuyện của mấy chục người, mà không có đường lùi.
     */
    const truoc = await db.chuDe.count({ where: { tieuDe: { startsWith: DAU } } });
    await admin.goto(`${GOC}/quan-tri/chuyen-muc`, { waitUntil: 'networkidle' });
    tuDongXacNhan(admin);
    await admin.click(`button[aria-label="Xoá chuyên mục ${DAU} Hỏi đáp"]`);
    const daXoa = await doiToi(async () =>
      (await db.chuyenMuc.count({ where: { id: muc.id } })) === 0);
    kiem('quản trị xoá được chuyên mục', daXoa);
    kiem('xoá mục thì không chủ đề nào mất theo',
      (await db.chuDe.count({ where: { tieuDe: { startsWith: DAU } } })) === truoc);
    kiem('mấy chủ đề ấy rơi về chưa xếp mục, chứ không trỏ vào hư không',
      (await db.chuDe.count({
        where: { tieuDe: { startsWith: DAU }, chuyenMucId: null },
      })) === truoc);

    await thuong.goto(`${GOC}/game/${gA.duongDan}/dien-dan?muc=${MUC_CHUNG}`,
      { waitUntil: 'networkidle' });
    kiem('và vẫn mở ra đọc được ở mục Chung dựng sẵn',
      (await thuong.locator('ul[aria-label="Danh sách chủ đề"] > li').count()) >= 4);
  } finally {
    if (admin) await admin.close();
    if (thuong) await thuong.close();
    await don();
  }
}
