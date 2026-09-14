import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const TIEU_DE = 'Chủ đề kiểm thử theo dõi';

/**
 * Theo dõi một chủ đề để được báo khi có bài mới.
 *
 * Trước đợt này chỉ chủ chủ đề được báo, nên người vào hỏi thêm một câu rồi đi
 * thì không bao giờ biết có ai đáp mình — họ phải nhớ quay lại kiểm, mà phần
 * lớn thì không. Cuộc trò chuyện chết ở đúng chỗ nó đang có ích nhất.
 *
 * Mục đáng canh nhất KHÔNG phải "bấm thì có hàng", mà là KHÔNG BÁO THỪA: một
 * người vừa là chủ chủ đề vừa theo dõi, hoặc vừa được đáp thẳng vừa theo dõi,
 * thì chỉ được nhận MỘT thông báo cho một bài viết. Báo hai lần cho cùng một
 * chuyện là cách nhanh nhất khiến người ta tắt hết thông báo.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  const chu = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'huytran' }, select: { id: true },
  });
  const nguoiXem = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  const nguoiViet = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'minhdev' }, select: { id: true },
  });
  if (!game || !chu || !nguoiXem || !nguoiViet) { kiem('có dữ liệu mẫu', false); return; }

  const don = async () => {
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: TIEU_DE } }, select: { id: true },
    });
    const id = cu.map((c) => c.id);
    await db.theoDoiChuDe.deleteMany({ where: { chuDeId: { in: id } } });
    await db.traLoi.deleteMany({ where: { chuDeId: { in: id } } });
    await db.chuDe.deleteMany({ where: { id: { in: id } } });
    await db.thongBao.deleteMany({ where: { chiTiet: { startsWith: TIEU_DE } } });
  };
  await don();

  let xem, viet, khach;
  try {
    const chuDe = await db.chuDe.create({
      data: { gameId: game.id, nguoiId: chu.id, tieuDe: TIEU_DE, noiDung: 'Ai biết chỉ mình với.' },
      select: { id: true },
    });
    const dia = `${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`;

    // ── Khách không thấy công tắc ──────────────────────────────────────
    khach = await moTrang();
    await khach.goto(dia, { waitUntil: 'networkidle' });
    kiem('khách chưa đăng nhập thì không bày công tắc theo dõi',
      (await khach.locator('button:has-text("Theo dõi")').count()) === 0);

    // ── Bật theo dõi ───────────────────────────────────────────────────
    xem = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    await xem.goto(dia, { waitUntil: 'networkidle' });
    kiem('người đã đăng nhập thấy công tắc, và đang tắt',
      (await xem.locator('button[aria-pressed="false"]:has-text("Theo dõi")').count()) === 1);

    await xem.click('button:has-text("Theo dõi")');
    const daTheo = await doiToi(async () =>
      (await db.theoDoiChuDe.count({ where: { chuDeId: chuDe.id, nguoiId: nguoiXem.id } })) === 1);
    kiem('bật được theo dõi', daTheo);

    await xem.goto(dia, { waitUntil: 'networkidle' });
    kiem('tải lại trang thì công tắc nhớ đúng trạng thái',
      (await xem.locator('button[aria-pressed="true"]:has-text("Đang theo dõi")').count()) === 1);

    // ── Người khác viết bài thì người theo dõi được báo ────────────────
    viet = await moTrangDaDangNhap('minhdev', 'thanhvien123');
    await viet.goto(dia, { waitUntil: 'networkidle' });
    await viet.fill('textarea[name="noiDung"]', 'Mình vừa qua được, để mình kể.');
    await viet.click('button:has-text("Gửi trả lời")');

    const coTin = await doiToi(async () =>
      (await db.thongBao.count({
        where: { nguoiId: nguoiXem.id, chiTiet: TIEU_DE },
      })) >= 1);
    kiem('người theo dõi được báo khi có bài mới', coTin);

    const tin = await db.thongBao.findFirst({
      where: { nguoiId: nguoiXem.id, chiTiet: TIEU_DE },
      orderBy: { taoLuc: 'desc' }, select: { tieuDe: true, duongDan: true },
    });
    kiem('câu báo nói rõ là chủ đề đang theo dõi',
      (tin?.tieuDe ?? '').includes('theo dõi'), tin?.tieuDe ?? '');
    kiem('và dẫn thẳng tới bài mới', (tin?.duongDan ?? '').includes('#tl-'));

    /*
     * CHỦ CHỦ ĐỀ CHỈ NHẬN MỘT THÔNG BÁO.
     *
     * Viết bài là tự theo dõi, nên chủ chủ đề luôn nằm trong danh sách theo
     * dõi ngay khi có ai đó trả lời họ. Không lọc thì mỗi bài mới sinh ra hai
     * thông báo cho cùng một người — và đó là cách nhanh nhất khiến họ tắt
     * sạch thông báo.
     */
    const soTinChu = await db.thongBao.count({
      where: { nguoiId: chu.id, chiTiet: TIEU_DE },
    });
    kiem('chủ chủ đề chỉ nhận MỘT thông báo cho một bài', soTinChu === 1, `${soTinChu} tin`);

    // ── Viết bài là tự theo dõi ────────────────────────────────────────
    const tuTheo = await db.theoDoiChuDe.count({
      where: { chuDeId: chuDe.id, nguoiId: nguoiViet.id },
    });
    kiem('viết bài thì tự theo dõi chủ đề, không phải bấm thêm', tuTheo === 1);

    // ── Người viết KHÔNG tự báo cho mình ───────────────────────────────
    const tuBao = await db.thongBao.count({
      where: { nguoiId: nguoiViet.id, chiTiet: TIEU_DE },
    });
    kiem('người vừa viết không nhận thông báo về chính bài mình', tuBao === 0, `${tuBao} tin`);

    // ── Tắt theo dõi thì thôi không báo nữa ────────────────────────────
    await xem.goto(dia, { waitUntil: 'networkidle' });
    await xem.click('button:has-text("Đang theo dõi")');
    const daTat = await doiToi(async () =>
      (await db.theoDoiChuDe.count({ where: { chuDeId: chuDe.id, nguoiId: nguoiXem.id } })) === 0);
    kiem('tắt được theo dõi', daTat);

    const truoc = await db.thongBao.count({ where: { nguoiId: nguoiXem.id, chiTiet: TIEU_DE } });
    await viet.goto(dia, { waitUntil: 'networkidle' });
    await viet.fill('textarea[name="noiDung"]', 'Bài thứ hai, sau khi đã tắt.');
    await viet.click('button:has-text("Gửi trả lời")');
    await doiToi(async () =>
      (await db.traLoi.count({ where: { chuDeId: chuDe.id } })) === 2);
    await viet.waitForTimeout(1500);
    const sau = await db.thongBao.count({ where: { nguoiId: nguoiXem.id, chiTiet: TIEU_DE } });
    kiem('tắt rồi thì KHÔNG báo nữa', sau === truoc, `${truoc} → ${sau}`);

    // ── Xoá chủ đề thì hàng theo dõi đi theo ───────────────────────────
    await db.chuDe.delete({ where: { id: chuDe.id } });
    kiem('xoá chủ đề thì hàng theo dõi đi theo, không thành rác',
      (await db.theoDoiChuDe.count({ where: { chuDeId: chuDe.id } })) === 0);
  } finally {
    if (xem) await xem.close();
    if (viet) await viet.close();
    if (khach) await khach.close();
    await don();
  }
}
