import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * Cài đặt tài khoản, và sửa/xoá bài của chính mình trên diễn đàn.
 *
 * Mấy mục đáng giá nhất ở đây đều là mục QUYỀN, và đều theo một khuôn: điều
 * kiện "cái này của tôi" phải nằm trong `where` của Prisma. Bài kiểm dựng đúng
 * tình huống người khác nhảy vào sửa bài của mình rồi xem có lọt không.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    where: { trangThai: 'DANG_HIEN' }, select: { id: true, duongDan: true },
  });
  const [a, b] = await Promise.all([
    db.nguoiDung.findFirst({ where: { tenDangNhap: 'anhthu' }, select: { id: true } }),
    db.nguoiDung.findFirst({ where: { tenDangNhap: 'minhdev' }, select: { id: true } }),
  ]);
  if (!game || !a || !b) { kiem('có dữ liệu mẫu', false); return; }

  const DAU = 'Bài kiểm sửa xoá';
  await don(DAU, a.id);

  let pA, pB;
  try {
    pA = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    pB = await moTrangDaDangNhap('minhdev', 'thanhvien123');

    // ── Cài đặt tài khoản: khách không vào được ───────────────────────
    const khach = await moTrang();
    await khach.goto(`${GOC}/toi/cai-dat`, { waitUntil: 'networkidle' });
    kiem('khách bị đưa sang trang đăng nhập ở trang cài đặt',
      khach.url().includes('/dang-nhap'), khach.url());
    await khach.close();

    // ── Đổi tên hiển thị ──────────────────────────────────────────────
    await pA.goto(`${GOC}/toi/cai-dat`, { waitUntil: 'networkidle' });
    await pA.fill('input[name="tenHienThi"]', 'Anh Thư đã đổi');
    await pA.click('button:has-text("Lưu hồ sơ")');
    const daDoiTen = await doiToi(async () =>
      (await db.nguoiDung.findUnique({ where: { id: a.id }, select: { tenHienThi: true } }))
        ?.tenHienThi === 'Anh Thư đã đổi');
    kiem('đổi được tên hiển thị', daDoiTen);

    // Địa chỉ ảnh lạ bị chặn — `javascript:` lọt vào thuộc tính src là hỏng.
    await pA.fill('input[name="anh"]', 'javascript:alert(1)');
    await pA.click('button:has-text("Lưu hồ sơ")');
    await pA.waitForSelector('[role="alert"]', { timeout: 5000 }).catch(() => {});
    const anh = (await db.nguoiDung.findUnique({ where: { id: a.id }, select: { anh: true } }))?.anh;
    kiem('địa chỉ ảnh không phải https hay "/" thì bị chặn', anh == null, `lưu thành ${anh}`);

    // ── Đổi mật khẩu: sai mật khẩu cũ thì không ăn ────────────────────
    await pA.fill('input[name="matKhauCu"]', 'sai-bet-roi');
    await pA.fill('input[name="matKhauMoi"]', 'matkhaumoi123');
    await pA.fill('input[name="matKhauLai"]', 'matkhaumoi123');
    await pA.click('button:has-text("Đổi mật khẩu")');
    await pA.waitForSelector('form:has(input[name="matKhauCu"]) [role="alert"]', { timeout: 5000 }).catch(() => {});
    const conDangNhapDuoc = await thuDangNhap('anhthu', 'thanhvien123');
    kiem('sai mật khẩu cũ thì không đổi được', conDangNhapDuoc);

    // ── Đổi mật khẩu thật, và mọi phiên KHÁC bị đóng ──────────────────
    // Mở sẵn một phiên thứ hai của chính người ấy để xem nó có bị đá ra không.
    const pA2 = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    const soPhienTruoc = await db.phien.count({ where: { nguoiId: a.id } });

    await pA.reload({ waitUntil: 'networkidle' });
    await pA.fill('input[name="matKhauCu"]', 'thanhvien123');
    await pA.fill('input[name="matKhauMoi"]', 'matkhaumoi123');
    await pA.fill('input[name="matKhauLai"]', 'matkhaumoi123');
    await pA.click('button:has-text("Đổi mật khẩu")');

    const daDoi = await doiToi(async () => await thuDangNhap('anhthu', 'matkhaumoi123'));
    kiem('đổi được mật khẩu', daDoi);
    kiem('mật khẩu cũ hết dùng được', !(await thuDangNhap('anhthu', 'thanhvien123')));

    const soPhienSau = await db.phien.count({ where: { nguoiId: a.id } });
    kiem('đổi mật khẩu thì đóng mọi phiên khác',
      soPhienSau < soPhienTruoc, `${soPhienTruoc} → ${soPhienSau}`);

    // Phiên đang dùng phải còn sống, không thì vừa đổi xong là bị đá ra.
    await pA.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    kiem('phiên đang dùng vẫn sống sau khi đổi mật khẩu',
      !pA.url().includes('/dang-nhap'), pA.url());

    /*
     * `/toi` KHÔNG đá khách sang trang đăng nhập — nó hiện lời mời ngay tại
     * chỗ. Nên canh bằng nội dung, không canh bằng địa chỉ: canh địa chỉ thì
     * bài kiểm đỏ vì một lẽ chẳng liên quan gì tới thứ nó định canh.
     */
    await pA2.goto(`${GOC}/toi`, { waitUntil: 'networkidle' });
    kiem('thiết bị khác bị đăng xuất',
      (await pA2.locator('text=Bạn chưa đăng nhập').count()) > 0,
      (await pA2.locator('h1').first().textContent()) ?? '');
    await pA2.close();

    // Trả mật khẩu về cũ để mấy bài kiểm khác còn chạy được.
    await pA.goto(`${GOC}/toi/cai-dat`, { waitUntil: 'networkidle' });
    await pA.fill('input[name="matKhauCu"]', 'matkhaumoi123');
    await pA.fill('input[name="matKhauMoi"]', 'thanhvien123');
    await pA.fill('input[name="matKhauLai"]', 'thanhvien123');
    await pA.click('button:has-text("Đổi mật khẩu")');
    await doiToi(async () => await thuDangNhap('anhthu', 'thanhvien123'));

    // ── Sửa và xoá bài của chính mình ─────────────────────────────────
    const chuDe = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: a.id,
        tieuDe: `${DAU} — bài của Anh Thư`, noiDung: 'Nội dung ban đầu của bài.',
      },
      select: { id: true },
    });

    const dia = `${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`;
    await pA.goto(dia, { waitUntil: 'networkidle' });
    kiem('chủ bài thấy nút sửa', (await pA.locator('button:has-text("Sửa bài")').count()) > 0);

    await pB.goto(dia, { waitUntil: 'networkidle' });
    kiem('người khác KHÔNG thấy nút sửa',
      (await pB.locator('button:has-text("Sửa bài")').count()) === 0);

    await pA.click('button:has-text("Sửa bài")');
    await pA.fill('textarea[aria-label="Nội dung"]', 'Nội dung đã sửa lại cho đúng.');
    await pA.click('button:has-text("Lưu bài")');
    const daSua = await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { noiDung: true } }))
        ?.noiDung === 'Nội dung đã sửa lại cho đúng.');
    kiem('chủ bài sửa được bài mình', daSua);

    // ── Người khác gọi THẲNG endpoint sửa thì không ăn ────────────────
    let donHang = null;
    pA.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      delete dau.cookie;
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });
    await pA.reload({ waitUntil: 'networkidle' });
    await pA.click('button:has-text("Sửa bài")');
    await pA.fill('textarea[aria-label="Nội dung"]', 'Bản sửa lần hai, vẫn của chủ bài.');
    await pA.click('button:has-text("Lưu bài")');
    await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { noiDung: true } }))
        ?.noiDung === 'Bản sửa lần hai, vẫn của chủ bài.');

    kiem('bắt được mã băm và thân yêu cầu để phát lại',
      !!donHang?.dau?.['next-action'] && !!donHang?.than);

    if (donHang) {
      const ma = await pB.evaluate(async ({ dia, dau, than }) => {
        const r = await fetch(dia, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, donHang);
      const conNguyen = await db.chuDe.findUnique({
        where: { id: chuDe.id }, select: { noiDung: true } });
      kiem('người khác phát lại yêu cầu sửa thì không đổi được bài',
        conNguyen?.noiDung === 'Bản sửa lần hai, vẫn của chủ bài.',
        `máy trả về ${ma}`);
    }

    // ── Có người trả lời rồi thì KHÔNG xoá được nữa ───────────────────
    await db.traLoi.create({
      data: { chuDeId: chuDe.id, nguoiId: b.id, noiDung: 'Tôi góp một câu.' },
      select: { id: true },
    });
    await db.chuDe.update({ where: { id: chuDe.id }, data: { soTraLoi: 1 } });

    await pA.goto(dia, { waitUntil: 'networkidle' });
    kiem('chủ đề đã có người đáp thì không hiện nút xoá',
      (await pA.locator('button:has-text("Xoá bài")').count()) === 0);

    // ── Khoá chủ đề thì hết sửa, kể cả bài của chính mình ─────────────
    await db.chuDe.update({ where: { id: chuDe.id }, data: { khoa: true } });
    await pA.goto(dia, { waitUntil: 'networkidle' });
    kiem('chủ đề bị khoá thì chủ bài cũng hết sửa được',
      (await pA.locator('button:has-text("Sửa bài")').count()) === 0);
  } finally {
    await don(DAU, a?.id);
    await pA?.close();
    await pB?.close();
  }
}

/** Thử đăng nhập bằng một bộ mật khẩu, không giữ phiên lại. */
async function thuDangNhap(ten, matKhau) {
  const p = await moTrang();
  try {
    await p.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
    await p.fill('input[name="dinhDanh"]', ten);
    await p.fill('input[name="matKhau"]', matKhau);
    await p.click('button[type="submit"]');
    await p.waitForTimeout(1500);
    return !p.url().includes('/dang-nhap');
  } finally {
    await p.close();
  }
}

async function don(dau, nguoiId) {
  await db.chuDe.deleteMany({ where: { tieuDe: { startsWith: dau } } });
  if (nguoiId) {
    await db.nguoiDung.update({
      where: { id: nguoiId },
      data: { tenHienThi: 'Anh Thư', anh: null },
    });
  }
}
