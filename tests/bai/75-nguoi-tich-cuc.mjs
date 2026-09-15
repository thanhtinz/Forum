import { GOC, db, moTrang } from '../tro-giup.mjs';
import { IT_NHAT, TOP } from '../../src/lib/tich-cuc-const.ts';

const DAU = 'Ktich';

/**
 * Bảng "Người tích cực nhất" của diễn đàn một game.
 *
 * Diễn đàn game sống bằng dăm người trả lời mọi câu hỏi của người mới, nên
 * chỗ này là chỗ trả cái công ấy. Mà một bảng vinh danh thì sai một con số là
 * hỏng cả ý nghĩa, nên có mấy chỗ đáng canh:
 *
 *   • đếm GỘP chủ đề với lời đáp — đếm mỗi lời đáp thì người chuyên mở chuyện
 *     bị bỏ sót;
 *   • dưới mốc `IT_NHAT` thì chưa lên bảng, kẻo diễn đàn vừa mở đã có "người
 *     tích cực nhất" với đúng một bài;
 *   • người bị khoá KHÔNG lên bảng — bảng này là lời khen, không phải sổ đếm;
 *   • bảng chỉ tính diễn đàn CỦA GAME NÀY, không cộng dồn cả cửa hàng.
 */
export default async function chay(kiem) {
  const game = await db.game.findMany({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    take: 2, select: { id: true, duongDan: true },
  });
  if (game.length < 2) { kiem('có hai game mẫu', false); return; }
  const [g1, g2] = game;

  const don = async () => {
    const nguoi = await db.nguoiDung.findMany({
      where: { tenDangNhap: { startsWith: DAU.toLowerCase() } }, select: { id: true },
    });
    const id = nguoi.map((n) => n.id);
    const cd = await db.chuDe.findMany({
      where: { OR: [{ nguoiId: { in: id } }, { tieuDe: { startsWith: DAU } }] },
      select: { id: true },
    });
    const cdId = cd.map((c) => c.id);
    await db.traLoi.deleteMany({ where: { OR: [{ nguoiId: { in: id } }, { chuDeId: { in: cdId } }] } });
    await db.chuDe.deleteMany({ where: { id: { in: cdId } } });
    await db.nguoiDung.deleteMany({ where: { id: { in: id } } });
  };
  await don();

  let p;
  try {
    /*
     * Dựng NGƯỜI MỚI TINH, không mượn tài khoản mẫu.
     *
     * Tài khoản mẫu đã có sẵn bài trong diễn đàn của mấy game, nên mốc đếm của
     * chúng là một con số không biết trước — mà bài kiểm này đo đúng con số
     * ấy. Người mới thì mốc là 0, mọi phép cộng sau đó nói được thành lời.
     */
    const taoNguoi = async (hau, ten) => db.nguoiDung.create({
      data: {
        email: `${DAU.toLowerCase()}${hau}@kiemthu.test`,
        tenDangNhap: `${DAU.toLowerCase()}${hau}`,
        tenHienThi: ten,
        matKhauBam: 'khong-dung-de-dang-nhap',
      },
      select: { id: true, tenHienThi: true },
    });
    const sieng = await taoNguoi('sieng', `${DAU} Siêng Năng`);
    const lang = await taoNguoi('lang', `${DAU} Lặng Lẽ`);

    const taoChuDe = async (nguoiId, gameId, so) => {
      const ra = [];
      for (let i = 0; i < so; i++) {
        ra.push(await db.chuDe.create({
          data: { gameId, nguoiId, tieuDe: `${DAU} chủ đề ${i}`, noiDung: 'Nội dung kiểm thử.' },
          select: { id: true },
        }));
      }
      return ra;
    };

    // Siêng: 2 chủ đề + 2 lời đáp = 4 bài, quá mốc.
    const cua = await taoChuDe(sieng.id, g1.id, 2);
    for (let i = 0; i < 2; i++) {
      await db.traLoi.create({
        data: { chuDeId: cua[0].id, nguoiId: sieng.id, noiDung: `Đáp ${i}` },
        select: { id: true },
      });
    }
    // Lặng: đúng 1 bài, dưới mốc.
    await taoChuDe(lang.id, g1.id, 1);

    const dia = `${GOC}/game/${g1.duongDan}/dien-dan`;
    p = await moTrang();
    await p.goto(dia, { waitUntil: 'networkidle' });

    const bang = p.locator('section:has(h2:text("Người tích cực nhất"))');
    kiem('diễn đàn có người viết thì bày bảng người tích cực',
      (await bang.count()) === 1);
    kiem('người đủ mốc thì lên bảng',
      (await bang.getByText(sieng.tenHienThi).count()) === 1);
    kiem(`dưới ${IT_NHAT} bài thì chưa lên bảng`,
      (await bang.getByText(lang.tenHienThi).count()) === 0);

    /*
     * ĐẾM GỘP CHỦ ĐỀ VỚI LỜI ĐÁP.
     *
     * Đây là chỗ dễ sai nhất và sai thì lặng lẽ: đếm mỗi bảng `TraLoi` vẫn ra
     * một bảng trông hợp lý, chỉ là thiếu mất người chuyên mở chuyện.
     */
    kiem('con số đếm gộp cả chủ đề lẫn lời đáp',
      (await bang.getByText('4 bài').count()) === 1,
      await bang.innerText().catch(() => ''));

    kiem('tên trên bảng dẫn tới trang thành viên',
      (await bang.locator(`a[href="/thanh-vien/${DAU.toLowerCase()}sieng"]`).count()) === 1);

    kiem(`bảng không dài quá ${TOP} người`,
      (await bang.locator('li').count()) <= TOP);

    /*
     * ── CHỈ TÍNH DIỄN ĐÀN CỦA GAME NÀY ───────────────────────────────
     *
     * Bảng nằm trong trang một game, nên nó phải nói về game ấy. Quên điều
     * kiện `gameId` thì nó thành bảng của cả cửa hàng mà vẫn trông y hệt —
     * không nhìn ra được bằng mắt, chỉ đếm mới biết.
     */
    await p.goto(`${GOC}/game/${g2.duongDan}/dien-dan`, { waitUntil: 'networkidle' });
    const bang2 = p.locator('section:has(h2:text("Người tích cực nhất"))');
    kiem('bài ở game này không lọt sang bảng của game khác',
      (await bang2.getByText(sieng.tenHienThi).count()) === 0);

    // ── Người bị khoá thì rời bảng ────────────────────────────────────
    await db.nguoiDung.update({ where: { id: sieng.id }, data: { khoa: true } });
    await p.goto(dia, { waitUntil: 'networkidle' });
    kiem('người bị khoá không còn trên bảng',
      (await p.locator('section:has(h2:text("Người tích cực nhất"))')
        .getByText(sieng.tenHienThi).count()) === 0);
  } finally {
    if (p) await p.close();
    await don();
  }
}
