import fs from 'node:fs';
import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Bộ icon pixel của forum wap ngày trước.
 *
 * Mục kiểm chính là ẢNH VỠ. Icon nằm trong `public/` nên TypeScript không hề
 * kiểm hộ: gõ sai tên tệp hay sai đuôi (.gif/.png) thì vẫn biên dịch trơn tru,
 * chỉ ra tới trình duyệt mới thành ô vuông rách. Bộ icon gốc trộn hai đuôi
 * chẳng theo quy luật nào nên đây là lỗi rất dễ mắc.
 */
export default async function run(check) {
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL' }, select: { slug: true } });
  const game = await db.game.findFirst({ where: { status: 'PUBLISHED' }, select: { slug: true } });
  if (!forum) { check('có dữ liệu mẫu', false, 'thiếu diễn đàn'); return; }

  const p = await openPage('huytran');

  /** Mọi ảnh /retro trên trang đều tải được (naturalWidth > 0 nghĩa là đã vẽ). */
  const soiAnh = async () => p.evaluate(() =>
    [...document.querySelectorAll('img[src^="/retro/"]')].map((i) => ({
      src: i.getAttribute('src'),
      ok: i.complete && i.naturalWidth > 0,
    })));

  // ── Thanh công cụ BBCode ──────────────────────────────────────────────
  await p.goto(`${BASE}/forum/${forum.slug}/new`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const bb = await soiAnh();
  check('thanh soạn thảo dùng bộ icon hoài cổ', bb.length >= 10, `đếm được ${bb.length}`);
  const vo = bb.filter((x) => !x.ok).map((x) => x.src);
  check('không icon nào vỡ ở thanh soạn thảo', vo.length === 0, vo.join(', '));

  // ── Sao đánh giá game ─────────────────────────────────────────────────
  if (game) {
    await p.goto(`${BASE}/games/${game.slug}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    const sao = await soiAnh();
    const daiSao = sao.filter((x) => x.src.includes('/retro/rating/'));
    check('game có dải sao hoài cổ', daiSao.length > 0);
    check('dải sao không vỡ', daiSao.every((x) => x.ok), daiSao.filter((x) => !x.ok).map((x) => x.src).join(', '));
  }

  // ── Trang đang online ─────────────────────────────────────────────────
  await db.user.updateMany({
    where: { username: { in: ['minhdev', 'huytran'] } }, data: { lastSeenAt: new Date() },
  });
  await p.goto(`${BASE}/online`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const on = await soiAnh();
  check('trang online có huy hiệu ON', on.some((x) => x.src.includes('/retro/online')));
  check('huy hiệu ON không vỡ', on.every((x) => x.ok), on.filter((x) => !x.ok).map((x) => x.src).join(', '));

  // ── Mọi tên icon khai trong mã đều có tệp thật ────────────────────────
  // Đọc thẳng danh sách trong RetroIcon: đây là chỗ duy nhất biết icon nào là
  // .png, nên sai ở đây là ảnh vỡ ở mọi nơi dùng icon ấy.
  const nguon = fs.readFileSync('src/components/RetroIcon.tsx', 'utf8');
  const khoi = nguon.slice(nguon.indexOf('RETRO_PNG = new Set(['));
  const dsPng = [...khoi.slice(0, khoi.indexOf(']')).matchAll(/'([^']+)'/g)].map((m) => m[1]);
  check('đọc được danh sách icon .png trong mã', dsPng.length > 20, `đếm được ${dsPng.length}`);
  const saiDuoi = dsPng.filter((n) => !fs.existsSync(`public/retro/${n}.png`));
  check('mọi icon khai là .png đều có tệp .png thật', saiDuoi.length === 0, saiDuoi.join(', '));

  // Chiều ngược lại: tệp .png nào không có trong danh sách thì RetroIcon sẽ
  // đoán nhầm sang .gif — cũng là ảnh vỡ, chỉ khác hướng.
  const moiPng = [];
  const quet = (thuMuc, tien = '') => {
    for (const e of fs.readdirSync(thuMuc, { withFileTypes: true })) {
      if (e.isDirectory()) quet(`${thuMuc}/${e.name}`, tien ? `${tien}/${e.name}` : e.name);
      else if (e.name.endsWith('.png')) moiPng.push(tien ? `${tien}/${e.name.slice(0, -4)}` : e.name.slice(0, -4));
    }
  };
  quet('public/retro');
  const sotPng = moiPng.filter((n) => !n.startsWith('rating/') && !dsPng.includes(n));
  check('mọi tệp .png đều có tên trong danh sách', sotPng.length === 0, sotPng.join(', '));
}
