#!/usr/bin/env node
/**
 * Chụp toàn bộ trang ở hai khổ màn hình: PC và điện thoại.
 *
 *   node scripts/chup-man-hinh.mjs            dựng lại rồi chụp
 *   CHUP_BO_DUNG=1 node scripts/...           dùng bản .next có sẵn
 *
 * Vì sao chạy trên bản dựng chứ không phải `next dev`: dev biên dịch từng
 * route lúc có người gõ vào, nên ảnh đầu tiên của mỗi trang luôn chụp trúng
 * lúc trang chưa ổn định. Cùng lý do với `scripts/kiem-tren-ban-dung.mjs`.
 *
 * Ảnh ra ở `.anh-chup/pc/*.png` và `.anh-chup/mobile/*.png`, kèm
 * `.anh-chup/manifest.json` ghi kích thước và trang nào hỏng.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { chromium } from 'playwright-core';

const CONG = Number(process.env.PORT_CHUP ?? 3200);
const GOC = `http://localhost:${CONG}`;
const RA = path.join(process.cwd(), '.anh-chup');

/** Chromium cài sẵn trong môi trường; dò cả hai kiểu tên thư mục. */
function duongDanChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const goc = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  const ungVien = [];
  for (const ten of fs.readdirSync(goc)) {
    if (!ten.startsWith('chromium')) continue;
    for (const tm of ['chrome-linux', 'chrome-linux64']) {
      const p = `${goc}/${ten}/${tm}/chrome`;
      if (fs.existsSync(p)) ungVien.push(p);
    }
  }
  ungVien.sort((a, b) => Number(b.match(/chromium[-_](\d+)/)?.[1] ?? 0) - Number(a.match(/chromium[-_](\d+)/)?.[1] ?? 0));
  if (!ungVien[0]) throw new Error(`Không thấy chrome trong ${goc}`);
  return ungVien[0];
}

function chay(lenh, dsoi) {
  return new Promise((xong) => spawn(lenh, dsoi, { stdio: 'inherit' }).on('exit', (m) => xong(m ?? 1)));
}

/**
 * Đợi máy chủ trả 200 ở trang chủ — không nhận "khác 5xx" là đủ.
 *
 * `next dev` dùng chung thư mục `.next` với bản dựng, nên nếu nó chạy song
 * song thì nó ghi đè lên bản vừa dựng và `next start` lên được nhưng mọi
 * trang đều 500 ("Cannot read properties of undefined (reading 'call')").
 * Trước đây điều kiện là `< 500` nên bộ chụp đi tiếp rồi chụp về 162 tấm ảnh
 * màn hình lỗi.
 */
