import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

export const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
export const db = new PrismaClient();

/** Chromium cài sẵn trong môi trường; CI đặt PLAYWRIGHT_BROWSERS_PATH tương tự. */
function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';

  for (const name of fs.readdirSync(root)) {
    const p = `${root}/${name}/chrome-linux/chrome`;
    if (fs.existsSync(p)) return p;
  }
  return `${root}/chromium/chrome-linux/chrome`;
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
