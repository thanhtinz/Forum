import { GOC, db, moTrang } from '../tro-giup.mjs';

/**
 * LỊCH SỬ PHIÊN BẢN — mỗi hệ máy một dãy số hiệu riêng.
 *
 * Đây là thứ cửa hàng game cũ có mà cửa hàng lớn không có, nên cũng là chỗ dễ hỏng
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

  /*
   * Hệ máy được chọn sẵn là hệ ĐẦU TIÊN THEO THỨ TỰ KHAI BÁO (`HE_MAY`), chứ
   * không phải hệ nào tình cờ đứng đầu trong kết quả CSDL trả về.
   *
   * Bản trước bài kiểm lấy `[...theoHe.keys()][0]` — tức thứ tự của CSDL — nên
   * chạy lại seed một lần là hàng đổi id, thứ tự đổi theo, và bài kiểm đỏ
   * trong khi mã không sai chỗ nào. Đoán thứ tự của CSDL là đoán bừa: Postgres
   * không hứa gì khi truy vấn không có ORDER BY.
   */
  const THU_TU_HE = ['JAVA', 'ANDROID', 'IOS', 'WINDOWS', 'MAC'];
  const heDau = THU_TU_HE.find((h) => theoHe.has(h));
  const banHeDau = theoHe.get(heDau);

  /*
   * ── CẢ DÃY BẢN NẰM TRONG TẤM TẢI, KHÔNG GẤP LẠI NỮA ───────────────────
   *
   * Trước đợt này lịch sử là một ô GẤP trong khối tải giữa trang: mặc định
   * đóng, phải bấm "Xem N phiên bản" mới mở. Nay bấm "Tải về" là tấm tải hiện
   * ra với đủ dãy bản của hệ đang chọn, mỗi bản một hàng kèm nút tải ngay cạnh
   * — muốn so hai bản không phải mở ra đóng vào hai lượt nữa.
   */
  kiem('vào trang thì tấm tải chưa mở',
    (await p.locator('dialog[open]').count()) === 0);

  await p.click('[data-viec="tai-dau"]');
  await p.waitForSelector('dialog[open]', { timeout: 5000 });
  const tam = p.locator('dialog[open]');

  const soHang = await tam.locator('ul li').count();
  kiem('tấm tải bày đủ mọi bản của hệ đang chọn',
    soHang === banHeDau.length, `hiện ${soHang}, chờ ${banHeDau.length}`);

  /*
   * ── MỤC "CÓ GÌ MỚI" Ở TAB THÔNG TIN ──────────────────────────────────
   *
   * Khác hẳn khối vừa kiểm ở trên: khối kia nằm TRONG khung tải, cạnh trục
   * thời gian, nên in ra là lặp. Mục này nằm ở tab thông tin, trên phần giới
   * thiệu — đúng chỗ App Store đặt nó, và đúng thứ người đã tải quay lại xem.
   *
   * Nó phải nhắc ghi chú của bản MỚI NHẤT CÓ GHI, không phải bản mới nhất:
   * game cũ thường chỉ ghi cho một hai bản giữa dãy.
   */
  const banCoGhi = await db.banTai.findFirst({
    where: { game: { duongDan: game.duongDan }, doiMoi: { not: null } },
    orderBy: [{ moiNhat: 'desc' }, { ngayRa: 'desc' }, { id: 'desc' }],
    select: { soHieu: true, doiMoi: true },
  });
  if (banCoGhi) {
    const chuTrang = await p.locator('body').textContent();
    kiem('tab thông tin có mục "Có gì mới"',
      (await p.locator('h2:has-text("Có gì mới")').count()) > 0);
    kiem('mục ấy nhắc đúng ghi chú của bản mới nhất có ghi',
      chuTrang.includes(banCoGhi.doiMoi.slice(0, 40)), banCoGhi.doiMoi.slice(0, 40));
    kiem('mục ấy nói rõ là bản nào', chuTrang.includes(`Bản ${banCoGhi.soHieu}`));
    /* Lối "Lịch sử phiên bản" nay MỞ TẤM TẢI chứ không cuộn xuống một khối
       nào nữa, nên nó là một cái nút — xem đổi gì rồi tải ngay bản ấy là một
       mạch. */
    kiem('mục ấy có lối mở lịch sử phiên bản',
      (await p.locator('button:has-text("Lịch sử phiên bản")').count()) > 0);
  }

  // ── Bản của hệ KHÁC không được lọt vào danh sách ──────────────────────
  const chuTrongLichSu = await tam.locator('ul').textContent();
  const heKhac = THU_TU_HE.find((h) => theoHe.has(h) && h !== heDau);
  if (heKhac) {
    const soHieuHeKhac = theoHe.get(heKhac)
      .map((b) => b.soHieu)
      .filter((v) => !banHeDau.some((b) => b.soHieu === v));
    const lot = soHieuHeKhac.filter((v) => chuTrongLichSu.includes(v));
    kiem('không lẫn bản của hệ máy khác vào lịch sử', lot.length === 0, `lọt: ${lot.join(', ')}`);
  }

  /*
   * ── MỖI HÀNG TRỎ ĐÚNG TỆP CỦA CHÍNH BẢN ẤY ────────────────────────────
   *
   * Đây là chỗ chọn nhầm gây hậu quả thật: trỏ nhầm sang tệp của bản mới nhất
   * thì người cố ý lấy bản cũ cho máy đời 2006 lại nhận đúng bản làm treo máy.
   */
  const banCu = banHeDau.find((b) => !b.moiNhat);
  if (banCu) {
    const hang = tam.locator('li').filter({ hasText: `Bản ${banCu.soHieu}` }).first();
    kiem('bản cũ có hàng riêng trong tấm tải', (await hang.count()) > 0);

    const moiTepCuaBan = await db.tepTai.findMany({
      where: { ban: { heMay: heDau, soHieu: banCu.soHieu, game: { duongDan: game.duongDan } } },
      select: { id: true },
    });
    if (moiTepCuaBan.length > 0) {
      const dich = await hang.locator('a[href^="/tai/"]').first().getAttribute('href');
      kiem('nút tải của hàng ấy trỏ đúng tệp của chính bản ấy',
        moiTepCuaBan.some((t) => dich === `/tai/${t.id}`), `đang trỏ ${dich}`);
    }
  }

  /*
   * ── DÃY DÀI THÌ CÓ Ô TÌM VÀ PHÂN TRANG ────────────────────────────────
   *
   * Game đời đầu có game mang vài chục bản: dãy ấy dài hơn cả màn hình, mà
   * người đi tìm đúng bản 1.1 cho máy Nokia thì phải cuộn mò. Dựng hẳn một
   * game mười bốn bản để đo, vì bộ dữ liệu mẫu không chắc có game nào đủ dài —
   * mà bài kiểm dựa vào "chắc là có" thì đỏ lúc nào không hay.
   */
  const DAI = 'kiemthu-nhieu-ban';
  try {
    await db.game.deleteMany({ where: { duongDan: DAI } });
    await db.game.create({
      data: {
        ten: 'Game nhiều bản', duongDan: DAI, trangThai: 'DANG_HIEN', dangLuc: new Date(),
        banTai: {
          create: Array.from({ length: 14 }, (_, i) => ({
            heMay: 'JAVA', soHieu: `1.${i}`, moiNhat: i === 13,
            ghiChu: i === 4 ? 'Sửa lỗi âm thanh' : null,
          })),
        },
      },
      select: { id: true },
    });

    await p.goto(`${GOC}/game/${DAI}`, { waitUntil: 'networkidle' });
    await p.click('[data-viec="tai-dau"]');
    await p.waitForSelector('dialog[open]', { timeout: 5000 });
    const tamDai = p.locator('dialog[open]');

    kiem('dãy dài thì tấm tải có ô tìm',
      (await tamDai.locator('input[aria-label="Tìm phiên bản"]').count()) === 1);
    kiem('và cắt trang thay vì đổ hết ra một mạch',
      (await tamDai.locator('ul li').count()) === 8,
      `đang hiện ${await tamDai.locator('ul li').count()}`);
    kiem('dòng đếm nói rõ đang ở trang nào trên tổng bao nhiêu',
      ((await tamDai.textContent()) ?? '').includes('Trang 1/2'));

    await tamDai.locator('button:has-text("Sau")').click();
    await p.waitForTimeout(300);
    kiem('lật sang trang sau thì hiện nốt mấy bản còn lại',
      (await tamDai.locator('ul li').count()) === 6,
      `đang hiện ${await tamDai.locator('ul li').count()}`);

    /* Tìm theo GHI CHÚ, không chỉ theo số hiệu: lắm khi người ta nhớ "bản sửa
       lỗi âm thanh" chứ không nhớ con số. */
    await tamDai.locator('input[aria-label="Tìm phiên bản"]').fill('âm thanh');
    await p.waitForTimeout(400);
    const conLai = await tamDai.locator('ul li').count();
    kiem('gõ vào ô tìm thì lọc theo cả ghi chú', conLai === 1, `còn ${conLai} hàng`);
    kiem('và nhảy về trang một, không để danh sách trống',
      !((await tamDai.textContent()) ?? '').includes('Trang 2/'));

    await tamDai.locator('input[aria-label="Tìm phiên bản"]').fill('không có bản nào thế này');
    await p.waitForTimeout(400);
    kiem('gõ chuỗi không khớp thì nói thẳng là không có',
      ((await tamDai.textContent()) ?? '').includes('Không có bản nào khớp'));
  } finally {
    await db.game.deleteMany({ where: { duongDan: DAI } });
  }

  await p.close();
}
