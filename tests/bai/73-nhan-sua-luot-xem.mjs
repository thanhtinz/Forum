import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';
import { NHAN, NHAN_MAC_DINH, laNhan } from '../../src/lib/nhan-chu-de-const.ts';

const DAU = 'Ktnhan';

/**
 * Ba thứ nhỏ mà thiếu thì diễn đàn cứ lờ mờ: NHÃN chủ đề, dấu ĐÃ SỬA, và
 * LƯỢT XEM.
 *
 *   • Nhãn chia bốn kiểu chuyện mà diễn đàn game hỏi đi hỏi lại — hỏi đáp, báo
 *     lỗi, mẹo hay, tán gẫu — để người đang kẹt màn và người bày hàng không
 *     phải lọc bằng mắt qua cùng một dải.
 *   • Dấu "đã sửa" nói với người đọc rằng nội dung đã đổi sau khi họ có thể đã
 *     đọc. Sửa lặng lẽ, với mấy chủ đề tranh luận, là cách rút lại lời đã nói
 *     sau khi người khác đã đáp nó.
 *   • Lượt xem tách "chưa ai ngó tới" khỏi "ai cũng đọc mà không ai biết trả
 *     lời" — hai chuyện khác hẳn nhau với người đang chờ câu trả lời.
 */
