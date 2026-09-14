import { GOC, LOI, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const TIEU_DE = 'Chủ đề kiểm thử lời giải';

/**
 * Đánh dấu một bài làm LỜI GIẢI của chủ đề.
 *
 * Diễn đàn game phần lớn là câu hỏi — kẹt màn nào, máy nào chạy được — mà câu
 * trả lời đúng thì nằm lẫn giữa hai chục bài bàn ra bàn vào. Người thứ hai gặp
 * đúng chuyện ấy phải đọc lại từ đầu, và phần lớn thì bỏ giữa chừng rồi mở một
 * chủ đề y hệt.
 *
 * Ba chỗ đáng canh, cả ba đều là chỗ dễ mở toang:
 *   • người LẠ không được chọn lời giải cho chủ đề của người khác;
 *   • bài ở CHỦ ĐỀ KHÁC không được trỏ tới — lọt thì trang ghim lên đầu một
 *     câu trả lời cho câu hỏi khác hẳn, tệ hơn là không có lời giải nào;
 *   • mỗi chủ đề đúng MỘT lời giải, chọn bài thứ hai thì bài đầu nhường chỗ.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  const chu = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'huytran' }, select: { id: true },
  });
  const nguoiDap = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  if (!game || !chu || !nguoiDap) { kiem('có dữ liệu mẫu', false); return; }

  const don = async () => {
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: TIEU_DE } }, select: { id: true },
    });
    await db.chuDe.updateMany({
      where: { id: { in: cu.map((c) => c.id) } }, data: { loiGiaiId: null },
    });
    await db.traLoi.deleteMany({ where: { chuDeId: { in: cu.map((c) => c.id) } } });
    await db.chuDe.deleteMany({ where: { tieuDe: { startsWith: TIEU_DE } } });
    await db.thongBao.deleteMany({ where: { chiTiet: { startsWith: TIEU_DE } } });
  };
  await don();

  let chuTrang, laTrang, khach;
  try {
    const chuDe = await db.chuDe.create({
      data: { gameId: game.id, nguoiId: chu.id, tieuDe: TIEU_DE, noiDung: 'Qua màn 5 kiểu gì?' },
      select: { id: true },
    });
    const chuDeKhac = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: chu.id,
        tieuDe: `${TIEU_DE} — chủ đề khác`, noiDung: 'Chuyện khác.',
      },
      select: { id: true },
    });
    const bai1 = await db.traLoi.create({
      data: { chuDeId: chuDe.id, nguoiId: nguoiDap.id, noiDung: 'Thử đi vòng bên trái.' },
      select: { id: true },
    });
    const bai2 = await db.traLoi.create({
      data: { chuDeId: chuDe.id, nguoiId: nguoiDap.id, noiDung: 'Đánh vào đuôi lúc nó hồi máu.' },
      select: { id: true },
    });
    const baiNgoai = await db.traLoi.create({
      data: { chuDeId: chuDeKhac.id, nguoiId: nguoiDap.id, noiDung: 'Bài ở chủ đề khác.' },
      select: { id: true },
    });

    const dia = `${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`;

    // ── Người lạ không có nút, và gọi thẳng cũng không ăn ──────────────
    laTrang = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    await laTrang.goto(dia, { waitUntil: 'networkidle' });
    kiem('người không phải chủ chủ đề thì không thấy nút chọn lời giải',
      (await laTrang.locator('button:has-text("Chọn làm lời giải")').count()) === 0);

    // ── Chủ chủ đề chọn được ───────────────────────────────────────────
    chuTrang = await moTrangDaDangNhap('huytran', 'thanhvien123');
    await chuTrang.goto(dia, { waitUntil: 'networkidle' });
    kiem('chủ chủ đề thấy nút chọn ở mỗi bài',
      (await chuTrang.locator('button:has-text("Chọn làm lời giải")').count()) === 2);

    await chuTrang.locator(`#tl-${bai1.id} button:has-text("Chọn làm lời giải")`).click();
    const daChon = await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { loiGiaiId: true } }))
        ?.loiGiaiId === bai1.id);
    kiem('chủ chủ đề chọn được lời giải', daChon);

    await chuTrang.goto(dia, { waitUntil: 'networkidle' });
    kiem('trang bày dải báo đã có lời giải',
      (await chuTrang.locator('text=Chủ đề này đã có lời giải').count()) > 0);
    kiem('và đánh dấu ngay trên bài ấy',
      (await chuTrang.locator(`#tl-${bai1.id} >> text=Lời giải`).count()) > 0);

    const tin = await db.thongBao.findFirst({
      where: { nguoiId: nguoiDap.id, loai: 'BAI_THANH_LOI_GIAI' },
      orderBy: { taoLuc: 'desc' }, select: { duongDan: true },
    });
    kiem('người viết bài ấy được báo', !!tin);
    kiem('thông báo dẫn thẳng tới bài', (tin?.duongDan ?? '').includes(`#tl-${bai1.id}`));

    // ── Mỗi chủ đề đúng MỘT lời giải ───────────────────────────────────
    await chuTrang.locator(`#tl-${bai2.id} button:has-text("Chọn làm lời giải")`).click();
    const daDoi = await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { loiGiaiId: true } }))
        ?.loiGiaiId === bai2.id);
    kiem('chọn bài khác thì bài cũ nhường chỗ, không thành hai lời giải', daDoi);

    // ── Người lạ gọi thẳng vào địa chỉ POST thì trượt ──────────────────
    let donHang = null;
    chuTrang.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      delete dau.cookie;
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });
    await chuTrang.goto(dia, { waitUntil: 'networkidle' });
    await chuTrang.locator(`#tl-${bai1.id} button:has-text("Chọn làm lời giải")`).click();
    await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { loiGiaiId: true } }))
        ?.loiGiaiId === bai1.id);
    kiem('bắt được yêu cầu để phát lại', !!donHang?.than);

    if (donHang) {
      const than = donHang.than.replaceAll(bai1.id, bai2.id);
      const ma = await laTrang.evaluate(async ({ dia: d, dau, than: t }) => {
        const r = await fetch(d, { method: 'POST', headers: dau, body: t });
        return r.status;
      }, { ...donHang, than });
      await laTrang.waitForTimeout(1200);
      const sau = await db.chuDe.findUnique({
        where: { id: chuDe.id }, select: { loiGiaiId: true },
      });
      kiem('người lạ phát lại yêu cầu chọn lời giải thì không ăn',
        sau?.loiGiaiId === bai1.id, `máy trả ${ma}, lời giải = ${sau?.loiGiaiId}`);
    }

    // ── Bài ở chủ đề khác thì bị chối ──────────────────────────────────
    await chuTrang.goto(dia, { waitUntil: 'networkidle' });
    await chuTrang.evaluate((id) => {
      const f = document.querySelector('form:has(button)');
      void f;
      document.querySelectorAll('input[name="traLoiId"]').forEach((o) => { o.value = id; });
    }, baiNgoai.id);
    await chuTrang.locator(`#tl-${bai2.id} button:has-text("Chọn làm lời giải")`).click();
    await chuTrang.waitForSelector(LOI, { timeout: 8000 }).catch(() => {});
    const conNguyen = await db.chuDe.findUnique({
      where: { id: chuDe.id }, select: { loiGiaiId: true },
    });
    kiem('bài ở chủ đề khác không làm lời giải được',
      conNguyen?.loiGiaiId === bai1.id, String(conNguyen?.loiGiaiId));

    // ── Bỏ đánh dấu ────────────────────────────────────────────────────
    await chuTrang.goto(dia, { waitUntil: 'networkidle' });
    await chuTrang.locator('button:has-text("Bỏ đánh dấu lời giải")').click();
    const daBo = await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: chuDe.id }, select: { loiGiaiId: true } }))
        ?.loiGiaiId === null);
    kiem('bỏ đánh dấu được', daBo);

    // ── Xoá bài lời giải thì chủ đề quay về chưa có lời giải ───────────
    await db.chuDe.update({ where: { id: chuDe.id }, data: { loiGiaiId: bai2.id } });
    await db.traLoi.delete({ where: { id: bai2.id } });
    const sauXoa = await db.chuDe.findUnique({
      where: { id: chuDe.id }, select: { loiGiaiId: true },
    });
    kiem('xoá bài lời giải thì chủ đề KHÔNG chết theo, chỉ mất dấu',
      sauXoa?.loiGiaiId === null);

    // ── Danh sách chủ đề bày dấu lời giải ──────────────────────────────
    await db.chuDe.update({ where: { id: chuDe.id }, data: { loiGiaiId: bai1.id } });
    khach = await moTrang();
    await khach.goto(`${GOC}/game/${game.duongDan}/dien-dan`, { waitUntil: 'networkidle' });
    kiem('danh sách chủ đề bày dấu đã có lời giải',
      (await khach.locator('[aria-label="đã có lời giải"]').count()) > 0);
  } finally {
    if (chuTrang) await chuTrang.close();
    if (laTrang) await laTrang.close();
    if (khach) await khach.close();
    await don();
  }
}
