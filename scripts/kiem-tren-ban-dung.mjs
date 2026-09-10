import { spawn, spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

/*
 * Chạy bộ kiểm trên BẢN DỰNG THẬT, không phải trên máy chủ dev.
 *
 * Máy chủ dev biên dịch lại từng phần khi mã đổi, và thư mục `.next` của nó
 * bị `npm run build` ghi đè mất — chạy hai thứ ấy xen kẽ nhau là kiểu gì cũng
 * có lúc thiếu một mẩu chunk rồi cả trang trắng, mà lỗi ấy trông y hệt lỗi
 * thật: bài kiểm đỏ, trang 200 nhưng rỗng ruột. Đã mất ba lượt vì chuyện này.
 *
 * Nên: dựng sạch → chạy `next start` ở một cổng RIÊNG → kiểm → tắt. Máy chủ
 * dev ở cổng 3000 cứ để nguyên, không đụng tới.
 */
const CONG = process.env.CONG ?? '3100';
const GOC = `http://localhost:${CONG}`;

function chay(lenh, thamSo, chu) {
  process.stdout.write(`▸ ${chu}\n`);
  const r = spawnSync(lenh, thamSo, { stdio: 'inherit', env: process.env });
  if (r.status !== 0) { process.exit(r.status ?? 1); }
}

// `.next` dựng cho bản chạy thật khác hẳn bản dev, nên xoá trước cho chắc.
rmSync('.next', { recursive: true, force: true });
chay('npm', ['run', 'build'], 'Dựng bản chạy thật');

const may = spawn('npx', ['next', 'start', '-p', CONG], {
  stdio: ['ignore', 'pipe', 'inherit'], env: process.env,
});

let daTat = false;
const tat = () => {
  if (daTat) return;
  daTat = true;
  may.kill('SIGTERM');
};
process.on('exit', tat);
process.on('SIGINT', () => { tat(); process.exit(130); });

/** Chờ máy chủ trả lời, chứ không đoán bằng một khoảng `sleep` cố định. */
async function doiMayChu(hanGiay = 60) {
  const het = Date.now() + hanGiay * 1000;
  while (Date.now() < het) {
    try {
      const r = await fetch(GOC, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return true;
    } catch { /* chưa lên, thử lại */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

process.stdout.write(`▸ Chờ máy chủ ở cổng ${CONG}\n`);
if (!(await doiMayChu())) {
  console.error('Máy chủ không lên sau 60 giây.');
  tat();
  process.exit(1);
}

const loc = process.argv[2] ?? '';
const bo = spawnSync('node', ['tests/chay.mjs', ...(loc ? [loc] : [])], {
  stdio: 'inherit', env: { ...process.env, GOC },
});

tat();
process.exit(bo.status ?? 1);
