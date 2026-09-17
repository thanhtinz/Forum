import { GOC, db, doiToi, moTrangDaDangNhap } from '../tro-giup.mjs';
import { NGHI_CHU_DE_GIAY, NGHI_TRA_LOI_GIAY } from '../../src/lib/dien-dan-const.ts';

const DAU = 'Ktnhip';

/**
 * NHỊP NGHỈ CỦA DIỄN ĐÀN.
 *
 * Diễn đàn là lối ghi vào cơ sở dữ liệu dễ nhất mà người lạ chạm được tới:
 * đăng nhập xong là viết được, không ô nào phải duyệt. Phòng chat có nhịp nghỉ
 * từ đầu, diễn đàn thì không — mà bài diễn đàn NẶNG HƠN một câu chat, vì mỗi
 * bài kéo theo `guiThongBao`, và `guiThongBao` lại gọi `baoQuaThu`. Rải bài là
 * rải thư đi kèm, vào hộp thư của người khác.
 *
 * Mục canh nặng nhất: cửa nằm ở MÁY CHỦ. Phát lại đúng yêu cầu ấy vẫn phải
 * trượt — một cái nút bị làm mờ thì không chặn được ai gọi thẳng địa chỉ POST.
 *
 * Và mặt kia của cùng một đồng xu: hết nhịp thì phải viết được. Một cửa chặn
 * mở ra rồi không đóng lại được thì đó là hỏng, không phải an toàn.
 */
