// Sau khi `next build` (output: export), Next tạo file kiểu `cong-game.html`
// đồng thời có thư mục `cong-game/` (chứa route con). Khi NestJS serve-static
// nhận request `/cong-game`, nó thấy thư mục nhưng thiếu `index.html` -> fallback
// về `index.html` gốc (trang forum). Script này copy mỗi `X.html` thành
// `X/index.html` để reload deep link hoạt động đúng.
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { await walk(full); continue; }
    if (!e.name.endsWith('.html') || e.name === 'index.html' || e.name === '404.html') continue;
    const base = e.name.slice(0, -'.html'.length);
    const target = path.join(dir, base, 'index.html');
    try {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(full, target);
    } catch (err) {
      console.warn('fix-export skip', target, err.message);
    }
  }
}

try {
  await fs.access(outDir);
  await walk(outDir);
  console.log('fix-export: đã tạo index.html cho các route export.');
} catch {
  console.warn('fix-export: không thấy thư mục out/, bỏ qua.');
}
