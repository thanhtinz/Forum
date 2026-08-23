import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

export const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
export const db = new PrismaClient();

/**
 * Chromium cài sẵn trong môi trường; CI đặt PLAYWRIGHT_BROWSERS_PATH tương tự.
 *
 * Tên thư mục khác nhau tuỳ bản Playwright tải về, nên phải dò cả hai kiểu:
 *
 *   bản dựng Playwright      <root>/chromium-1194/chrome-linux/chrome
 *   bản Chrome for Testing   <root>/chromium-1234/chrome-linux64/chrome
 *
 * Trước đây chỉ dò `chrome-linux` nên trên CI (nơi Playwright tải bản Chrome
 * for Testing vào `chrome-linux64`) không khớp cái nào, rồi trả về đường dẫn
 * mặc định không tồn tại và chỉ vỡ lúc launch với thông báo khó hiểu.
 */
function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!fs.existsSync(root)) {
    throw new Error(`Không thấy thư mục trình duyệt: ${root}. Chạy: npx playwright-core install chromium`);
  }

  // `chromium_headless_shell-*` cũng bắt đầu bằng "chromium" nhưng chứa
  // `chrome-headless-shell` chứ không phải `chrome`, nên tự khắc bị loại.
  const ungVien = [];
  for (const ten of fs.readdirSync(root)) {
    if (!ten.startsWith('chromium')) continue;
    for (const thuMuc of ['chrome-linux', 'chrome-linux64']) {
      const p = `${root}/${ten}/${thuMuc}/chrome`;
      if (fs.existsSync(p)) ungVien.push(p);
    }
  }
  // Nhiều bản cùng tồn tại thì lấy bản mới nhất theo số hiệu.
  ungVien.sort((a, b) => soHieu(b) - soHieu(a));
  if (ungVien[0]) return ungVien[0];

  throw new Error(
    `Không thấy chrome trong ${root} (đã dò chromium*/chrome-linux{,64}/chrome). ` +
      'Chạy: npx playwright-core install chromium',
  );
}

/** Số hiệu bản dựng lấy từ tên thư mục, vd `chromium-1234` -> 1234. */
function soHieu(duongDan) {
  return Number(duongDan.match(/chromium[-_](\d+)/)?.[1] ?? 0);
}

let browser;
export async function getBrowser() {
  browser ??= await chromium.launch({ executablePath: chromePath() });
  return browser;
}

export async function closeBrowser() {
  await browser?.close();
  browser = undefined;
}

/** Mở một tab; truyền user để đăng nhập sẵn, bỏ trống là khách. */
export async function openPage(user, password = 'member123') {
  const b = await getBrowser();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await ctx.newPage();
  if (user) {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[name="identifier"]', user);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
  }
  return page;
}
