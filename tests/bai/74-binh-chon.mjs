import { GOC, db, doiToi, moTrang, moTrangDaDangNhap, tuDongXacNhan } from '../tro-giup.mjs';
import { IT_NHAT, NHIEU_NHAT, phanTram } from '../../src/lib/binh-chon-const.ts';

const TIEU_DE = 'Kiểm thử bình chọn';

/**
 * Bình chọn gắn vào một chủ đề.
 *
 * Nửa số chủ đề tán gẫu trong diễn đàn game thật ra là một câu hỏi đếm đầu
 * người — "bản nào mượt hơn", "nên tải bản Việt hoá hay bản gốc". Không có chỗ
 * bấm thì hai chục người vào gõ đúng một chữ, và người mở chủ đề tự ngồi đếm.
 *
 * Mấy chỗ đáng canh, và chỗ nào cũng là chỗ con số hoá ra nói dối:
 *   • bấm hai lần KHÔNG thành hai phiếu — ràng buộc ở khoá chính, không ở một
 *     câu `if`;
 *   • cuộc CHỈ MỘT đáp án thì chọn ô mới tự bỏ ô cũ, và cả hai con số đếm sẵn
 *     phải đổi theo trong cùng một lượt;
 *   • người lạ KHÔNG gắn được bình chọn vào chủ đề của người khác;
 *   • chủ đề khoá thì thôi bỏ phiếu.
 */
