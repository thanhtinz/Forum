import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const DAU = 'Ktpt';
const SO_CHU_DE = 25;
const MOI_TRANG = 20;

/**
 * Tìm chủ đề và phân trang trong diễn đàn của một game.
 *
 * Hai thứ này luôn hỏng cùng nhau, và hỏng theo lối im lặng: trang 2 lặp lại
 * một chủ đề đã thấy ở trang 1 rồi giấu mất một chủ đề khác, hoặc tìm xong
 * bấm sang trang 2 thì bộ lọc rơi mất và cả diễn đàn ùa về. Không ai báo lỗi
 * mấy chuyện ấy — người ta chỉ nghĩ chủ đề mình tìm đã bị xoá.
 *
 * Nên bài này không đếm hàng trên một trang. Nó GOM ID CỦA CẢ HAI TRANG rồi so
 * với danh sách thật: đủ, không trùng, không sót.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  const nguoi = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'huytran' }, select: { id: true },
  });
  if (!game || !nguoi) { kiem('có dữ liệu mẫu', false); return; }

  const don = async () => {
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: DAU } }, select: { id: true },
    });
    const id = cu.map((c) => c.id);
    await db.theoDoiChuDe.deleteMany({ where: { chuDeId: { in: id } } });
    await db.traLoi.deleteMany({ where: { chuDeId: { in: id } } });
    await db.chuDe.deleteMany({ where: { id: { in: id } } });
  };
  await don();

  let p, khach;
  try {
    /*
     * Mốc thời gian GIÃN RA từng phút.
     *
     * Danh sách xếp theo `traLoiCuoiLuc`, mà dựng liền một mạch thì hai mươi
     * lăm chủ đề dính cùng một mốc — lúc ấy thứ tự do khoá phụ `id` quyết, và
     * bài kiểm không còn phân biệt được "phân trang đúng" với "phân trang may".
     */
    const goc = Date.now() - SO_CHU_DE * 60_000;
    for (let i = 0; i < SO_CHU_DE; i++) {
      const luc = new Date(goc + i * 60_000);
      await db.chuDe.create({
        data: {
          gameId: game.id, nguoiId: nguoi.id,
          tieuDe: `${DAU} chủ đề số ${String(i).padStart(2, '0')}`,
          noiDung: `Nội dung của chủ đề số ${i}.`,
          timKiem: `${DAU} chu de so ${String(i).padStart(2, '0')}`.toLowerCase(),
          taoLuc: luc, traLoiCuoiLuc: luc,
        },
        select: { id: true },
      });
    }

    const dia = `${GOC}/game/${game.duongDan}/dien-dan`;
    khach = await moTrang();

    /*
     * Ô TÌM PHẢI CÓ MẶT, và phải gửi được bằng chuột.
     *
     * Trước đây nó chỉ hiện khi diễn đàn có từ năm chủ đề — mà phần lớn game
     * chưa tới năm, nên người dùng học được rằng diễn đàn này không tìm được
     * rồi thôi không tìm nữa. Và nó từng không có nút gửi: trên điện thoại,
     * bàn phím che mất nửa màn hình mà không phải bàn phím nào cũng bày sẵn
     * phím tìm.
     */
    await khach.goto(dia, { waitUntil: 'networkidle' });
    kiem('diễn đàn bày ô tìm', (await khach.locator('input[name="tim"]').count()) === 1);
    kiem('và ô tìm có nút gửi bấm được',
      (await khach.locator('form:has(input[name="tim"]) button[type="submit"]').count()) === 1);

    await khach.fill('input[name="tim"]', 'chu de so 09');
    await khach.click('form:has(input[name="tim"]) button[type="submit"]');
    await khach.waitForURL((u) => u.searchParams.get('tim') === 'chu de so 09', { timeout: 10_000 })
      .catch(() => {});
    kiem('bấm nút tìm thì ra đúng kết quả',
      (await khach.locator('ul[aria-label="Danh sách chủ đề"] li').count()) === 1,
      khach.url());

    /*
     * Đọc ID CHỦ ĐỀ trên trang, không đọc tiêu đề.
     *
     * Diễn đàn của game mẫu VỐN ĐÃ CÓ chủ đề sẵn, nên "đếm hàng rồi so với số
     * mình vừa dựng" là sai ngay từ đầu — lượt chạy đầu tiên của bài này đỏ
     * đúng vì thế, và cái đỏ ấy là lỗi của bài kiểm chứ không phải của trang.
     * Id thì không lẫn vào đâu được.
     */
    const docId = async (duong) => {
      await khach.goto(duong, { waitUntil: 'networkidle' });
      return khach.locator('ul[aria-label="Danh sách chủ đề"] li a[href*="/dien-dan/"]')
        .evaluateAll((ns) => ns.map((n) => (n.getAttribute('href') ?? '').split('/').pop()));
    };
    const docTieuDe = async (duong) => {
      await khach.goto(duong, { waitUntil: 'networkidle' });
      return khach.locator('ul[aria-label="Danh sách chủ đề"] li').evaluateAll(
        (ns) => ns.map((n) => (n.textContent ?? '').match(/Ktpt chủ đề số \d\d/)?.[0] ?? '')
          .filter(Boolean));
    };

    // ── Đi hết mọi trang: đủ, không trùng, không sót ───────────────────
    const tongThat = await db.chuDe.count({ where: { gameId: game.id } });
    const soTrangThat = Math.ceil(tongThat / MOI_TRANG);
    kiem('diễn đàn này nhiều hơn một trang để mà kiểm', soTrangThat >= 2, `${tongThat} chủ đề`);

    const tatCa = [];
    for (let t = 1; t <= soTrangThat; t++) {
      const hang = await docId(t === 1 ? dia : `${dia}?trang=${t}`);
      if (t < soTrangThat) {
        kiem(`trang ${t} đầy đúng một trang`, hang.length === MOI_TRANG, `${hang.length} hàng`);
      }
      tatCa.push(...hang);
    }

    kiem('đi hết mọi trang thì KHÔNG gặp lại chủ đề nào hai lần',
      new Set(tatCa).size === tatCa.length,
      `${tatCa.length} hàng, ${new Set(tatCa).size} khác nhau`);
    kiem('và gặp đủ mọi chủ đề của diễn đàn, không sót cái nào',
      new Set(tatCa).size === tongThat, `thấy ${new Set(tatCa).size} / ${tongThat}`);

    const cuaToi = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: DAU } }, select: { id: true },
    });
    kiem('mỗi chủ đề vừa dựng đều xuất hiện đúng một lần',
      cuaToi.every((c) => tatCa.filter((x) => x === c.id).length === 1));

    // ── Số trang bịa thì kẹp về trang có thật ─────────────────────────
    const cuoi = await docId(`${dia}?trang=${soTrangThat}`);
    const t99 = await docId(`${dia}?trang=99`);
    kiem('`?trang=99` đưa về trang cuối chứ không ra danh sách trống',
      JSON.stringify(t99) === JSON.stringify(cuoi), `${t99.length} hàng`);

    // ── Tìm: gõ có dấu hay không dấu đều ra ───────────────────────────
    const coDau = await docTieuDe(`${dia}?tim=${encodeURIComponent('chủ đề số 07')}`);
    kiem('gõ CÓ DẤU tìm được', coDau.length === 1 && coDau[0].includes('07'), coDau.join(','));
    const khongDau = await docTieuDe(`${dia}?tim=${encodeURIComponent('chu de so 07')}`);
    kiem('gõ KHÔNG DẤU cũng ra đúng chủ đề ấy',
      JSON.stringify(khongDau) === JSON.stringify(coDau), khongDau.join(','));

    /*
     * ── TÌM XONG SANG TRANG 2 THÌ VẪN LÀ KẾT QUẢ TÌM ──────────────────
     *
     * Đây là chỗ hỏng kinh điển: lối sang trang không mang theo từ khoá, nên
     * trang 2 là cả diễn đàn trong khi trang 1 vừa lọc. Người đọc tưởng trang
     * hỏng, mà cũng có thể tin nhầm rằng mấy chủ đề kia đều khớp.
     */
    await khach.goto(`${dia}?tim=${encodeURIComponent('chu de so')}`, { waitUntil: 'networkidle' });
    const loiSang2 = await khach.locator('nav a[href*="trang=2"], a[href*="trang=2"]')
      .first().getAttribute('href').catch(() => null);
    kiem('kết quả tìm nhiều hơn một trang thì có lối sang trang 2', !!loiSang2, String(loiSang2));
    kiem('và lối ấy mang theo từ khoá',
      (loiSang2 ?? '').includes('tim='), String(loiSang2));

    if (loiSang2) {
      const t2Tim = await docTieuDe(new URL(loiSang2, GOC).toString());
      kiem('sang trang 2 của kết quả tìm vẫn chỉ ra chủ đề khớp',
        t2Tim.length > 0 && t2Tim.every((x) => x.startsWith(DAU)), t2Tim.join(','));
    }

    // ── Lọc + tìm chồng nhau ──────────────────────────────────────────
    const locTim = await docTieuDe(`${dia}?loc=chua-tra-loi&tim=${encodeURIComponent('so 03')}`);
    kiem('lọc và tìm chồng nhau thì cùng có hiệu lực',
      locTim.length === 1 && locTim[0].includes('03'), locTim.join(','));

    /*
     * ── SỬA TIÊU ĐỀ THÌ Ô TÌM PHẢI BIẾT ──────────────────────────────
     *
     * Chuỗi tìm là một cột dựng sẵn lúc ghi. Quên dựng lại lúc SỬA thì bài đổi
     * tên xong vẫn chỉ tìm ra bằng tên cũ — và không ai phát hiện, vì người
     * sửa thì nhớ tên mới, còn người tìm thì không biết có bài ấy.
     */
    p = await moTrangDaDangNhap('huytran', 'thanhvien123');
    const doiTen = await db.chuDe.findFirst({
      where: { tieuDe: { startsWith: `${DAU} chủ đề số 11` } }, select: { id: true },
    });
    await p.goto(`${GOC}/game/${game.duongDan}/dien-dan/${doiTen.id}`, { waitUntil: 'networkidle' });
    await p.click('button:has-text("Sửa bài")');
    await p.fill('input[name="tieuDe"]', `${DAU} chủ đề số 11 thêm chữ lachtachriengbiet`);
    await p.click('button:has-text("Lưu bài")');
    await doiToi(async () =>
      ((await db.chuDe.findUnique({ where: { id: doiTen.id }, select: { timKiem: true } }))
        ?.timKiem ?? '').includes('lachtachriengbiet'));

    const sauSua = await docTieuDe(`${dia}?tim=lachtachriengbiet`);
    kiem('sửa tiêu đề xong thì tìm bằng chữ MỚI ra ngay',
      sauSua.length === 1, `${sauSua.length} kết quả`);
  } finally {
    if (p) await p.close();
    if (khach) await khach.close();
    await don();
  }
}
