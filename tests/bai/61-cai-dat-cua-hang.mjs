import { db, doiToi, GOC, LOI, moTrangDaDangNhap } from '../tro-giup.mjs';

const TEN = 'Cửa Hàng Kiểm Thử';
// Khu quản trị có mấy thanh lối đi khác cũng trỏ tới `/quan-tri/cai-dat`, nên
// phải chỉ đích danh hàng tab chứ không hỏi chung cả trang.
const THANH = 'nav[aria-label="Nhóm cài đặt"]';
const BI_MAT = 'bi-mat-kiem-thu-khong-duoc-lo-ra';

/**
 * Khu cài đặt: thông tin cửa hàng, gửi thư, kho tệp — mỗi nhóm một tab.
 *
 * Hai chỗ đáng canh nhất, và cả hai đều im lặng lúc hỏng:
 *
 *   • BÍ MẬT KHÔNG ĐƯỢC ĐI NGƯỢC RA TRÌNH DUYỆT. Điền sẵn ô mật khẩu bằng giá
 *     trị cũ là lối viết biểu mẫu quen tay nhất trên đời, mà làm thế là khoá
 *     kho tệp nằm thẳng trong mã nguồn trang — ai ngồi cạnh bấm "Xem nguồn"
 *     cũng đọc được, và không có gì báo là đã lộ.
 *   • Ô BÍ MẬT ĐỂ TRỐNG NGHĨA LÀ GIỮ NGUYÊN. Vì trang không in giá trị cũ ra,
 *     nếu hiểu "trống" là "xoá" thì chỉ cần vào sửa tên thùng rồi bấm Lưu là
 *     mất sạch khoá, mà chẳng ai cố ý làm gì.
 *
 * Chỉ đụng tới nhóm `trang` và ô `biMat` của nhóm `kho`: mấy ô còn lại của kho
 * để trống nên kho tệp vẫn TẮT suốt bài, không có bài kiểm nào sau đó bỗng
 * dưng gửi tệp lên một thùng R2 không tồn tại. Nhóm `thu` thì chỉ thử phần
 * chặn cổng sai — phần ấy hỏng giữa chừng nên không ghi gì.
 */
