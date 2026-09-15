import { GOC, LOI, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';
import { BAI_MOI, NGHI_GIAY, TIN_TOI_DA } from '../../src/lib/chat-const.ts';

const DAU = 'Ktchat';

/**
 * PHÒNG CHAT CHUNG của một game, và hàng BÀI VIẾT MỚI ngay trên nó.
 *
 * Phòng chat là đường ghi nhanh nhất vào cơ sở dữ liệu mà người lạ chạm được
 * tới — không có ô nào phải duyệt, không có tiêu đề phải nghĩ. Nên mấy mục
 * nặng nhất ở đây đều là mục CỬA:
 *
 *   • nhịp nghỉ giữa hai câu của cùng một người có thật ở MÁY CHỦ, không phải
 *     một nút bị làm mờ;
 *   • người thường gỡ được câu của chính mình, KHÔNG gỡ được câu người khác —
 *     và điều kiện ấy nằm trong `where`, nên phát lại yêu cầu vẫn trượt;
 *   • mỗi game một phòng riêng, câu bên này không lọt sang bên kia.
 *
 * Còn hàng bài viết mới thì canh đúng hai thứ nó hứa: NĂM bài, và xếp theo
 * lượt nói cuối chứ không theo lúc mở chủ đề.
 */
export default async function chay(kiem) {
  const game = await db.game.findMany({
    orderBy: { id: 'asc' }, where: { trangThai: 'DANG_HIEN' },
    take: 2, select: { id: true, duongDan: true, ten: true },
  });
  if (game.length < 2) { kiem('có hai game mẫu', false); return; }
  const [gA, gB] = game;
  const thu = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'anhthu' }, select: { id: true, tenHienThi: true },
  });
  const huy = await db.nguoiDung.findFirst({
    where: { tenDangNhap: 'huytran' }, select: { id: true, tenHienThi: true },
  });
  if (!thu || !huy) { kiem('có thành viên mẫu', false); return; }

  const don = async () => {
    await db.tinNhanChat.deleteMany({ where: { noiDung: { contains: DAU } } });
    const cu = await db.chuDe.findMany({
      where: { tieuDe: { startsWith: DAU } }, select: { id: true },
    });
    const id = cu.map((c) => c.id);
    await db.traLoi.deleteMany({ where: { chuDeId: { in: id } } });
    await db.chuDe.deleteMany({ where: { id: { in: id } } });
  };
  await don();

  let khach, pThu, admin;
  try {
    // ── Khách đọc được, không gõ được ─────────────────────────────────
    await db.tinNhanChat.create({
      data: { gameId: gA.id, nguoiId: huy.id, noiDung: `${DAU} câu của người khác` },
      select: { id: true },
    });

    const dia = `${GOC}/game/${gA.duongDan}/dien-dan`;
    khach = await moTrang();
    await khach.goto(dia, { waitUntil: 'networkidle' });
    const phong = khach.locator(`section[aria-label="Phòng chat ${gA.ten}"]`);
    kiem('diễn đàn game có phòng chat', (await phong.count()) === 1);
    kiem('khách đọc được câu đã có trong phòng',
      (await phong.getByText(`${DAU} câu của người khác`).count()) === 1);
    kiem('khách không có ô gõ, chỉ có lời mời đăng nhập',
      (await phong.locator('input[aria-label="Gõ một câu"]').count()) === 0
      && (await phong.getByText('Đăng nhập').count()) === 1);

    // ── Thành viên nói được ───────────────────────────────────────────
    pThu = await moTrangDaDangNhap('anhthu', 'thanhvien123');
    await pThu.goto(dia, { waitUntil: 'networkidle' });
    const oGo = pThu.locator('input[aria-label="Gõ một câu"]');
    await oGo.fill(`${DAU} câu đầu tiên của Thư`);
    await pThu.click('button[aria-label="Gửi"]');
    const daNoi = await doiToi(async () =>
      (await db.tinNhanChat.count({
        where: { gameId: gA.id, noiDung: `${DAU} câu đầu tiên của Thư` },
      })) === 1);
    kiem('thành viên gửi được câu', daNoi);
    kiem('câu vừa gửi hiện ra ngay, không đợi hết nhịp hỏi lại',
      (await pThu.locator(`section[aria-label="Phòng chat ${gA.ten}"]`)
        .getByText(`${DAU} câu đầu tiên của Thư`).count()) === 1);
    kiem('gửi xong thì ô gõ sạch, sẵn sàng cho câu sau',
      (await oGo.inputValue()) === '');

    /*
     * ── NHỊP NGHỈ CÓ THẬT Ở MÁY CHỦ ──────────────────────────────────
     *
     * Gửi câu thứ hai ngay lập tức. Chối thì phải chối bằng CÂU NÓI, không
     * phải im lặng — im lặng thì người ta bấm thêm năm lần nữa, đúng thứ nhịp
     * nghỉ sinh ra để tránh.
     */
    await oGo.fill(`${DAU} câu thứ hai ngay tức thì`);
    await pThu.click('button[aria-label="Gửi"]');
    await pThu.waitForSelector(LOI, { timeout: 5000 }).catch(() => {});
    kiem(`hai câu liền nhau trong ${NGHI_GIAY} giây thì bị chối`,
      (await db.tinNhanChat.count({
        where: { noiDung: `${DAU} câu thứ hai ngay tức thì` },
      })) === 0);
    kiem('và nói rõ lý do chứ không im lặng',
      (await pThu.locator(LOI).count()) > 0);
    kiem('câu bị chối vẫn còn trong ô gõ, không mất trắng',
      (await oGo.inputValue()) === `${DAU} câu thứ hai ngay tức thì`);

    kiem(`ô gõ chặn sẵn ở ${TIN_TOI_DA} ký tự`,
      (await oGo.getAttribute('maxlength')) === String(TIN_TOI_DA));

    // ── Mỗi game một phòng riêng ──────────────────────────────────────
    await pThu.goto(`${GOC}/game/${gB.duongDan}/dien-dan`, { waitUntil: 'networkidle' });
    kiem('câu nói ở game này không lọt sang phòng của game kia',
      (await pThu.getByText(`${DAU} câu đầu tiên của Thư`).count()) === 0);

    /*
     * ── GỠ CÂU: CỦA MÌNH THÌ ĐƯỢC, CỦA NGƯỜI KHÁC THÌ KHÔNG ──────────
     *
     * Giao diện chỉ bày nút gỡ trên câu của chính mình, nhưng `xoaChat` là một
     * địa chỉ POST công khai. Bắt lấy yêu cầu gỡ thật rồi thay mã câu bằng mã
     * câu của người khác — nếu lọt thì ai cũng dọn sạch được phòng chat.
     */
    const cuaToi = await db.tinNhanChat.findFirst({
      where: { noiDung: `${DAU} câu đầu tiên của Thư` }, select: { id: true },
    });
    const cuaNguoiKhac = await db.tinNhanChat.findFirst({
      where: { noiDung: `${DAU} câu của người khác` }, select: { id: true },
    });

    let donHang = null;
    pThu.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      const than = yc.postData();
      if (!than || !than.includes(cuaToi.id)) return;
      donHang = { dia: yc.url(), dau, than };
    });

    await pThu.goto(dia, { waitUntil: 'networkidle' });
    kiem('không thấy nút gỡ trên câu của người khác',
      (await pThu.locator(`li:has-text("${DAU} câu của người khác") button[aria-label="Gỡ câu này"]`)
        .count()) === 0);

    await pThu.locator(`li:has-text("${DAU} câu đầu tiên của Thư") button[aria-label="Gỡ câu này"]`)
      .click();
    const daGo = await doiToi(async () =>
      (await db.tinNhanChat.count({ where: { id: cuaToi.id } })) === 0);
    kiem('gỡ được câu của chính mình', daGo);

    kiem('bắt được yêu cầu gỡ để phát lại', !!donHang?.than);
    if (donHang) {
      /*
       * PHÁT LẠI THỬ MỘT LƯỢT ĐÚNG TRƯỚC ĐÃ.
       *
       * Không có mục này thì mục an ninh ngay dưới là mục rỗng: yêu cầu phát
       * lại có thể trượt vì một lý do chẳng liên quan gì tới quyền — sai thân
       * bài, sai mã hiệu — mà nhìn vào vẫn thấy "không gỡ được", y hệt lúc cửa
       * chặn làm đúng việc của nó.
       */
      const cuaToi2 = await db.tinNhanChat.create({
        data: { gameId: gA.id, nguoiId: thu.id, noiDung: `${DAU} câu thứ hai của Thư` },
        select: { id: true },
      });
      await pThu.evaluate(async ({ dia: d, dau, than }) => {
        await fetch(d, { method: 'POST', headers: dau, body: than });
      }, { ...donHang, than: donHang.than.split(cuaToi.id).join(cuaToi2.id) });
      const tuGoDuoc = await doiToi(async () =>
        (await db.tinNhanChat.count({ where: { id: cuaToi2.id } })) === 0);
      kiem('phát lại đúng lối thì gỡ được — yêu cầu dựng lại là thật', tuGoDuoc);

      const ma = await pThu.evaluate(async ({ dia: d, dau, than }) => {
        const r = await fetch(d, { method: 'POST', headers: dau, body: than });
        return r.status;
      }, { ...donHang, than: donHang.than.split(cuaToi.id).join(cuaNguoiKhac.id) });
      await pThu.waitForTimeout(1200);
      kiem('phát lại với mã câu người khác thì không gỡ được',
        (await db.tinNhanChat.count({ where: { id: cuaNguoiKhac.id } })) === 1,
        `máy trả ${ma}`);
    }

    // ── Quản trị gỡ được câu của bất kỳ ai ────────────────────────────
    admin = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
    await admin.goto(dia, { waitUntil: 'networkidle' });
    await admin.locator(`li:has-text("${DAU} câu của người khác") button[aria-label="Gỡ câu này"]`)
      .click();
    const quanTriGo = await doiToi(async () =>
      (await db.tinNhanChat.count({ where: { id: cuaNguoiKhac.id } })) === 0);
    kiem('quản trị gỡ được câu của bất kỳ ai', quanTriGo);

    /*
     * ── HÀNG BÀI VIẾT MỚI ────────────────────────────────────────────
     *
     * Dựng bảy chủ đề để đúng cái trần năm bài có việc phải làm, rồi đẩy chủ
     * đề CŨ NHẤT lên đầu bằng một lượt trả lời — xếp theo lúc mở chủ đề thì nó
     * không lọt vào đâu.
     */
    const moc = new Date(Date.now() - 7 * 86400000);
    const cu = await db.chuDe.create({
      data: {
        gameId: gA.id, nguoiId: huy.id, tieuDe: `${DAU} chuyện cũ vừa có người đáp`,
        noiDung: 'Nội dung kiểm thử.', taoLuc: moc, traLoiCuoiLuc: moc,
      },
      select: { id: true },
    });
    for (let i = 0; i < 6; i++) {
      await db.chuDe.create({
        data: {
          gameId: gA.id, nguoiId: thu.id, tieuDe: `${DAU} chuyện mới ${i}`,
          noiDung: 'Nội dung kiểm thử.',
        },
        select: { id: true },
      });
    }

    await khach.goto(dia, { waitUntil: 'networkidle' });
    const hang = khach.locator('section[aria-label="Bài viết mới"] li');
    kiem(`hàng bài viết mới đúng ${BAI_MOI} bài, không hơn`,
      (await hang.count()) === BAI_MOI, `đếm được ${await hang.count()}`);
    kiem('chuyện cũ chưa ai đáp thì chưa lọt vào',
      (await khach.locator('section[aria-label="Bài viết mới"]')
        .getByText(`${DAU} chuyện cũ vừa có người đáp`).count()) === 0);

    await db.traLoi.create({
      data: { chuDeId: cu.id, nguoiId: thu.id, noiDung: 'Tôi vừa đáp đây.' },
      select: { id: true },
    });
    await db.chuDe.update({
      where: { id: cu.id },
      data: { soTraLoi: 1, traLoiCuoiLuc: new Date() },
      select: { id: true },
    });

    await khach.goto(dia, { waitUntil: 'networkidle' });
    kiem('có người đáp thì chuyện cũ lên đầu hàng bài mới',
      (await hang.first().innerText()).includes(`${DAU} chuyện cũ vừa có người đáp`),
      await hang.first().innerText());
    kiem('và ghi tên người vừa đáp, không phải người mở',
      (await hang.first().innerText()).includes(thu.tenHienThi),
      await hang.first().innerText());

    // ── Vào trong một chuyên mục thì thôi bày chat với bài mới ────────
    await khach.goto(`${dia}?muc=chung`, { waitUntil: 'networkidle' });
    kiem('vào trong chuyên mục thì thôi vác theo phòng chat và bài mới',
      (await khach.locator('section[aria-label="Bài viết mới"]').count()) === 0
      && (await khach.locator(`section[aria-label="Phòng chat ${gA.ten}"]`).count()) === 0);
  } finally {
    if (khach) await khach.close();
    if (pThu) await pThu.close();
    if (admin) await admin.close();
    await don();
  }
}
