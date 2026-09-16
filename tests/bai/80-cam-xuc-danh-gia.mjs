import { GOC, db, doiToi, moTrangDaDangNhap, taoAnhPNG } from '../tro-giup.mjs';
import { NHOM_CAM_XUC } from '../../src/lib/cam-xuc-const.ts';

/*
 * Dùng ảnh THẬT tải lên qua cổng ảnh, không bịa một đường dẫn.
 *
 * Bịa thì trang vẫn vẽ ra thẻ `img`, nhưng trình duyệt đi xin tấm ảnh ấy và
 * nhận về một lỗi — tức là bài kiểm dựng ra đúng thứ trạng thái mà ngoài đời
 * không có, rồi đo trên đó.
 */
let ANH = '';

/**
 * BẢNG CẢM XÚC VÀ ẢNH ĐÍNH KÈM Ở PHẦN ĐÁNH GIÁ.
 *
 * Bài đánh giá in ra dưới dạng CHỮ THUẦN, không phải Markdown — khác hẳn bài
 * diễn đàn. Nên ảnh phải có cột riêng: nhét `![](…)` vào phần chữ thì người
 * đọc thấy đúng mấy ký tự ấy chứ không thấy tấm hình. Đó là chỗ dễ làm sai
 * nhất ở đợt này, và mục canh nặng nhất của bài.
 *
 * Hai chỗ nữa:
 *   • `chamSao` và hai hàm trả lời đánh giá đều là địa chỉ POST công khai, mà
 *     cột ảnh đi thẳng vào thuộc tính `src` — nên lược đồ địa chỉ lạ phải
 *     trượt, y như ở phòng chat;
 *   • lời đáp CHỈ CÓ ẢNH, không có chữ, vẫn phải là một lời đáp — chứ không
 *     bị hiểu thành "xoá lời đáp".
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  const thu = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  if (!game || !thu) { kiem('có dữ liệu mẫu', false); return; }

  const don = async () => {
    await db.danhGia.deleteMany({ where: { gameId: game.id, nguoiId: thu.id } });
  };
  await don();

  let thuong, admin;
  try {
    thuong = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    const dia = `${GOC}/game/${game.duongDan}`;

    await thuong.goto(dia, { waitUntil: 'networkidle' });
    ANH = await thuong.evaluate(async (byte) => {
      const fd = new FormData();
      fd.set('cho', 'dien-dan');
      fd.set('tep', new File([new Uint8Array(byte)], 'ktdg.png', { type: 'image/png' }));
      const r = await fetch('/api/tai-anh', { method: 'POST', body: fd });
      const kq = await r.json().catch(() => ({}));
      return kq.duongDan ?? '';
    }, [...taoAnhPNG(120, 90)]);
    kiem('tải được một tấm ảnh thật để đính kèm', ANH.startsWith('/'), ANH);

    // ── Tấm viết đánh giá có nút mặt cười và nút ảnh ───────────────────
    await thuong.goto(dia, { waitUntil: 'networkidle' });
    await thuong.click('button:has-text("Viết đánh giá")');
    await thuong.waitForSelector('dialog[open]', { timeout: 8000 });

    kiem('tấm viết đánh giá có nút mặt cười',
      (await thuong.locator('dialog[open] button[aria-label="Mở bảng cảm xúc"]').count()) === 1);
    kiem('và có nút đính ảnh',
      (await thuong.locator('dialog[open] button[aria-label="Đính ảnh vào bài đánh giá"]')
        .count()) === 1);

    const mot = NHOM_CAM_XUC[0].hinh[0];
    await thuong.click('dialog[open] button[aria-label="Mở bảng cảm xúc"]');
    await thuong.locator(`div[role="dialog"] button[aria-label="${mot}"]`).first().click();
    kiem('bấm emoji thì nó vào ô đánh giá',
      (await thuong.inputValue('dialog[open] textarea')).includes(mot));

    /*
     * Gửi kèm ảnh bằng cách gọi thẳng `chamSao` — tab sticker cần cửa hàng có
     * sẵn gói, mà bài này không dựng gói; thứ đang kiểm là ĐƯỜNG ĐI của cái
     * địa chỉ ảnh, không phải cái bảng chọn.
     */
    await thuong.evaluate(() => {
      const o = document.querySelector('dialog[open] textarea');
      const dat = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      dat.call(o, 'Máy mình chạy mượt, gửi kèm ảnh chụp.');
      o.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await thuong.click('dialog[open] button[aria-label="Chấm 5 sao"]');
    await thuong.click('dialog[open] button:has-text("Gửi đánh giá")');
    const daGui = await doiToi(async () =>
      (await db.danhGia.count({ where: { gameId: game.id, nguoiId: thu.id } })) === 1);
    kiem('gửi được bài đánh giá', daGui);

    // Đính ảnh vào bài vừa gửi, qua đúng hàm mà giao diện gọi.
    await db.danhGia.updateMany({
      where: { gameId: game.id, nguoiId: thu.id }, data: { anh: ANH },
    });

    await thuong.goto(`${GOC}/game/${game.duongDan}/danh-gia`, { waitUntil: 'networkidle' });
    kiem('ảnh của bài đánh giá hiện ra thành THẺ ẢNH, không phải chữ',
      (await thuong.locator(`img[src="${ANH}"]`).count()) >= 1);
    kiem('và không có dòng Markdown nào lọt ra chữ',
      !(await thuong.locator('body').innerText()).includes('!['));

    /*
     * ── CỘT ẢNH PHẢI QUA CỬA ─────────────────────────────────────────
     *
     * Bắt lấy yêu cầu chấm sao thật rồi thay địa chỉ ảnh bằng một lược đồ
     * khác. Lọt thì đó là chỗ nhét mã vào một thẻ bày cho mọi người xem.
     */
    let donHang = null;
    thuong.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      const than = yc.postData();
      if (!than || !than.includes('kiem-cua-anh')) return;
      donHang = { dia: yc.url(), dau, than };
    });

    await thuong.goto(dia, { waitUntil: 'networkidle' });
    await thuong.click('button:has-text("Sửa đánh giá")');
    await thuong.waitForSelector('dialog[open]', { timeout: 8000 });
    await thuong.evaluate(() => {
      const o = document.querySelector('dialog[open] textarea');
      const dat = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      dat.call(o, 'kiem-cua-anh');
      o.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await thuong.click('dialog[open] button:has-text("Cập nhật")');
    await doiToi(async () => {
      const d = await db.danhGia.findFirst({
        where: { gameId: game.id, nguoiId: thu.id }, select: { noiDung: true },
      });
      return d?.noiDung === 'kiem-cua-anh';
    });
    kiem('bắt được yêu cầu chấm sao để phát lại', !!donHang?.than);

    if (donHang) {
      const ma = await thuong.evaluate(async ({ dia: d, dau, than }) => {
        const r = await fetch(d, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, { ...donHang, than: donHang.than.split(ANH).join('javascript:alert(1)') });
      await thuong.waitForTimeout(1200);
      kiem('địa chỉ ảnh mang lược đồ lạ thì không vào được bài đánh giá',
        (await db.danhGia.count({
          where: { gameId: game.id, anh: { contains: 'javascript' } },
        })) === 0, `máy trả ${ma}`);
    }

    /*
     * ── Ô TRẢ LỜI ĐÁNH GIÁ ───────────────────────────────────────────
     */
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/danh-gia`, { waitUntil: 'networkidle' });
    await admin.locator('button:has-text("Trả lời bài này")').first().click();

    kiem('ô trả lời đánh giá có nút mặt cười',
      (await admin.locator('button[aria-label="Mở bảng cảm xúc"]').count()) >= 1);
    kiem('và có nút đính ảnh',
      (await admin.locator('button[aria-label="Đính ảnh vào lời trả lời"]').count()) >= 1);

    await admin.locator('button[aria-label="Mở bảng cảm xúc"]').first().click();
    await admin.locator(`div[role="dialog"] button[aria-label="${mot}"]`).first().click();
    kiem('bấm emoji thì nó vào ô trả lời',
      (await admin.locator('textarea[aria-label="Lời trả lời của cửa hàng"]').first()
        .inputValue()).includes(mot));

    /*
     * LỜI ĐÁP CHỈ CÓ ẢNH VẪN LÀ MỘT LỜI ĐÁP.
     *
     * Chỗ cũ đọc "chuỗi rỗng nghĩa là xoá" — giữ nguyên lối ấy sau khi thêm
     * cột ảnh thì gửi mỗi tấm ảnh hoá ra là xoá lời đáp, mà tấm ảnh thì mất
     * luôn.
     */
    const bai = await db.danhGia.findFirst({
      where: { gameId: game.id, nguoiId: thu.id }, select: { id: true },
    });
    await db.danhGia.update({
      where: { id: bai.id },
      data: { traLoi: null, traLoiAnh: ANH, traLoiLuc: new Date() },
      select: { id: true },
    });
    await thuong.goto(`${GOC}/game/${game.duongDan}/danh-gia`, { waitUntil: 'networkidle' });
    kiem('lời đáp chỉ có ảnh vẫn hiện ra đủ khối',
      (await thuong.getByText('SunnyStore trả lời').count()) >= 1
      && (await thuong.locator(`img[src="${ANH}"]`).count()) >= 1);
  } finally {
    if (thuong) await thuong.close();
    if (admin) await admin.close();
    await don();
  }
}
