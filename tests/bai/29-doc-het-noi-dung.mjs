import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const DAU = 'kiemthu-phantrang';

/*
 * ĐỌC ĐƯỢC HẾT — phân trang diễn đàn và trang đánh giá đầy đủ.
 *
 * Trước đây danh sách chủ đề lấy `take: 50`, một chủ đề lấy `take: 200`, trang
 * game khoe sáu đánh giá — rồi thôi. Phần dôi ra không có lối nào tới được,
 * mà người viết vẫn thấy bài mình gửi đi trót lọt. Bài này canh đúng chỗ ấy.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' },
    where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  if (!game) { kiem('có game mẫu', false); return; }

  const nguoi = await db.nguoiDung.findFirst({
    orderBy: { id: 'asc' }, where: { tenDangNhap: 'huytran' }, select: { id: true },
  });
  if (!nguoi) { kiem('có tài khoản mẫu', false); return; }

  const don = async () => {
    await db.chuDe.deleteMany({ where: { tieuDe: { startsWith: DAU } } });
    await db.danhGia.deleteMany({ where: { nguoi: { tenDangNhap: { startsWith: DAU } } } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: DAU } } });
  };
  await don();

  try {
    // ── Danh sách chủ đề chia trang ────────────────────────────────────
    // 25 chủ đề, mỗi trang 20 → đúng hai trang, trang sau còn 5.
    await db.chuDe.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({
        gameId: game.id, nguoiId: nguoi.id,
        tieuDe: `${DAU} chủ đề số ${String(i).padStart(2, '0')}`,
        noiDung: 'Nội dung dựng sẵn để kiểm phân trang.',
        // Mốc giờ cách nhau để thứ tự xác định được, không phụ thuộc lúc ghi.
        traLoiCuoiLuc: new Date(Date.now() - i * 60_000),
      })),
    });

    const goc = `${GOC}/game/${game.duongDan}/dien-dan`;
    const p = await moTrang();

    const tenTrang = async (dia) => {
      await p.goto(dia, { waitUntil: 'networkidle' });
      return p.locator('ul[aria-label="Danh sách chủ đề"] li').allInnerTexts();
    };

    const t1 = await tenTrang(goc);
    kiem('trang 1 của diễn đàn đúng 20 chủ đề', t1.length === 20, `đếm được ${t1.length}`);

    const t2 = await tenTrang(`${goc}?trang=2`);
    kiem('sang được trang 2 của diễn đàn', t2.length > 0, `đếm được ${t2.length}`);

    /*
     * Không bài nào nằm ở cả hai trang.
     *
     * Đây mới là phép kiểm thật của phân trang: `skip`/`take` đúng mà thiếu
     * khoá phụ trong `orderBy` thì hai chủ đề cùng mốc giờ đổi chỗ giữa hai
     * lượt hỏi, trang 2 lặp lại bài của trang 1 và một bài khác biến mất hẳn.
     */
    const trung = t1.filter((x) => t2.includes(x));
    kiem('hai trang không lặp chủ đề nào', trung.length === 0, trung.slice(0, 2).join(' | '));

    // Đếm CẢ chủ đề sẵn có của game, không riêng mấy cái vừa dựng: trang đang
    // vẽ tất, nên so với tất mới đúng.
    const tongChuDe = await db.chuDe.count({ where: { gameId: game.id } });
    kiem('gộp hai trang là đủ số chủ đề của game',
      t1.length + t2.length === tongChuDe, `${t1.length}+${t2.length} so với ${tongChuDe}`);

    // Số trên đầu phải là TỔNG, không phải số dòng đang vẽ.
    kiem('đầu trang nói đúng tổng số chủ đề',
      (await p.locator(`text=${tongChuDe} chủ đề`).count()) > 0);

    // Trang bịa trên địa chỉ thì kẹp về trang cuối, không trả danh sách rỗng.
    const t99 = await tenTrang(`${goc}?trang=99`);
    kiem('?trang=99 kẹp về trang cuối chứ không ra trang trống', t99.length > 0);

    // ── Trả lời trong một chủ đề chia trang ────────────────────────────
    const chuDe = await db.chuDe.findFirst({
      orderBy: { id: 'asc' },
      where: { tieuDe: { startsWith: DAU } }, select: { id: true },
    });
    await db.traLoi.createMany({
      data: Array.from({ length: 31 }, (_, i) => ({
        chuDeId: chuDe.id, nguoiId: nguoi.id,
        noiDung: `Trả lời dựng sẵn số ${i}`,
        taoLuc: new Date(Date.now() - (31 - i) * 60_000),
      })),
    });
    await db.chuDe.update({ where: { id: chuDe.id }, data: { soTraLoi: 31 } });

    const duongChuDe = `${goc}/${chuDe.id}`;
    await p.goto(duongChuDe, { waitUntil: 'networkidle' });
    const r1 = await p.locator('ul[aria-label="Các trả lời"] li').count();
    kiem('trang 1 của chủ đề đúng 30 trả lời', r1 === 30, `đếm được ${r1}`);

    await p.goto(`${duongChuDe}?trang=2`, { waitUntil: 'networkidle' });
    const r2 = await p.locator('ul[aria-label="Các trả lời"] li').count();
    kiem('trả lời thứ 31 nằm ở trang 2, đọc được', r2 === 1, `đếm được ${r2}`);

    await p.close();

    /*
     * Gửi trả lời TỪ TRANG 1 của một chủ đề nhiều trang.
     *
     * Bài mới rơi xuống trang cuối, nên đứng yên tại chỗ là màn hình không đổi
     * gì cả — và người ta bấm Gửi lần nữa vì tưởng trượt. Máy chủ phải đưa
     * thẳng tới đúng bài vừa gửi.
     */
    const q = await moTrangDaDangNhap('huytran', 'thanhvien123');
    await q.goto(duongChuDe, { waitUntil: 'networkidle' });
    await q.fill('textarea[name="noiDung"]', `${DAU} bài vừa gửi từ trang một`);
    await q.click('button:has-text("Gửi trả lời")');

    const daGhi = await doiToi(async () =>
      (await db.traLoi.count({ where: { chuDeId: chuDe.id } })) === 32);
    kiem('gửi được trả lời', daGhi);

    const toiTrangCuoi = await q.waitForURL('**trang=2**', { timeout: 15_000 })
      .then(() => true).catch(() => false);
    kiem('gửi xong thì nhảy tới trang chứa bài vừa gửi', toiTrangCuoi, q.url());
    kiem('và đọc được ngay bài vừa gửi',
      (await q.locator(`text=${DAU} bài vừa gửi từ trang một`).count()) > 0);
    await q.close();

    // ── Trang đánh giá đầy đủ ──────────────────────────────────────────
    // 25 người khác nhau: mỗi người mỗi game chỉ được một bài.
    const khach = [];
    for (let i = 0; i < 25; i++) {
      khach.push(await db.nguoiDung.create({
        data: {
          email: `${DAU}-${i}@kiemthu.invalid`,
          tenDangNhap: `${DAU}-${i}`,
          tenHienThi: `Người kiểm ${i}`,
          matKhauBam: 'khong-dung-de-dang-nhap',
        },
        select: { id: true },
      }));
    }
    await db.danhGia.createMany({
      data: khach.map((k, i) => ({
        gameId: game.id, nguoiId: k.id,
        // Rải đều 1..5 sao để phép sắp theo điểm có gì mà sắp.
        sao: (i % 5) + 1,
        noiDung: `${DAU} nhận xét số ${i}`,
      })),
    });

    const d = await moTrang();
    await d.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    kiem('tab Thông tin mời đọc hết đánh giá',
      (await d.locator('a:has-text("Xem tất cả")').count()) > 0);

    /*
     * ── ĐỌC TIẾP TRONG TẤM TRƯỢT, KHÔNG RỜI TRANG ────────────────────
     *
     * Người đang cân nhắc tải hay đọc vài bài rồi ngước lên nhìn lại nút tải
     * và cỡ tệp; rời trang là mất chỗ đang đứng, quay lại phải cuộn tìm từ đầu.
     */
    const diaChiTruoc = d.url();
    await d.click('a:has-text("Xem tất cả")');
    await d.waitForTimeout(600);
    kiem('bấm xem tất cả thì KHÔNG rời trang', d.url() === diaChiTruoc, d.url());
    kiem('tấm trượt đánh giá mở ra',
      (await d.locator('dialog[open] h2:has-text("Đánh giá")').count()) > 0);

    const trongTam = d.locator('dialog[open] ul li');
    const soDau = await trongTam.count();
    kiem('tấm trượt mở ra đã có sẵn mấy bài của trang', soDau > 0, `${soDau} bài`);

    // Lọc theo sao ngay trong tấm, không phải tải lại trang.
    await d.click('dialog[open] button:has-text("1 sao")');
    await d.waitForTimeout(800);
    const motSaoTrongTam = await db.danhGia.count({ where: { gameId: game.id, sao: 1 } });
    const sauLoc = await trongTam.count();
    kiem('lọc 1 sao ngay trong tấm trượt', sauLoc === Math.min(20, motSaoTrongTam),
      `${sauLoc} so với ${motSaoTrongTam}`);

    // Còn bài chưa bày thì phải có nút tải thêm, và bấm là dài ra.
    await d.click('dialog[open] button:has-text("Tất cả")');
    await d.waitForTimeout(800);
    const coTaiThem = await d.locator('dialog[open] button:has-text("Tải thêm")').count();
    if (coTaiThem > 0) {
      const truocKhiTai = await trongTam.count();
      await d.click('dialog[open] button:has-text("Tải thêm")');
      await d.waitForTimeout(900);
      kiem('bấm tải thêm thì danh sách dài ra',
        (await trongTam.count()) > truocKhiTai, `${truocKhiTai} → ${await trongTam.count()}`);
    }

    // Esc đóng được — đó là thứ <dialog> mang sẵn, và phải còn nguyên.
    await d.keyboard.press('Escape');
    await d.waitForTimeout(400);
    kiem('nhấn Esc thì tấm trượt đóng lại',
      (await d.locator('dialog[open]').count()) === 0);

    const duongDG = `${GOC}/game/${game.duongDan}/danh-gia`;
    await d.goto(duongDG, { waitUntil: 'networkidle' });
    const dg1 = await d.locator('ul[aria-label="Danh sách đánh giá"] li').count();
    kiem('trang đánh giá đầy đủ chia 20 bài một trang', dg1 === 20, `đếm được ${dg1}`);

    await d.goto(`${duongDG}?trang=2`, { waitUntil: 'networkidle' });
    const dg2 = await d.locator('ul[aria-label="Danh sách đánh giá"] li').count();
    kiem('đánh giá sang trang 2 được', dg2 > 0, `đếm được ${dg2}`);

    // Lọc theo sao: đúng số bài, và mọi bài hiện ra đều đúng mức sao ấy.
    const soMotSao = await db.danhGia.count({ where: { gameId: game.id, sao: 1 } });
    await d.goto(`${duongDG}?sao=1`, { waitUntil: 'networkidle' });
    const loc1 = await d.locator('ul[aria-label="Danh sách đánh giá"] li').count();
    kiem('lọc 1 sao ra đúng số bài', loc1 === Math.min(20, soMotSao), `${loc1} so với ${soMotSao}`);

    /*
     * Đổi cách sắp thì GIỮ bộ lọc, và ngược lại.
     *
     * Hai thứ ấy nằm chung một địa chỉ, nên rất dễ viết thành "bấm cái này xoá
     * cái kia" — người đang đọc kỹ đánh giá 1 sao mà bấm "Điểm thấp" lại văng
     * về toàn bộ danh sách.
     */
    await d.click('a:has-text("Điểm thấp")');
    await d.waitForLoadState('networkidle');
    kiem('đổi cách sắp vẫn giữ bộ lọc sao', d.url().includes('sao=1'), d.url());

    await d.goto(`${duongDG}?sap=thap`, { waitUntil: 'networkidle' });
    const bai1 = d.locator('ul[aria-label="Danh sách đánh giá"] li').first();
    kiem('sắp theo điểm thấp thì bài đầu là bài ít sao nhất',
      (await bai1.locator('[aria-label="1.0 trên 5 sao"]').count()) > 0,
      await bai1.locator('[role="img"]').first().getAttribute('aria-label'));

    await d.close();
  } finally {
    await don();
  }
}
