#!/usr/bin/env node
/**
 * Dựng bảng kích thước gốc của bộ icon hoài cổ.
 *
 * Icon pixel chỉ nét khi mỗi điểm ảnh gốc rơi đúng vào một (hoặc N) điểm ảnh
 * màn hình. Ép chúng vào một ô vuông chung là co giãn lẻ — `pixelated` chặn
 * được làm mịn nhưng không cứu được việc điểm ảnh to nhỏ không đều, nhìn vẫn
 * mờ và răng cưa lệch.
 *
 * Nên thay vì đoán, ta đọc kích thước thật từ chính tệp ảnh và sinh ra bảng
 * tra. Bảng này cũng thay luôn danh sách .png chép tay trước đây — chép tay
 * thì sai đuôi là ảnh vỡ, mà TypeScript không kiểm hộ được gì.
 *
 * Chạy lại mỗi khi thêm/bớt icon:  node scripts/tao-bang-icon.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const GOC = path.join(import.meta.dirname, '..', 'public', 'retro');
const RA = path.join(import.meta.dirname, '..', 'src', 'lib', 'retro-icons.ts');

/** Đọc bề rộng/cao ngay từ phần đầu tệp — khỏi cần thư viện ảnh. */
function kichThuoc(tep) {
  const d = fs.readFileSync(tep);
  // GIF: "GIF87a"/"GIF89a" rồi hai số 16-bit little-endian.
  if (d.subarray(0, 3).toString('latin1') === 'GIF') {
    return { w: d.readUInt16LE(6), h: d.readUInt16LE(8) };
  }
  // PNG: khối IHDR luôn đứng đầu, rộng/cao là hai số 32-bit big-endian.
  if (d.subarray(1, 4).toString('latin1') === 'PNG') {
    return { w: d.readUInt32BE(16), h: d.readUInt32BE(20) };
  }
  throw new Error(`Không nhận ra định dạng: ${tep}`);
}

const icons = {};
(function quet(thuMuc, tien = '') {
  for (const e of fs.readdirSync(thuMuc, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(thuMuc, e.name);
    const ten = tien ? `${tien}/${e.name}` : e.name;
    if (e.isDirectory()) { quet(full, ten); continue; }
    const m = /^(.*)\.(png|gif)$/i.exec(e.name);
    if (!m) continue;
    const key = tien ? `${tien}/${m[1]}` : m[1];
    icons[key] = { ...kichThuoc(full), ext: m[2].toLowerCase() };
  }
})(GOC);

const dong = Object.entries(icons)
  .map(([k, v]) => `  '${k}': { w: ${v.w}, h: ${v.h}, ext: '${v.ext}' },`)
  .join('\n');

fs.writeFileSync(RA, `// TỆP SINH TỰ ĐỘNG — đừng sửa tay.
// Chạy lại: node scripts/tao-bang-icon.mjs

/** Kích thước gốc và đuôi tệp của từng icon trong \`public/retro\`. */
export const RETRO_ICONS = {
${dong}
} as const;

export type RetroIconName = keyof typeof RETRO_ICONS;
`);

console.log(`Đã ghi ${Object.keys(icons).length} icon vào src/lib/retro-icons.ts`);
