import zlib from 'node:zlib';
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

/*
 * LUÔN GHIM THỨ TỰ KHI CHỌN DỮ LIỆU MẪU.
 *
 * `findFirst` không kèm `orderBy` thì Postgres trả về hàng nào là tuỳ nó, và
 * thứ tự vật lý ấy ĐỔI mỗi khi có hàng được thêm hay xoá — mà mấy bài kiểm ở
 * đây dựng rồi xoá game suốt. Hậu quả: một bài xanh cả tháng bỗng đỏ sau khi
 * thêm một bài kiểm mới chẳng liên quan gì, và người đọc kết quả đi tìm lỗi ở
 * đúng chỗ không có lỗi.
 *
 * Đã dính hai lần: bài 13 chọn nhầm game cùng hãng, bài 02 chọn nhằm game
 * không có game cùng thể loại. Nên mọi lượt chọn dữ liệu mẫu trong `tests/bai`
 * đều phải kèm `orderBy` — trừ lượt tra theo khoá duy nhất như `tenDangNhap`.
 */

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

/**
 * Dựng một tệp PNG THẬT, đúng cỡ yêu cầu.
 *
 * Cửa hàng nay đo kích thước ảnh trước khi nhận (xem `luat-anh-const.ts`), nên
 * mấy bài kiểm không dùng lại được tấm PNG 1×1 chép cứng như trước. Dựng ra ở
 * đây thay vì để sẵn mấy tệp mẫu trên đĩa: bài kiểm cần cỡ nào thì gọi đúng cỡ
 * ấy, và không ai phải đoán tệp `mau-400.png` trong thư mục là tệp của bài nào.
 *
 * Ảnh đen một màu, ít màu nhất có thể — ruột nó không phải thứ đang kiểm.
 */
export function taoAnhPNG(rong, cao) {
  const khoi = (ten, than) => {
    const dai = Buffer.alloc(4);
    dai.writeUInt32BE(than.length);
    const ruot = Buffer.concat([Buffer.from(ten, 'ascii'), than]);
    const ma = Buffer.alloc(4);
    ma.writeUInt32BE(zlib.crc32(ruot));
    return Buffer.concat([dai, ruot, ma]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(rong, 0);
  ihdr.writeUInt32BE(cao, 4);
  ihdr[8] = 8; // tám bit một kênh
  ihdr[9] = 0; // ảnh xám, không kênh trong suốt

  // Mỗi dòng ảnh mở đầu bằng một byte nói dòng ấy lọc kiểu gì — để 0 là không lọc.
  const tho = Buffer.alloc((rong + 1) * cao);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    khoi('IHDR', ihdr),
    khoi('IDAT', zlib.deflateSync(tho)),
    khoi('IEND', Buffer.alloc(0)),
  ]);
}
