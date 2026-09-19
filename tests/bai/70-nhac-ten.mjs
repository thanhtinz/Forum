import { GOC, boNhipDienDan, db, doiToi, moTrangDaDangNhap } from '../tro-giup.mjs';
import { bocTenNhac, TOI_DA_NHAC } from '../../src/lib/nhac-ten-const.ts';

const TIEU_DE = 'Kiểm thử nhắc tên';

/**
 * Nhắc tên người khác trong bài viết: `@ten-dang-nhap`.
 *
 * Hai vế phải khớp nhau tuyệt đối: chữ IN RA TRANG và người ĐƯỢC BÁO. Lệch một
 * vế là trang in ra một cái tên xanh mà người ấy chẳng nhận được gì, hoặc
 * người ta nhận thông báo vì một câu chẳng nhắc tới mình — nên cả hai vế đọc
 * chung đúng một bản luật trong `nhac-ten-const.ts`, và bài này canh cả hai.
 *
 * Chỗ dễ sai nhất là ĐỊA CHỈ THƯ: `ai-do@vi-du.test` viết trong bài mà bắt làm
 * lời nhắc thì người tên `vi-du` bỗng nhận thông báo vì một câu chẳng liên
 * quan. Và chỗ nguy hiểm nhất là tên nằm trong khối mã người ta đang trích —
 * đổi chữ trong đó vừa hỏng đoạn mã, vừa mở đúng cái cửa mà `html: false` đóng.
 */