export default async function chay(kiem) {
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
      where: { tieuDe: { startsWith: DAU } }, select: { id: true },
    });
    const ids = cu.map((c) => c.id);
    if (!ids.length) return;
    await db.chuDe.updateMany({ where: { id: { in: ids } }, data: { loiGiaiId: null } });
    await db.traLoi.deleteMany({ where: { chuDeId: { in: ids } } });
    await db.chuDe.deleteMany({ where: { id: { in: ids } } });
  };
  await don();

  /*
   * Lùi mốc giờ của mọi bài người này đã viết về quá khứ.
   *
   * Không có cách nào khác để kiểm "hết nhịp thì viết được" mà không ngồi đợi
   * ba mươi giây thật. Lùi cả bài CŨ trong dữ liệu mẫu nữa: nhịp nghỉ đếm theo
   * NGƯỜI chứ không theo chủ đề, nên một bài cũ của chính người ấy cũng chặn
   * được lượt đầu tiên của bài kiểm.
   */
  const luiGio = async () => {
    const xa = new Date(Date.now() - 3600_000);
    await db.chuDe.updateMany({ where: { nguoiId: nguoi.id }, data: { taoLuc: xa } });
    await db.traLoi.updateMany({ where: { nguoiId: nguoi.id }, data: { taoLuc: xa } });
  };

  let p;
  try {
    p = await moTrangDaDangNhap('huytran', 'thanhvien123');
    const dang = `${GOC}/game/${game.duongDan}/dien-dan/dang`;
    const demBai = async () => db.chuDe.count({ where: { tieuDe: { startsWith: DAU } } });

    // ── Bài đầu tiên: phải đăng được ───────────────────────────────────
    await luiGio();
    await p.goto(dang, { waitUntil: 'networkidle' });
    await p.fill('input[name="tieuDe"]', `${DAU} bài thứ nhất của đợt kiểm`);
    await p.fill('textarea[name="noiDung"]', 'Thân bài đủ dài để qua cửa kiểm chữ.');
    await p.click('button[type="submit"]');
    kiem('bài đầu tiên đăng được', await doiToi(async () => (await demBai()) === 1));

    // ── Bài thứ hai ngay sau đó: phải bị chối ──────────────────────────
    await p.goto(dang, { waitUntil: 'networkidle' });
    await p.fill('input[name="tieuDe"]', `${DAU} bài thứ hai gửi ngay lập tức`);
    await p.fill('textarea[name="noiDung"]', 'Thân bài đủ dài để qua cửa kiểm chữ.');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(1500);
    kiem('bài thứ hai gửi ngay thì bị chối', (await demBai()) === 1,
      `đang có ${await demBai()} bài`);
    kiem('và nói rõ phải đợi bao lâu',
      (await p.locator('body').innerText())
        .includes(`mỗi chủ đề cách nhau ${NGHI_CHU_DE_GIAY} giây`));

    /*
     * ── CỬA NẰM Ở MÁY CHỦ ────────────────────────────────────────────
     *
     * Bắt lấy yêu cầu đăng bài thật rồi phát lại nguyên văn. Lọt thì cái gọi
     * là nhịp nghỉ chỉ là một nút bị làm mờ ở trình duyệt.
     */
    let don2 = null;
    p.on('request', (yc) => {
      const dau = yc.headers();
      if (yc.method() !== 'POST' || !dau['next-action']) return;
      const than = yc.postData();
      if (!than || !than.includes(`${DAU} bài thứ ba`)) return;
      don2 = { dia: yc.url(), dau, than };
    });

    await p.goto(dang, { waitUntil: 'networkidle' });
    await p.fill('input[name="tieuDe"]', `${DAU} bài thứ ba để phát lại`);
    await p.fill('textarea[name="noiDung"]', 'Thân bài đủ dài để qua cửa kiểm chữ.');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(1500);
    kiem('bắt được yêu cầu đăng bài để phát lại', !!don2?.than);

    if (don2) {
      for (let i = 0; i < 3; i++) {
        await p.evaluate(async ({ dia, dau, than }) => {
          await fetch(dia, { method: 'POST', headers: dau, body: than }).catch(() => {});
        }, don2);
      }
      await p.waitForTimeout(1200);
      kiem('phát lại yêu cầu ba lần vẫn không lọt bài nào',
        (await demBai()) === 1, `đang có ${await demBai()} bài`);
    }

    // ── Hết nhịp thì phải viết được ────────────────────────────────────
    await luiGio();
    await p.goto(dang, { waitUntil: 'networkidle' });
    await p.fill('input[name="tieuDe"]', `${DAU} bài sau khi đã hết nhịp`);
    await p.fill('textarea[name="noiDung"]', 'Thân bài đủ dài để qua cửa kiểm chữ.');
    await p.click('button[type="submit"]');
    kiem('hết nhịp thì đăng được bài tiếp theo',
      await doiToi(async () => (await demBai()) === 2));

    // ── Lời đáp: cùng cửa, nhịp riêng ──────────────────────────────────
    const chuDe = await db.chuDe.findFirst({
      where: { tieuDe: { startsWith: DAU } }, orderBy: { taoLuc: 'asc' },
      select: { id: true },
    });
    const demDap = async () =>
      db.traLoi.count({ where: { chuDeId: chuDe.id, nguoiId: nguoi.id } });
    const doc = `${GOC}/game/${game.duongDan}/dien-dan/${chuDe.id}`;

    await luiGio();
    await p.goto(doc, { waitUntil: 'networkidle' });
    await p.fill('textarea[aria-label="Trả lời"]', `${DAU} lời đáp thứ nhất`);
    await p.click('button:has-text("Gửi trả lời")');
    kiem('lời đáp đầu tiên gửi được', await doiToi(async () => (await demDap()) === 1));

    await p.goto(doc, { waitUntil: 'networkidle' });
    await p.fill('textarea[aria-label="Trả lời"]', `${DAU} lời đáp thứ hai gửi ngay`);
    await p.click('button:has-text("Gửi trả lời")');
    await p.waitForTimeout(1500);
    kiem('lời đáp thứ hai gửi ngay thì bị chối', (await demDap()) === 1,
      `đang có ${await demDap()} lời đáp`);
    kiem('và nói rõ phải đợi bao lâu',
      (await p.locator('body').innerText())
        .includes(`mỗi lời đáp cách nhau ${NGHI_TRA_LOI_GIAY} giây`));

    await luiGio();
    await p.goto(doc, { waitUntil: 'networkidle' });
    await p.fill('textarea[aria-label="Trả lời"]', `${DAU} lời đáp sau khi hết nhịp`);
    await p.click('button:has-text("Gửi trả lời")');
    kiem('hết nhịp thì gửi được lời đáp tiếp theo',
      await doiToi(async () => (await demDap()) === 2));

    /*
     * Nhịp của lời đáp NGẮN HƠN nhịp của chủ đề, và đó là chủ ý — mở một chỗ
     * mới cho người khác vào nói thì nặng hơn nói thêm một câu ở chỗ đã có.
     */
    kiem('nhịp chủ đề dài hơn nhịp lời đáp',
      NGHI_CHU_DE_GIAY > NGHI_TRA_LOI_GIAY,
      `${NGHI_CHU_DE_GIAY}s ↔ ${NGHI_TRA_LOI_GIAY}s`);
  } finally {
    if (p) await p.close();
    await don();
  }
}
