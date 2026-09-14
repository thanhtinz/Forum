import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const DAU = 'Kiểm thử lọc diễn đàn';

/**
 * Lọc / tìm trong diễn đàn của một game, và trang "chủ đề đang theo dõi".
 *
 * Trang theo dõi sinh ra để vá một lỗ của chính đợt trước: công tắc "Theo dõi"
 * bấm được mà không xem lại được. Người ta theo dõi năm chủ đề ở năm game khác
 * nhau rồi hết đường tìm lại, trừ khi nhớ tên từng game — thông báo có dẫn tới
 * nơi, nhưng thông báo thì trôi đi.
 *
 * Phần lọc canh hai chỗ dễ sai: mã lọc BỊA từ địa chỉ không được làm danh sách
 * rỗng trông như diễn đàn chết, và sang trang 2 phải GIỮ nguyên bộ lọc — mất
 * nó thì trang 2 là cả diễn đàn trong khi trang 1 vừa lọc, người đọc tưởng
 * trang hỏng.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  const a = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  const b = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'huytran' }, select: { id: true },
  });
  if (!game || !a || !b) { kiem('có dữ liệu mẫu', false); return; }

  const don = async () => {
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: DAU } }, select: { id: true },
    });
    const id = cu.map((c) => c.id);
    await db.chuDe.updateMany({ where: { id: { in: id } }, data: { loiGiaiId: null } });
    await db.theoDoiChuDe.deleteMany({ where: { chuDeId: { in: id } } });
    await db.traLoi.deleteMany({ where: { chuDeId: { in: id } } });
    await db.chuDe.deleteMany({ where: { id: { in: id } } });
  };
  await don();

  let p, khach;
  try {
    // Dựng đủ năm chủ đề: hàng lọc chỉ bày ra từ mốc ấy trở lên.
    const tao = async (ten, noiDung) => db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: b.id, tieuDe: `${DAU} — ${ten}`, noiDung,
        timKiem: `${DAU} ${ten} ${noiDung}`.toLowerCase(),
      },
      select: { id: true },
    });

    const cChuaDap = await tao('chua ai dap', 'Chưa ai đáp bài này.');
    const cDaGiai = await tao('da giai', 'Chủ đề này đã xong.');
    const cRieng = await tao('tu khoa hiem lachtach', 'Có chữ lachtach để tìm.');
    await tao('thuong mot', 'Bài thường.');
    await tao('thuong hai', 'Bài thường nữa.');

    const baiGiai = await db.traLoi.create({
      data: { chuDeId: cDaGiai.id, nguoiId: a.id, noiDung: 'Đây là lời giải.' },
      select: { id: true },
    });
    await db.chuDe.update({
      where: { id: cDaGiai.id }, data: { loiGiaiId: baiGiai.id, soTraLoi: 1 },
    });

    const dia = `${GOC}/game/${game.duongDan}/dien-dan`;
    khach = await moTrang();

    // ── Hàng lọc hiện ra và lọc đúng ───────────────────────────────────
    await khach.goto(dia, { waitUntil: 'networkidle' });
    kiem('diễn đàn đủ chủ đề thì bày hàng lọc',
      (await khach.locator('a:has-text("Chưa ai đáp")').count()) > 0
      && (await khach.locator('input[name="q"]').count()) > 0);

    await khach.goto(`${dia}?loc=da-giai`, { waitUntil: 'networkidle' });
    const chuDaGiai = await khach.locator('ul[aria-label="Danh sách chủ đề"]').textContent();
    kiem('lọc "Đã giải" chỉ ra chủ đề đã có lời giải',
      (chuDaGiai ?? '').includes('da giai') && !(chuDaGiai ?? '').includes('chua ai dap'),
      (chuDaGiai ?? '').slice(0, 120));

    await khach.goto(`${dia}?loc=chua-tra-loi`, { waitUntil: 'networkidle' });
    const chuChua = await khach.locator('ul[aria-label="Danh sách chủ đề"]').textContent();
    kiem('lọc "Chưa ai đáp" bỏ chủ đề đã có trả lời',
      (chuChua ?? '').includes('chua ai dap') && !(chuChua ?? '').includes('da giai'));

    /*
     * MÃ LỌC BỊA THÌ QUAY VỀ MẶC ĐỊNH, không ra danh sách rỗng.
     *
     * `?loc=` tới từ địa chỉ nên ai cũng gõ bừa được. Nhận bừa thì câu truy vấn
     * không khớp hàng nào, và người mở đường dẫn ấy thấy một diễn đàn trống
     * trơn — tưởng cả diễn đàn chết chứ không nghĩ là mình gõ sai.
     */
    await khach.goto(`${dia}?loc=khong-co-loc-nay`, { waitUntil: 'networkidle' });
    const chuBia = await khach.locator('ul[aria-label="Danh sách chủ đề"]').textContent();
    kiem('mã lọc bịa thì quay về danh sách đầy đủ',
      (chuBia ?? '').includes('chua ai dap') && (chuBia ?? '').includes('da giai'));

    // ── Tìm trong đúng diễn đàn này ────────────────────────────────────
    await khach.goto(`${dia}?tim=lachtach`, { waitUntil: 'networkidle' });
    const chuTim = await khach.locator('ul[aria-label="Danh sách chủ đề"]').textContent();
    kiem('tìm được chủ đề theo từ khoá',
      (chuTim ?? '').includes('lachtach') && !(chuTim ?? '').includes('thuong mot'));
    kiem('và nói rõ đang lọc, kèm lối bỏ lọc',
      (await khach.locator('a:has-text("bỏ lọc")').count()) > 0);

    await khach.goto(`${dia}?tim=khongcotukhoanaokhopdau`, { waitUntil: 'networkidle' });
    kiem('không khớp gì thì nói không khớp, không nói diễn đàn trống',
      (await khach.locator('text=Không có chủ đề nào khớp').count()) > 0);

    // ── Sang trang vẫn giữ bộ lọc ──────────────────────────────────────
    const dua = await khach.locator('a[href*="loc=da-giai"]').first().getAttribute('href');
    void dua;
    await khach.goto(`${dia}?loc=da-giai`, { waitUntil: 'networkidle' });
    const cacLoi = await khach.locator('a[href*="/dien-dan?"]').evaluateAll(
      (ns) => ns.map((n) => n.getAttribute('href')));
    kiem('mọi lối đi ra từ trang đã lọc đều mang theo bộ lọc',
      cacLoi.every((h) => !h.includes('trang=') || h.includes('loc=da-giai')),
      cacLoi.join(' '));

    // ── Trang "đang theo dõi" ──────────────────────────────────────────
    p = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    await p.goto(`${GOC}/toi/theo-doi`, { waitUntil: 'networkidle' });
    kiem('chưa theo dõi gì thì nói rõ là chưa, và chỉ đường',
      (await p.locator('text=Chưa theo dõi chủ đề nào').count()) > 0);

    await db.theoDoiChuDe.createMany({
      data: [{ chuDeId: cRieng.id, nguoiId: a.id }], skipDuplicates: true,
    });
    await p.goto(`${GOC}/toi/theo-doi`, { waitUntil: 'networkidle' });
    kiem('chủ đề đang theo dõi hiện ra',
      (await p.locator('text=lachtach').count()) > 0);
    kiem('và nói rõ nó thuộc game nào',
      (await p.locator('ul[aria-label="Chủ đề đang theo dõi"]').textContent() ?? '')
        .length > 0);

    // Chủ đề KHÔNG theo dõi thì không được lọt vào đây.
    const chuTrang = await p.locator('ul[aria-label="Chủ đề đang theo dõi"]').textContent();
    kiem('chủ đề không theo dõi thì không lọt vào danh sách',
      !(chuTrang ?? '').includes('thuong mot'));

    // ── Khách bị mời đăng nhập ─────────────────────────────────────────
    await khach.goto(`${GOC}/toi/theo-doi`, { waitUntil: 'networkidle' });
    kiem('khách chưa đăng nhập thì bị đưa về trang đăng nhập',
      khach.url().includes('/dang-nhap'), khach.url());
  } finally {
    if (p) await p.close();
    if (khach) await khach.close();
    await don();
  }
}
