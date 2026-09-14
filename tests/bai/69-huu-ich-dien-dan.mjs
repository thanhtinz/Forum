import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const TIEU_DE = 'Kiểm thử hữu ích diễn đàn';

/**
 * Phiếu "hữu ích" cho từng bài trong diễn đàn.
 *
 * Lời giải chỉ đánh dấu được MỘT bài và chỉ chủ chủ đề đánh dấu được, nhưng
 * một chủ đề thường có mấy câu trả lời đều đáng đọc, mà người hỏi thì hay biến
 * mất sau khi xong việc. Phiếu này để chính người đọc sau đẩy mấy câu ấy nổi
 * lên, không phải chờ ai cho phép.
 *
 * Ba chỗ đáng canh:
 *   • KHÔNG tự bấm cho bài của mình — không thì con số chỉ còn nói lên ai chăm
 *     bấm nút, chẳng nói gì về bài viết;
 *   • bấm hai lần là bỏ phiếu, không thành hai phiếu — ràng buộc nằm ở khoá
 *     chính chứ không ở một câu `if`;
 *   • con số đếm sẵn phải KHỚP với số hàng thật trong bảng.
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
      where: { tieuDe: { startsWith: TIEU_DE } }, select: { id: true },
    });
    const id = cu.map((c) => c.id);
    await db.traLoi.deleteMany({ where: { chuDeId: { in: id } } });
    await db.theoDoiChuDe.deleteMany({ where: { chuDeId: { in: id } } });
    await db.chuDe.deleteMany({ where: { id: { in: id } } });
  };
  await don();

  let p, khach;
  try {
    const chuDe = await db.chuDe.create({
      data: { gameId: game.id, nguoiId: b.id, tieuDe: TIEU_DE, noiDung: 'Hỏi một câu.' },
      select: { id: true },
    });
    const baiNguoiKhac = await db.traLoi.create({
      data: { chuDeId: chuDe.id, nguoiId: a.id, noiDung: 'Câu trả lời của người khác.' },
      select: { id: true },
    });
    const baiCuaMinh = await db.traLoi.create({
      data: { chuDeId: chuDe.id, nguoiId: b.id, noiDung: 'Bài của chính người đang xem.' },
      select: { id: true },
    });

    const dia = `${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`;
    p = await moTrangDaDangNhap('huytran', 'thanhvien123');
    await p.goto(dia, { waitUntil: 'networkidle' });

    const nutCuaNguoiKhac = p.locator(`#tl-${baiNguoiKhac.id} [data-viec="huu-ich"]`);
    kiem('bài của người khác có nút hữu ích bấm được',
      (await nutCuaNguoiKhac.count()) === 1);

    /*
     * BÀI CỦA CHÍNH MÌNH THÌ KHÔNG CÓ NÚT.
     *
     * Không chặn thì con số này chỉ còn nói lên ai chăm bấm nút của chính
     * mình, chẳng nói gì về bài viết — mà nó sinh ra đúng để nói về bài viết.
     */
    kiem('bài của chính mình thì không bày nút bấm',
      (await p.locator(`#tl-${baiCuaMinh.id} [data-viec="huu-ich"]`).count()) === 0);

    await nutCuaNguoiKhac.click();
    const daBam = await doiToi(async () =>
      (await db.traLoiHuuIch.count({ where: { traLoiId: baiNguoiKhac.id } })) === 1);
    kiem('bấm được hữu ích', daBam);

    const sau1 = await db.traLoi.findUnique({
      where: { id: baiNguoiKhac.id }, select: { soHuuIch: true },
    });
    kiem('con số đếm sẵn khớp với số phiếu thật', sau1?.soHuuIch === 1, String(sau1?.soHuuIch));

    await p.goto(dia, { waitUntil: 'networkidle' });
    kiem('tải lại trang thì nút nhớ là đã bấm',
      (await p.locator(`#tl-${baiNguoiKhac.id} [data-viec="huu-ich"][aria-pressed="true"]`)
        .count()) === 1);

    // ── Bấm lần nữa là bỏ phiếu, không phải phiếu thứ hai ──────────────
    await p.locator(`#tl-${baiNguoiKhac.id} [data-viec="huu-ich"]`).click();
    const daBo = await doiToi(async () =>
      (await db.traLoiHuuIch.count({ where: { traLoiId: baiNguoiKhac.id } })) === 0);
    kiem('bấm lần nữa thì bỏ phiếu', daBo);
    const sau2 = await db.traLoi.findUnique({
      where: { id: baiNguoiKhac.id }, select: { soHuuIch: true },
    });
    kiem('và con số trừ theo, không tụt xuống âm',
      sau2?.soHuuIch === 0, String(sau2?.soHuuIch));

    /*
     * ── GỌI THẲNG VÀO BÀI CỦA CHÍNH MÌNH THÌ TRƯỢT ────────────────────
     *
     * Giao diện không bày nút, nhưng hàm ấy nằm trong tệp `'use server'` nên
     * là một địa chỉ POST công khai — gọi thẳng được mà không cần thấy nút nào.
     */
    let donHang = null;
    p.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });
    await p.goto(dia, { waitUntil: 'networkidle' });
    await p.locator(`#tl-${baiNguoiKhac.id} [data-viec="huu-ich"]`).click();
    await doiToi(async () =>
      (await db.traLoiHuuIch.count({ where: { traLoiId: baiNguoiKhac.id } })) === 1);
    kiem('bắt được yêu cầu để phát lại', !!donHang?.than);

    if (donHang) {
      const than = donHang.than.replaceAll(baiNguoiKhac.id, baiCuaMinh.id);
      const ma = await p.evaluate(async ({ dia: d, dau, than: t }) => {
        const r = await fetch(d, { method: 'POST', headers: dau, body: t });
        return r.status;
      }, { ...donHang, than });
      await p.waitForTimeout(1200);
      const tuBam = await db.traLoiHuuIch.count({ where: { traLoiId: baiCuaMinh.id } });
      kiem('gọi thẳng để tự bấm cho bài của mình thì không ăn',
        tuBam === 0, `máy trả ${ma}, ${tuBam} phiếu`);
    }

    // ── Khách chỉ thấy con số, không bấm được ──────────────────────────
    khach = await moTrang();
    await khach.goto(dia, { waitUntil: 'networkidle' });
    kiem('khách chưa đăng nhập thì không có nút bấm',
      (await khach.locator('[data-viec="huu-ich"]').count()) === 0);
    kiem('nhưng vẫn thấy con số của bài đã có phiếu',
      (await khach.locator(`#tl-${baiNguoiKhac.id} >> text=/1 thấy hữu ích/`).count()) === 1);

    // ── Xoá bài thì phiếu đi theo, không thành rác ─────────────────────
    await db.traLoi.delete({ where: { id: baiNguoiKhac.id } });
    kiem('xoá bài thì phiếu đi theo',
      (await db.traLoiHuuIch.count({ where: { traLoiId: baiNguoiKhac.id } })) === 0);
  } finally {
    if (p) await p.close();
    if (khach) await khach.close();
    await don();
  }
}
