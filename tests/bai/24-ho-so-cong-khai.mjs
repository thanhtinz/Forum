import { GOC, db, moTrang } from '../tro-giup.mjs';

/**
 * Hồ sơ công khai của thành viên.
 *
 * Hai thứ dễ sai nhất ở một trang "ai cũng xem được":
 *
 * 1. LỘ thứ không nên lộ. Trang này dựng từ bảng NguoiDung, mà bảng ấy có cả
 *    email lẫn mã băm mật khẩu — quên một dòng `select` là bày hết ra. Nên có
 *    hẳn một mục kiểm đi soi email trong mã nguồn trang, không phải soi chữ
 *    hiện ra: email lọt vào thuộc tính HTML thì mắt không thấy mà máy vẫn đọc
 *    được.
 * 2. Tài khoản bị KHOÁ mà vẫn xem được hồ sơ. Khoá một người là để người ấy
 *    biến mất khỏi trang, chứ không phải chỉ chặn đăng nhập.
 */
export default async function chay(kiem) {
  // Chọn một chủ đề có thật, để còn bấm từ đó sang hồ sơ của người viết.
  const chuDe = await db.chuDe.findFirst({
    where: { game: { trangThai: 'DANG_HIEN' } },
    orderBy: { id: 'asc' },
    select: {
      id: true, tieuDe: true,
      game: { select: { duongDan: true } },
      nguoi: { select: { id: true, tenDangNhap: true, tenHienThi: true, email: true } },
    },
  });
  if (!chuDe) { kiem('có chủ đề trong dữ liệu mẫu', false); return; }

  const chu = chuDe.nguoi;
  const p = await moTrang();

  // ── Bấm tên người viết ở diễn đàn thì sang hồ sơ ──────────────────────
  await p.goto(`${GOC}/game/${chuDe.game.duongDan}/dien-dan/${chuDe.id}`,
    { waitUntil: 'networkidle' });
  const lienKet = p.locator(`a[href^="/thanh-vien/"]`).first();
  kiem('tên người viết ở diễn đàn bấm được', (await lienKet.count()) > 0);

  await lienKet.click();
  await p.waitForURL('**/thanh-vien/**', { timeout: 15_000 }).catch(() => {});
  kiem('bấm vào thì sang trang hồ sơ', p.url().includes('/thanh-vien/'), p.url());

  const chuTrang = await p.locator('main').textContent();
  kiem('hồ sơ hiện tên hiển thị', chuTrang.includes(chu.tenHienThi), chuTrang.slice(0, 80));
  kiem('hồ sơ hiện tên đăng nhập', chuTrang.includes(`@${chu.tenDangNhap}`));
  kiem('hồ sơ nói năm tham gia', /Tham gia tháng \d+ năm \d{4}/.test(chuTrang), chuTrang.slice(0, 200));

  // ── Không lộ thứ riêng tư ─────────────────────────────────────────────
  const mangUon = await p.content();
  kiem('hồ sơ KHÔNG lộ email', !mangUon.includes(chu.email), chu.email);

  // ── Bày đúng bài của người ấy, và đếm đúng ────────────────────────────
  kiem('hồ sơ liệt kê chủ đề người ấy mở', chuTrang.includes(chuDe.tieuDe), chuDe.tieuDe);

  const [soChuDe, soTraLoi, soDanhGia] = await Promise.all([
    db.chuDe.count({ where: { nguoiId: chu.id, game: { trangThai: 'DANG_HIEN' } } }),
    db.traLoi.count({ where: { nguoiId: chu.id, chuDe: { game: { trangThai: 'DANG_HIEN' } } } }),
    db.danhGia.count({ where: { nguoiId: chu.id, game: { trangThai: 'DANG_HIEN' } } }),
  ]);
  const so = async (nhan) =>
    (await p.locator(`dt:has-text("${nhan}")`).locator('xpath=preceding-sibling::dd[1]')
      .first().textContent()).trim();
  kiem('đếm đúng số chủ đề', (await so('chủ đề')) === String(soChuDe), `bảng nói ${soChuDe}`);
  kiem('đếm đúng số trả lời', (await so('trả lời')) === String(soTraLoi), `bảng nói ${soTraLoi}`);
  kiem('đếm đúng số đánh giá', (await so('đánh giá')) === String(soDanhGia), `bảng nói ${soDanhGia}`);

  // Một đánh giá của chính người ấy phải nằm trong danh sách — lấy bài mới
  // nhất để chắc chắn nó không bị rơi ra ngoài mười mục đầu.
  const dg = await db.danhGia.findFirst({
    where: { nguoiId: chu.id, game: { trangThai: 'DANG_HIEN' } },
    orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
    select: { game: { select: { ten: true } } },
  });
  if (dg) {
    kiem('hồ sơ liệt kê game người ấy đã đánh giá',
      chuTrang.includes(dg.game.ten), dg.game.ten);
  }

  // ── Tên đăng nhập gõ hoa vẫn ra đúng người ────────────────────────────
  const r = await p.goto(`${GOC}/thanh-vien/${chu.tenDangNhap.toUpperCase()}`,
    { waitUntil: 'domcontentloaded' });
  kiem('gõ tên đăng nhập viết hoa vẫn ra hồ sơ', r.status() === 200, `trả về ${r.status()}`);

  // ── Người không có thật thì 404 ───────────────────────────────────────
  const r2 = await p.goto(`${GOC}/thanh-vien/khong-co-ai-ten-the-nay`,
    { waitUntil: 'domcontentloaded' });
  kiem('người không có thật thì trả 404', r2.status() === 404, `trả về ${r2.status()}`);

  // ── Tài khoản bị khoá thì coi như không có ────────────────────────────
  const TEN_TAM = 'kiem-ho-so-tam';
  await db.nguoiDung.deleteMany({ where: { tenDangNhap: TEN_TAM } });
  const tam = await db.nguoiDung.create({
    data: {
      email: `${TEN_TAM}@sunnystore.local`, tenDangNhap: TEN_TAM,
      tenHienThi: 'Người Tạm', matKhauBam: 'x',
    },
    select: { id: true },
  });
  try {
    // Chưa khoá: vào được, và vì chưa viết gì nên phải nói rõ là chưa có gì
    // chứ không bày ra một trang trống không ai hiểu.
    const r3 = await p.goto(`${GOC}/thanh-vien/${TEN_TAM}`, { waitUntil: 'domcontentloaded' });
    kiem('người mới chưa viết gì vẫn có hồ sơ', r3.status() === 200, `trả về ${r3.status()}`);
    const chuTam = await p.locator('main').textContent();
    kiem('hồ sơ rỗng nói rõ là chưa có gì',
      chuTam.includes('Chưa chấm sao game nào') && chuTam.includes('Chưa mở chủ đề nào'),
      chuTam.slice(0, 120));

    await db.nguoiDung.update({ where: { id: tam.id }, data: { khoa: true }, select: { id: true } });
    const r4 = await p.goto(`${GOC}/thanh-vien/${TEN_TAM}`, { waitUntil: 'domcontentloaded' });
    kiem('tài khoản bị khoá thì hồ sơ trả 404', r4.status() === 404, `trả về ${r4.status()}`);
  } finally {
    await db.nguoiDung.delete({ where: { id: tam.id } });
  }

  await p.close();
}
