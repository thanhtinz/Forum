import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Bảng thả xuống phải hiện ra trọn vẹn, không bị khối cha cắt mất.
 *
 * Vì sao cần kiểm riêng: hầu hết khối `.card` của trang có `overflow-hidden`,
 * nên bảng định vị bằng `absolute` bên trong sẽ bị cắt ở mép khối. Người dùng
 * bấm nút, bảng có mở nhưng gần như không nhìn thấy gì — đúng cảm giác "nút
 * hỏng". Đã từng dính ở menu Điều hành (mất 196/199px) và bảng emoji của
 * phòng chat (mất 172/322px).
 *
 * Bấm thử KHÔNG bắt được lỗi này: phần tử bị cắt vẫn còn khung bao, nên trình
 * điều khiển trình duyệt bấm trúng như thường dù mắt người không thấy. Phải đo
 * hình học mới ra.
 */

/** Đo phần bị tổ tiên cắt mất, tính bằng pixel (0 là trọn vẹn). */
const MEASURE = `((sel) => {
  const el = document.querySelector(sel)
    || [...document.body.children].find((e) => e.tagName === 'DIV'
        && getComputedStyle(e).position === 'fixed' && e.offsetWidth > 100 && e.offsetHeight > 60);
  if (!el) return null;
  const m = el.getBoundingClientRect();
  let n = el.parentElement, lost = 0;
  while (n && n !== document.documentElement) {
    const cs = getComputedStyle(n);
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
      const c = n.getBoundingClientRect();
      const vh = Math.max(0, Math.min(m.bottom, c.bottom) - Math.max(m.top, c.top));
      const vw = Math.max(0, Math.min(m.right, c.right) - Math.max(m.left, c.left));
      lost = Math.round(m.height - vh) + Math.round(m.width - vw);
      break;
    }
    n = n.parentElement;
  }
  const offScreen = Math.round(Math.max(0, m.bottom - window.innerHeight) + Math.max(0, -m.top)
    + Math.max(0, m.right - window.innerWidth) + Math.max(0, -m.left));
  return { w: Math.round(m.width), h: Math.round(m.height), lost, offScreen };
})`;

export default async function run(check) {
  // Phải là chủ đề chưa khoá, khoá rồi thì không có ô trả lời để mà mở bảng emoji.
  const thread = await db.thread.findFirst({
    where: { status: 'PUBLISHED', locked: false },
    select: { id: true, forum: { select: { slug: true } } },
  });
  const threadUrl = `${BASE}/forum/${thread.forum.slug}/${thread.id}`;

  const open = async (page, url, openSel, panelSel) => {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const btn = page.locator(openSel).first();
    if (!(await btn.count())) return null;
    await btn.click();
    await page.waitForTimeout(600);
    return page.evaluate(`${MEASURE}(${JSON.stringify(panelSel)})`);
  };

  const admin = await openPage('admin@nova.local', 'admin123');
  const member = await openPage('minhdev');

  const mod = await open(admin, threadUrl, 'button:has-text("Điều hành")', '[role="menu"]');
  check('menu Điều hành mở ra', !!mod && mod.h > 60);
  check('menu Điều hành không bị khối cha cắt', !!mod && mod.lost <= 2, mod && `mất ${mod.lost}px`);
  check('menu Điều hành nằm trọn trong màn hình', !!mod && mod.offScreen <= 2, mod && `lọt ra ngoài ${mod.offScreen}px`);

  // Bảng emoji mở ở cả ba ô soạn — mỗi ô nằm trong một khối cha khác nhau
  // nên phải đo riêng từng chỗ.
  const post = await db.post.findFirst({ where: { status: 'PUBLISHED', access: 'FREE' }, select: { slug: true } });
  const game = await db.game.findFirst({ where: { status: 'PUBLISHED' }, select: { slug: true } });
  for (const [ten, page, url] of [
    ['phòng chat', member, BASE],
    ['ô trả lời chủ đề', member, threadUrl],
    ...(post ? [['ô bình luận bài viết', member, `${BASE}/posts/${post.slug}/binh-luan`]] : []),
    ...(game ? [['ô bình luận game', member, `${BASE}/games/${game.slug}`]] : []),
  ]) {
    const box = await open(page, url, 'button[title="Emoji, sticker & GIF"]', '#khong-co-selector-rieng');
    check(`bảng emoji ở ${ten} mở ra`, !!box && box.h > 100);
    check(`bảng emoji ở ${ten} không bị khối cha cắt`, !!box && box.lost <= 2, box && `mất ${box.lost}px`);
    check(`bảng emoji ở ${ten} nằm trọn trong màn hình`, !!box && box.offScreen <= 2, box && `lọt ra ngoài ${box.offScreen}px`);
  }
}
