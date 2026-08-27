/**
 * Dò cột trong schema mà mã nguồn không hề đụng tới.
 *
 * Cột kiểu đó thường là tính năng làm dở: bảng đã có chỗ chứa, giao diện thì
 * chưa bao giờ đọc hay ghi. Cũng bắt được cột đã chết sau một lần đổi hướng.
 *
 * Chạy: node scripts/scan-unused-fields.mjs
 * Kết quả chỉ là gợi ý để người đọc lại — có cột chính đáng không ai đọc
 * (khoá ngoại, cột Prisma tự quản), nên script không trả mã lỗi.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/** Cột không cần ai đọc thẳng vẫn hợp lệ. */
const IGNORE = new Set([
  'id', 'createdAt', 'updatedAt', 'user', 'author', 'post', 'thread', 'forum',
  'category', 'tag', 'parent', 'children', 'sender', 'conversation', 'game',
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walk(full, out);
    } else if (/\.(ts|tsx|mjs)$/.test(e.name)) out.push(full);
  }
  return out;
}

const code = walk(path.join(ROOT, 'src'))
  .concat(fs.existsSync(path.join(ROOT, 'prisma', 'seed.ts')) ? [path.join(ROOT, 'prisma', 'seed.ts')] : [])
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');

const schema = fs.readFileSync(path.join(ROOT, 'prisma', 'schema.prisma'), 'utf8');

const findings = [];
let model = null;
for (const raw of schema.split('\n')) {
  const line = raw.trim();
  const start = line.match(/^model\s+(\w+)\s*\{/);
  if (start) { model = start[1]; continue; }
  if (line === '}') { model = null; continue; }
  if (!model || !line || line.startsWith('//') || line.startsWith('@@') || line.startsWith('/')) continue;

  const m = line.match(/^(\w+)\s+(\S+)/);
  if (!m) continue;
  const [, field, type] = m;
  if (IGNORE.has(field)) continue;
  // Bỏ qua quan hệ (kiểu viết hoa, không phải kiểu vô hướng) và mảng quan hệ
  if (/^[A-Z]/.test(type.replace(/[[\]?]/g, '')) && !/^(String|Int|Boolean|DateTime|Float|Json|BigInt|Decimal|Bytes)$/.test(type.replace(/[[\]?]/g, ''))) continue;

  // Tên cột xuất hiện ở đâu đó trong mã (dưới dạng khoá đối tượng hay thuộc tính)
  const used = new RegExp(`[.\\s{,'"\`]${field}\\s*[:.,}\\s)'"\`]`).test(code);
  if (!used) findings.push({ model, field, type });
}

if (findings.length === 0) {
  console.log('✓ Mọi cột vô hướng trong schema đều được mã nguồn đụng tới.');
} else {
  console.log(`Có ${findings.length} cột không thấy mã nguồn nào đụng tới:\n`);
  let last = '';
  for (const f of findings) {
    if (f.model !== last) { console.log(`  ${f.model}`); last = f.model; }
    console.log(`    · ${f.field} : ${f.type}`);
  }
  console.log('\nĐọc lại từng cái: tính năng làm dở, hay cột đã chết?');
}
