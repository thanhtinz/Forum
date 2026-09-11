import { GOC, db, doiToi, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * Chức năng mới của khu quản trị: ghim/khoá/xoá chủ đề, thể loại, xoá đánh giá.
 *
 * Mục đáng giá nhất vẫn là QUYỀN. Mỗi hàm vừa thêm nằm trong tệp `'use server'`
 * nên là một địa chỉ POST công khai — thành viên thường gọi thẳng vào được mà
 * không cần thấy nút nào. Bài này bắt đúng yêu cầu quản trị vừa gửi rồi PHÁT
 * LẠI từ phiên thành viên, y hệt lối bài 14 làm.
 *
 * Và một mục nữa dễ quên: hai cột đếm sẵn (`ChuDe.soTraLoi`, `Game.tongSao`)
 * phải khớp lại sau mỗi lần xoá. Xoá mà quên trừ thì con số lệch vĩnh viễn,
 * không có chỗ nào tự phát hiện ra.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' },
    where: { trangThai: 'DANG_HIEN' }, select: { id: true, ten: true, duongDan: true },
  });
  const nguoi = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  if (!game || !nguoi) { kiem('có dữ liệu mẫu', false); return; }

  const TEN_THE_LOAI = 'Thể loại kiểm thử';
  await don(game.id, nguoi.id, TEN_THE_LOAI);

  let admin, thuong;
  try {
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    thuong = await moTrangDaDangNhap('anhthu', 'thanhvien123');

    // ── Dựng một chủ đề có đúng một lời đáp ───────────────────────────
    const chuDe = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: nguoi.id,
        tieuDe: 'Chủ đề kiểm thử kiểm duyệt', noiDung: 'Nội dung để kiểm.',
        soTraLoi: 1,
        traLoi: { create: { nguoiId: nguoi.id, noiDung: 'Một lời đáp.' } },
      },
      select: { id: true },
    });

    await admin.goto(`${GOC}/quan-tri/dien-dan`, { waitUntil: 'networkidle' });
    kiem('trang kiểm duyệt diễn đàn hiện chủ đề',
      (await admin.locator('text=Chủ đề kiểm thử kiểm duyệt').count()) > 0);

    // ── GHIM ──────────────────────────────────────────────────────────
    await admin.click('button[aria-label="Ghim Chủ đề kiểm thử kiểm duyệt"]');
    const daGhim = await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { ghim: true } }))?.ghim === true);
    kiem('ghim được chủ đề', daGhim);

    // Cột `ghim` vốn đã được trang diễn đàn đọc từ trước, chỉ thiếu đường đặt.
    // Kiểm luôn rằng nó hiện ra thật, chứ không phải chỉ ghi vào CSDL.
    await thuong.goto(`${GOC}/game/${game.duongDan}/dien-dan`, { waitUntil: 'networkidle' });
    kiem('chủ đề ghim hiện dấu ghim ngoài diễn đàn',
      (await thuong.locator('[aria-label="ghim"]').count()) > 0);

    // ── KHOÁ ──────────────────────────────────────────────────────────
    await admin.reload({ waitUntil: 'networkidle' });
    await admin.click('button[aria-label="Khoá Chủ đề kiểm thử kiểm duyệt"]');
    const daKhoa = await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { khoa: true } }))?.khoa === true);
    kiem('khoá được chủ đề', daKhoa);

    await thuong.goto(`${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`, { waitUntil: 'networkidle' });
    const chuTrang = await thuong.locator('main').textContent();
    kiem('chủ đề đã khoá thì không còn ô trả lời',
      (await thuong.locator('textarea').count()) === 0, chuTrang.slice(0, 80));

    // ── Thành viên thường PHÁT LẠI yêu cầu ghim ───────────────────────
    let donHang = null;
    admin.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      delete dau.cookie; // bánh quy do ngữ cảnh tự gắn — bỏ ra mới là phép thử
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });
    await admin.goto(`${GOC}/quan-tri/dien-dan`, { waitUntil: 'networkidle' });
    await admin.click('button[aria-label="Bỏ ghim Chủ đề kiểm thử kiểm duyệt"]');
    await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { ghim: true } }))?.ghim === false);

    kiem('bắt được mã băm và thân yêu cầu để phát lại',
      !!donHang?.dau?.['next-action'] && !!donHang?.than);

    if (donHang) {
      const ma = await thuong.evaluate(async ({ dia, dau, than }) => {
        const r = await fetch(dia, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, donHang);
      const sau = await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { ghim: true } });
      kiem('thành viên thường phát lại yêu cầu ghim thì không ăn',
        sau?.ghim === false, `máy trả về ${ma}, ghim = ${sau?.ghim}`);
    }

    // ── XOÁ CHỦ ĐỀ kéo theo lời đáp ───────────────────────────────────
    await admin.reload({ waitUntil: 'networkidle' });
    admin.once('dialog', (d) => d.accept());
    await admin.click('button[aria-label="Xoá chủ đề Chủ đề kiểm thử kiểm duyệt"]');
    const daXoa = await doiToi(async () =>
      (await db.chuDe.count({ where: { id: chuDe.id } })) === 0);
    kiem('xoá được chủ đề', daXoa);
    kiem('lời đáp trong chủ đề bị xoá theo',
      (await db.traLoi.count({ where: { chuDeId: chuDe.id } })) === 0);

    // ── THỂ LOẠI: thêm, không cho xoá khi còn game, rồi xoá ────────────
    await admin.goto(`${GOC}/quan-tri/the-loai`, { waitUntil: 'networkidle' });
    await admin.fill('input[name="ten"]', TEN_THE_LOAI);
    await admin.click('button:has-text("Thêm thể loại")');
    const daThem = await doiToi(async () =>
      (await db.theLoai.count({ where: { ten: TEN_THE_LOAI } })) === 1);
    kiem('thêm được thể loại mới', daThem);

    const tl = await db.theLoai.findFirst({
    orderBy: { id: 'asc' },
      where: { ten: TEN_THE_LOAI }, select: { id: true, duongDan: true },
    });
    kiem('đường dẫn thể loại tự suy ra không dấu',
      tl?.duongDan === 'the-loai-kiem-thu', tl?.duongDan);

    // Gắn tạm vào một game rồi thử xoá: phải bị chặn, và thể loại còn nguyên.
    await db.theLoaiTrenGame.create({
      data: { gameId: game.id, theLoaiId: tl.id }, select: { gameId: true },
    });
    await admin.reload({ waitUntil: 'networkidle' });
    kiem('thể loại còn game thì không hiện nút xoá',
      (await admin.locator(`button[aria-label="Xoá thể loại ${TEN_THE_LOAI}"]`).count()) === 0);

    await db.theLoaiTrenGame.deleteMany({ where: { theLoaiId: tl.id } });
    await admin.reload({ waitUntil: 'networkidle' });
    admin.once('dialog', (d) => d.accept());
    await admin.click(`button[aria-label="Xoá thể loại ${TEN_THE_LOAI}"]`);
    const tlXoa = await doiToi(async () =>
      (await db.theLoai.count({ where: { id: tl.id } })) === 0);
    kiem('gỡ hết game rồi thì xoá được thể loại', tlXoa);

    // ── XOÁ ĐÁNH GIÁ và bộ đếm phải khớp lại ──────────────────────────
    await db.danhGia.deleteMany({ where: { gameId: game.id, nguoiId: nguoi.id } });
    await db.danhGia.create({
      data: { gameId: game.id, nguoiId: nguoi.id, sao: 1, noiDung: 'Bài rác để kiểm xoá.' },
      select: { id: true },
    });
    await lamMoiBoDem(game.id);
    const truoc = await db.game.findUnique({
      where: { id: game.id }, select: { tongSao: true, soLuotDanhGia: true },
    });

    await admin.goto(`${GOC}/quan-tri/danh-gia`, { waitUntil: 'networkidle' });
    admin.once('dialog', (d) => d.accept());
    await admin.locator('li', { hasText: 'Bài rác để kiểm xoá.' })
      .locator('button:has-text("Xoá bài này")').click();

    const dgXoa = await doiToi(async () =>
      (await db.danhGia.count({ where: { gameId: game.id, nguoiId: nguoi.id } })) === 0);
    kiem('xoá được bài đánh giá', dgXoa);

    const sau = await db.game.findUnique({
      where: { id: game.id }, select: { tongSao: true, soLuotDanhGia: true },
    });
    kiem('bộ đếm đánh giá trừ lại đúng sau khi xoá',
      sau.soLuotDanhGia === truoc.soLuotDanhGia - 1 && sau.tongSao === truoc.tongSao - 1,
      `${truoc.tongSao}/${truoc.soLuotDanhGia} → ${sau.tongSao}/${sau.soLuotDanhGia}`);
    kiem('bộ đếm khớp với bảng đánh giá', await boDemKhop(game.id));
  } finally {
    await don(game?.id, nguoi?.id, TEN_THE_LOAI);
    await admin?.close();
    await thuong?.close();
  }
}

async function don(gameId, nguoiId, tenTheLoai) {
  if (!gameId || !nguoiId) return;
  await db.chuDe.deleteMany({ where: { gameId, tieuDe: { contains: 'kiểm thử kiểm duyệt' } } });
  await db.danhGia.deleteMany({ where: { gameId, nguoiId } });
  const tl = await db.theLoai.findFirst({
    orderBy: { id: 'asc' }, where: { ten: tenTheLoai }, select: { id: true } });
  if (tl) {
    await db.theLoaiTrenGame.deleteMany({ where: { theLoaiId: tl.id } });
    await db.theLoai.delete({ where: { id: tl.id } });
  }
  await lamMoiBoDem(gameId);
}

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

async function boDemKhop(gameId) {
  const [gom, g] = await Promise.all([
    db.danhGia.aggregate({ where: { gameId }, _sum: { sao: true }, _count: { _all: true } }),
    db.game.findUnique({ where: { id: gameId }, select: { tongSao: true, soLuotDanhGia: true } }),
  ]);
  return g.tongSao === (gom._sum.sao ?? 0) && g.soLuotDanhGia === gom._count._all;
}
