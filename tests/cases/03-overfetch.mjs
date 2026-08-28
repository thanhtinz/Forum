import { execFileSync } from 'node:child_process';

/**
 * Quét tĩnh: không được để truy vấn Prisma lấy trọn bản ghi của model có cột
 * nhạy cảm. Danh sách chấp nhận được liệt kê ngay đây — thêm dòng mới phải có
 * lý do rõ ràng, đó chính là lúc cần nhìn kỹ.
 */
const ALLOWED = new Set([
  'src/app/(site)/report/actions.ts',            // select truyền qua biến rồi trải ra
  'src/lib/rate-limit.ts',                       // select truyền qua biến rồi trải ra
  'src/app/api/download/[itemId]/route.ts',      // route API, cần url thật để chuyển hướng
  'src/lib/auth.ts',                             // cần passwordHash để so mật khẩu
]);

export default async function run(check) {
  const out = execFileSync('node', ['scripts/scan-overfetch.mjs'], { encoding: 'utf8' });
  const found = out.split('\n')
    .filter((l) => l.includes('db.'))
    .map((l) => l.split(':')[0].trim())
    .filter(Boolean);

  const unexpected = [...new Set(found)].filter((f) => !ALLOWED.has(f));
  check('không có truy vấn lấy trọn bản ghi ngoài danh sách đã duyệt',
    unexpected.length === 0, unexpected.join(', '));
}
