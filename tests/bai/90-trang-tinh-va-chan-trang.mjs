import { GOC, db, moTrang } from '../tro-giup.mjs';
import { TRANG_TINH } from '../../src/lib/trang-tinh-const.ts';

/**
 * BA TRANG TĨNH VÀ CHÂN TRANG.
 *
 * Mặt tiền cửa hàng trước đây KHÔNG có chân trang nào, và không có trang nào
 * nói cửa hàng này là của ai. Dòng liên hệ với dòng bản quyền chỉ nằm ở đáy
 * thanh bên máy bàn, mà thanh bên ẩn hẳn dưới `lg` — nên người dùng điện
 * thoại, tức phần lớn người vào một cửa hàng game, không bao giờ thấy.
 *
 * Đó không phải chuyện thẩm mỹ: chỗ này cho người lạ tải tệp thực thi về máy
 * họ. Nên bài này canh chặt nhất đúng hai điều — mọi trang đều có lối đi tới
 * ba trang ấy ở MỌI khổ, và ba trang ấy mở được thật.
 *
 * Và một mục khó thấy: trang Liên hệ KHÔNG được bày một liên kết `mailto:`
 * trỏ vào chỗ trống khi ban quản trị chưa đặt địa chỉ. Bấm vào mở ra một lá
 * thư không người nhận thì tệ hơn hẳn là không có nút nào.
 */
export default async function chay(kiem) {
  let p;
  try {
    p = await moTrang();

    for (const [khoKhung, co] of [['điện thoại', { width: 430, height: 932 }],
                                  ['máy bàn', { width: 1280, height: 900 }]]) {
      await p.setViewportSize(co);

      // ── Ba trang mở được, và có đầu đề thật ──────────────────────────
      for (const t of TRANG_TINH) {
        const tl = await p.goto(`${GOC}${t.duongDan}`, { waitUntil: 'networkidle' });
        kiem(`${khoKhung}: ${t.duongDan} mở được`, tl.status() === 200, `máy trả ${tl.status()}`);
        kiem(`${khoKhung}: ${t.duongDan} có đầu đề “${t.ten}”`,
          (await p.locator('h1').first().innerText()).trim() === t.ten);
      }

      // ── Chân trang có ở TRANG THƯỜNG, không chỉ ở ba trang này ───────
      await p.goto(`${GOC}/`, { waitUntil: 'networkidle' });
      const thieu = [];
      for (const t of TRANG_TINH) {
        if ((await p.locator(`footer a[href="${t.duongDan}"]`).count()) === 0) thieu.push(t.ten);
      }
      kiem(`${khoKhung}: chân trang ở trang chủ có đủ ${TRANG_TINH.length} lối đi`,
        thieu.length === 0, `thiếu: ${thieu.join(', ')}`);

      /*
       * KHÔNG BỊ CHE. Đây là chỗ dễ hỏng nhất của một chân trang mới thêm:
       * thanh tab nổi ở khổ nhỏ trôi trên nội dung, nên phải có chỗ chừa.
       */
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForTimeout(500);
      const che = await p.evaluate(() => {
        const f = document.querySelector('footer');
        if (!f) return 'không có chân trang';
        const fr = f.getBoundingClientRect();
        const de = [...document.querySelectorAll('*')].filter((e) => {
          if (getComputedStyle(e).position !== 'fixed') return false;
          const r = e.getBoundingClientRect();
          // Giao cả CHIỀU NGANG lẫn chiều dọc mới là che thật. Xét mỗi chiều
          // dọc thì thanh bên máy bàn cũng bị tính là che, mà nó nằm hẳn sang
          // một cột khác.
          return r.width > 100 && r.left < fr.right && r.right > fr.left
            && r.top < fr.bottom && r.bottom > fr.top;
        });
        return de.length ? de.map((e) => e.tagName).join(', ') : null;
      });
      kiem(`${khoKhung}: cuộn tới đáy thì chân trang không bị che`, che === null, String(che));
    }

    // ── Chưa đặt địa chỉ thư thì đừng bày liên kết rỗng ────────────────
    const cai = await db.caiDat.findUnique({ where: { khoa: 'trang' } });
    const email = (cai?.giaTri ?? {}).emailLienHe ?? '';
    await p.goto(`${GOC}/lien-he`, { waitUntil: 'networkidle' });
    const soMail = await p.locator('a[href^="mailto:"]').count();
    kiem('trang Liên hệ chỉ bày liên kết thư khi thật sự có địa chỉ',
      email ? soMail >= 1 : soMail === 0,
      `cài đặt: "${email}", trang có ${soMail} liên kết thư`);
  } finally {
    if (p) await p.close();
  }
}
