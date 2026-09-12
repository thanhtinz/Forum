import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const DAU = 'kiemthu-tacgia';

/*
 * HỆ THỐNG TÁC GIẢ.
 *
 * Bài kiểm quan trọng nhất của cả bộ, ngang với bài 06. Từ lúc game có chủ,
 * MỌI hàm sửa game có hai loại người gọi hợp lệ — ban quản trị và chính chủ —
 * và chỗ sai ở đây nghĩa là tác giả A sửa được game của tác giả B.
 *
 * Nên phần lớn bài này không kiểm "chạy được không", mà kiểm "KHÔNG chạy được
 * khi không được phép", và kiểm bằng cách gọi THẲNG vào server action chứ
 * không bấm nút — nút thì giấu đi được, địa chỉ POST thì không.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.game.deleteMany({ where: { duongDan: { startsWith: DAU } } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: DAU } } });
  };
  await don();

  const mau = await db.nguoiDung.findFirst({
    orderBy: { id: 'asc' }, where: { tenDangNhap: 'huytran' }, select: { matKhauBam: true },
  });
  if (!mau) { kiem('có tài khoản mẫu', false); return; }

  const theLoai = await db.theLoai.findFirst({ orderBy: { thuTu: 'asc' }, select: { id: true } });

  let aPage, bPage, admin;
  try {
    const taoTacGia = (ma, ten) => db.nguoiDung.create({
      data: {
        email: `${DAU}-${ma}@kiemthu.invalid`, tenDangNhap: `${DAU}-${ma}`,
        tenHienThi: ten, matKhauBam: mau.matKhauBam, vaiTro: 'TAC_GIA',
      },
      select: { id: true, tenDangNhap: true },
    });
    const a = await taoTacGia('a', 'Tác giả A');
    const b = await taoTacGia('b', 'Tác giả B');

    const gameB = await db.game.create({
      data: {
        ten: 'Game của B', duongDan: `${DAU}-cua-b`, trangThai: 'NHAP', tacGiaId: b.id,
      },
      select: { id: true },
    });

    aPage = await moTrangDaDangNhap(`${DAU}-a`, 'thanhvien123');

    /** Gọi thẳng một server action qua biểu mẫu, mang cookie phiên của trang. */
    const goiLuuGame = (p, truong) => p.evaluate(async ([goc, truong]) => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(truong)) fd.set(k, v);
      const r = await fetch(`${goc}/quan-tri/game/moi`, { method: 'POST', body: fd })
        .catch(() => null);
      return r?.status ?? 0;
    }, [GOC, truong]);

    // ── A KHÔNG sửa được game của B ────────────────────────────────────
    await aPage.goto(`${GOC}/quan-ly`, { waitUntil: 'networkidle' });
    await goiLuuGame(aPage, { id: gameB.id, ten: 'A đã chiếm game này', duongDan: `${DAU}-cua-b` });
    await aPage.waitForTimeout(1200);

    const sauKhiA = await db.game.findUnique({ where: { id: gameB.id }, select: { ten: true, tacGiaId: true } });
    kiem('tác giả A KHÔNG sửa được game của tác giả B',
      sauKhiA.ten === 'Game của B' && sauKhiA.tacGiaId === b.id, sauKhiA.ten);

    // ── A không xem được trang sửa game của B ──────────────────────────
    const r404 = await aPage.goto(`${GOC}/quan-ly/game/${gameB.id}`, { waitUntil: 'domcontentloaded' });
    kiem('mở trang sửa game của người khác thì trả 404', r404.status() === 404, `mã ${r404.status()}`);

    // ── A không thấy game của B trong danh sách của mình ───────────────
    await aPage.goto(`${GOC}/quan-ly/game`, { waitUntil: 'networkidle' });
    kiem('danh sách game của A không có game của B',
      (await aPage.locator('text=Game của B').count()) === 0);

    /*
     * ── THIẾU THỨ THÌ KHÔNG GỬI DUYỆT ĐƯỢC ───────────────────────────
     *
     * Chặn ở đây chứ không để ban quản trị phát hiện lúc duyệt: một vòng
     * gửi–từ chối–sửa–gửi lại tốn thời gian cả hai bên, mà cái thiếu thì máy
     * tự nhìn ra được.
     */
    const gameA = await db.game.create({
      data: { ten: 'Game của A', duongDan: `${DAU}-cua-a`, trangThai: 'NHAP', tacGiaId: a.id },
      select: { id: true },
    });

    await aPage.goto(`${GOC}/quan-ly/game/${gameA.id}`, { waitUntil: 'networkidle' });
    await aPage.click('button:has-text("Gửi duyệt")').catch(() => {});
    // Hộp xác nhận của trình duyệt chặn luồng, nên bắt nó trước khi bấm.
    await aPage.waitForTimeout(600);
    let tt = await db.game.findUnique({ where: { id: gameA.id }, select: { trangThai: true } });
    kiem('game thiếu giới thiệu và bản tải thì KHÔNG gửi duyệt được',
      tt.trangThai === 'NHAP', tt.trangThai);

    // Lấp đủ rồi gửi lại.
    await db.game.update({
      where: { id: gameA.id },
      data: {
        gioiThieu: 'Một game để kiểm luồng duyệt.',
        theLoai: theLoai ? { create: [{ theLoaiId: theLoai.id }] } : undefined,
        banTai: { create: [{ heMay: 'JAVA', soHieu: '1.0', moiNhat: true }] },
      },
    });

    await aPage.goto(`${GOC}/quan-ly/game/${gameA.id}`, { waitUntil: 'networkidle' });
    aPage.once('dialog', (d) => d.accept());
    await aPage.click('button:has-text("Gửi duyệt")');
    const daGui = await doiToi(async () =>
      (await db.game.findUnique({ where: { id: gameA.id }, select: { trangThai: true } }))
        ?.trangThai === 'CHO_DUYET');
    kiem('đủ thứ rồi thì gửi duyệt được', daGui);

    /*
     * ── GAME CHỜ DUYỆT KHÔNG ĐƯỢC RÒ RA MẶT TIỀN ─────────────────────
     *
     * Mọi truy vấn ở cửa hàng lọc theo `DANG_HIEN`, nên thêm trạng thái mới
     * không được làm rò game nháp. Mục này canh đúng lời hứa ấy.
     */
    const khach = await moTrang();
    const rCong = await khach.goto(`${GOC}/game/${DAU}-cua-a`, { waitUntil: 'domcontentloaded' });
    kiem('game chờ duyệt KHÔNG hiện ở cửa hàng', rCong.status() === 404, `mã ${rCong.status()}`);
    await khach.close();

    // ── B không duyệt được game của A ──────────────────────────────────
    bPage = await moTrangDaDangNhap(`${DAU}-b`, 'thanhvien123');
    await bPage.goto(`${GOC}/quan-ly`, { waitUntil: 'networkidle' });
    const rDuyet = await bPage.goto(`${GOC}/quan-tri/duyet`, { waitUntil: 'networkidle' });
    kiem('tác giả không vào được hàng chờ duyệt của quản trị',
      !bPage.url().includes('/quan-tri'), bPage.url());

    // ── Quản trị trả lại kèm lý do ─────────────────────────────────────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/duyet`, { waitUntil: 'networkidle' });
    kiem('hàng chờ duyệt bày game vừa gửi',
      (await admin.locator('text=Game của A').count()) > 0);

    await admin.click('button:has-text("Trả lại")');
    await admin.fill('textarea', 'Tệp JAR tải về bị lỗi, mở không lên trên máy S40.');
    await admin.click('button:has-text("Gửi lý do và trả lại")');
    const daTra = await doiToi(async () =>
      (await db.game.findUnique({ where: { id: gameA.id }, select: { trangThai: true } }))
        ?.trangThai === 'TU_CHOI');
    kiem('quản trị trả lại được game', daTra);

    const g = await db.game.findUnique({
      where: { id: gameA.id }, select: { lyDoTuChoi: true },
    });
    kiem('lý do trả lại được lưu lại', (g.lyDoTuChoi ?? '').includes('S40'), g.lyDoTuChoi ?? '');

    const tin = await db.thongBao.count({
      where: { nguoiId: a.id, loai: 'GAME_BI_TU_CHOI' },
    });
    kiem('tác giả nhận được thông báo bị trả lại', tin === 1, `${tin} tin`);

    // Tác giả đọc được lý do ngay trên trang sửa.
    await aPage.goto(`${GOC}/quan-ly/game/${gameA.id}`, { waitUntil: 'networkidle' });
    kiem('tác giả đọc được lý do trên trang game của mình',
      (await aPage.locator('text=máy S40').count()) > 0);

    // ── Gửi lại rồi quản trị duyệt ─────────────────────────────────────
    aPage.once('dialog', (d) => d.accept());
    await aPage.click('button:has-text("Gửi duyệt")');
    await doiToi(async () =>
      (await db.game.findUnique({ where: { id: gameA.id }, select: { trangThai: true } }))
        ?.trangThai === 'CHO_DUYET');

    await admin.goto(`${GOC}/quan-tri/duyet`, { waitUntil: 'networkidle' });
    admin.once('dialog', (d) => d.accept());
    await admin.click('button:has-text("Duyệt")');
    const daDuyet = await doiToi(async () =>
      (await db.game.findUnique({ where: { id: gameA.id }, select: { trangThai: true } }))
        ?.trangThai === 'DANG_HIEN');
    kiem('quản trị duyệt thì game lên kệ', daDuyet);

    const tinDuyet = await db.thongBao.count({
      where: { nguoiId: a.id, loai: 'GAME_DA_DUYET' },
    });
    kiem('tác giả nhận được thông báo đã duyệt', tinDuyet === 1, `${tinDuyet} tin`);

    /*
     * ── TRANG CÔNG KHAI CỦA TÁC GIẢ: CHỈ GAME CỦA HỌ ─────────────────
     */
    const xem = await moTrang();
    await xem.goto(`${GOC}/tac-gia/${DAU}-a`, { waitUntil: 'networkidle' });
    kiem('trang tác giả bày game của chính họ',
      (await xem.locator('text=Game của A').count()) > 0);
    kiem('trang tác giả KHÔNG bày game của người khác',
      (await xem.locator('text=Game của B').count()) === 0);

    // Thành viên thường không có trang tác giả — nếu không chặn thì đây hoá ra
    // một cách dò xem tên đăng nhập nào đã có người dùng.
    const rThuong = await xem.goto(`${GOC}/tac-gia/huytran`, { waitUntil: 'domcontentloaded' });
    kiem('thành viên thường không có trang tác giả', rThuong.status() === 404,
      `mã ${rThuong.status()}`);
    await xem.close();

    // ── Tên tác giả trên trang game trỏ về trang tác giả ───────────────
    const xem2 = await moTrang();
    await xem2.goto(`${GOC}/game/${DAU}-cua-a`, { waitUntil: 'networkidle' });
    kiem('tên tác giả trên trang game bấm sang trang tác giả',
      (await xem2.locator(`a[href="/tac-gia/${DAU}-a"]`).count()) > 0);
    await xem2.close();
  } finally {
    for (const p of [aPage, bPage, admin]) if (p) await p.close();
    await don();
  }
}
