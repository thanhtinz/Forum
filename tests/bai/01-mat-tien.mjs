import { GOC, db, moTrang } from '../tro-giup.mjs';

/**
 * Bốn tab đáy và hai mặt tiền: "Hôm nay" và "Game".
 *
 * Kiểm ở mức MÃ NGUỒN và mức số đếm chứ không chỉ "trang trả về 200": một
 * trang lỗi giữa chừng vẫn trả 200 với cái vỏ rỗng.
 */
export default async function chay(kiem) {
  const p = await moTrang();

  // ── Tab "Hôm nay" (trang gốc) ────────────────────────────────────────
  await p.goto(GOC, { waitUntil: 'networkidle' });
  kiem('tab Hôm nay có tiêu đề ngày', (await p.locator('h1:has-text("Hôm nay")').count()) > 0);
  const soTamLon = await p.locator('main article').count();
  kiem('tab Hôm nay bày tấm lớn do người chọn', soTamLon > 0, `đếm được ${soTamLon}`);

  // ── Thanh tab đáy: đúng bốn ô, đúng bốn tên ──────────────────────────
  const tenTab = await p.locator('nav[aria-label="Điều hướng chính"] a').evaluateAll((els) =>
    els.map((e) => e.textContent?.trim() ?? ''));
  kiem('thanh tab đáy có đúng bốn ô', tenTab.length === 4, JSON.stringify(tenTab));
  for (const t of ['Hôm nay', 'Game', 'BXH', 'Tìm kiếm']) {
    kiem(`thanh tab đáy có ô “${t}”`, tenTab.includes(t), JSON.stringify(tenTab));
  }

  // ── Tab "Game" — mặt tiền của kho ────────────────────────────────────
  await p.goto(`${GOC}/game`, { waitUntil: 'networkidle' });

  for (const ten of ['Bảng xếp hạng', 'Mới ra mắt', 'Thể loại']) {
    kiem(`tab Game có khối “${ten}”`, (await p.locator(`text=${ten}`).count()) > 0);
  }

  /*
   * KHÔNG KHỐI NÀO ĐƯỢC LẶP LẠI KHỐI KHÁC.
   *
   * Đây từng là lỗi thật: kệ "Đề xuất cho bạn" xếp theo lượt XEM đứng ngay
   * trên bảng xếp hạng xếp theo lượt TẢI, và cả hai ra đúng chín game giống
   * nhau theo đúng một thứ tự. Bài kiểm này gom tên game trong từng khối rồi
   * so, nên kho có đổi dữ liệu thì nó vẫn bắt được nếu hai kệ lại trùng nhau.
   */
  const tenTrongKhoi = async (tieuDe) => {
    const khoi = p.locator('section').filter({ hasText: tieuDe }).first();
    const ten = await khoi.locator('a[href^="/game/"]').evaluateAll((els) =>
      els.map((e) => e.textContent?.trim().split('\n')[0] ?? '').filter(Boolean));
    return [...new Set(ten)];
  };

  const xepHang = await tenTrongKhoi('Bảng xếp hạng');
  const moiLenKho = await tenTrongKhoi('Mới ra mắt');
  if (xepHang.length >= 3 && moiLenKho.length >= 3) {
    const trung = xepHang.filter((t) => moiLenKho.includes(t)).length;
    const tiLe = trung / Math.min(xepHang.length, moiLenKho.length);
    kiem('hai kệ liền nhau không bày cùng một danh sách', tiLe < 0.9,
      `trùng ${trung}/${Math.min(xepHang.length, moiLenKho.length)}`);
  }

  // Nút cài phải có ở mỗi hàng game — đây là dấu hiệu của cửa hàng, thiếu nó
  // thì danh sách chỉ là một bảng chữ.
  const soNutCai = await p.locator('a.nut-cai').count();
  kiem('mỗi hàng game có nút Cài đặt', soNutCai >= 5, `đếm được ${soNutCai}`);

  // Băng nổi bật chỉ bày game được đánh dấu, không bày bừa.
  const soNoiBat = await db.game.count({ where: { trangThai: 'DANG_HIEN', noiBat: true } });
  const tenNoiBat = await db.game.findMany({
    where: { trangThai: 'DANG_HIEN', noiBat: true }, take: 1, select: { ten: true },
  });
  if (soNoiBat > 0) {
    kiem('băng nổi bật có game được chọn tay',
      (await p.locator(`text=${tenNoiBat[0].ten}`).count()) > 0);
  }

  // Game NHÁP tuyệt đối không được lọt ra mặt tiền.
  const nhap = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'NHAP' }, select: { ten: true } });
  if (nhap) {
    const html = await p.content();
    kiem('game nháp không lọt ra trang chủ', !html.includes(nhap.ten));
  }

  // ── Tab "BXH" ────────────────────────────────────────────────────────
  await p.goto(`${GOC}/bxh`, { waitUntil: 'networkidle' });
  const soHang = await p.locator('main ol > li').count();
  kiem('trang BXH có danh sách đánh số', soHang > 0, `đếm được ${soHang}`);
  const soDau = await p.locator('main ol > li').first().textContent();
  kiem('hạng đầu bảng đánh số 1', (soDau ?? '').trim().startsWith('1'), (soDau ?? '').slice(0, 30));

  // Chip lọc bấm được và dẫn sang trang duyệt có đúng bộ lọc.
  await p.goto(`${GOC}/duyet?he=JAVA`, { waitUntil: 'networkidle' });
  const soJava = await db.game.count({
    where: { trangThai: 'DANG_HIEN', banTai: { some: { heMay: 'JAVA' } } },
  });
  /*
   * Đọc bằng `textContent` chứ không bằng `includes` trên mã nguồn HTML.
   * React chèn `<!-- -->` vào giữa một biểu thức và đoạn chữ liền sau nó, nên
   * trong mã nguồn con số và chữ "game" KHÔNG dính nhau — tìm chuỗi thô là
   * trượt, dù trên màn hình vẫn đọc ra đúng câu ấy.
   */
  const dong = await p.locator('p:has-text("khớp với lựa chọn")').first().textContent();
  kiem('lọc theo hệ Java ra đúng số game',
    (dong ?? '').includes(`${soJava} game`), `đang là “${dong}”, chờ ${soJava}`);

  await p.close();
}
