/**
 * Tìm truy vấn Prisma lấy trọn bản ghi của model có cột nhạy cảm.
 *
 * Không có `select` ở cấp ngoài cùng thì Prisma trả về MỌI cột vô hướng. Nếu
 * bản ghi đó đi xuống một component phía trình duyệt, cả object bị tuần tự hoá
 * vào mã nguồn trang — nội dung trả phí, mật khẩu tệp, băm mật khẩu đều lộ.
 *
 * Chạy:  node scripts/scan-overfetch.mjs
 *
 * Có vài trường hợp báo nhầm, xem xong rồi bỏ qua được:
 *  - `select` truyền vào qua biến rồi trải ra (`...sel`, `findFirst(args)`)
 *  - route API và trang chỉ tác giả/quản trị mở được, vốn cần đúng cột đó
 */
import fs from 'node:fs';
import path from 'node:path';

/** Model có cột nhạy cảm: lấy trọn bản ghi là kéo cả những cột này về. */
const SECRET = {
  user: ['passwordHash'],
  post: ['hiddenContent', 'hiddenSource'],
  downloadItem: ['url', 'password', 'extractCode'],
  account: ['access_token', 'refresh_token', 'id_token'],
};

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(f);
  }
})('src');

const FIND = /db\.(\w+)\.(findUnique|findFirst|findMany|findUniqueOrThrow|findFirstOrThrow)\b/g;
const hits = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let m;
  FIND.lastIndex = 0;
  while ((m = FIND.exec(src)) !== null) {
    const model = m[1];
    if (!SECRET[model]) continue;
    // Lấy khối lệnh gọi: cân bằng ngoặc từ dấu ( ngay sau tên hàm
    let i = src.indexOf('(', m.index + m[0].length);
    if (i < 0) continue;
    let depth = 0, j = i;
    for (; j < src.length; j++) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')') { depth--; if (depth === 0) break; }
    }
    const call = src.slice(i, j + 1);
    // Chỉ xét select/include Ở CẤP NGOÀI CÙNG: select lồng trong quan hệ
    // (author: { select: ... }) không cứu được bản ghi cha.
    const body = call.slice(1, -1);
    let d = 0, topSelect = false, topInclude = false, word = '';
    for (const ch of body) {
      if ('{(['.includes(ch)) d++;
      else if ('})]'.includes(ch)) d--;
      if (d === 1 && /[A-Za-z]/.test(ch)) word += ch;
      else if (d === 1 && ch === ':') {
        if (word.endsWith('select')) topSelect = true;
        if (word.endsWith('include')) topInclude = true;
        word = '';
      } else if (d !== 1 || ch === ',') word = '';
    }
    if (topSelect) continue;   // đã liệt kê cột ở cấp ngoài — an toàn
    void topInclude;
    const line = src.slice(0, m.index).split('\n').length;
    hits.push({ file, line, model, hasInclude: /\binclude\s*:/.test(call), secrets: SECRET[model] });
  }
}

if (hits.length === 0) console.log('Không còn truy vấn nào lấy trọn bản ghi của model có cột nhạy cảm.');
for (const h of hits) {
  console.log(`${h.file}:${h.line}  db.${h.model}.*  ${h.hasInclude ? '(include, không select)' : '(không select)'}  → kéo về: ${h.secrets.join(', ')}`);
}
