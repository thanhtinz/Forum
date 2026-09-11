import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * Báo xấu, và hàng chờ xử lý trong khu quản trị.
 *
 * Ba điều đáng canh:
 *   1. KHÔNG báo được bài của chính mình — bài của mình thì sửa hoặc xoá thẳng.
 *   2. Báo hai lần cùng một mục chỉ ghi MỘT hàng. Ràng buộc duy nhất ở CSDL
 *      lo phần ấy, và nó phải thật sự hoạt động với cột cho phép rỗng.
 *   3. Xoá nội dung bị báo thì mấy lượt báo về nó đi theo — đó là `Cascade`
 *      ở lược đồ, tức là thứ không nhìn thấy trong mã và dễ hỏng lặng lẽ nhất.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' },
    where: { trangThai: 'DANG_HIEN' }, select: { id: true, duongDan: true },
  });
  const [a, b] = await Promise.all([
    db.nguoiDung.findFirst({ where: { tenDangNhap: 'anhthu' }, select: { id: true } }),
    db.nguoiDung.findFirst({ where: { tenDangNhap: 'minhdev' }, select: { id: true } }),
  ]);
  if (!game || !a || !b) { kiem('có dữ liệu mẫu', false); return; }

  const DAU = 'Bài kiểm báo xấu';
  await don(DAU, a.id, b.id);

  let pA, pB, admin;
  try {
    // Chủ đề của A, để B báo.
    const chuDe = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: a.id,
        tieuDe: `${DAU} — chủ đề của Anh Thư`, noiDung: 'Nội dung để đem đi báo.',
      },
      select: { id: true },
    });
    const dia = `${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`;

    pA = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    pB = await moTrangDaDangNhap('minhdev', 'thanhvien123');

    // ── Khách không thấy nút báo ──────────────────────────────────────
    const khach = await moTrang();
    await khach.goto(dia, { waitUntil: 'networkidle' });
    kiem('khách không thấy nút báo xấu',
      (await khach.locator('button:has-text("Báo xấu")').count()) === 0);
    await khach.close();

    // ── Chủ bài không báo được bài của chính mình ─────────────────────
    await pA.goto(dia, { waitUntil: 'networkidle' });
    kiem('chủ bài không thấy nút báo bài của chính mình',
      (await pA.locator('button:has-text("Báo xấu")').count()) === 0);

    // ── Người khác báo được ───────────────────────────────────────────
    await pB.goto(dia, { waitUntil: 'networkidle' });
    await pB.click('button:has-text("Báo xấu")');
    await pB.click('label:has-text("Spam hoặc quảng cáo")');
    await pB.fill('input[placeholder^="Nói thêm"]', 'Toàn đường dẫn lạ.');
    await pB.click('button:has-text("Gửi báo cáo")');

    const daBao = await doiToi(async () =>
      (await db.baoXau.count({ where: { chuDeId: chuDe.id, nguoiId: b.id } })) === 1);
    kiem('báo được chủ đề của người khác', daBao);
    kiem('bấm xong thì nút đổi thành đã báo',
      (await pB.locator('text=Đã báo, cảm ơn bạn').count()) > 0);

    const hang = await db.baoXau.findFirst({
    orderBy: { id: 'asc' },
      where: { chuDeId: chuDe.id }, select: { lyDo: true, ghiChu: true, trangThai: true },
    });
    kiem('ghi đúng lý do và ghi chú',
      hang?.lyDo === 'RAC' && hang?.ghiChu === 'Toàn đường dẫn lạ.',
      JSON.stringify(hang));
    kiem('lượt báo mới vào trạng thái chờ xem', hang?.trangThai === 'CHO_XEM');

    // ── Báo lần hai chỉ ghi MỘT hàng ──────────────────────────────────
    await pB.reload({ waitUntil: 'networkidle' });
    await pB.click('button:has-text("Báo xấu")');
    await pB.click('button:has-text("Gửi báo cáo")');
    await pB.waitForTimeout(1500);
    const soHang = await db.baoXau.count({ where: { chuDeId: chuDe.id, nguoiId: b.id } });
    kiem('báo lần hai không đẻ thêm hàng', soHang === 1, `đếm được ${soHang}`);

    // ── Hàng chờ trong quản trị ───────────────────────────────────────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/bao-xau`, { waitUntil: 'networkidle' });
    const chu = await admin.locator('main').textContent();
    kiem('hàng chờ hiện lượt báo', chu.includes(`${DAU} — chủ đề của Anh Thư`), chu.slice(0, 120));
    kiem('hàng chờ hiện lý do', chu.includes('Spam hoặc quảng cáo'));
    kiem('hàng chờ hiện nội dung bị báo', chu.includes('Nội dung để đem đi báo.'));

    // ── Bỏ qua: nội dung còn nguyên, lượt báo đóng lại ────────────────
    await admin.click('button:has-text("Bỏ qua")');
    const daBoQua = await doiToi(async () =>
      (await db.baoXau.findFirst({
    orderBy: { id: 'asc' }, where: { chuDeId: chuDe.id }, select: { trangThai: true } }))
        ?.trangThai === 'BO_QUA');
    kiem('bỏ qua thì đóng lượt báo', daBoQua);
    kiem('bỏ qua KHÔNG xoá nội dung',
      (await db.chuDe.count({ where: { id: chuDe.id } })) === 1);

    await admin.reload({ waitUntil: 'networkidle' });
    kiem('lượt đã bỏ qua rời khỏi hàng chờ',
      !(await admin.locator('main').textContent()).includes(`${DAU} — chủ đề của Anh Thư`));

    // ── Xoá nội dung thì lượt báo đi theo ─────────────────────────────
    await db.baoXau.updateMany({ where: { chuDeId: chuDe.id }, data: { trangThai: 'CHO_XEM' } });
    await admin.reload({ waitUntil: 'networkidle' });
    admin.once('dialog', (d) => d.accept());
    await admin.click('button:has-text("Xoá nội dung")');

    const daXoa = await doiToi(async () =>
      (await db.chuDe.count({ where: { id: chuDe.id } })) === 0);
    kiem('xoá được nội dung bị báo', daXoa);
    kiem('lượt báo đi theo nội dung bị xoá',
      (await db.baoXau.count({ where: { chuDeId: chuDe.id } })) === 0);

    // ── Gọi thẳng: người thường không bỏ qua được lượt báo ────────────
    const chuDe2 = await db.chuDe.create({
      data: { gameId: game.id, nguoiId: a.id, tieuDe: `${DAU} — bài hai`, noiDung: 'x'.repeat(20) },
      select: { id: true },
    });
    const bao2 = await db.baoXau.create({
      data: { nguoiId: b.id, chuDeId: chuDe2.id, lyDo: 'KHAC' },
      select: { id: true },
    });

    let donHang = null;
    admin.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      delete dau.cookie;
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });
    await admin.goto(`${GOC}/quan-tri/bao-xau`, { waitUntil: 'networkidle' });
    await admin.click('button:has-text("Bỏ qua")');
    await doiToi(async () =>
      (await db.baoXau.findUnique({ where: { id: bao2.id }, select: { trangThai: true } }))
        ?.trangThai === 'BO_QUA');
    await db.baoXau.update({ where: { id: bao2.id }, data: { trangThai: 'CHO_XEM' } });

    kiem('bắt được mã băm và thân yêu cầu để phát lại',
      !!donHang?.dau?.['next-action'] && !!donHang?.than);

    if (donHang) {
      const ma = await pB.evaluate(async ({ dia, dau, than }) => {
        const r = await fetch(dia, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, donHang);
      const sau = await db.baoXau.findUnique({
        where: { id: bao2.id }, select: { trangThai: true },
      });
      kiem('thành viên thường phát lại yêu cầu bỏ qua thì không ăn',
        sau?.trangThai === 'CHO_XEM', `máy trả về ${ma}, trạng thái ${sau?.trangThai}`);
    }
  } finally {
    await don(DAU, a?.id, b?.id);
    await pA?.close();
    await pB?.close();
    await admin?.close();
  }
}

async function don(dau, ...nguoiId) {
  await db.chuDe.deleteMany({ where: { tieuDe: { startsWith: dau } } });
  for (const id of nguoiId.filter(Boolean)) {
    await db.baoXau.deleteMany({ where: { nguoiId: id } });
  }
}
