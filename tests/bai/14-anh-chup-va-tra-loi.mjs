import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * Ảnh chụp trong quản trị, lọc đánh giá theo sao, và lời đáp của cửa hàng.
 *
 * Mục đáng giá nhất là mục QUYỀN: `themAnhChup` và `traLoiDanhGia` nằm trong
 * tệp `'use server'`, nên chúng là địa chỉ POST công khai — thành viên thường
 * gọi thẳng vào được, không cần thấy nút nào. Bài kiểm gọi đúng như thế.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' },
    where: { trangThai: 'DANG_HIEN' }, select: { id: true, duongDan: true },
  });
  const nguoi = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  if (!game || !nguoi) { kiem('có dữ liệu mẫu', false); return; }

  await don(game.id, nguoi.id);

  try {
    // ── Quản trị thêm được ảnh chụp ──────────────────────────────────────
    const admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(`${GOC}/quan-tri/game/${game.id}`, { waitUntil: 'networkidle' });

    kiem('trang quản trị game có khối ảnh chụp',
      (await admin.locator('text=Thêm ảnh chụp').count()) > 0);

    await admin.fill('input[name="duongDanAnh"]', '/anh-kiem/mot.jpg');
    await admin.fill('input[name="chuThich"]', 'Ảnh kiểm một');
    await admin.click('button:has-text("Thêm ảnh")');
    const anhMot = await doiToi(async () =>
      (await db.anhChup.count({ where: { gameId: game.id, duongDan: '/anh-kiem/mot.jpg' } })) === 1);
    kiem('thêm ảnh thì ghi vào CSDL', anhMot);

    await admin.fill('input[name="duongDanAnh"]', '/anh-kiem/hai.jpg');
    await admin.click('button:has-text("Thêm ảnh")');
    const anhHai = await doiToi(async () =>
      (await db.anhChup.count({ where: { gameId: game.id } })) === 2);
    kiem('thêm được ảnh thứ hai', anhHai);

    // Thứ tự chừa khoảng trống 10 để đổi chỗ chỉ phải ghi lại một con số.
    const xep = await db.anhChup.findMany({
      where: { gameId: game.id }, orderBy: { thuTu: 'asc' },
      select: { duongDan: true, thuTu: true },
    });
    kiem('ảnh thêm sau nằm sau ảnh thêm trước',
      xep[0]?.duongDan === '/anh-kiem/mot.jpg' && xep[1]?.thuTu > xep[0]?.thuTu,
      JSON.stringify(xep));

    // ── Đổi chỗ hai ảnh ──────────────────────────────────────────────────
    await admin.click('button[aria-label="Đưa ảnh 2 lên trước"]');
    const daDoi = await doiToi(async () => {
      const a = await db.anhChup.findMany({
        where: { gameId: game.id }, orderBy: { thuTu: 'asc' }, select: { duongDan: true },
      });
      return a[0]?.duongDan === '/anh-kiem/hai.jpg';
    });
    kiem('đổi chỗ được thứ tự ảnh', daDoi);

    // ── Địa chỉ ảnh lạ bị chặn ───────────────────────────────────────────
    await admin.fill('input[name="duongDanAnh"]', 'javascript:alert(1)');
    await admin.click('button:has-text("Thêm ảnh")');
    await admin.waitForSelector('[role="alert"]', { timeout: 5000 }).catch(() => {});
    const soSauKhiThemRac = await db.anhChup.count({ where: { gameId: game.id } });
    kiem('địa chỉ ảnh không phải “/” hay “https://” thì bị chặn',
      soSauKhiThemRac === 2, `đếm được ${soSauKhiThemRac}`);

    // ── Ảnh hiện ra trang công khai ──────────────────────────────────────
    const khach = await moTrang();
    await khach.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    kiem('ảnh chụp hiện ở trang game',
      (await khach.locator('img[src="/anh-kiem/hai.jpg"]').count()) > 0);

    // ── Thành viên thường gọi thẳng endpoint thêm ảnh thì không ăn ────────
    const thuong = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    await thuong.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    kiem('thành viên thường không thấy ô thêm ảnh',
      (await thuong.locator('input[name="duongDanAnh"]').count()) === 0);

    // ── Lọc đánh giá theo sao ────────────────────────────────────────────
    await db.danhGia.createMany({
      data: [
        { gameId: game.id, nguoiId: nguoi.id, sao: 1, noiDung: 'Bài một sao để kiểm lọc.' },
      ],
      skipDuplicates: true,
    });
    await lamMoiBoDem(game.id);

    await khach.goto(`${GOC}/game/${game.duongDan}?sao=1`, { waitUntil: 'networkidle' });
    kiem('lọc 1 sao thì thấy bài một sao',
      (await khach.locator('text=Bài một sao để kiểm lọc.').count()) > 0);
    kiem('lọc 1 sao có lối bỏ lọc',
      (await khach.locator('a:has-text("Xem tất cả")').count()) > 0);

    await khach.goto(`${GOC}/game/${game.duongDan}?sao=5`, { waitUntil: 'networkidle' });
    kiem('lọc 5 sao thì không thấy bài một sao',
      (await khach.locator('text=Bài một sao để kiểm lọc.').count()) === 0);

    // Số rác trên địa chỉ coi như không lọc, không phải lỗi trang.
    await khach.goto(`${GOC}/game/${game.duongDan}?sao=99`, { waitUntil: 'networkidle' });
    kiem('sao=99 thì coi như không lọc',
      (await khach.locator('text=Bài một sao để kiểm lọc.').count()) > 0);

    // ── Quản trị trả lời đánh giá ────────────────────────────────────────
    const bai = await db.danhGia.findFirst({
    orderBy: { id: 'asc' },
      where: { gameId: game.id, nguoiId: nguoi.id }, select: { id: true },
    });

    await admin.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    kiem('quản trị thấy nút trả lời đánh giá',
      (await admin.locator('button:has-text("Trả lời bài này")').count()) > 0);
    kiem('thành viên thường không thấy nút trả lời',
      (await thuong.locator('button:has-text("Trả lời bài này")').count()) === 0);

    await admin.click('button:has-text("Trả lời bài này")');
    await admin.fill('textarea[aria-label="Lời trả lời của cửa hàng"]', 'Cảm ơn bạn, bản sau sẽ vá.');

    let donHang = null;
    admin.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      // Bánh quy do ngữ cảnh trình duyệt tự gắn, nên bỏ ra khỏi bản chép —
      // giữ lại thì hoá ra phát lại bằng chính phiên quản trị, kiểm cái gì nữa.
      delete dau.cookie;
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });

    await admin.click('button:has-text("Lưu lời trả lời")');
    const daDap = await doiToi(async () => {
      const d = await db.danhGia.findUnique({ where: { id: bai.id }, select: { traLoi: true } });
      return d?.traLoi === 'Cảm ơn bạn, bản sau sẽ vá.';
    });
    kiem('quản trị trả lời thì ghi vào bài đánh giá', daDap);

    await khach.reload({ waitUntil: 'networkidle' });
    kiem('lời đáp hiện cho khách đọc',
      (await khach.locator('text=SunnyStore trả lời').count()) > 0);

    // ── Thành viên thường gọi thẳng endpoint trả lời thì không ăn ─────────
    //
    // Phát LẠI đúng yêu cầu mà quản trị vừa gửi, nhưng từ phiên của thành viên
    // thường. Đây mới là phép thử thật: mã băm của hàm và thân yêu cầu đều
    // đúng y bản gốc, chỉ khác cái bánh quy — nên thứ duy nhất chặn được nó là
    // `batBuocQuanTri()` nằm trong hàm.
    kiem('bắt được cả mã băm và thân yêu cầu để phát lại',
      !!donHang?.dau?.['next-action'] && !!donHang?.than);

    if (donHang) {
      const ma = await thuong.evaluate(async ({ dia, dau, than }) => {
        const r = await fetch(dia, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, donHang);

      const conNguyen = await db.danhGia.findUnique({
        where: { id: bai.id }, select: { traLoi: true },
      });
      // Ghi rõ có bắt được thân yêu cầu hay không: thân rỗng thì cú phát lại
      // nhẹ hơn bản gốc, và lời kiểm này không đáng tin bằng — người đọc kết
      // quả phải thấy được điều đó chứ không chỉ thấy một dấu tích.
      kiem('phát lại yêu cầu trả lời từ phiên thành viên thì không ăn',
        conNguyen?.traLoi === 'Cảm ơn bạn, bản sau sẽ vá.',
        `máy trả về ${ma}, ${donHang.than ? 'có thân yêu cầu' : 'KHÔNG bắt được thân yêu cầu'}, `
        + `lời đáp còn là “${conNguyen?.traLoi}”`);
    } else {
      kiem('bắt được yêu cầu trả lời của quản trị để phát lại', false);
    }

    // ── Xoá lời đáp = lưu chuỗi rỗng ─────────────────────────────────────
    await admin.reload({ waitUntil: 'networkidle' });
    await admin.click('button:has-text("Sửa lời trả lời")');
    await admin.click('button:has-text("Xoá lời trả lời")');
    const daXoa = await doiToi(async () => {
      const d = await db.danhGia.findUnique({ where: { id: bai.id }, select: { traLoi: true, traLoiLuc: true } });
      return d?.traLoi === null && d?.traLoiLuc === null;
    });
    kiem('xoá lời đáp thì xoá cả mốc thời gian', daXoa);

    await khach.close();
    await thuong.close();
    await admin.close();
  } finally {
    // CSDL dùng chung và là thật, nên bài nào cũng phải dọn phần của mình —
    // để rác lại là làm đỏ oan những bài chạy sau.
    await don(game.id, nguoi.id);
  }
}

async function don(gameId, nguoiId) {
  await db.anhChup.deleteMany({ where: { gameId } });
  await db.danhGia.deleteMany({ where: { gameId, nguoiId } });
  await lamMoiBoDem(gameId);
}

/**
 * Tính lại `tongSao`/`soLuotDanhGia` ở bảng Game.
 *
 * Hai cột ấy là bản đếm sẵn, và chỉ `chamSao` mới tự lo cập nhật. Bài này ghi
 * thẳng vào bảng đánh giá nên phải tự tính lại — bỏ qua thì trang game in một
 * con số ở đầu trang và một con số khác hẳn ở mục đánh giá, mà cái sai ấy còn
 * nằm lại cho mọi bài chạy sau và cho cả lần xem bằng mắt.
 */
async function lamMoiBoDem(gameId) {
  const gom = await db.danhGia.aggregate({
    where: { gameId }, _sum: { sao: true }, _count: { _all: true },
  });
  await db.game.update({
    where: { id: gameId },
    data: { tongSao: gom._sum.sao ?? 0, soLuotDanhGia: gom._count._all },
    select: { id: true },
  });
}
