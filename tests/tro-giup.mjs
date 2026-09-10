import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { chromium } from 'playwright-core';

export const GOC = process.env.GOC ?? 'http://localhost:3000';
export const db = new PrismaClient();

/**
 * Chromium cài sẵn trong môi trường.
 *
 * Tên thư mục khác nhau tuỳ bản Playwright: bản dựng riêng để trong
 * `chrome-linux`, bản Chrome for Testing để trong `chrome-linux64`. Dò cả hai,
 * vì đoán một kiểu thì máy nào dùng kiểu kia sẽ vỡ ở tận lúc mở trình duyệt
 * với một câu lỗi chẳng liên quan gì.
 */
function timChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const goc = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  for (const ten of fs.readdirSync(goc)) {
    if (!ten.startsWith('chromium-')) continue;
    for (const thuMuc of ['chrome-linux', 'chrome-linux64']) {
      const p = `${goc}/${ten}/${thuMuc}/chrome`;
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error(`Không tìm thấy Chromium trong ${goc}`);
}

let may = null;

export async function moTrinhDuyet() {
  if (!may) may = await chromium.launch({ executablePath: timChrome() });
  return may;
}

export async function dongTrinhDuyet() {
  if (may) await may.close();
  may = null;
  await db.$disconnect();
}

/** Mở một trang KHÁCH — chưa đăng nhập. */
export async function moTrang() {
  const ctx = await (await moTrinhDuyet()).newContext({ viewport: { width: 1280, height: 900 } });
  return ctx.newPage();
}

/**
 * Mở một trang ĐÃ ĐĂNG NHẬP.
 *
 * Đăng nhập qua biểu mẫu thật chứ không cấy cookie: chính đường đăng nhập ấy
 * cũng là thứ cần kiểm, mà cấy cookie thì nó không bao giờ được chạy.
 */
export async function moTrangDaDangNhap(dinhDanh, matKhau) {
  const p = await moTrang();
  await p.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle' });
  await p.fill('input[name="dinhDanh"]', dinhDanh);
  await p.fill('input[name="matKhau"]', matKhau);
  await p.click('button[type="submit"]');
  await p.waitForURL((u) => !u.pathname.startsWith('/dang-nhap'), { timeout: 15_000 });
  return p;
}

/**
 * Chờ tới khi một điều kiện thành đúng.
 *
 * Server action chạy xong rồi Next mới dựng lại trang, nên `waitForTimeout` cố
 * định lúc nào cũng hoặc chờ thừa hoặc chờ thiếu. Hỏi lại điều kiện theo nhịp
 * ngắn thì bài kiểm vừa nhanh vừa không đỏ oan lúc máy chậm.
 */
export async function doiToi(dieuKien, hanGiay = 15) {
  const het = Date.now() + hanGiay * 1000;
  while (Date.now() < het) {
    if (await dieuKien()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}