async function doiMayChu(hanGiay = 90) {
  const het = Date.now() + hanGiay * 1000;
  let ma = 0;
  for (;;) {
    try {
      const r = await fetch(GOC, { cache: 'no-store' });
      ma = r.status;
      if (r.ok) return true;
    } catch { /* chưa lên */ }
    if (Date.now() > het) {
      if (ma >= 500) {
        console.error(
          `Máy chủ lên nhưng trang chủ trả ${ma}. Thường là do có \`next dev\` chạy song song:\n` +
          'nó ghi đè .next và làm hỏng bản dựng. Dẹp nó rồi dựng lại.',
        );
      }
      return false;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

/**
 * Giá trị thật cho các đoạn `[slug]`, `[id]` — lấy từ CSDL chứ không bịa,
 * vì trang tham số bịa chỉ chụp về được màn 404.
 */
async function layThamSo() {
  const db = new PrismaClient();
  const lay = async (f) => { try { return await f(); } catch { return null; } };
  const ts = {
    forum: (await lay(() => db.forum.findFirst({ select: { slug: true } })))?.slug,
    // Chỉ lấy chủ đề đã đăng: trang chủ đề trả 404 cho bản nháp, chụp về
    // đúng màn 404 chứ không phải giao diện chủ đề.
    thread: await lay(() => db.thread.findFirst({ where: { status: 'PUBLISHED' }, select: { id: true, forum: { select: { slug: true } } } })),
    game: (await lay(() => db.game.findFirst({ select: { slug: true, id: true } }))),
    club: (await lay(() => db.club.findFirst({ select: { slug: true } })))?.slug,
    boSuuTap: (await lay(() => db.gameCollection.findFirst({ select: { slug: true } })))?.slug,
    theLoaiQuiz: (await lay(() => db.quizCategory.findFirst({ select: { slug: true } })))?.slug,
    cauHoiQuiz: (await lay(() => db.quizQuestion.findFirst({ select: { id: true } })))?.id,
    the: (await lay(() => db.tag.findFirst({ select: { slug: true } })))?.slug,
    album: await lay(() => db.photoAlbum.findFirst({ select: { id: true, owner: { select: { username: true } } } })),
    // Hội thoại phải có chính người đang đăng nhập trong đó, nếu không trang
    // tin nhắn từ chối (404) — đúng như nó phải thế. Quản trị viên thường
    // không nằm trong hội thoại nào, nên hai trang này chụp bằng phiên của
    // một trong hai người trong cuộc.
    hoiThoai: await lay(() => db.conversation.findFirst({
      orderBy: { lastMessageAt: 'desc' },
      select: { id: true, userA: { select: { email: true } } },
    })),
    thanhVien: (await lay(() => db.user.findFirst({ where: { username: { not: 'admin' } }, select: { username: true } })))?.username,
  };
  await db.$disconnect();
  return ts;
}

/** Danh sách trang: [đường dẫn, tên tệp, 'khach' nếu phải xem bằng mắt khách]. */
function dungDanhSach(ts) {
  const ds = [
    ['/login', 'dang-nhap', 'khach'],
    ['/register', 'dang-ky', 'khach'],
    ['/', 'trang-chu'],
    ['/forum', 'forum'],
    ['/chua-doc', 'chua-doc'],
    ['/dang-chu-de', 'dang-chu-de'],
    ['/search', 'tim-kiem'],
    ['/thanh-vien', 'thanh-vien'],
    ['/online', 'online'],
    ['/ranking', 'bang-xep-hang'],
    ['/clb', 'clb'],
    ['/cua-hang', 'cua-hang'],
    ['/huong-dan/bbcode', 'huong-dan-bbcode'],
    ['/games', 'games'],
    ['/games/browse', 'games-browse'],
    ['/games/collections', 'games-collections'],
    ['/games/search', 'games-search'],
    ['/games/yeu-cau', 'games-yeu-cau'],
    ['/giai-tri', 'giai-tri'],
    ['/giai-tri/trac-nghiem', 'giai-tri-trac-nghiem'],
    ['/giai-tri/trac-nghiem/cua-toi', 'giai-tri-trac-nghiem-cua-toi'],
    ['/nong-trai', 'nong-trai'],
    ['/user/dashboard', 'user-dashboard'],
    ['/user/threads', 'user-threads'],
    ['/user/favorites', 'user-favorites'],
    ['/user/following', 'user-following'],
    ['/user/friends', 'user-friends'],
    ['/user/invite', 'user-invite'],
    ['/user/items', 'user-items'],
    ['/user/messages', 'user-messages'],
    ['/user/notifications', 'user-notifications'],
    ['/user/points', 'user-points'],
    ['/user/settings', 'user-settings'],
    ['/user/blocked', 'user-blocked'],
    ['/u/admin', 'ho-so'],
    ['/u/admin/album', 'ho-so-album'],
    ['/u/admin/uy-tin', 'ho-so-uy-tin'],
    ['/admin', 'admin'],
    ['/admin/backup', 'admin-backup'],
    ['/admin/chat-backgrounds', 'admin-chat-backgrounds'],
    ['/admin/chat-bubbles', 'admin-chat-bubbles'],
    ['/admin/clubs', 'admin-clubs'],
    ['/admin/forums', 'admin-forums'],
    ['/admin/games', 'admin-games'],
    ['/admin/games/new', 'admin-games-new'],
    ['/admin/games/danh-muc', 'admin-games-danh-muc'],
    ['/admin/gif', 'admin-gif'],
    ['/admin/levels', 'admin-levels'],
    ['/admin/links', 'admin-links'],
    ['/admin/logs', 'admin-logs'],
    ['/admin/medals', 'admin-medals'],
    ['/admin/moderators', 'admin-moderators'],
    ['/admin/nav', 'admin-nav'],
    ['/admin/quiz', 'admin-quiz'],
    ['/admin/quiz/the-loai', 'admin-quiz-the-loai'],
    ['/admin/reports', 'admin-reports'],
    ['/admin/settings', 'admin-settings'],
    ['/admin/shop', 'admin-shop'],
    ['/admin/slides', 'admin-slides'],
    ['/admin/stickers', 'admin-stickers'],
    ['/admin/storage', 'admin-storage'],
    ['/admin/threads', 'admin-threads'],
    ['/admin/users', 'admin-users'],
  ];
  // Trang có tham số — bỏ qua hẳn nếu CSDL chưa có dữ liệu tương ứng, thay vì
  // chụp về một màn 404 rồi để người xem tưởng trang hỏng.
  const co = (dk, ...mucs) => { if (dk) ds.push(...mucs); };
  co(ts.forum, [`/forum/${ts.forum}`, 'forum-chuyen-muc'], [`/forum/${ts.forum}/new`, 'forum-bai-moi']);
  co(ts.thread, [`/forum/${ts.thread?.forum.slug}/${ts.thread?.id}`, 'forum-chu-de'],
                [`/forum/${ts.thread?.forum.slug}/${ts.thread?.id}/edit`, 'forum-chu-de-sua']);
  co(ts.the, [`/tag/${ts.the}`, 'the']);
  co(ts.game?.slug, [`/games/${ts.game.slug}`, 'game']);
  co(ts.game?.id, [`/admin/games/${ts.game.id}`, 'admin-game-sua']);
  co(ts.boSuuTap, [`/games/collections/${ts.boSuuTap}`, 'games-bo-suu-tap']);
  co(ts.club, [`/clb/${ts.club}`, 'clb-chi-tiet']);
  co(ts.theLoaiQuiz, [`/giai-tri/trac-nghiem/the-loai/${ts.theLoaiQuiz}`, 'trac-nghiem-the-loai'],
                     [`/giai-tri/trac-nghiem/the-loai/${ts.theLoaiQuiz}/dang`, 'trac-nghiem-dang-cau']);
  co(ts.cauHoiQuiz, [`/giai-tri/trac-nghiem/cau-hoi/${ts.cauHoiQuiz}`, 'trac-nghiem-cau-hoi']);
  co(ts.hoiThoai, [`/user/messages/${ts.hoiThoai?.id}`, 'user-tin-nhan', 'thanhVien'],
                  [`/user/messages/${ts.hoiThoai?.id}/media`, 'user-tin-nhan-anh', 'thanhVien']);
  co(ts.album, [`/u/${ts.album?.owner.username}/album/${ts.album?.id}`, 'ho-so-album-chi-tiet']);
  co(ts.thanhVien, [`/u/${ts.thanhVien}`, 'ho-so-nguoi-khac']);
  return ds;
}

/**
 * Tìm phần tử thò ra ngoài mép phải — chạy TRONG trang.
 *
 * Thân trang cuộn ngang được là dấu hiệu chắc chắn của một chỗ hỏng bố cục,
 * và nó là thứ máy tìm được, khác với "trông xấu" thì phải mắt người nhìn.
 * Chỉ kể phần tử NHỎ NHẤT thò ra: cha của nó cũng rộng theo, kể cả họ hàng
 * thì mỗi lỗi hoá ra hai chục dòng.
 */
function doTranNgang() {
  const rong = document.documentElement.clientWidth;
  // Chính THÂN TRANG có cuộn ngang không. Không thì mọi thứ thò ra bên trong
  // đều nằm trong một khung cuộn cố ý (băng game, hàng thẻ lọc, bảng quản trị
  // đặt `min-w`) — đó là thiết kế, không phải lỗi.
  if (document.documentElement.scrollWidth - rong <= 1) return [];

  const trongKhungCuon = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
    }
    return false;
  };

  const thoRa = [];
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= rong + 1) continue;
    if (getComputedStyle(el).position === 'fixed') continue;
    if (trongKhungCuon(el)) continue;
    // Cha đã thò ra rồi thì con không kể lại nữa.
    if (thoRa.some((x) => x.el.contains(el))) continue;
    thoRa.push({ el, thua: Math.round(r.right - rong) });
  }
  return thoRa.slice(0, 6).map(({ el, thua }) => ({
    thua,
    the: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''),
    chu: (el.textContent ?? '').trim().slice(0, 40),
  }));
}

