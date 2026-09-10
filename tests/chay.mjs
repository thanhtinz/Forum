import fs from 'node:fs';
import path from 'node:path';
import { dongTrinhDuyet } from './tro-giup.mjs';

/*
 * Bộ chạy bài kiểm.
 *
 * Mỗi bài là một tệp trong `tests/bai/`, xuất một hàm nhận `kiem(tên, đúng?,
 * chú thích?)`. Bài nào ném lỗi thì ghi lại rồi CHẠY TIẾP bài sau — dừng ở bài
 * đầu tiên hỏng thì mỗi lần sửa chỉ thấy được một lỗi, mà mấy lỗi thường đi
 * theo cụm.
 */
const THU_MUC = path.join(import.meta.dirname, 'bai');
const loc = process.argv[2];

let dat = 0;
const hong = [];

function kiem(ten, dung, chuThich = '') {
  if (dung) {
    dat++;
    console.log(`  ✓ ${ten}`);
  } else {
    hong.push(chuThich ? `${ten} — ${chuThich}` : ten);
    console.log(`  ✗ ${ten}${chuThich ? ` — ${chuThich}` : ''}`);
  }
}

const tep = fs.readdirSync(THU_MUC).filter((t) => t.endsWith('.mjs')).sort()
  .filter((t) => !loc || t.includes(loc));

for (const t of tep) {
  console.log(`\n▸ ${t.replace('.mjs', '')}`);
  const bai = await import(path.join(THU_MUC, t));
  try {
    await bai.default(kiem);
  } catch (e) {
    hong.push(`${t} ném lỗi: ${e.message}`);
    console.log(`  ✗ bài ném lỗi: ${e.message}`);
  }
}

await dongTrinhDuyet();

console.log(`\n${'─'.repeat(52)}`);
if (hong.length === 0) {
  console.log(`Đạt hết: ${dat} mục kiểm.`);
} else {
  console.log(`Đạt ${dat}, HỎNG ${hong.length}:`);
  for (const h of hong) console.log(`  • ${h}`);
  process.exitCode = 1;
}
