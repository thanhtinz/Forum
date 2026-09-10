import fs from 'node:fs';
import { chromium } from 'playwright-core';

/**
 * Chụp màn hình mấy trang chính để tự soi bằng mắt.
 *
 * Chụp ở HAI khổ: điện thoại 390px và máy bàn 1280px. Trang này có hai bộ
 * điều hướng khác hẳn nhau ở hai khổ ấy (thanh tab đáy và thanh bên), nên chỉ
 * chụp một khổ là bỏ sót đúng một nửa giao diện.
 */
function timChrome() {
  const goc = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  for (const ten of fs.readdirSync(goc)) {
    if (!ten.startsWith('chromium-')) continue;
    for (const thuMuc of ['chrome-linux', 'chrome-linux64']) {
      const p = `${goc}/${ten}/${thuMuc}/chrome`;
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error('Không tìm thấy Chromium');
}

const GOC = process.env.GOC ?? 'http://localhost:3000';
const TRANG = process.argv.slice(2);
if (TRANG.length === 0) TRANG.push('/');

const may = await chromium.launch({ executablePath: timChrome() });
fs.mkdirSync('anh-chup', { recursive: true });

for (const [ten, rong, cao] of [['dt', 390, 844], ['ban', 1280, 900]]) {
  const ctx = await may.newContext({ viewport: { width: rong, height: cao }, deviceScaleFactor: 2 });
  // Đăng nhập sẵn để chụp được cả những trang cần tài khoản.
  const p = await ctx.newPage();
  await p.goto(`${GOC}/dang-nhap`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  if (await p.locator('input[name="dinhDanh"]').count()) {
    await p.fill('input[name="dinhDanh"]', 'admin@nova.local');
    await p.fill('input[name="matKhau"]', 'admin123');
    await p.click('button[type="submit"]');
    await p.waitForTimeout(2200);
  }
  for (const duong of TRANG) {
    await p.goto(GOC + duong, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    const nhan = duong === '/' ? 'trang-chu' : duong.replace(/^\//, '').replace(/[/?=&]/g, '-');
    await p.screenshot({ path: `anh-chup/${nhan}--${ten}.png`, fullPage: true });
    console.log(`${nhan}--${ten}.png`);
  }
  await ctx.close();
}
await may.close();