const KHO = {
  pc: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

/**
 * Đăng nhập, thử lại tối đa ba lượt.
 *
 * Ô nhập chỉ hoạt động sau khi React gắn xong; bấm sớm hơn thì cú bấm rơi vào
 * đường gửi mặc định của trình duyệt, trang quay lại /login và chờ mãi không
 * thấy chuyển. Máy bận (đang dựng, đang chạy bộ kiểm) là lúc hay trúng nhất.
 */
async function dangNhap(ctx, tenDangNhap = 'admin@nova.local', matKhau = 'admin123') {
  const page = await ctx.newPage();
  let loiCuoi;
  for (let lan = 1; lan <= 3; lan++) {
    try {
      await page.goto(`${GOC}/login`, { waitUntil: 'networkidle' });
      await page.fill('input[name="identifier"]', tenDangNhap);
      await page.fill('input[name="password"]', matKhau);
      await page.click('button[type="submit"]');
      await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
      await page.close();
      return;
    } catch (e) {
      loiCuoi = e;
      console.log(`  … đăng nhập ${tenDangNhap} hụt lượt ${lan}, thử lại`);
    }
  }
  throw loiCuoi;
}

async function main() {
  if (!process.env.CHUP_BO_DUNG) {
    const ma = await chay('npm', ['run', 'build']);
    if (ma !== 0) { console.error('Dựng hỏng — chưa chụp.'); process.exit(ma); }
  }

  // Cổng phải trống. `stdio: 'ignore'` nuốt luôn lỗi kẹt cổng, nên khi một lượt
  // chụp trước còn sót máy chủ thì lượt này lặng lẽ chụp bản dựng CŨ của lượt
  // đó — ảnh ra không khớp mã, mà chẳng có dấu hiệu gì.
  try {
    await fetch(GOC, { cache: 'no-store' });
    console.error(`Cổng ${CONG} đang có máy chủ khác. Dẹp nó rồi chạy lại:\n  pkill -f "next start"`);
    process.exit(1);
  } catch { /* trống, đúng như mong đợi */ }

  // `detached`: `npx next start` đẻ ra một tiến trình `next-server` riêng, và
  // giết mỗi thằng cha thì thằng con sống tiếp, ôm luôn cổng 3200 — lượt chụp
  // sau gặp cổng bận. Cho cả nhóm một mã rồi giết theo nhóm.
  const mayChu = spawn('npx', ['next', 'start'], {
    env: { ...process.env, PORT: String(CONG) }, stdio: 'ignore', detached: true,
  });
  const donDep = () => {
    if (mayChu.killed || mayChu.pid == null) return;
    try { process.kill(-mayChu.pid, 'SIGTERM'); } catch { mayChu.kill('SIGTERM'); }
  };
  process.on('exit', donDep);
  process.on('SIGINT', () => { donDep(); process.exit(130); });

  if (!(await doiMayChu())) { console.error(`Máy chủ không lên ở ${GOC}`); donDep(); process.exit(1); }

  const ts = await layThamSo();
  const ds = dungDanhSach(ts);
  fs.rmSync(RA, { recursive: true, force: true });
  for (const k of Object.keys(KHO)) fs.mkdirSync(path.join(RA, k), { recursive: true });

  const trinhDuyet = await chromium.launch({ executablePath: duongDanChrome() });
  const manifest = [];
  let hong = 0;

  for (const [kho, tuyChon] of Object.entries(KHO)) {
    const ctxNguoiDung = await trinhDuyet.newContext(tuyChon);
    await dangNhap(ctxNguoiDung);
    const ctxKhach = await trinhDuyet.newContext(tuyChon);
    let ctxThanhVien;
    if (ts.hoiThoai?.userA.email) {
      ctxThanhVien = await trinhDuyet.newContext(tuyChon);
      await dangNhap(ctxThanhVien, ts.hoiThoai.userA.email, 'member123');
    }

    for (const [duongDan, ten, vaiTro] of ds) {
      const ctx = vaiTro === 'khach' ? ctxKhach : vaiTro === 'thanhVien' ? (ctxThanhVien ?? ctxNguoiDung) : ctxNguoiDung;
      const page = await ctx.newPage();
      const tep = path.join(RA, kho, `${ten}.png`);
      const muc = { kho, duongDan, ten, tep: path.relative(process.cwd(), tep) };
      try {
        const res = await page.goto(GOC + duongDan, { waitUntil: 'domcontentloaded', timeout: 45000 });
        muc.ma = res?.status() ?? 0;
        // Chờ mạng lặng nhưng KHÔNG bắt buộc: trang có mối nối sống (thông
        // báo, chat) thì mạng chẳng bao giờ lặng, trước đây là hết giờ và
        // không có ảnh nào cả.
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        // Ảnh và phông nạp xong rồi mới chụp, nếu không nửa trang còn là ô trống.
        await page.evaluate(() => document.fonts?.ready).catch(() => {});
        await page.waitForTimeout(400);
        await page.screenshot({ path: tep, fullPage: true });
        muc.cao = await page.evaluate(() => document.documentElement.scrollHeight);
        const tran = await page.evaluate(doTranNgang);
        if (tran.length) muc.tranNgang = tran;
      } catch (e) {
        muc.loi = String(e).split('\n')[0];
        hong++;
        // Vẫn giữ lại ảnh chụp được ở trạng thái đó — hỏng cũng cần nhìn.
        await page.screenshot({ path: tep, fullPage: true }).catch(() => {});
      }
      await page.close();
      manifest.push(muc);
      console.log(`${muc.loi ? '✗' : '✓'} ${kho.padEnd(6)} ${duongDan}${muc.loi ? '  ' + muc.loi : ''}`);
    }
    await ctxNguoiDung.close();
    await ctxKhach.close();
    await ctxThanhVien?.close();
  }

  await trinhDuyet.close();
  fs.writeFileSync(path.join(RA, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const tran = manifest.filter((m) => m.tranNgang);
  console.log(`\n${manifest.length} ảnh · ${hong} lỗi · ${tran.length} trang tràn ngang · ${RA}`);
  for (const m of tran) {
    console.log(`  ⇥ ${m.kho} ${m.duongDan}`);
    for (const t of m.tranNgang) console.log(`      +${t.thua}px  ${t.the}  ${t.chu ? '“' + t.chu + '”' : ''}`);
  }
  donDep();
  process.exit(hong ? 1 : 0);
}

await main();
