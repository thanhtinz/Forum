/**
 * Bộ kiểm tự động — chạy được cả trên máy lẫn trong CI.
 *
 *   node tests/run.mjs              chạy tất cả
 *   node tests/run.mjs security     chỉ chạy tệp khớp tên
 *
 * Cần: máy chủ đã chạy ở BASE_URL (mặc định http://localhost:3000) và CSDL
 * đã có dữ liệu mẫu (`npm run seed`).
 *
 * Khác với script nháp: mỗi mục kiểm là một lời khẳng định, sai thì tiến
 * trình thoát với mã khác 0 để CI báo đỏ.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const only = process.argv[2] ?? '';
const dir = path.join(import.meta.dirname, 'cases');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mjs') && f.includes(only)).sort();

let passed = 0;
const failures = [];

/** Một lời khẳng định. Sai thì ghi lại chứ không dừng cả bộ. */
function check(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

for (const file of files) {
  console.log(`\n▸ ${file.replace('.mjs', '')}`);
  const mod = await import(pathToFileURL(path.join(dir, file)).href);
  try {
    await mod.default(check);
  } catch (e) {
    failures.push(`${file} ném lỗi: ${e.message}`);
    console.log(`  ✗ ném lỗi giữa chừng: ${e.message}`);
  }
}

console.log(`\n${'─'.repeat(50)}`);
if (failures.length === 0) {
  console.log(`Đạt hết: ${passed} mục kiểm.`);
  process.exit(0);
}
console.log(`Đạt ${passed}, HỎNG ${failures.length}:`);
failures.forEach((f) => console.log(`  • ${f}`));
process.exit(1);
