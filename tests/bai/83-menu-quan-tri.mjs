import { GOC, moTrangDaDangNhap } from '../tro-giup.mjs';
import { LOI_QUAN_TRI } from '../../src/lib/quan-tri-loi-di.ts';

const NUT = 'button[aria-controls="ngan-keo-quan-tri"]';

/**
 * MENU BA GẠCH CỦA KHU QUẢN TRỊ — một bản cho mọi khổ màn hình.
 *
 * Bản cũ nuôi hai bộ điều hướng rời nhau, và cái ở khổ nhỏ đã trôi đi mất tiêu
 * đề nhóm: mười ba mục nằm thành một dải cuộn ngang mà phần lớn khuất ngoài
 * mép phải. Nên mục canh nặng nhất ở đây là ĐỦ MƯỜI BA LỐI ĐI, ở cả hai khổ —
 * một lối đi không với tới được thì coi như trang ấy không tồn tại.
 *
 * Ba nước đóng đều phải chạy, vì mỗi nước phục vụ một kiểu người dùng: phím
 * Esc cho bàn phím, bấm ra ngoài cho chuột, và nút X cho ngón tay trên điện
 * thoại — nơi không có Esc, còn "bấm ra ngoài" là một luật ngầm.
 *
 * Và nước dễ quên nhất: bấm một mục thì ngăn kéo phải TỰ ĐÓNG. Next chuyển
 * trang tại chỗ, không tải lại tài liệu, nên không có gì tự dọn nó đi — nó
 * nằm che đúng cái trang vừa mở.
 */
export default async function chay(kiem) {
  const trang = await moTrangDaDangNhap('admin@sunnystore.local', 'admin123');
  try {
    for (const [khoKhung, co] of [['máy bàn', { width: 1280, height: 900 }],
                                  ['điện thoại', { width: 390, height: 844 }]]) {
      await trang.setViewportSize(co);
      await trang.goto(`${GOC}/quan-tri/thanh-vien`, { waitUntil: 'networkidle' });

      kiem(`${khoKhung}: có đúng một nút ba gạch`,
        (await trang.locator(NUT).count()) === 1);
      kiem(`${khoKhung}: chưa bấm thì ngăn kéo đóng`,
        (await trang.getAttribute(NUT, 'aria-expanded')) === 'false');

      await trang.click(NUT);
      await trang.waitForSelector('dialog[open]', { timeout: 5000 });
      kiem(`${khoKhung}: bấm thì ngăn kéo mở`,
        (await trang.getAttribute(NUT, 'aria-expanded')) === 'true');

      // Mục canh nặng nhất: KHÔNG lối đi nào bị rơi ra ngoài.
      const thieu = [];
      for (const l of LOI_QUAN_TRI) {
        if ((await trang.locator(`dialog[open] a[href="${l.duongDan}"]`).count()) === 0) {
          thieu.push(l.ten);
        }
      }
      kiem(`${khoKhung}: đủ ${LOI_QUAN_TRI.length} lối đi trong ngăn kéo`,
        thieu.length === 0, thieu.join(', '));

      kiem(`${khoKhung}: giữ tiêu đề nhóm để mục không thành một dãy phẳng`,
        (await trang.locator('dialog[open]').innerText()).includes('CỘNG ĐỒNG'));

      // ── Ba nước đóng ────────────────────────────────────────────────
      await trang.keyboard.press('Escape');
      await trang.waitForTimeout(400);
      kiem(`${khoKhung}: phím Esc đóng được`,
        (await trang.getAttribute(NUT, 'aria-expanded')) === 'false');

      await trang.click(NUT);
      await trang.waitForSelector('dialog[open]', { timeout: 5000 });
      await trang.locator('dialog[open] button:has-text("Đóng menu")').click();
      await trang.waitForTimeout(400);
      kiem(`${khoKhung}: nút X đóng được`,
        (await trang.getAttribute(NUT, 'aria-expanded')) === 'false');

      /*
       * Bấm ra ngoài: nhắm vào góc trên BÊN PHẢI màn hình — ngăn kéo dán mép
       * trái nên chỗ ấy chắc chắn là lớp phủ, không phải ruột ngăn kéo.
       */
      await trang.click(NUT);
      await trang.waitForSelector('dialog[open]', { timeout: 5000 });
      await trang.mouse.click(co.width - 12, 12);
      await trang.waitForTimeout(400);
      kiem(`${khoKhung}: bấm ra ngoài đóng được`,
        (await trang.getAttribute(NUT, 'aria-expanded')) === 'false');

      // ── Bấm một mục: vừa đi, vừa tự đóng ────────────────────────────
      await trang.click(NUT);
      await trang.waitForSelector('dialog[open]', { timeout: 5000 });
      await trang.click('dialog[open] a[href="/quan-tri/duyet"]');
      await trang.waitForURL('**/quan-tri/duyet', { timeout: 8000 }).catch(() => {});
      await trang.waitForTimeout(600);
      kiem(`${khoKhung}: bấm một mục thì sang đúng trang ấy`,
        new URL(trang.url()).pathname === '/quan-tri/duyet', trang.url());
      kiem(`${khoKhung}: và ngăn kéo tự đóng, không nằm che trang vừa mở`,
        (await trang.getAttribute(NUT, 'aria-expanded')) === 'false');

      kiem(`${khoKhung}: trang quản trị không tràn ngang`,
        !(await trang.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
    }
  } finally {
    await trang.close();
  }
}
