import { GOC, db, moTrang } from '../tro-giup.mjs';

/**
 * LỊCH SỬ PHIÊN BẢN — mỗi hệ máy một dãy số hiệu riêng.
 *
 * Đây là thứ kho game cũ có mà cửa hàng lớn không có, nên cũng là chỗ dễ hỏng
 * nhất: dãy của hệ này lọt sang hệ kia thì người dùng tải bản Android về máy
 * Nokia. Bài kiểm soi đúng chuyện ấy.
 */
export default async function chay(kiem) {
  // Tìm game có lịch sử dài nhất, không chép cứng tên game.
  const game = await db.game.findMany({
    where: { trangThai: 'DANG_HIEN' },
    select: { duongDan: true, ten: true, banTai: { select: { heMay: true, soHieu: true, moiNhat: true } } },
  }).then((ds) => ds.sort((a, b) => b.banTai.length - a.banTai.length)[0]);

  if (!game || game.banTai.length < 4) {
    kiem('có game nhiều phiên bản để kiểm', false, `nhiều nhất ${game?.banTai.length ?? 0} bản`);
    return;
  }

  // ── Bất biến của dữ liệu: MỖI HỆ đúng MỘT bản mang cờ "mới nhất" ──────
  const theoHe = new Map();
  for (const b of game.banTai) {
    theoHe.set(b.heMay, [...(theoHe.get(b.heMay) ?? []), b]);
  }
  for (const [he, ds] of theoHe) {
    const soMoiNhat = ds.filter((b) => b.moiNhat).length;
    kiem(`hệ ${he} có đúng một bản mới nhất`, soMoiNhat === 1, `đếm được ${soMoiNhat}`);
  }

  // Không hệ nào dùng chung số hiệu với hệ khác một cách vô tình — mỗi hệ
  // phải có dãy riêng, đó là lý do bảng tách theo hệ ngay từ lược đồ.
  const trung = [...theoHe.values()].every((ds) =>
    new Set(ds.map((b) => b.soHieu)).size === ds.length);
  kiem('trong một hệ không có hai bản trùng số hiệu', trung);

  const p = await moTrang();
  await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });

  const heDau = [...theoHe.keys()][0];
  const banHeDau = theoHe.get(heDau);

  /*
   * ── Mặc định GẤP HẲN, không in dòng nào ───────────────────────────────
   *
   * Gấp lại mà vẫn chừa dòng của bản đang chọn thì dòng ấy lặp đúng những gì
   * phần đầu khung tải vừa nói — số hiệu, nhãn "mới nhất", ngày, câu "có gì
   * mới" — bốn thứ in hai lần cách nhau một gang tay.
   */
  const hienLucDau = await p.locator('#tai ol li').count();
  kiem('lịch sử gấp lại thì không in dòng nào', hienLucDau === 0, `đang hiện ${hienLucDau} dòng`);
  kiem('có nút mở lịch sử, ghi rõ tổng số bản',
    (await p.locator(`#tai button:has-text("Xem ${banHeDau.length} phiên bản")`).count()) > 0,
    `chờ "Xem ${banHeDau.length} phiên bản"`);

  // Và phần đầu khung tải KHÔNG được lặp lại câu "có gì mới" của bản đang chọn.
  const soLanCoGiMoi = await p.locator('#tai h3:has-text("Có gì mới")').count();
  kiem('không in khối "Có gì mới" riêng khi đã có trục thời gian', soLanCoGiMoi === 0);

  // ── Mở ra thì hiện đủ ─────────────────────────────────────────────────
  await p.locator(`#tai button:has-text("Xem ${banHeDau.length} phiên bản")`).click();
  await p.waitForTimeout(400);
  const hienSauKhiMo = await p.locator('#tai ol li').count();
  kiem('mở ra thì hiện đủ mọi bản của hệ đang chọn',
    hienSauKhiMo === banHeDau.length, `hiện ${hienSauKhiMo}, chờ ${banHeDau.length}`);

  // ── Bản của hệ KHÁC không được lọt vào danh sách ──────────────────────
  const chuTrongLichSu = await p.locator('#tai ol').textContent();
  const heKhac = [...theoHe.keys()].find((h) => h !== heDau);
  if (heKhac) {
    const soHieuHeKhac = theoHe.get(heKhac)
      .map((b) => b.soHieu)
      .filter((v) => !banHeDau.some((b) => b.soHieu === v));
    const lot = soHieuHeKhac.filter((v) => chuTrongLichSu.includes(v));
    kiem('không lẫn bản của hệ máy khác vào lịch sử', lot.length === 0, `lọt: ${lot.join(', ')}`);
  }

  // ── Bấm một bản cũ thì đổi hẳn nút tải sang bản ấy ────────────────────
  const banCu = banHeDau.find((b) => !b.moiNhat);
  if (banCu) {
    await p.locator(`#tai ol button:has-text("${banCu.soHieu}")`).first().click();
    await p.waitForTimeout(400);
    const dauTrang = await p.locator('#tai').textContent();
    kiem('chọn bản cũ thì phần đầu đổi theo bản ấy',
      dauTrang.includes(`Bản ${banCu.soHieu}`), dauTrang.slice(0, 120));

    // Nút tải phải trỏ sang ĐÚNG tệp của bản vừa chọn, không phải tệp của bản
    // mới nhất — đây mới là chỗ chọn nhầm gây hậu quả thật.
    const tepBanCu = await db.tepTai.findFirst({
      where: { ban: { heMay: heDau, soHieu: banCu.soHieu, game: { duongDan: game.duongDan } } },
      orderBy: { loai: 'asc' },
      select: { id: true },
    });
    if (tepBanCu) {
      const dich = await p.locator('#tai a[href^="/api/tai/"]').first().getAttribute('href');
      const moiTepCuaBan = await db.tepTai.findMany({
        where: { ban: { heMay: heDau, soHieu: banCu.soHieu, game: { duongDan: game.duongDan } } },
        select: { id: true },
      });
      kiem('nút tải trỏ đúng tệp của bản đang chọn',
        moiTepCuaBan.some((t) => dich === `/api/tai/${t.id}`), `đang trỏ ${dich}`);
    }
  }

  // ── Đổi hệ máy thì lịch sử gấp lại và đổi sang dãy của hệ mới ─────────
  if (heKhac) {
    const NHAN = { JAVA: 'Java ME', ANDROID: 'Android', IOS: 'iOS', WINDOWS: 'Windows', MAC: 'macOS' };
    await p.locator(`#tai button:has-text("${NHAN[heKhac]}")`).first().click();
    await p.waitForTimeout(400);
    const lai = await p.locator('#tai ol li').count();
    kiem('đổi hệ máy thì lịch sử gấp lại', lai === 0, `đang hiện ${lai}`);

    const moiNhatHeKhac = theoHe.get(heKhac).find((b) => b.moiNhat);
    const chu = await p.locator('#tai').textContent();
    kiem('đổi hệ máy thì nhảy về bản mới nhất của hệ ấy',
      chu.includes(`Bản ${moiNhatHeKhac.soHieu}`), chu.slice(0, 120));
  }

  await p.close();
}
