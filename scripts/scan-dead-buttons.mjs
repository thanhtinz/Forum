/**
 * Dò nút/liên kết "chết" trong giao diện.
 *
 * Hai loại bắt được:
 *  1. <Link href="/..."> trỏ tới đường dẫn không có trang nào nhận
 *  2. <button> không nằm trong <form>, không có onClick / formAction / type=submit
 *     → bấm vào không xảy ra gì
 *
 * Chạy: node scripts/scan-dead-buttons.mjs
 * Không thay thế được việc bấm thử, nhưng chặn được kiểu quên nối hẳn backend.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP = path.join(ROOT, 'src', 'app');

/** Gom mọi đường dẫn mà Next sẽ phục vụ, từ cây thư mục src/app. */
function collectRoutes(dir, prefix = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) {
      if (/^(page|route)\.tsx?$/.test(e.name)) out.push(prefix || '/');
      continue;
    }
    // (nhóm) không tạo đoạn đường dẫn; @slot và _private bị bỏ qua
    if (e.name.startsWith('_') || e.name.startsWith('@')) continue;
    const seg = /^\(.*\)$/.test(e.name) ? '' : `/${e.name}`;
    out.push(...collectRoutes(path.join(dir, e.name), prefix + seg));
  }
  return out;
}

const routes = collectRoutes(APP);

/** Đường dẫn động [slug] khớp mọi giá trị, nên đổi sang biểu thức chính quy. */
const matchers = routes.map((r) => {
  if (r.includes('[')) {
    const re = r
      .replace(/\[\.\.\.[^\]]+\]/g, '.+')
      .replace(/\[[^\]]+\]/g, '[^/]+');
    return { route: r, re: new RegExp(`^${re}$`) };
  }
  return { route: r, re: new RegExp(`^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) };
});

function routeExists(p) {
  const clean = p.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  return matchers.some((m) => m.re.test(clean));
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (/\.tsx$/.test(e.name)) out.push(full);
  }
  return out;
}

const files = walk(path.join(ROOT, 'src'));
const deadLinks = [];
const deadButtons = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);

  // 1. href tĩnh trỏ vào nội bộ
  for (const m of src.matchAll(/href=(?:"([^"]+)"|\{`([^`${}]+)`\})/g)) {
    const href = m[1] ?? m[2];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    if (href.startsWith('/api/')) continue; // route handler, đã tính ở trên
    if (routeExists(href)) continue;
    deadLinks.push({ rel, href, line: src.slice(0, m.index).split('\n').length });
  }

  // 2. <button> trơ — không handler, không submit
  for (const m of src.matchAll(/<button\b([^>]*)>/g)) {
    const attrs = m[1];
    if (/onClick|formAction|type=["']submit|type=\{|disabled|onPointer|onMouseDown/.test(attrs)) continue;
    // Nút không ghi type mặc định là submit; chỉ coi là chết nếu tệp không có form nào
    if (!/<form|<ActionForm|action=\{/.test(src)) {
      deadButtons.push({ rel, line: src.slice(0, m.index).split('\n').length, attrs: attrs.trim().slice(0, 70) });
    }
  }
}

console.log(`Đã quét ${files.length} tệp giao diện, ${routes.length} đường dẫn.\n`);

if (deadLinks.length) {
  console.log(`✗ ${deadLinks.length} liên kết trỏ vào đường dẫn không tồn tại:`);
  for (const d of deadLinks) console.log(`   ${d.rel}:${d.line}  →  ${d.href}`);
} else console.log('✓ Không có liên kết nội bộ nào trỏ vào hư không.');

console.log('');
if (deadButtons.length) {
  console.log(`✗ ${deadButtons.length} nút không có gì phía sau:`);
  for (const d of deadButtons) console.log(`   ${d.rel}:${d.line}  <button ${d.attrs}>`);
} else console.log('✓ Mọi <button> đều có handler hoặc nằm trong biểu mẫu.');

process.exit(deadLinks.length + deadButtons.length > 0 ? 1 : 0);
