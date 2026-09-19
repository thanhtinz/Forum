import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

const CHU = 'Ktsao bài viết phải còn nguyên sau khi chấm lại sao';

/**
 * CHẤM SAO MỘT CÚ BẤM.
 *
 * App Store: bấm vào ngôi sao thứ tư là chấm xong bốn sao, không mở biểu mẫu
 * nào. Phần lớn người ta chỉ muốn nói "game này hay" chứ không muốn viết gì.
 *
 * MỤC CANH NẶNG NHẤT không phải "chấm được", mà là "chấm KHÔNG XOÁ bài đã
 * viết". Hàm `chamSao` cũ ghi `noiDung: chu || null` — chữ rỗng nghĩa là xoá.
 * Nối hàng sao vào hàm ấy thì một cú bấm thổi bay cả bài đánh giá, tiêu đề và
 * ảnh đính kèm mà không hỏi một câu. Nên có hàm riêng `chamSaoNhanh`, và bài
 * này canh đúng chỗ đó.
 *
 * Và vì nó là một địa chỉ POST công khai: khách chưa đăng nhập phải trượt, và
 * sao ngoài khoảng 1–5 cũng phải trượt.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  const thu = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  if (!game || !thu) { kiem('có dữ liệu mẫu', false); return; }

  const don = async () => {
    await db.danhGia.deleteMany({ where: { gameId: game.id, nguoiId: thu.id } });
  };
  await don();

  const docBai = async () => db.danhGia.findFirst({
    where: { gameId: game.id, nguoiId: thu.id },
    select: { sao: true, noiDung: true, tieuDe: true },
  });

  let p, khach;
  try {
    p = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    const dia = `${GOC}/game/${game.duongDan}`;
    await p.goto(dia, { waitUntil: 'networkidle' });

    // ── Một cú bấm là chấm xong ────────────────────────────────────────
    await p.locator('[role="radio"][aria-label="4 sao"]').click();
    const daCham = await doiToi(async () => (await docBai())?.sao === 4);
    kiem('bấm một cái là chấm xong bốn sao', daCham);
    kiem('và KHÔNG mở hộp thoại nào',
      (await p.locator('dialog[open]').count()) === 0);
    kiem('trang nói rõ đã chấm mấy sao',
      (await p.locator('[role="status"]').first().innerText()).includes('4 sao'));

    /*
     * ── CHẤM LẠI KHÔNG ĐƯỢC XOÁ BÀI ĐÃ VIẾT ──────────────────────────
     *
     * Dựng sẵn một bài có chữ và tiêu đề, rồi bấm sao khác. Cả hai phải còn
     * nguyên — đây là chỗ nối nhầm vào `chamSao` sẽ hỏng.
     */
    await db.danhGia.updateMany({
      where: { gameId: game.id, nguoiId: thu.id },
      data: { noiDung: CHU, tieuDe: 'Ktsao tiêu đề' },
    });

    await p.goto(dia, { waitUntil: 'networkidle' });
    await p.locator('[role="radio"][aria-label="2 sao"]').click();
    const daDoi = await doiToi(async () => (await docBai())?.sao === 2);
    kiem('chấm lại thì điểm sao đổi', daDoi);

    const con = await docBai();
    kiem('và phần chữ của bài đánh giá CÒN NGUYÊN', con?.noiDung === CHU,
      `còn lại: ${con?.noiDung ?? 'rỗng'}`);
    kiem('tiêu đề cũng còn nguyên', con?.tieuDe === 'Ktsao tiêu đề',
      `còn lại: ${con?.tieuDe ?? 'rỗng'}`);

    // ── Điểm trung bình của game khớp lại ngay ─────────────────────────
    const g = await db.game.findUnique({
      where: { id: game.id }, select: { tongSao: true, soLuotDanhGia: true },
    });
    const gom = await db.danhGia.aggregate({
      where: { gameId: game.id }, _sum: { sao: true }, _count: { _all: true },
    });
    kiem('bộ đếm sao của game khớp với bảng đánh giá',
      g?.tongSao === (gom._sum.sao ?? 0) && g?.soLuotDanhGia === gom._count._all,
      `game nói ${g?.tongSao}/${g?.soLuotDanhGia}, bảng nói ${gom._sum.sao}/${gom._count._all}`);

    /*
     * ── CỬA: khách phát lại yêu cầu vẫn phải trượt ───────────────────
     */
    let donHang = null;
    p.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      const than = yc.postData();
      if (!than) return;
      donHang = { dia: yc.url(), dau, than };
    });
    await p.goto(dia, { waitUntil: 'networkidle' });
    await p.locator('[role="radio"][aria-label="5 sao"]').click();
    await doiToi(async () => (await docBai())?.sao === 5);
    kiem('bắt được yêu cầu chấm sao để phát lại', !!donHang?.than);

    if (donHang) {
      khach = await moTrang();
      await khach.goto(dia, { waitUntil: 'networkidle' });
      const dauKhach = { ...donHang.dau };
      delete dauKhach.cookie;
      await khach.evaluate(async ({ dia: d, dau, than }) => {
        await fetch(d, { method: 'POST', headers: dau, body: than }).catch(() => {});
      }, { ...donHang, dau: dauKhach });
      await khach.waitForTimeout(1500);
      kiem('khách phát lại yêu cầu thì không đổi được điểm sao của người khác',
        (await docBai())?.sao === 5, `giờ là ${(await docBai())?.sao}`);
    }
  } finally {
    if (p) await p.close();
    if (khach) await khach.close();
    await don();
  }
}
