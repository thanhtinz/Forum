import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';
import { dauNgayVN, dauNgayTruoc, nhanNgayVN } from '../../src/lib/ngay-vn-const.ts';

const TEN = 'kiemthu-so-lieu';
const DUONG_DAN = 'kiemthu-so-lieu-game';

/**
 * SỐ LIỆU CỦA TÁC GIẢ.
 *
 * Hai chuyện đáng canh nhất ở đây:
 *
 *   • MỐC NGÀY THEO GIỜ VIỆT NAM. Gom theo giờ UTC thì mọi lượt tải từ nửa đêm
 *     tới 7 giờ sáng giờ ta rơi sang hôm trước — cột "hôm nay" lúc nào cũng
 *     hụt một mẩu mà chẳng ai đoán ra vì sao.
 *
 *   • KHÔNG RÒ SỐ LIỆU SANG TÁC GIẢ KHÁC. Id game nằm trên địa chỉ, nên gõ tay
 *     id game của người ta vào là phải không xem được gì.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.game.deleteMany({ where: { duongDan: { startsWith: DUONG_DAN } } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: TEN } } });
  };
  await don();

  let p; let khac;
  try {
    /* ── Phần thuần: mốc ngày ─────────────────────────────────────────── */
    // 2 giờ sáng giờ Việt Nam ngày 13/9 = 19:00 UTC ngày 12/9.
    const raNgSang = new Date('2026-09-12T19:00:00Z');
    const moc = dauNgayVN(raNgSang);
    kiem('2 giờ sáng giờ ta vẫn thuộc về ngày hôm ấy, không rơi sang hôm trước',
      nhanNgayVN(moc) === '13/9', `${moc.toISOString()} → ${nhanNgayVN(moc)}`);
    kiem('mốc ngày là 17 giờ UTC hôm trước',
      moc.toISOString() === '2026-09-12T17:00:00.000Z', moc.toISOString());
    kiem('cùng một ngày thì ra cùng một mốc',
      dauNgayVN(new Date('2026-09-13T16:59:00Z')).getTime() === moc.getTime());
    kiem('sang ngày mới thì mốc nhảy đúng một ngày',
      dauNgayVN(new Date('2026-09-13T17:00:00Z')).getTime() - moc.getTime() === 86400000);
    kiem('lùi 30 ngày ra đúng 30 ngày',
      (dauNgayVN(raNgSang).getTime() - dauNgayTruoc(30, raNgSang).getTime()) === 30 * 86400000);

    /* ── Dựng hai tác giả, mỗi người một game ─────────────────────────── */
    const bcrypt = (await import('bcryptjs')).default;
    const bam = await bcrypt.hash('thanhvien123', 10);
    const tacGia = await db.nguoiDung.create({
      data: {
        tenDangNhap: TEN, tenHienThi: 'Tác giả số liệu', vaiTro: 'TAC_GIA',
        email: `${TEN}@kiemthu.local`, matKhauBam: bam,
      },
      select: { id: true },
    });
    const nguoiKhac = await db.nguoiDung.create({
      data: {
        tenDangNhap: `${TEN}-khac`, tenHienThi: 'Tác giả khác', vaiTro: 'TAC_GIA',
        email: `${TEN}-khac@kiemthu.local`, matKhauBam: bam,
      },
      select: { id: true },
    });

    const game = await db.game.create({
      data: {
        ten: 'Game kiểm số liệu', duongDan: DUONG_DAN, trangThai: 'DANG_HIEN',
        dangLuc: new Date(), tacGiaId: tacGia.id,
        banTai: {
          create: [{
            heMay: 'JAVA', soHieu: '1.0', moiNhat: true,
            tep: { create: [{ loai: 'JAR', duongDan: '/tep-mau/mau.jar', tenTep: 'mau.jar' }] },
          }],
        },
      },
      select: { id: true, banTai: { select: { tep: { select: { id: true } } } } },
    });
    const tepId = game.banTai[0].tep[0].id;

    const gameNguoiKhac = await db.game.create({
      data: {
        ten: 'Game của người khác', duongDan: `${DUONG_DAN}-khac`, trangThai: 'DANG_HIEN',
        dangLuc: new Date(), tacGiaId: nguoiKhac.id,
      },
      select: { id: true },
    });
    await db.luotTaiNgay.create({
      data: { gameId: gameNguoiKhac.id, ngay: dauNgayVN(), heMay: 'ANDROID', so: 4242 },
      select: { gameId: true },
    });

    /* ── Tải thật một lượt: ô đếm của hôm nay phải cộng ───────────────── */
    const khach = await moTrang();
    await khach.goto(`${GOC}/api/tai/${tepId}`, { waitUntil: 'domcontentloaded' });
    await khach.close();

    const dem = await doiToi(async () => {
      const o = await db.luotTaiNgay.findUnique({
        where: { gameId_ngay_heMay: { gameId: game.id, ngay: dauNgayVN(), heMay: 'JAVA' } },
        select: { so: true },
      });
      return o?.so === 1;
    });
    kiem('tải một lượt thì ô đếm của hôm nay cộng đúng một', dem);

    kiem('bộ đếm tổng của game cũng cộng theo',
      (await db.game.findUnique({ where: { id: game.id }, select: { soLuotTai: true } }))
        ?.soLuotTai === 1);

    /* ── Trang số liệu ────────────────────────────────────────────────── */
    // Gieo thêm một ít cho mấy ngày trước để biểu đồ có hình.
    await db.luotTaiNgay.createMany({ data: [
      { gameId: game.id, ngay: dauNgayTruoc(1), heMay: 'JAVA', so: 5 },
      { gameId: game.id, ngay: dauNgayTruoc(2), heMay: 'ANDROID', so: 9 },
      { gameId: game.id, ngay: dauNgayTruoc(60), heMay: 'JAVA', so: 1000 },
    ] });

    p = await moTrangDaDangNhap(TEN, 'thanhvien123');
    await p.goto(`${GOC}/quan-ly/so-lieu`, { waitUntil: 'networkidle' });
    const chu = await p.locator('main').textContent();

    kiem('trang số liệu cộng đúng tổng 30 ngày', chu.includes('15'), chu.slice(0, 300));
    kiem('lượt tải cũ hơn 30 ngày KHÔNG lọt vào tổng', !chu.includes('1.0K') && !chu.includes('1015'));
    kiem('có mục tải theo hệ máy', chu.includes('Java'));
    kiem('biểu đồ dựng đủ 30 cột',
      (await p.locator('div[title*="lượt"]').count()) === 30);

    kiem('KHÔNG thấy số liệu của tác giả khác', !chu.includes('4.2K') && !chu.includes('4242'));

    /* ── Gõ tay id game của người khác vào địa chỉ ────────────────────── */
    await p.goto(`${GOC}/quan-ly/so-lieu?game=${gameNguoiKhac.id}`, { waitUntil: 'networkidle' });
    const chuGia = await p.locator('main').textContent();
    kiem('gõ id game của người khác vào địa chỉ thì không xem được số liệu của họ',
      !chuGia.includes('4.2K') && !chuGia.includes('4242'), chuGia.slice(0, 200));

    /* ── Thành viên thường không có cửa ───────────────────────────────── */
    khac = await moTrang();
    const tra = await khac.goto(`${GOC}/quan-ly/so-lieu`, { waitUntil: 'networkidle' });
    kiem('khách chưa đăng nhập bị đẩy khỏi trang số liệu',
      !khac.url().includes('/quan-ly/so-lieu'), `${tra?.status()} ${khac.url()}`);
  } finally {
    await don();
    await p?.close();
    await khac?.close();
  }
}
