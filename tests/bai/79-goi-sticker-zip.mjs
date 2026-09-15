import { GOC, db, doiToi, moTrangDaDangNhap, taoAnhPNG, taoZip } from '../tro-giup.mjs';
import { docZip } from '../../src/lib/doc-zip.ts';
import { STICKER_MOI_GOI, STICKER_TOI_DA, ZIP_TONG_BUNG } from '../../src/lib/cam-xuc-const.ts';

const DAU = 'Ktzip';

/**
 * TẢI CẢ GÓI STICKER BẰNG MỘT TỆP ZIP, máy chủ tự mở ra.
 *
 * Đây là chỗ cửa hàng nhận một tệp NÉN của người ngoài rồi tự bung ra — tức là
 * mọi con số bên trong tệp đều do người gửi đặt. Nên bài này canh phần đọc zip
 * nhiều hơn là canh phần giao diện:
 *
 *   • TÊN TỆP TRONG ZIP KHÔNG BAO GIỜ thành tên tệp trên đĩa. Thả vào một mục
 *     tên `../../../../etc/passwd.png` mà lọt thì đó là lỗ ghi đè tệp máy chủ.
 *   • BOM NÉN: một tệp zip bé tí bung ra được vài gigabyte. Trần tổng phải
 *     chặn, và chặn bằng con số ĐO ĐƯỢC lúc bung chứ không bằng con số tệp tự
 *     khai.
 *   • Tệp không phải ảnh (readme, thư mục rác của macOS) thì BỎ QUA và đếm
 *     lại, chứ không chối cả gói — gói tải về ngoài đời gói nào cũng có.
 *   • Cổng này chỉ mở cho quản trị.
 */
