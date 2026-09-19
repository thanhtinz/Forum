import { GOC, db, doiToi, moTrangDaDangNhap } from '../tro-giup.mjs';

const DUONG_DAN = 'kiemthu-danh-gia-ban';
const TEN = 'kiemthu-dg-ban';

/**
 * ĐÁNH GIÁ GẮN VỚI PHIÊN BẢN.
 *
 * Một game bị chê nát ở bản 1.0 rồi vá sạch lỗi ở bản 2.0 thì điểm trung bình
 * vẫn kéo lê mấy bài cũ, mà người đang cân nhắc tải bản 2.0 không có cách nào
 * nghe tiếng nói về ĐÚNG bản họ sắp tải. App Store cho đổi giữa "mọi phiên
 * bản" và "bản hiện tại" đúng vì chuyện ấy.
 *
 * Chỗ dễ sai nhất: lấy bản nào để ghi. Người ĐÃ TẢI thì phải là bản họ cầm
 * trong tay, không phải bản mới nhất đang bày — bài này canh đúng chỗ ấy.
 */
export default async function chay(kiem) {
  const don = async () => {
    await db.game.deleteMany({ where: { duongDan: DUONG_DAN } });
    await db.nguoiDung.deleteMany({ where: { tenDangNhap: { startsWith: TEN } } });
  };
  await don();

  let p;
  try {
    const game = await db.game.create({
      data: {
        ten: 'Game kiểm đánh giá theo bản', duongDan: DUONG_DAN,
        trangThai: 'DANG_HIEN', dangLuc: new Date(),
        banTai: {
          create: [
            { heMay: 'JAVA', soHieu: '1.0', moiNhat: false },
            { heMay: 'JAVA', soHieu: '2.0', moiNhat: true },
          ],
        },
      },
      select: { id: true },
    });

    const bcrypt = (await import('bcryptjs')).default;
    const nguoi = await db.nguoiDung.create({
      data: {
        tenDangNhap: TEN, tenHienThi: 'Người Chấm Sao',
        email: `${TEN}@kiemthu.local`, matKhauBam: await bcrypt.hash('thanhvien123', 10),
      },
      select: { id: true },
    });

    p = await moTrangDaDangNhap(TEN, 'thanhvien123');

    /*
     * Chấm sao bằng MỘT CÚ BẤM ngoài trang — đúng lối App Store, và cũng là
     * lối duy nhất bài này cần: nó đo cột `soHieu` ghi kèm bài đánh giá, chứ
     * không đo phần chữ.
     */
    const chamSao = async (n) => {
      await p.locator(`button[aria-label="${n} sao"]`).first().click();
      await p.waitForTimeout(1200);
    };

    /* ── Chưa tải bao giờ: lấy bản mới nhất đang bày ──────────────────── */
    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    await chamSao(4);

    kiem('chưa tải bao giờ thì bài đánh giá mang bản mới nhất', await doiToi(async () => {
      const d = await db.danhGia.findUnique({
        where: { gameId_nguoiId: { gameId: game.id, nguoiId: nguoi.id } },
        select: { soHieu: true },
      });
      return d?.soHieu === '2.0';
    }));

    /* ── Đã tải bản 1.0: chấm lại thì mang bản 1.0 ────────────────────── */
    await db.luotTai.create({
      data: { gameId: game.id, nguoiId: nguoi.id, heMay: 'JAVA', soHieu: '1.0' },
      select: { id: true },
    });
    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    await chamSao(2);

    kiem('người đã tải thì bài mang đúng bản HỌ đang cầm', await doiToi(async () => {
      const d = await db.danhGia.findUnique({
        where: { gameId_nguoiId: { gameId: game.id, nguoiId: nguoi.id } },
        select: { soHieu: true },
      });
      return d?.soHieu === '1.0';
    }));

    /* ── Bộ lọc: chỉ bản hiện tại ─────────────────────────────────────── */
    await db.danhGia.updateMany({
      where: { gameId: game.id }, data: { noiDung: 'Bài của bản cũ', soHieu: '1.0' },
    });
    /*
     * Trang chỉ bày NĂM bài đầu rồi mới mời "xem tất cả", nên phải có hơn năm
     * bài thì lối mở tấm trượt mới hiện ra. Dựng người chấm bằng tài khoản
     * RIÊNG của bài kiểm, không mượn tài khoản mẫu: mượn thì số lượng phụ
     * thuộc vào bộ dữ liệu mẫu, mà bộ ấy đổi lúc nào không hay.
     */
    const bam = await bcrypt.hash('thanhvien123', 10);
    for (let i = 0; i < 6; i++) {
      const k = await db.nguoiDung.create({
        data: {
          tenDangNhap: `${TEN}-${i}`, tenHienThi: `Người chấm ${i}`,
          email: `${TEN}-${i}@kiemthu.local`, matKhauBam: bam,
        },
        select: { id: true },
      });
      await db.danhGia.create({
        data: {
          gameId: game.id, nguoiId: k.id, sao: 5,
          noiDung: i === 0 ? 'Bài của bản mới' : `Bài phụ ${i}`,
          soHieu: i === 0 ? '2.0' : '1.0',
        },
        select: { id: true },
      });
    }

    await p.goto(`${GOC}/game/${DUONG_DAN}`, { waitUntil: 'networkidle' });
    kiem('mỗi bài in kèm số hiệu bản',
      (await p.locator('text=bản 1.0').count()) > 0);

    await p.locator('a[aria-label*="Xem tất cả"]').first().click();
    await p.waitForSelector('dialog[open]', { timeout: 5000 });
    const chipBan = p.locator('dialog[open] button:has-text("Chỉ bản 2.0")');
    kiem('tấm xem tất cả có chip lọc theo bản hiện tại', (await chipBan.count()) === 1);

    await chipBan.click();
    await p.waitForTimeout(1200);
    const chu = (await p.locator('dialog[open]').textContent()) ?? '';
    kiem('lọc bản hiện tại thì bỏ bài của bản cũ',
      chu.includes('Bài của bản mới') && !chu.includes('Bài của bản cũ'), chu.slice(0, 200));
  } finally {
    if (p) await p.close();
    await don();
  }
}
