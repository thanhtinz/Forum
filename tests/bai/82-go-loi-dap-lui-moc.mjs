import { GOC, db, doiToi, moTrangDaDangNhap, tuDongXacNhan } from '../tro-giup.mjs';

const DAU = 'Ktmoc';

/**
 * GỠ LỜI ĐÁP PHẢI LÙI LUÔN MỐC `traLoiCuoiLuc`.
 *
 * Cột ấy vừa là khoá sắp của cả bảng chủ đề (`[gameId, ghim, traLoiCuoiLuc]`),
 * vừa là con số in ra dưới mỗi dòng ở trang diễn đàn. Chỗ hỏng cũ chỉ khớp lại
 * `soTraLoi` rồi thôi, nên gỡ đúng lời đáp mới nhất là chủ đề nằm lì trên đầu
 * bảng vì một bài KHÔNG CÒN TỒN TẠI, và dòng chữ dưới nó ghép tên người trả
 * lời áp chót với mốc giờ của bài vừa bị gỡ — một câu không có thật.
 *
 * Kiểm cả hai lối gỡ, vì chúng là hai hàm riêng nằm ở hai tệp: người tự gỡ bài
 * mình, và ban quản trị gỡ bài người khác. Và kiểm nước cuối: gỡ sạch lời đáp
 * thì mốc phải quay về NGÀY MỞ CHỦ ĐỀ, chứ không đứng nguyên chỗ cũ.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  const [thu, huy] = await Promise.all([
    db.nguoiDung.findFirst({ where: { tenDangNhap: 'anhthu' }, select: { id: true } }),
    db.nguoiDung.findFirst({ where: { tenDangNhap: 'huytran' }, select: { id: true } }),
  ]);
  if (!game || !thu || !huy) { kiem('có dữ liệu mẫu', false); return; }

  const don = async () => {
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: DAU } }, select: { id: true },
    });
    const ids = cu.map((c) => c.id);
    if (!ids.length) return;
    // Gỡ con trỏ lời giải trước: nó trỏ vào `TraLoi`, mà `TraLoi` sắp bị xoá.
    await db.chuDe.updateMany({ where: { id: { in: ids } }, data: { loiGiaiId: null } });
    await db.traLoi.deleteMany({ where: { chuDeId: { in: ids } } });
    await db.chuDe.deleteMany({ where: { id: { in: ids } } });
  };
  await don();

  let trang;
  try {
    /*
     * Mốc giờ dựng TÁCH HẲN NHAU, mỗi bài cách nhau hàng giờ — để phép so
     * không phụ thuộc vào chuyện hai lượt ghi liền nhau có trùng mili giây hay
     * không.
     */
    const moLuc = new Date(Date.now() - 5 * 3600_000);
    const lucA = new Date(Date.now() - 3 * 3600_000);
    const lucB = new Date(Date.now() - 1 * 3600_000);

    const chuDe = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: thu.id, tieuDe: `${DAU} mốc lùi theo bài bị gỡ`,
        noiDung: 'Thân bài.', taoLuc: moLuc, traLoiCuoiLuc: lucB, soTraLoi: 2,
        traLoi: {
          create: [
            { nguoiId: huy.id, noiDung: `${DAU} lời đáp trước`, taoLuc: lucA },
            { nguoiId: thu.id, noiDung: `${DAU} lời đáp sau`, taoLuc: lucB },
          ],
        },
      },
      select: { id: true, traLoi: { orderBy: { taoLuc: 'asc' }, select: { id: true } } },
    });
    const [dapA, dapB] = chuDe.traLoi;
    const dia = `${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`;
    const doc = async () => db.chuDe.findUnique({
      where: { id: chuDe.id }, select: { soTraLoi: true, traLoiCuoiLuc: true },
    });

    // ── Người tự gỡ lời đáp MỚI NHẤT của mình ──────────────────────────
    trang = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    await trang.goto(dia, { waitUntil: 'networkidle' });
    tuDongXacNhan(trang);
    await trang.locator(`#tl-${dapB.id} button:has-text("Xoá")`).first().click();

    const daGo = await doiToi(async () =>
      (await db.traLoi.count({ where: { id: dapB.id } })) === 0);
    kiem('người viết gỡ được lời đáp của chính mình', daGo);

    if (daGo) {
      const sau = await doc();
      kiem('gỡ lời đáp mới nhất thì `soTraLoi` còn 1', sau.soTraLoi === 1,
        `bảng nói ${sau.soTraLoi}`);
      kiem('và `traLoiCuoiLuc` lùi về mốc của lời đáp còn lại',
        Math.abs(sau.traLoiCuoiLuc.getTime() - lucA.getTime()) < 2000,
        `bảng nói ${sau.traLoiCuoiLuc.toISOString()}, đợi ${lucA.toISOString()}`);
    }

    // ── Ban quản trị gỡ nốt bài còn lại ────────────────────────────────
    await trang.close();
    trang = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await trang.goto(dia, { waitUntil: 'networkidle' });
    tuDongXacNhan(trang);
    await trang.locator(`#tl-${dapA.id} button:has-text("Gỡ bài")`).first().click();

    const sachTron = await doiToi(async () =>
      (await db.traLoi.count({ where: { chuDeId: chuDe.id } })) === 0);
    kiem('ban quản trị gỡ được lời đáp của người khác', sachTron);

    if (sachTron) {
      const het = await doc();
      kiem('gỡ sạch lời đáp thì `soTraLoi` về 0', het.soTraLoi === 0, `bảng nói ${het.soTraLoi}`);
      kiem('và mốc quay về NGÀY MỞ CHỦ ĐỀ, không đứng ở bài vừa bị gỡ',
        Math.abs(het.traLoiCuoiLuc.getTime() - moLuc.getTime()) < 2000,
        `bảng nói ${het.traLoiCuoiLuc.toISOString()}, đợi ${moLuc.toISOString()}`);
    }
  } finally {
    if (trang) await trang.close();
    await don();
  }
}