export default async function chay(kiem) {
  const don = async () =>
    db.caiDat.deleteMany({ where: { khoa: { in: ['trang', 'kho', 'thu'] } } });
  await don();

  let admin, thuong;
  try {
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    thuong = await moTrangDaDangNhap('anhthu', 'thanhvien123');

    // ── Ba tab ────────────────────────────────────────────────────────
    await admin.goto(`${GOC}/quan-tri/cai-dat`, { waitUntil: 'networkidle' });
    for (const [dich, ten] of [
      ['/quan-tri/cai-dat', 'Thông tin trang'],
      ['/quan-tri/cai-dat/thu', 'Gửi thư'],
      ['/quan-tri/cai-dat/kho', 'Kho tệp'],
    ]) {
      kiem(`khu cài đặt có tab "${ten}"`,
        (await admin.locator(`${THANH} a[href="${dich}"]`).count()) > 0);
    }
    kiem('tab đang mở được đánh dấu cho bộ đọc màn hình',
      (await admin.locator(`${THANH} a[aria-current="page"]`).count()) === 1);

    // Chưa lưu gì thì trang phải nói thẳng là đang chạy bằng thứ khác.
    kiem('chưa lưu gì thì trang nói rõ đang lấy từ đâu',
      (await admin.locator('text=/chữ mặc định/').count()) > 0);

    // ── Lưu thông tin cửa hàng ────────────────────────────────────────
    await admin.fill('input[name="ten"]', TEN);
    await admin.fill('textarea[name="moTa"]', 'Câu giới thiệu của bài kiểm.');
    await admin.fill('input[name="emailLienHe"]', 'lienhe-kiemthu@sunnystore.local');
    await admin.click('button:has-text("Lưu thông tin trang")');

    const daLuu = await doiToi(async () => {
      const h = await db.caiDat.findUnique({ where: { khoa: 'trang' }, select: { giaTri: true } });
      return h?.giaTri?.ten === TEN;
    });
    kiem('lưu được tên cửa hàng', daLuu);

    const hangTrang = await db.caiDat.findUnique({
      where: { khoa: 'trang' }, select: { giaTri: true },
    });
    kiem('lưu cả câu giới thiệu và email liên hệ',
      hangTrang?.giaTri?.moTa === 'Câu giới thiệu của bài kiểm.'
      && hangTrang?.giaTri?.emailLienHe === 'lienhe-kiemthu@sunnystore.local',
      JSON.stringify(hangTrang?.giaTri));

    /*
     * ĐỔI TÊN XONG THÌ CẢ CỬA HÀNG PHẢI ĐỔI THEO.
     *
     * Lưu vào cơ sở dữ liệu mà mặt tiền vẫn tên cũ thì thiết lập này vô dụng —
     * và đó đúng là thứ xảy ra nếu quên `revalidatePath('/', 'layout')`, vì
     * tên nằm ở bố cục gốc chứ không ở trang nào.
     */
    await thuong.goto(`${GOC}/`, { waitUntil: 'networkidle' });
    kiem('tên mới hiện ở chân thanh bên của cửa hàng',
      (await thuong.locator(`text=© ${new Date().getFullYear()} ${TEN}`).count()) > 0);
    kiem('tên mới vào luôn tiêu đề thẻ trình duyệt',
      (await thuong.title()).includes(TEN), await thuong.title());
    kiem('có email liên hệ thì chân thanh bên bày lối viết thư',
      (await thuong.locator('a[href="mailto:lienhe-kiemthu@sunnystore.local"]').count()) > 0);

    // ── Bí mật: lưu, không lộ, để trống là giữ ────────────────────────
    await admin.goto(`${GOC}/quan-tri/cai-dat/kho`, { waitUntil: 'networkidle' });
    kiem('chưa có khoá bí mật thì trang nói rõ là chưa có',
      (await admin.locator('text=Chưa có khoá bí mật').count()) > 0);
    kiem('ô bí mật không mang sẵn giá trị nào',
      (await admin.inputValue('input[name="biMat"]')) === '');

    await admin.fill('input[name="biMat"]', BI_MAT);
    await admin.click('button:has-text("Lưu cấu hình kho tệp")');
    const coBiMat = await doiToi(async () => {
      const h = await db.caiDat.findUnique({ where: { khoa: 'kho' }, select: { giaTri: true } });
      return h?.giaTri?.biMat === BI_MAT;
    });
    kiem('lưu được khoá bí mật', coBiMat);

    await admin.reload({ waitUntil: 'networkidle' });
    kiem('có rồi thì trang nói rõ là đã có',
      (await admin.locator('text=Đã có khoá bí mật').count()) > 0);
    kiem('KHOÁ BÍ MẬT KHÔNG NẰM TRONG MÃ NGUỒN TRANG',
      !(await admin.content()).includes(BI_MAT));
    kiem('ô bí mật vẫn trống sau khi đã lưu',
      (await admin.inputValue('input[name="biMat"]')) === '');
    kiem('đã có thì mới bày ô xoá hẳn',
      (await admin.locator('input[name="xoa-biMat"]').count()) === 1);

    // Bấm Lưu mà không đụng ô bí mật — đây là thao tác đời thường nhất, và
    // cũng là thao tác làm mất sạch khoá nếu hiểu "trống" là "xoá".
    await admin.fill('input[name="diaChi"]', 'https://tep-kiemthu.local/');
    await admin.click('button:has-text("Lưu cấu hình kho tệp")');
    const daTrim = await doiToi(async () => {
      const h = await db.caiDat.findUnique({ where: { khoa: 'kho' }, select: { giaTri: true } });
      return h?.giaTri?.diaChi === 'https://tep-kiemthu.local';
    });
    kiem('gạch chéo cuối địa chỉ thùng tự bỏ đi', daTrim);

    const conNguyen = await db.caiDat.findUnique({
      where: { khoa: 'kho' }, select: { giaTri: true },
    });
    kiem('để trống ô bí mật thì GIỮ NGUYÊN cái đang có',
      conNguyen?.giaTri?.biMat === BI_MAT);

    // ── Muốn xoá thì có ô đánh dấu riêng ──────────────────────────────
    await admin.reload({ waitUntil: 'networkidle' });
    await admin.check('input[name="xoa-biMat"]');
    await admin.click('button:has-text("Lưu cấu hình kho tệp")');
    const daXoa = await doiToi(async () => {
      const h = await db.caiDat.findUnique({ where: { khoa: 'kho' }, select: { giaTri: true } });
      return h?.giaTri?.biMat === '';
    });
    kiem('tích ô xoá thì mới xoá thật', daXoa);

    // ── Cổng thư phải là số ───────────────────────────────────────────
    await admin.goto(`${GOC}/quan-tri/cai-dat/thu`, { waitUntil: 'networkidle' });
    await admin.fill('input[name="cong"]', 'năm-tám-bảy');
    await admin.click('button:has-text("Lưu cấu hình thư")');
    await admin.waitForSelector(LOI, { timeout: 8000 }).catch(() => {});
    kiem('cổng không phải số thì báo lỗi',
      (await admin.locator(LOI).count()) > 0);
    kiem('gửi hỏng thì KHÔNG ghi gì vào cấu hình thư',
      (await db.caiDat.count({ where: { khoa: 'thu' } })) === 0);

    /*
     * ── Thành viên thường PHÁT LẠI yêu cầu lưu ────────────────────────
     *
     * `luuCaiDat` nằm trong tệp `'use server'`, tức là một địa chỉ POST công
     * khai: không thấy nút nào vẫn gọi thẳng vào được. Bố cục khu quản trị
     * chặn được GIAO DIỆN chứ chặn không nổi chuyện này.
     */
    let donHang = null;
    admin.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      delete dau.cookie; // bánh quy do ngữ cảnh tự gắn — bỏ ra mới là phép thử
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });
    await admin.goto(`${GOC}/quan-tri/cai-dat`, { waitUntil: 'networkidle' });
    await admin.fill('input[name="ten"]', TEN);
    await admin.click('button:has-text("Lưu thông tin trang")');
    await doiToi(async () => !!donHang);
    kiem('bắt được yêu cầu lưu để phát lại', !!donHang?.than);

    if (donHang) {
      // Đổi tên trong thân yêu cầu để nếu nó lọt thì thấy được ngay.
      const than = donHang.than.replaceAll(TEN, 'Tên Do Kẻ Lạ Đặt');
      const ma = await thuong.evaluate(async ({ dia, dau, than: t }) => {
        const r = await fetch(dia, { method: 'POST', headers: dau, body: t });
        return r.status;
      }, { ...donHang, than });

      const sau = await db.caiDat.findUnique({ where: { khoa: 'trang' }, select: { giaTri: true } });
      kiem('thành viên thường phát lại yêu cầu lưu thì không ăn',
        sau?.giaTri?.ten === TEN, `máy trả về ${ma}, tên = ${sau?.giaTri?.ten}`);
    }
  } finally {
    await don();
    if (admin) await admin.close();
    if (thuong) await thuong.close();
  }
}