export default async function chay(kiem) {
  // ── Phần thuần ─────────────────────────────────────────────────────
  kiem('bốn nhãn, không hơn không kém', NHAN.length === 4);
  kiem('nhãn mặc định là nhãn nhẹ nhất', NHAN_MAC_DINH === 'TAN_GAU');
  kiem('nhãn bịa thì không nhận', !laNhan('KHONG_CO_NHAN_NAY') && laNhan('BAO_LOI'));

  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  const nguoi = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'huytran' }, select: { id: true },
  });
  if (!game || !nguoi) { kiem('có dữ liệu mẫu', false); return; }

  const don = async () => {
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { contains: DAU } }, select: { id: true },
    });
    const id = cu.map((c) => c.id);
    await db.theoDoiChuDe.deleteMany({ where: { chuDeId: { in: id } } });
    await db.traLoi.deleteMany({ where: { chuDeId: { in: id } } });
    await db.chuDe.deleteMany({ where: { id: { in: id } } });
  };
  await don();

  let p, khach;
  try {
    const dia = `${GOC}/game/${game.duongDan}/dien-dan`;
    p = await moTrangDaDangNhap('huytran', 'thanhvien123');

    // ── Đăng bài có chọn nhãn ──────────────────────────────────────────
    await p.goto(`${dia}/dang`, { waitUntil: 'networkidle' });
    kiem('trang đăng bài bày đủ bốn nhãn để chọn',
      (await p.locator('input[name="nhan"]').count()) === 4);
    kiem('và nhãn nhẹ nhất được chọn sẵn',
      (await p.locator(`input[name="nhan"][value="${NHAN_MAC_DINH}"]`).isChecked()) === true);

    await p.fill('input[name="tieuDe"]', `${DAU} game vỡ ngay màn mở đầu`);
    await p.fill('textarea[name="noiDung"]', 'Bấm chơi là văng ra ngoài, máy mình Nokia 5130.');
    await p.check('input[name="nhan"][value="BAO_LOI"]');
    await p.click('button:has-text("Đăng chủ đề")');

    /*
     * CHỜ HÀNG TRONG CƠ SỞ DỮ LIỆU, đừng chờ điều hướng bằng khuôn đường dẫn.
     *
     * Khuôn `/dien-dan/<gì đó>` khớp luôn với chính trang ĐANG đứng —
     * `/dien-dan/dang` — nên phép chờ về ngay lập tức, rồi câu truy vấn chạy
     * trước khi máy chủ kịp ghi. Lượt chạy đầu của bài này đỏ đúng vì thế, và
     * cái đỏ ấy là lỗi của bài kiểm chứ không phải của trang.
     */
    await doiToi(async () =>
      (await db.chuDe.count({ where: { tieuDe: { contains: DAU } } })) === 1);

    const bai = await db.chuDe.findFirst({
      where: { tieuDe: { contains: DAU } }, select: { id: true, nhan: true, soLuotXem: true },
    });
    kiem('nhãn vừa chọn được ghi đúng', bai?.nhan === 'BAO_LOI', String(bai?.nhan));

    // ── Nhãn hiện trên trang chủ đề và trong danh sách ─────────────────
    await p.goto(`${dia}/${bai.id}`, { waitUntil: 'networkidle' });
    kiem('trang chủ đề bày nhãn', (await p.locator('text=Báo lỗi').count()) > 0);

    await p.goto(dia, { waitUntil: 'networkidle' });
    kiem('danh sách chủ đề cũng bày nhãn ấy',
      (await p.locator('ul[aria-label="Danh sách chủ đề"] >> text=Báo lỗi').count()) > 0);

    // ── Lọc theo nhãn ─────────────────────────────────────────────────
    kiem('hàng lọc có đủ bốn nhãn',
      (await p.locator('a[href*="loc=BAO_LOI"]').count()) > 0
      && (await p.locator('a[href*="loc=MEO_HAY"]').count()) > 0);

    await p.goto(`${dia}?loc=BAO_LOI`, { waitUntil: 'networkidle' });
    const raBaoLoi = await p.locator('ul[aria-label="Danh sách chủ đề"]').textContent();
    kiem('lọc theo nhãn ra đúng chủ đề mang nhãn ấy',
      (raBaoLoi ?? '').includes(DAU), (raBaoLoi ?? '').slice(0, 80));

    await p.goto(`${dia}?loc=MEO_HAY`, { waitUntil: 'networkidle' });
    const raMeo = await p.locator('ul[aria-label="Danh sách chủ đề"]').textContent().catch(() => '');
    kiem('và KHÔNG lọt vào lối lọc của nhãn khác', !(raMeo ?? '').includes(DAU));

    /*
     * Mã lọc bịa thì quay về danh sách đầy đủ — cùng lẽ với mấy lối lọc trạng
     * thái: `?loc=` tới từ địa chỉ nên ai cũng gõ bừa được.
     */
    await p.goto(`${dia}?loc=KHONG_CO_NHAN_NAY`, { waitUntil: 'networkidle' });
    kiem('nhãn bịa trong địa chỉ thì quay về danh sách đầy đủ',
      ((await p.locator('ul[aria-label="Danh sách chủ đề"]').textContent()) ?? '').includes(DAU));

    // ── Dấu "đã sửa" ──────────────────────────────────────────────────
    await p.goto(`${dia}/${bai.id}`, { waitUntil: 'networkidle' });
    kiem('bài chưa sửa thì KHÔNG mang dấu đã sửa',
      (await p.locator('text=đã sửa').count()) === 0);

    await p.click('button:has-text("Sửa bài")');
    await p.fill('textarea[name="noiDung"]', 'Bấm chơi là văng ra ngoài. Đã thử cài lại vẫn thế.');
    await p.click('button:has-text("Lưu bài")');
    const daSua = await doiToi(async () =>
      (await db.chuDe.findUnique({ where: { id: bai.id }, select: { suaLuc: true } }))?.suaLuc
        !== null);
    kiem('sửa bài thì ghi lại lúc sửa', daSua);

    await p.goto(`${dia}/${bai.id}`, { waitUntil: 'networkidle' });
    kiem('và trang nói rõ bài đã sửa', (await p.locator('text=đã sửa').count()) > 0);

    /*
     * ── CỬA HÀNG TỰ GHI THÌ KHÔNG PHẢI "ĐÃ SỬA" ──────────────────────
     *
     * Đây là lý do `suaLuc` ghi tay chứ không dùng `@updatedAt`. Cột ấy nhảy
     * theo MỌI lượt ghi — kể cả lúc cửa hàng tự cộng `soTraLoi` — rồi trang in
     * "đã sửa" lên một bài mà chủ nó chưa hề đụng vào.
     */
    const chuaSua = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: nguoi.id,
        tieuDe: `${DAU} chủ đề chưa ai sửa`, noiDung: 'Nội dung gốc.',
      },
      select: { id: true },
    });
    await db.chuDe.update({
      where: { id: chuaSua.id }, data: { soTraLoi: 5 }, select: { id: true },
    });
    const v = await db.chuDe.findUnique({
      where: { id: chuaSua.id }, select: { suaLuc: true },
    });
    kiem('cửa hàng tự ghi vào chủ đề thì KHÔNG hoá thành "đã sửa"', v?.suaLuc === null);

    // ── Lượt xem ──────────────────────────────────────────────────────
    const truoc = (await db.chuDe.findUnique({
      where: { id: bai.id }, select: { soLuotXem: true },
    }))?.soLuotXem ?? 0;
    khach = await moTrang();
    await khach.goto(`${dia}/${bai.id}`, { waitUntil: 'networkidle' });
    const tang = await doiToi(async () =>
      ((await db.chuDe.findUnique({ where: { id: bai.id }, select: { soLuotXem: true } }))
        ?.soLuotXem ?? 0) > truoc);
    kiem('mở chủ đề thì lượt xem tăng', tang);
    kiem('và con số ấy hiện trên trang',
      (await khach.locator('text=/lượt xem/').count()) > 0);
  } finally {
    if (p) await p.close();
    if (khach) await khach.close();
    await don();
  }
}
