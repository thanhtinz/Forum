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

  // ── Bảng kích thước phải khớp tệp thật ────────────────────────────────
  // Bảng này sinh tự động, nhưng thêm icon mà quên chạy lại script là bảng
  // thiếu tên — mà thiếu tên thì TypeScript báo ngay, còn SAI kích thước thì
  // không ai báo: ảnh vẫn hiện, chỉ là méo và mờ. Nên phải đối chiếu ở đây.
  const bang = fs.readFileSync('src/lib/retro-icons.ts', 'utf8');
  const khai = [...bang.matchAll(/'([^']+)':\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+),\s*ext:\s*'(\w+)'/g)]
    .map((m) => ({ ten: m[1], w: +m[2], h: +m[3], ext: m[4] }));
  check('bảng kích thước có đủ icon', khai.length >= 100, `đếm được ${khai.length}`);

  const doGif = (d) => [d.readUInt16LE(6), d.readUInt16LE(8)];
  const doPng = (d) => [d.readUInt32BE(16), d.readUInt32BE(20)];
  const lech = [];
  for (const k of khai) {
    const tep = `public/retro/${k.ten}.${k.ext}`;
    if (!fs.existsSync(tep)) { lech.push(`${k.ten}: không có tệp`); continue; }
    const d = fs.readFileSync(tep);
    const [w, h] = k.ext === 'gif' ? doGif(d) : doPng(d);
    if (w !== k.w || h !== k.h) lech.push(`${k.ten}: bảng ghi ${k.w}x${k.h}, tệp thật ${w}x${h}`);
  }
  check('kích thước trong bảng khớp tệp thật', lech.length === 0, lech.slice(0, 3).join(' | '));

  // Có tệp nào chưa vào bảng không — vào rồi mới gọi được từ mã.
  const coTep = [];
  const quet = (thuMuc, tien = '') => {
    for (const e of fs.readdirSync(thuMuc, { withFileTypes: true })) {
      if (e.isDirectory()) quet(`${thuMuc}/${e.name}`, tien ? `${tien}/${e.name}` : e.name);
      else if (/\.(png|gif)$/.test(e.name)) {
        coTep.push(tien ? `${tien}/${e.name.replace(/\.\w+$/, '')}` : e.name.replace(/\.\w+$/, ''));
      }
    }
  };
  quet('public/retro');
  const sot = coTep.filter((n) => !khai.some((k) => k.ten === n));
  check('mọi tệp icon đều có trong bảng', sot.length === 0, sot.join(', '));

  // ── Vẽ đúng kích thước gốc thì mới nét ────────────────────────────────
  // Ảnh phải hiện ĐÚNG bằng kích thước gốc (hoặc bội số nguyên). Lệch một
  // pixel là co giãn lẻ, và co giãn lẻ thì `pixelated` cũng không cứu nổi.
  await p.goto(`${BASE}/forum/${forum.slug}/new`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  const doVe = await p.evaluate(() =>
    [...document.querySelectorAll('img[src^="/retro/"]')].map((i) => ({
      src: i.getAttribute('src'),
      goc: [i.naturalWidth, i.naturalHeight],
      ve: [Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)],
    })));
  const meo = doVe.filter((x) => {
    const tiLe = x.ve[0] / x.goc[0];
    return !Number.isInteger(tiLe) || tiLe < 1 || x.ve[1] / x.goc[1] !== tiLe;
  });
  check('icon vẽ đúng bội số nguyên của kích thước gốc', meo.length === 0,
    meo.map((x) => `${x.src} gốc ${x.goc.join('x')} vẽ ${x.ve.join('x')}`).slice(0, 3).join(' | '));
}