export default async function chay(kiem) {
  // ── Phần thuần: bóc tên ────────────────────────────────────────────
  kiem('bóc được tên đứng đầu dòng và sau khoảng trắng',
    JSON.stringify(bocTenNhac('@anhthu ơi, hỏi @huy-tran cái này'))
      === JSON.stringify(['anhthu', 'huy-tran']));
  kiem('KHÔNG bắt phần sau @ của một địa chỉ thư',
    bocTenNhac('gửi mình qua ai-do@vi-du.test nhé').length === 0);
  kiem('nhắc hai lần một người thì chỉ tính một',
    JSON.stringify(bocTenNhac('@anhthu và @anhthu nữa')) === JSON.stringify(['anhthu']));
  kiem('có trần số người nhắc trong một bài',
    bocTenNhac(Array.from({ length: TOI_DA_NHAC + 5 }, (_, i) => `@ten-${i}`).join(' '))
      .length === TOI_DA_NHAC);

  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  const nguoiViet = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'huytran' }, select: { id: true },
  });
  const duocNhac = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true, tenDangNhap: true },
  });
  if (!game || !nguoiViet || !duocNhac) { kiem('có dữ liệu mẫu', false); return; }

  const don = async () => {
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: TIEU_DE } }, select: { id: true },
    });
    const id = cu.map((c) => c.id);
    await db.traLoi.deleteMany({ where: { chuDeId: { in: id } } });
    await db.theoDoiChuDe.deleteMany({ where: { chuDeId: { in: id } } });
    await db.chuDe.deleteMany({ where: { id: { in: id } } });
    await db.thongBao.deleteMany({ where: { chiTiet: { startsWith: TIEU_DE } } });
  };
  await don();

  let p;
  try {
    const chuDe = await db.chuDe.create({
      data: { gameId: game.id, nguoiId: nguoiViet.id, tieuDe: TIEU_DE, noiDung: 'Mở lời.' },
      select: { id: true },
    });
    const dia = `${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`;

    p = await moTrangDaDangNhap('huytran', 'thanhvien123');
    await p.goto(dia, { waitUntil: 'networkidle' });
    await p.fill('textarea[name="noiDung"]',
      `@${duocNhac.tenDangNhap} xem giúp mình với, gửi qua ai-do@vi-du.test cũng được.`);
    // Nhịp nghỉ diễn đàn đếm theo NGƯỜI trên toàn cửa hàng, nên bài kiểm
    // chạy trước có thể vừa đăng bằng chính tài khoản này. Xem `boNhipDienDan`.
    await boNhipDienDan(nguoiViet.id);
    await p.click('button:has-text("Gửi trả lời")');

    const daGui = await doiToi(async () =>
      (await db.traLoi.count({ where: { chuDeId: chuDe.id } })) === 1);
    kiem('gửi được bài có nhắc tên', daGui);

    // ── Chữ in ra trang ────────────────────────────────────────────────
    await p.goto(dia, { waitUntil: 'networkidle' });
    const lienKet = p.locator(`a.nhac-ten[href="/thanh-vien/${duocNhac.tenDangNhap}"]`);
    kiem('tên được nhắc thành lối đi tới trang người ấy',
      (await lienKet.count()) === 1);
    kiem('và in đúng chữ @tên', (await lienKet.textContent()) === `@${duocNhac.tenDangNhap}`);
    kiem('phần sau @ của địa chỉ thư KHÔNG thành lối đi',
      (await p.locator('a.nhac-ten[href="/thanh-vien/vi-du"]').count()) === 0);

    // ── Người được nhắc nhận thông báo ─────────────────────────────────
    const tin = await db.thongBao.findFirst({
      where: { nguoiId: duocNhac.id, loai: 'DUOC_NHAC_TEN' },
      orderBy: { taoLuc: 'desc' }, select: { duongDan: true },
    });
    kiem('người được nhắc nhận thông báo', !!tin);
    kiem('thông báo dẫn thẳng tới bài nhắc', (tin?.duongDan ?? '').includes('#tl-'));

    /*
     * MỘT NGƯỜI, MỘT TIN.
     *
     * Người vừa được gọi thẳng tên mà lại nhận thêm tin "chủ đề bạn theo dõi
     * có bài mới" thì tin thứ hai chỉ là tiếng ồn.
     */
    await db.theoDoiChuDe.createMany({
      data: [{ chuDeId: chuDe.id, nguoiId: duocNhac.id }], skipDuplicates: true,
    });
    const truoc = await db.thongBao.count({
      where: { nguoiId: duocNhac.id, chiTiet: TIEU_DE },
    });
    await p.goto(dia, { waitUntil: 'networkidle' });
    await p.fill('textarea[name="noiDung"]', `@${duocNhac.tenDangNhap} nhắc lại lần nữa nhé.`);
    // Nhịp nghỉ diễn đàn đếm theo NGƯỜI trên toàn cửa hàng, nên bài kiểm
    // chạy trước có thể vừa đăng bằng chính tài khoản này. Xem `boNhipDienDan`.
    await boNhipDienDan(nguoiViet.id);
    await p.click('button:has-text("Gửi trả lời")');
    await doiToi(async () => (await db.traLoi.count({ where: { chuDeId: chuDe.id } })) === 2);
    await p.waitForTimeout(1500);
    const sau = await db.thongBao.count({
      where: { nguoiId: duocNhac.id, chiTiet: TIEU_DE },
    });
    kiem('vừa được nhắc vừa đang theo dõi thì chỉ nhận MỘT tin cho một bài',
      sau - truoc === 1, `${truoc} → ${sau}`);

    /*
     * ── TÊN TRONG KHỐI MÃ THÌ ĐỂ YÊN ──────────────────────────────────
     *
     * Đây là chỗ nguy hiểm nhất: đổi chữ bên trong đoạn mã người ta đang trích
     * vừa hỏng đoạn mã ấy, vừa là lối chèn thẻ vào chỗ lẽ ra chỉ có chữ thường.
     */
    await p.goto(dia, { waitUntil: 'networkidle' });
    await p.fill('textarea[name="noiDung"]',
      `Đoạn mã của mình: \`@${duocNhac.tenDangNhap} không phải lời nhắc\``);
    // Nhịp nghỉ diễn đàn đếm theo NGƯỜI trên toàn cửa hàng, nên bài kiểm
    // chạy trước có thể vừa đăng bằng chính tài khoản này. Xem `boNhipDienDan`.
    await boNhipDienDan(nguoiViet.id);
    await p.click('button:has-text("Gửi trả lời")');
    await doiToi(async () => (await db.traLoi.count({ where: { chuDeId: chuDe.id } })) === 3);

    await p.goto(dia, { waitUntil: 'networkidle' });
    const trongMa = await p.locator('code').filter({ hasText: 'không phải lời nhắc' });
    kiem('tên nằm trong khối mã thì giữ nguyên chữ', (await trongMa.count()) >= 1);
    kiem('và KHÔNG thành lối đi bên trong khối mã ấy',
      (await trongMa.locator('a').count()) === 0);
  } finally {
    if (p) await p.close();
    await don();
  }
}
