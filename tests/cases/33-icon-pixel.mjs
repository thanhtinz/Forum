import fs from 'node:fs';
import { BASE, db, openPage } from '../helpers.mjs';

/**
 * Bộ icon pixel lấy từ Iconify, dựng bằng CSS (mask), không dùng tệp ảnh.
 *
 * Cách này sinh ra đúng MỘT kiểu hỏng, và nó lặng lẽ đến mức đáng sợ:
 * Tailwind tìm lớp bằng cách quét văn bản mã nguồn, nên nếu ai đó ghép chuỗi
 * tên icon (`icon-[pixelarticons--${ten}]`) thì lớp không được sinh ra, icon
 * biến mất mà chẳng có lỗi nào — chỉ còn một khoảng trắng nhỏ chẳng ai để ý.
 *
 * Nên mục kiểm ở đây đo trên trình duyệt thật: mỗi ô icon phải có `mask-image`
 * thật sự, và phải ăn màu theo chữ xung quanh.
 */
export default async function run(check) {
  const forum = await db.forum.findFirst({ where: { postAccess: 'ALL', requiredMedalId: null }, select: { slug: true } });
  const game = await db.game.findFirst({ where: { status: 'PUBLISHED' }, select: { slug: true } });
  if (!forum) { check('có dữ liệu mẫu', false, 'thiếu diễn đàn'); return; }

  // ── Mọi tên lớp phải nằm nguyên vẹn trong mã ──────────────────────────
  const nguon = fs.readFileSync('src/components/PixelIcon.tsx', 'utf8');
  const lop = [...nguon.matchAll(/'(icon-\[[a-z0-9-]+--[a-z0-9-]+\])'/g)].map((m) => m[1]);
  check('bảng icon có đủ tên lớp', lop.length >= 20, `đếm được ${lop.length}`);
  // Bỏ chú thích trước khi soi: chính chú thích trong tệp có nêu ví dụ ghép
  // chuỗi để cảnh báo, soi cả chú thích là bắt nhầm lời cảnh báo ấy.
  const khongChuThich = nguon.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  check('không nơi nào ghép chuỗi tên icon',
    !/icon-\[[^\]]*\$\{/.test(khongChuThich), 'có chỗ dùng `${}` trong tên lớp');

  // Tên icon phải có thật trong bộ đã cài, không thì lớp sinh ra rỗng.
  const boIcon = {
    pixelarticons: JSON.parse(fs.readFileSync('node_modules/@iconify-json/pixelarticons/icons.json', 'utf8')).icons,
    pixel: JSON.parse(fs.readFileSync('node_modules/@iconify-json/pixel/icons.json', 'utf8')).icons,
  };
  const khongCo = lop.filter((l) => {
    const [, bo, ten] = /icon-\[([a-z0-9-]+)--([a-z0-9-]+)\]/.exec(l);
    return !boIcon[bo]?.[ten];
  });
  check('mọi icon khai trong mã đều có thật trong bộ', khongCo.length === 0, khongCo.join(', '));

  // ── Trên trình duyệt: icon phải thật sự vẽ ra ─────────────────────────
  const p = await openPage('huytran');

  const soi = async () => p.evaluate(() =>
    [...document.querySelectorAll('[class*="icon-["]')].map((e) => {
      const s = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      return {
        lop: [...e.classList].find((c) => c.startsWith('icon-')) ?? '?',
        coHinh: (s.maskImage || s.webkitMaskImage || '').includes('url('),
        mau: s.backgroundColor,
        rong: Math.round(r.width),
      };
    }));

  const noi = [
    ['thanh soạn thảo', `/forum/${forum.slug}/new`],
    ['trang chủ', '/'],
    ['trang cá nhân', '/u/minhdev'],
    ...(game ? [['trang game', `/games/${game.slug}`]] : []),
  ];

  for (const [ten, url] of noi) {
    await p.goto(BASE + url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    const ds = await soi();
    check(`${ten} có icon pixel`, ds.length > 0, `đếm được ${ds.length}`);
    const rong = ds.filter((x) => !x.coHinh);
    check(`${ten}: icon nào cũng vẽ ra hình`, rong.length === 0,
      rong.map((x) => x.lop).slice(0, 3).join(', '));
    check(`${ten}: icon nào cũng có bề rộng`, ds.every((x) => x.rong > 0),
      ds.filter((x) => x.rong === 0).map((x) => x.lop).slice(0, 2).join(', '));
  }

  // ── Ăn theo màu chữ — cái được lớn nhất so với dùng tệp ảnh ───────────
  // So thẳng với màu chữ của thẻ cha: đó chính là điều `currentColor` hứa.
  // So màu giữa nền sáng và nền tối thì không chắc, vì có màu trùng ở cả hai.
  await p.goto(`${BASE}/u/minhdev`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const theoChu = await p.evaluate(() =>
    [...document.querySelectorAll('[class*="icon-["]')].slice(0, 8).map((e) => ({
      lop: [...e.classList].find((c) => c.startsWith('icon-')) ?? '?',
      cua: getComputedStyle(e).backgroundColor,
      chuCha: getComputedStyle(e.parentElement).color,
    })));
  const lech = theoChu.filter((x) => x.cua !== x.chuCha);
  check('icon lấy đúng màu chữ của khối chứa nó', lech.length === 0,
    lech.map((x) => `${x.lop}: ${x.cua} ≠ ${x.chuCha}`).slice(0, 2).join(' | '));

  // ── Sao đánh giá: lớp đầy phải bị cắt đúng tỉ lệ ──────────────────────
  if (game) {
    await p.goto(`${BASE}/games/${game.slug}`, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const sao = await p.evaluate(() => {
      const khoi = document.querySelector('[role="img"][aria-label*="/5 sao"]');
      if (!khoi) return null;
      const day = khoi.querySelector('span[style*="width"]');
      return { nhan: khoi.getAttribute('aria-label'), be: day?.getAttribute('style') ?? '' };
    });
    check('có khối sao đánh giá', !!sao, JSON.stringify(sao));
    check('lớp sao đầy bị cắt theo tỉ lệ điểm', /width:\s*\d/.test(sao?.be ?? ''), sao?.be);
  }
}