export default async function chay(kiem) {
  // ── Phần thuần ─────────────────────────────────────────────────────
  kiem('phần trăm chia theo tổng số phiếu', phanTram(3, 12) === 25);
  kiem('chưa ai bấm thì mọi thanh đều trống, không chia cho không',
    phanTram(0, 0) === 0);

  const game = await db.game.findFirst({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    select: { id: true, duongDan: true },
  });
  const chu = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'huytran' }, select: { id: true },
  });
  const la = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true },
  });
  if (!game || !chu || !la) { kiem('có dữ liệu mẫu', false); return; }

  const don = async () => {
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: TIEU_DE } }, select: { id: true },
    });
    const id = cu.map((c) => c.id);
    await db.binhChon.deleteMany({ where: { chuDeId: { in: id } } });
    await db.traLoi.deleteMany({ where: { chuDeId: { in: id } } });
    await db.theoDoiChuDe.deleteMany({ where: { chuDeId: { in: id } } });
    await db.chuDe.deleteMany({ where: { id: { in: id } } });
  };
  await don();

  let pChu, pLa, khach;
  try {
    const chuDe = await db.chuDe.create({
      data: { gameId: game.id, nguoiId: chu.id, tieuDe: TIEU_DE, noiDung: 'Hỏi cả nhà.' },
      select: { id: true },
    });
    const dia = `${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`;

    // ── Người lạ không thấy lối gắn ───────────────────────────────────
    pLa = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    await pLa.goto(dia, { waitUntil: 'networkidle' });
    kiem('người không mở chủ đề thì không thấy lối gắn bình chọn',
      (await pLa.locator('summary:has-text("Thêm một cuộc bình chọn")').count()) === 0);

    // ── Chủ chủ đề gắn được ───────────────────────────────────────────
    pChu = await moTrangDaDangNhap('huytran', 'thanhvien123');
    await pChu.goto(dia, { waitUntil: 'networkidle' });
    await pChu.click('summary:has-text("Thêm một cuộc bình chọn")');
    kiem(`biểu mẫu bày đủ ${NHIEU_NHAT} ô lựa chọn`,
      (await pChu.locator('input[name^="luaChon-"]').count()) === NHIEU_NHAT);

    // Một lựa chọn thì bị chối — đó là một câu khẳng định có nút bấm.
    await pChu.fill('input[name="cauHoi"]', 'Bản nào chạy mượt hơn trên máy cũ?');
    await pChu.fill('input[name="luaChon-0"]', 'Bản 1.1');
    await pChu.click('button:has-text("Gắn bình chọn")');
    await pChu.waitForTimeout(1500);
    kiem(`ít hơn ${IT_NHAT} lựa chọn thì bị chối`,
      (await db.binhChon.count({ where: { chuDeId: chuDe.id } })) === 0);

    /*
     * GỬI HỎNG MỘT LƯỢT THÌ CHỮ VỪA GÕ PHẢI Ở LẠI.
     *
     * React 19 xoá trắng biểu mẫu sau mỗi `action`, kể cả lượt trả về lỗi —
     * nên câu hỏi vừa gõ biến mất đúng lúc người ta đọc câu báo lỗi nói mình
     * thiếu một lựa chọn, rồi bấm lần hai là gửi lên một biểu mẫu rỗng.
     */
    kiem('gửi hỏng thì câu hỏi vừa gõ vẫn còn trong ô',
      (await pChu.inputValue('input[name="cauHoi"]')) === 'Bản nào chạy mượt hơn trên máy cũ?');
    kiem('và lựa chọn vừa gõ cũng còn',
      (await pChu.inputValue('input[name="luaChon-0"]')) === 'Bản 1.1');

    await pChu.fill('input[name="luaChon-1"]', 'Bản 1.2');
    await pChu.fill('input[name="luaChon-2"]', 'Như nhau');
    await pChu.click('button:has-text("Gắn bình chọn")');
    const daGan = await doiToi(async () =>
      (await db.binhChon.count({ where: { chuDeId: chuDe.id } })) === 1);
    kiem('gắn được cuộc bình chọn', daGan);

    const bc = await db.binhChon.findUnique({
      where: { chuDeId: chuDe.id },
      select: {
        id: true, nhieuLuaChon: true,
        luaChon: { orderBy: { thuTu: 'asc' }, select: { id: true, noiDung: true } },
      },
    });
    kiem('mấy ô để trống bị bỏ đi, không thành lựa chọn rỗng',
      bc?.luaChon.length === 3, `${bc?.luaChon.length} lựa chọn`);
    kiem('mặc định là cuộc chỉ chọn MỘT đáp án', bc?.nhieuLuaChon === false);

    // ── Gắn cuộc thứ hai thì bị chối ──────────────────────────────────
    await pChu.goto(dia, { waitUntil: 'networkidle' });
    kiem('đã có bình chọn thì không còn bày lối gắn thêm',
      (await pChu.locator('summary:has-text("Thêm một cuộc bình chọn")').count()) === 0);

    // ── Bỏ phiếu ──────────────────────────────────────────────────────
    const o = (i) => `button[aria-pressed]:has-text("${bc.luaChon[i].noiDung}")`;
    await pLa.goto(dia, { waitUntil: 'networkidle' });
    await pLa.click(o(0));
    const daBo = await doiToi(async () =>
      (await db.phieu.count({ where: { luaChonId: bc.luaChon[0].id } })) === 1);
    kiem('bỏ được phiếu', daBo);

    const sau1 = await db.luaChon.findUnique({
      where: { id: bc.luaChon[0].id }, select: { soPhieu: true },
    });
    kiem('con số đếm sẵn khớp số phiếu thật', sau1?.soPhieu === 1, String(sau1?.soPhieu));

    await pLa.goto(dia, { waitUntil: 'networkidle' });
    kiem('tải lại trang thì ô đã bấm vẫn sáng',
      (await pLa.locator(`${o(0)}[aria-pressed="true"]`).count()) === 1);

    /*
     * ── CUỘC MỘT ĐÁP ÁN: CHỌN Ô MỚI TỰ BỎ Ô CŨ ───────────────────────
     *
     * Chối lượt bấm thì người ta phải tự đoán ra là mình cần đi rút phiếu cũ
     * trước — chẳng ai đoán ra. Và cả hai con số đếm sẵn phải đổi theo trong
     * cùng một lượt, không thì tổng phiếu nhiều hơn số người bỏ phiếu.
     */
    await pLa.click(o(1));
    const daDoi = await doiToi(async () =>
      (await db.phieu.count({ where: { luaChonId: bc.luaChon[1].id } })) === 1);
    kiem('chọn ô khác thì phiếu chuyển sang ô ấy', daDoi);
    kiem('và ô cũ hết phiếu, không thành hai phiếu một người',
      (await db.phieu.count({ where: { luaChonId: bc.luaChon[0].id } })) === 0);

    const con = await db.luaChon.findMany({
      where: { binhChonId: bc.id }, select: { soPhieu: true },
    });
    kiem('tổng phiếu đếm sẵn vẫn đúng bằng một',
      con.reduce((t, x) => t + x.soPhieu, 0) === 1,
      con.map((x) => x.soPhieu).join(','));

    // ── Bấm lại đúng ô đang chọn thì rút phiếu ────────────────────────
    await pLa.goto(dia, { waitUntil: 'networkidle' });
    await pLa.click(o(1));
    const daRut = await doiToi(async () =>
      (await db.phieu.count({ where: { luaChon: { binhChonId: bc.id } } })) === 0);
    kiem('bấm lại đúng ô đang chọn thì rút phiếu', daRut);

    const sauRut = await db.luaChon.findMany({
      where: { binhChonId: bc.id }, select: { soPhieu: true },
    });
    kiem('và mọi con số về 0, không tụt xuống âm',
      sauRut.every((x) => x.soPhieu === 0), sauRut.map((x) => x.soPhieu).join(','));

    // ── Khách chỉ xem, không bấm ──────────────────────────────────────
    khach = await moTrang();
    await khach.goto(dia, { waitUntil: 'networkidle' });
    kiem('khách chưa đăng nhập thì thấy kết quả nhưng nút không bấm được',
      (await khach.locator('button[aria-pressed][disabled]').count()) === 3);

    // ── Chủ đề khoá thì thôi bỏ phiếu ─────────────────────────────────
    await db.chuDe.update({ where: { id: chuDe.id }, data: { khoa: true } });
    await pLa.goto(dia, { waitUntil: 'networkidle' });
    await pLa.locator(o(0)).click({ force: true }).catch(() => {});
    await pLa.waitForTimeout(1200);
    kiem('chủ đề khoá thì không bỏ phiếu được',
      (await db.phieu.count({ where: { luaChon: { binhChonId: bc.id } } })) === 0);
    await db.chuDe.update({ where: { id: chuDe.id }, data: { khoa: false } });

    /*
     * ── NGƯỜI LẠ PHÁT LẠI YÊU CẦU GẮN BÌNH CHỌN ──────────────────────
     *
     * Giao diện không bày lối, nhưng `taoBinhChon` là một địa chỉ POST công
     * khai. Lọt thì ai cũng gắn được bình chọn vào chủ đề của người khác.
     */
    const chuDe2 = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: chu.id,
        tieuDe: `${TIEU_DE} — chủ đề thứ hai`, noiDung: 'Hỏi tiếp.',
      },
      select: { id: true },
    });
    let donHang = null;
    pChu.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      delete dau.cookie;
      donHang = { dia: yc.url(), dau, than: yc.postData() };
    });
    await pChu.goto(`${GOC}/game/${game.duongDan}/dien-dan/${chuDe2.id}`,
      { waitUntil: 'networkidle' });
    await pChu.click('summary:has-text("Thêm một cuộc bình chọn")');
    await pChu.fill('input[name="cauHoi"]', 'Câu hỏi của chủ đề thứ hai?');
    await pChu.fill('input[name="luaChon-0"]', 'Có');
    await pChu.fill('input[name="luaChon-1"]', 'Không');
    await pChu.click('button:has-text("Gắn bình chọn")');
    await doiToi(async () =>
      (await db.binhChon.count({ where: { chuDeId: chuDe2.id } })) === 1);
    kiem('bắt được yêu cầu gắn để phát lại', !!donHang?.than);

    if (donHang) {
      await db.binhChon.deleteMany({ where: { chuDeId: chuDe2.id } });
      const ma = await pLa.evaluate(async ({ dia: d, dau, than }) => {
        const r = await fetch(d, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, donHang);
      await pLa.waitForTimeout(1200);
      kiem('người lạ phát lại yêu cầu thì không gắn được vào chủ đề người khác',
        (await db.binhChon.count({ where: { chuDeId: chuDe2.id } })) === 0,
        `máy trả ${ma}`);
    }

    /*
     * ── CUỘC NHIỀU ĐÁP ÁN: GIỮ ĐƯỢC MẤY PHIẾU MỘT LÚC ────────────────
     *
     * Đây là nhánh ngược của luật trên, nên phải canh riêng: cùng một hàm bỏ
     * phiếu, mà chỗ này KHÔNG được dọn phiếu cũ đi.
     */
    const chuDe3 = await db.chuDe.create({
      data: {
        gameId: game.id, nguoiId: chu.id,
        tieuDe: `${TIEU_DE} — chọn nhiều`, noiDung: 'Chọn bao nhiêu cũng được.',
        binhChon: {
          create: {
            cauHoi: 'Bạn chơi trên máy nào?', nhieuLuaChon: true,
            luaChon: { create: [
              { noiDung: 'Máy Java', thuTu: 0 },
              { noiDung: 'Máy Android', thuTu: 1 },
            ] },
          },
        },
      },
      select: { id: true, binhChon: { select: { id: true } } },
    });
    await pLa.goto(`${GOC}/game/${game.duongDan}/dien-dan/${chuDe3.id}`,
      { waitUntil: 'networkidle' });
    await pLa.click('button[aria-pressed]:has-text("Máy Java")');
    await doiToi(async () =>
      (await db.phieu.count({ where: { luaChon: { binhChonId: chuDe3.binhChon.id } } })) === 1);
    await pLa.click('button[aria-pressed]:has-text("Máy Android")');
    const haiPhieu = await doiToi(async () =>
      (await db.phieu.count({ where: { luaChon: { binhChonId: chuDe3.binhChon.id } } })) === 2);
    kiem('cuộc cho chọn nhiều thì giữ được hai phiếu một lúc', haiPhieu);
    // Đợi trên DOM, không đợi trên CSDL: hàng đã ghi xong từ trước lượt
    // `revalidatePath` vẽ lại trang, nên đếm ngay là đếm trang cũ.
    const caHaiSang = await pLa.waitForFunction(
      () => document.querySelectorAll('button[aria-pressed="true"]').length === 2,
      null, { timeout: 5000 },
    ).then(() => true).catch(() => false);
    kiem('và cả hai ô đều sáng', caHaiSang);

    // ── Gỡ bình chọn thì phiếu đi theo ────────────────────────────────
    await pLa.goto(dia, { waitUntil: 'networkidle' });
    await pLa.click(o(0));
    await doiToi(async () =>
      (await db.phieu.count({ where: { luaChon: { binhChonId: bc.id } } })) === 1);

    await pChu.goto(dia, { waitUntil: 'networkidle' });
    tuDongXacNhan(pChu);
    await pChu.click('button[aria-label="Gỡ bình chọn"]');
    const daGo = await doiToi(async () =>
      (await db.binhChon.count({ where: { chuDeId: chuDe.id } })) === 0);
    kiem('chủ chủ đề gỡ được cuộc bình chọn', daGo);
    kiem('và phiếu đi theo, không thành rác trỏ vào hư không',
      (await db.phieu.count({ where: { luaChonId: bc.luaChon[0].id } })) === 0);
  } finally {
    if (pChu) await pChu.close();
    if (pLa) await pLa.close();
    if (khach) await khach.close();
    await don();
  }
}
