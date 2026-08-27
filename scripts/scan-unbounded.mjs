#!/usr/bin/env node
/**
 * Tìm những chỗ đọc danh sách mà không đặt trần.
 *
 * `findMany` không có `take` là quả bom hẹn giờ: lúc mới chạy bảng có mươi
 * hàng nên trang nào cũng nhanh, đến khi bảng có trăm nghìn hàng thì đúng
 * trang đó gục — mà không ai sửa gì cả, chỉ là dữ liệu nhiều lên.
 *
 * Coi là ổn khi:
 *   • có `take` (kể cả viết tắt `take,`) — đã có trần;
 *   • lọc bằng `in:` theo một danh sách đã lấy có trần từ trước — số hàng trả
 *     về không thể vượt quá độ dài danh sách đó;
 *   • nằm trong danh sách miễn trừ bên dưới, kèm lý do.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..', 'src');

/**
 * Miễn trừ, kèm lý do. Chỉ nhận những chỗ mà số hàng bị chặn bởi thứ khác
 * chứ không phải "chắc là ít thôi".
 */
const MIEN_TRU = [
  { file: 'src/lib/backup.ts', ly_do: 'công cụ sao lưu — cố tình lấy hết bảng' },
];

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name)) files.push(p);
  }
})(ROOT);

const loi = [];
for (const f of files) {
  const rel = path.relative(path.join(import.meta.dirname, '..'), f);
  if (MIEN_TRU.some((m) => m.file === rel)) continue;

  const src = fs.readFileSync(f, 'utf8');
  let i = 0;
  while ((i = src.indexOf('.findMany(', i)) !== -1) {
    // Cắt đúng khối đối số bằng cách đếm ngoặc, vì đối số có cả object lồng nhau.
    let j = i + '.findMany('.length;
    let depth = 1;
    while (j < src.length && depth > 0) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')') depth--;
      j++;
    }
    const args = src.slice(i + '.findMany('.length, j - 1);
    const line = src.slice(0, i).split('\n').length;
    const model = (src.slice(Math.max(0, i - 60), i).match(/(?:db|tx|client)\.(\w+)\s*$/) ?? [])[1] ?? '?';

    const coTake = /\btake\b/.test(args);
    const chanBoiIn = /\bin:\s/.test(args);
    if (!coTake && !chanBoiIn) loi.push({ rel, line, model });
    i = j;
  }
}

if (loi.length === 0) {
  console.log('\n✓ Mọi truy vấn danh sách đều có trần.');
  process.exit(0);
}

console.log('\nDanh sách đọc không đặt trần:\n');
for (const l of loi) console.log(`  ${l.rel}:${l.line}  db.${l.model}.findMany  — thiếu take`);
console.log(`\n${loi.length} chỗ. Thêm \`take\`, hoặc phân trang, hoặc ghi vào MIEN_TRU kèm lý do.`);
process.exit(1);