export default async function chay(kiem) {
  // ── Phần thuần: bộ đọc zip ─────────────────────────────────────────
  const zipThuan = taoZip([
    { ten: 'a.txt', ruot: Buffer.from('xin chao') },
    { ten: 'thu-muc/', ruot: Buffer.alloc(0) },
    { ten: 'b.bin', ruot: Buffer.from([1, 2, 3, 4, 5]) },
  ]);
  const muc = docZip(new Uint8Array(zipThuan), {
    soMucToiDa: 10, moiMucToiDa: 1024, tongToiDa: 4096,
  });
  kiem('đọc được đúng số mục, bỏ qua thư mục', muc.length === 2,
    muc.map((m) => m.ten).join(','));
  kiem('ruột từng mục bung ra đúng nguyên văn',
    Buffer.from(muc[0].ruot).toString() === 'xin chao'
    && [...muc[1].ruot].join(',') === '1,2,3,4,5');

  let neLoi = '';
  try {
    docZip(new Uint8Array(Buffer.from('day khong phai zip dau nhe')), {
      soMucToiDa: 10, moiMucToiDa: 1024, tongToiDa: 4096,
    });
  } catch (e) { neLoi = e.message; }
  kiem('tệp không phải zip thì ném lỗi rõ ràng', neLoi === 'khong-phai-zip', neLoi);

  /*
   * BOM NÉN dựng tại chỗ: một megabyte số 0 nén lại còn hơn một kilobyte.
   * Trần tổng phải chặn nó, và chặn TRƯỚC khi bung hết vào bộ nhớ.
   */
  const bom = taoZip([{ ten: 'bom.png', ruot: Buffer.alloc(1024 * 1024) }]);
  kiem('tệp bom nén quả thật bé mà ruột thì to',
    bom.length < 5 * 1024, `${bom.length} byte`);
  let loiBom = '';
  try {
    docZip(new Uint8Array(bom), { soMucToiDa: 10, moiMucToiDa: 64 * 1024, tongToiDa: 128 * 1024 });
  } catch (e) { loiBom = e.message; }
  kiem('bom nén bị chặn, không bung ra hết', loiBom === 'muc-qua-nang', loiBom);

  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' }, select: { id: true },
  });
  if (!game) { kiem('có game mẫu', false); return; }

  const don = async () => {
    await db.goiSticker.deleteMany({ where: { ten: { startsWith: DAU } } });
  };
  await don();

  let admin, thuong;
  try {
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    thuong = await moTrangDaDangNhap('anhthu', 'thanhvien123');

    const goi = await db.goiSticker.create({
      data: { ten: `${DAU} Gói zip`, thuTu: 10 }, select: { id: true },
    });

    /*
     * ── GÓI THẬT: BA ẢNH, MỘT README, MỘT TÊN ĐI LÙI THƯ MỤC ─────────
     */
    const goiThat = taoZip([
      { ten: '02.png', ruot: taoAnhPNG(80, 80) },
      { ten: '01.png', ruot: taoAnhPNG(70, 70) },
      { ten: 'readme.txt', ruot: Buffer.from('Bộ sticker vẽ bởi ai đó') },
      { ten: '__MACOSX/._01.png', ruot: Buffer.from([0, 0, 0, 0]) },
      { ten: '../../../../thoat-ra.png', ruot: taoAnhPNG(90, 90) },
    ]);

    const kq = await admin.evaluate(async ({ goiId, byte }) => {
      const fd = new FormData();
      fd.set('goiId', goiId);
      fd.set('tep', new File([new Uint8Array(byte)], 'goi.zip', { type: 'application/zip' }));
      const r = await fetch('/api/tai-goi-sticker', { method: 'POST', body: fd });
      return { ma: r.status, than: await r.json().catch(() => ({})) };
    }, { goiId: goi.id, byte: [...goiThat] });

    kiem('quản trị ném tệp zip lên thì máy chủ tự mở ra', kq.ma === 200, JSON.stringify(kq.than));
    kiem('ba tấm ảnh trong gói đều vào', kq.than?.daThem === 3, JSON.stringify(kq.than));
    kiem('tệp không phải ảnh thì bỏ qua và ĐẾM LẠI, không chối cả gói',
      kq.than?.boQua === 2, JSON.stringify(kq.than));

    const hinh = await db.sticker.findMany({
      where: { goiId: goi.id }, orderBy: { thuTu: 'asc' }, select: { anh: true },
    });
    kiem('ba hàng sticker nằm đúng trong gói', hinh.length === 3);

    /*
     * ── TÊN TRONG ZIP KHÔNG THÀNH TÊN TRÊN ĐĨA ───────────────────────
     *
     * Mục thứ năm mang tên đi lùi bốn tầng thư mục. Nó VẪN được nhận (nó là
     * ảnh thật), nhưng phải nằm đúng trong ngăn sticker dưới một cái tên do
     * cửa hàng tự sinh — không còn dấu vết nào của tên cũ.
     */
    kiem('mọi hình đều nằm trong ngăn sticker của kho',
      hinh.every((h) => h.anh.includes('/sticker/')), hinh.map((h) => h.anh).join(' '));
    kiem('không tấm nào mang theo tên đi lùi thư mục',
      hinh.every((h) => !h.anh.includes('..')), hinh.map((h) => h.anh).join(' '));
    kiem('cũng không tấm nào giữ lại tên gốc trong zip',
      hinh.every((h) => !h.anh.includes('thoat-ra') && !h.anh.includes('01.png')),
      hinh.map((h) => h.anh).join(' '));

    // ── Thành viên thường thì cổng đóng ───────────────────────────────
    const maThuong = await thuong.evaluate(async ({ goiId, byte }) => {
      const fd = new FormData();
      fd.set('goiId', goiId);
      fd.set('tep', new File([new Uint8Array(byte)], 'goi.zip', { type: 'application/zip' }));
      const r = await fetch('/api/tai-goi-sticker', { method: 'POST', body: fd });
      return r.status;
    }, { goiId: goi.id, byte: [...goiThat] });
    kiem('thành viên thường không mở được gói zip nào', maThuong === 403, `máy trả ${maThuong}`);
    kiem('và không hàng sticker nào mọc thêm',
      (await db.sticker.count({ where: { goiId: goi.id } })) === 3);

    // ── Tệp không phải zip thì trả lời tử tế ──────────────────────────
    const maLa = await admin.evaluate(async ({ goiId }) => {
      const fd = new FormData();
      fd.set('goiId', goiId);
      fd.set('tep', new File([new TextEncoder().encode('day la mot tep chu')], 'a.zip',
        { type: 'application/zip' }));
      const r = await fetch('/api/tai-goi-sticker', { method: 'POST', body: fd });
      return { ma: r.status, than: await r.json().catch(() => ({})) };
    }, { goiId: goi.id });
    kiem('tệp không phải zip thì chối và nói rõ',
      maLa.ma === 415 && String(maLa.than?.loi ?? '').includes('không phải tệp zip'),
      JSON.stringify(maLa));

    // ── Zip chỉ toàn thứ không phải ảnh ───────────────────────────────
    const zipRong = taoZip([{ ten: 'chi-co-chu.txt', ruot: Buffer.from('khong co anh nao') }]);
    const maRong = await admin.evaluate(async ({ goiId, byte }) => {
      const fd = new FormData();
      fd.set('goiId', goiId);
      fd.set('tep', new File([new Uint8Array(byte)], 'r.zip', { type: 'application/zip' }));
      const r = await fetch('/api/tai-goi-sticker', { method: 'POST', body: fd });
      return { ma: r.status, than: await r.json().catch(() => ({})) };
    }, { goiId: goi.id, byte: [...zipRong] });
    kiem('zip không có tấm ảnh nào thì nói thẳng, không im lặng báo thành công',
      maRong.ma === 422 && String(maRong.than?.loi ?? '').includes('không có tấm ảnh nào'),
      JSON.stringify(maRong));

    // ── Nút trên trang quản trị ───────────────────────────────────────
    await admin.goto(`${GOC}/quan-tri/sticker`, { waitUntil: 'networkidle' });
    kiem('trang quản trị có nút tải cả tệp zip',
      (await admin.locator(`input[aria-label="Tải tệp zip vào gói ${DAU} Gói zip"]`).count()) === 1);

    await admin.setInputFiles(`input[aria-label="Tải tệp zip vào gói ${DAU} Gói zip"]`, {
      name: 'them.zip', mimeType: 'application/zip',
      buffer: taoZip([{ ten: 'them-mot.png', ruot: taoAnhPNG(60, 60) }]),
    });
    const daThemQuaGiaoDien = await doiToi(async () =>
      (await db.sticker.count({ where: { goiId: goi.id } })) === 4);
    kiem('tải qua giao diện cũng vào đúng gói ấy', daThemQuaGiaoDien);
    kiem('và nói ra đã thêm bao nhiêu hình',
      (await admin.locator('p[role="status"]').innerText()).includes('Đã thêm 1 hình'),
      await admin.locator('p[role="status"]').innerText().catch(() => ''));

    // ── Gói đầy thì chối, không ghi nửa vời ───────────────────────────
    await db.sticker.createMany({
      data: Array.from({ length: STICKER_MOI_GOI - 4 }, (_, i) => ({
        goiId: goi.id, anh: `/tep/sticker/day-${i}.png`, thuTu: 1000 + i,
      })),
    });
    const maDay = await admin.evaluate(async ({ goiId, byte }) => {
      const fd = new FormData();
      fd.set('goiId', goiId);
      fd.set('tep', new File([new Uint8Array(byte)], 'd.zip', { type: 'application/zip' }));
      const r = await fetch('/api/tai-goi-sticker', { method: 'POST', body: fd });
      return r.status;
    }, { goiId: goi.id, byte: [...taoZip([{ ten: 'x.png', ruot: taoAnhPNG(60, 60) }])] });
    kiem(`gói đã đủ ${STICKER_MOI_GOI} hình thì chối thẳng`, maDay === 409, `máy trả ${maDay}`);
    kiem('và không hàng nào lọt thêm vào',
      (await db.sticker.count({ where: { goiId: goi.id } })) === STICKER_MOI_GOI);

    kiem('trần tổng lúc bung có thật và lớn hơn một tấm sticker',
      ZIP_TONG_BUNG > STICKER_TOI_DA);
  } finally {
    if (admin) await admin.close();
    if (thuong) await thuong.close();
    await don();
  }
}
