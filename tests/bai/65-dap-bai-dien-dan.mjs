import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';
import { rutGon } from '../../src/lib/trich-dan-const.ts';

const TIEU_DE = 'Chủ đề kiểm thử đáp bài';

/**
 * Đáp thẳng vào MỘT BÀI trong chủ đề, không chỉ trả lời chung.
 *
 * Diễn đàn ở đây là một dải bài phẳng xếp theo thời gian, nên chủ đề đông
 * người thì đọc mãi không ra ai đang đáp ai. Bài kiểm canh ba chuyện:
 *
 *   • trích đúng bài — và con trỏ ấy phải nằm trong CƠ SỞ DỮ LIỆU, không phải
 *     một mẩu chữ chép vào bài mới, kẻo sửa bài gốc xong mẩu trích thành sai;
 *   • trỏ sang bài ở CHỦ ĐỀ KHÁC thì bị chối — `traLoiChoId` đi kèm biểu mẫu
 *     nên ai cũng sửa được, mà lọt thì người bị trỏ tới nhận một thông báo dẫn
 *     về một chủ đề họ chưa từng đặt chân vào;
 *   • xoá bài gốc thì bài đáp PHẢI Ở LẠI — `Cascade` ở đây là một người xoá
 *     bài của mình rồi kéo theo chữ của người khác.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  const a = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true, tenHienThi: true },
  });
  const b = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'huytran' }, select: { id: true },
  });
  if (!game || !a || !b) { kiem('có dữ liệu mẫu', false); return; }

  const don = async () => {
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: TIEU_DE } }, select: { id: true },
    });
    await db.traLoi.deleteMany({ where: { chuDeId: { in: cu.map((c) => c.id) } } });
    await db.chuDe.deleteMany({ where: { tieuDe: { startsWith: TIEU_DE } } });
    await db.thongBao.deleteMany({ where: { chiTiet: { startsWith: TIEU_DE } } });
  };
  await don();

  let p, khach;
  try {
    const chuDe = await db.chuDe.create({
      data: { gameId: game.id, nguoiId: b.id, tieuDe: TIEU_DE, noiDung: 'Nội dung để kiểm.' },
      select: { id: true },
    });
    // Một chủ đề THỨ HAI, để thử cú trỏ chéo chủ đề.
    const chuDeKhac = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: b.id,
        tieuDe: `${TIEU_DE} — chủ đề khác`, noiDung: 'Nội dung khác.',
      },
      select: { id: true },
    });
    const GOC_BAI = 'Mình kẹt ở màn năm, con trùm cứ hồi máu mãi.';
    const baiGoc = await db.traLoi.create({
      data: { chuDeId: chuDe.id, nguoiId: a.id, noiDung: GOC_BAI }, select: { id: true },
    });
    const baiChuDeKhac = await db.traLoi.create({
      data: { chuDeId: chuDeKhac.id, nguoiId: a.id, noiDung: 'Bài ở chủ đề khác.' },
      select: { id: true },
    });

    const dia = `${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`;
    p = await moTrangDaDangNhap('huytran', 'thanhvien123');

    // ── Nút Trả lời dẫn tới ô soạn, mang theo bài đang đáp ─────────────
    await p.goto(dia, { waitUntil: 'networkidle' });
    kiem('mỗi bài có lối đáp thẳng',
      (await p.locator(`a[href*="dap=${baiGoc.id}"]`).count()) > 0);

    await p.goto(`${dia}?dap=${baiGoc.id}#soan`, { waitUntil: 'networkidle' });
    kiem('ô soạn bày mẩu trích của bài đang đáp',
      (await p.locator('text=Đang đáp').count()) > 0
      && (await p.locator(`text=${rutGon(GOC_BAI)}`).count()) > 0);
    kiem('và mang theo con trỏ trong biểu mẫu',
      (await p.inputValue('input[name="traLoiChoId"]')) === baiGoc.id);

    await p.fill('textarea[name="noiDung"]', 'Đánh vào đuôi nó lúc nó đang hồi máu.');
    await p.click('button:has-text("Gửi trả lời")');
    const daDap = await doiToi(async () =>
      (await db.traLoi.count({ where: { chuDeId: chuDe.id, traLoiChoId: baiGoc.id } })) === 1);
    kiem('gửi xong thì con trỏ nằm trong cơ sở dữ liệu', daDap);

    await p.goto(dia, { waitUntil: 'networkidle' });
    kiem('trang in dòng trích ngay trên bài đáp',
      (await p.locator(`a[href="#tl-${baiGoc.id}"]`).count()) > 0);

    /*
     * MẨU TRÍCH DỰNG LẠI TỪ BÀI GỐC, không chép cứng lúc gửi.
     *
     * Chép cứng thì người viết sửa bài của mình xong, mẩu trích vẫn nhắc lại
     * câu cũ — thành ra bịa lời cho họ. Sửa bài gốc rồi xem trang là biết ngay.
     */
    await db.traLoi.update({
      where: { id: baiGoc.id }, data: { noiDung: 'Mình sửa lại: kẹt ở màn bảy.' },
    });
    await p.goto(dia, { waitUntil: 'networkidle' });
    kiem('sửa bài gốc thì mẩu trích đổi theo',
      (await p.locator('text=/kẹt ở màn bảy/').count()) > 0
      && (await p.locator('text=/con trùm cứ hồi máu/').count()) === 0);

    // ── Người bị đáp nhận thông báo riêng ──────────────────────────────
    const tin = await db.thongBao.findFirst({
      where: { nguoiId: a.id, loai: 'DAP_BAI_CUA_BAN' },
      orderBy: { taoLuc: 'desc' }, select: { duongDan: true },
    });
    kiem('người bị đáp nhận thông báo riêng', !!tin);
    kiem('thông báo dẫn thẳng tới bài đáp',
      (tin?.duongDan ?? '').includes('#tl-'), tin?.duongDan ?? '');

    // ── Trỏ sang bài ở chủ đề khác thì bị chối ─────────────────────────
    await p.goto(dia, { waitUntil: 'networkidle' });
    await p.evaluate((id) => {
      const f = document.querySelector('form:has(textarea[name="noiDung"])');
      const o = document.createElement('input');
      o.type = 'hidden'; o.name = 'traLoiChoId'; o.value = id;
      f.appendChild(o);
    }, baiChuDeKhac.id);
    await p.fill('textarea[name="noiDung"]', 'Bài trỏ chéo chủ đề.');
    await p.click('button:has-text("Gửi trả lời")');
    const daGui = await doiToi(async () =>
      (await db.traLoi.count({
        where: { chuDeId: chuDe.id, noiDung: 'Bài trỏ chéo chủ đề.' },
      })) === 1);
    kiem('bài vẫn gửi được', daGui);
    const cheo = await db.traLoi.findFirst({
      where: { chuDeId: chuDe.id, noiDung: 'Bài trỏ chéo chủ đề.' },
      select: { traLoiChoId: true },
    });
    kiem('nhưng con trỏ sang chủ đề khác bị bỏ đi',
      cheo?.traLoiChoId === null, String(cheo?.traLoiChoId));

    // ── Xoá bài gốc thì bài đáp ở lại ──────────────────────────────────
    await db.traLoi.delete({ where: { id: baiGoc.id } });
    const conLai = await db.traLoi.count({ where: { chuDeId: chuDe.id } });
    kiem('xoá bài gốc thì bài đáp KHÔNG chết theo', conLai === 2, `còn ${conLai} bài`);
    const motBai = await db.traLoi.findFirst({
      where: { chuDeId: chuDe.id, noiDung: { startsWith: 'Đánh vào đuôi' } },
      select: { traLoiChoId: true },
    });
    kiem('và con trỏ của nó thành rỗng chứ không trỏ vào hư không',
      motBai?.traLoiChoId === null);

    /*
     * ── NHÃN VAI PHẢI ĐÚNG NGƯỜI ──────────────────────────────────────
     *
     * Nhãn "Quản trị" đổi hẳn trọng lượng một câu trả lời — người đọc tin nó
     * hơn hẳn. Gắn nhầm lên một người thường thì đó không còn là lỗi trình bày
     * nữa, mà là cho một người mượn danh ban quản trị ngay giữa diễn đàn.
     */
    const admin = await db.nguoiDung.findFirst({
      where: { vaiTro: 'QUAN_TRI' }, select: { id: true, tenHienThi: true },
    });
    const baiQuanTri = await db.traLoi.create({
      data: { chuDeId: chuDe.id, nguoiId: admin.id, noiDung: 'Bản 1.2 đã chỉnh chỗ này.' },
      select: { id: true },
    });
    await p.goto(dia, { waitUntil: 'networkidle' });

    const nhanCuaQuanTri = await p.locator(`#tl-${baiQuanTri.id}`).textContent();
    kiem('bài của quản trị mang nhãn Quản trị',
      (nhanCuaQuanTri ?? '').includes('Quản trị'));

    // Dựng lấy một bài của người thường thay vì đi tìm: mấy bài của `a` ở
    // trên đã bị chính bài kiểm này xoá đi để thử chuyện khác.
    const baiThuong = await db.traLoi.create({
      data: { chuDeId: chuDe.id, nguoiId: a.id, noiDung: 'Bài của thành viên thường.' },
      select: { id: true },
    });
    await p.goto(dia, { waitUntil: 'networkidle' });
    const nhanCuaThuong = await p.locator(`#tl-${baiThuong.id}`).textContent();
    kiem('bài của thành viên thường KHÔNG mang nhãn Quản trị',
      !(nhanCuaThuong ?? '').includes('Quản trị'), (nhanCuaThuong ?? '').slice(0, 80));
    kiem('và cũng không mang nhãn Người mở, vì họ không mở chủ đề này',
      !(nhanCuaThuong ?? '').includes('Người mở'));

    await db.traLoi.delete({ where: { id: baiQuanTri.id } });

    // ── Khách không thấy lối đáp ───────────────────────────────────────
    khach = await moTrang();
    await khach.goto(dia, { waitUntil: 'networkidle' });
    kiem('khách chưa đăng nhập thì không bày lối đáp',
      (await khach.locator('a[href*="dap="]').count()) === 0);
  } finally {
    if (p) await p.close();
    if (khach) await khach.close();
    await don();
  }
}
