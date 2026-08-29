#!/usr/bin/env node
/**
 * Chạy bộ kiểm trên BẢN DỰNG THẬT thay vì máy chủ dev.
 *
 * Vì sao cần: `next dev` biên dịch từng route ngay lúc có người gõ vào, và
 * tiến trình `next-server` phình tới gần 900MB sau vài giờ. Bộ kiểm mở hàng
 * chục tab dồn dập nên nó nghẽn — đo thực tế: dev trả lời 180–1600ms, bản dựng
 * 35ms. Tệ hơn, `next-server` là tiến trình CON nên Next thay nó lúc nào cũng
 * được, và bộ kiểm ăn ngay `ERR_CONNECTION_REFUSED` giữa chừng.
 *
 * Hậu quả đã đo được: cùng một bộ mã, chạy trên dev cho ra 555, 594, 613, 633,
 * 634 mục đạt qua năm lượt. Một bộ kiểm mà lần nào cũng phải tự hỏi "đỏ thật
 * hay đỏ oan" thì lần có lỗi thật, phản xạ đầu tiên sẽ là bỏ qua.
 *
 * Cổng riêng (3100) để không đụng máy chủ dev đang chạy ở 3000.
 */
import { spawn } from 'node:child_process';

const CONG = Number(process.env.PORT_KIEM ?? 3100);
const GOC = `http://localhost:${CONG}`;

/** Đợi máy chủ trả lời, chứ không ngủ cứng một quãng đoán chừng. */
async function doiMayChu(hanGiay = 90) {
  const het = Date.now() + hanGiay * 1000;
  for (;;) {
    try {
      const r = await fetch(GOC, { cache: 'no-store' });
      if (r.ok || r.status < 500) return true;
    } catch { /* chưa lên, thử lại */ }
    if (Date.now() > het) return false;
    await new Promise((r) => setTimeout(r, 500));
  }
}

function chay(lenh, tsoDoi, tuyChon = {}) {
  return new Promise((giaiQuyet) => {
    const p = spawn(lenh, tsoDoi, { stdio: 'inherit', ...tuyChon });
    p.on('exit', (ma) => giaiQuyet(ma ?? 1));
  });
}

const maBuild = await chay('npm', ['run', 'build']);
if (maBuild !== 0) {
  console.error('\nDựng bản thật hỏng — chưa chạy bộ kiểm.');
  process.exit(maBuild);
}

const mayChu = spawn('npx', ['next', 'start'], {
  env: { ...process.env, PORT: String(CONG) },
  stdio: 'ignore',
  detached: false,
});

// Dọn máy chủ dù bộ kiểm đạt, hỏng, hay chính tiến trình này bị ngắt.
const donDep = () => { if (!mayChu.killed) mayChu.kill('SIGTERM'); };
process.on('exit', donDep);
process.on('SIGINT', () => { donDep(); process.exit(130); });
process.on('SIGTERM', () => { donDep(); process.exit(143); });

if (!(await doiMayChu())) {
  console.error(`\nMáy chủ không lên ở ${GOC} — chưa chạy bộ kiểm.`);
  donDep();
  process.exit(1);
}

console.log(`\nChạy bộ kiểm trên bản dựng thật tại ${GOC}\n`);
const ma = await chay('node', ['tests/run.mjs', ...process.argv.slice(2)], {
  env: { ...process.env, BASE_URL: GOC },
});
donDep();
process.exit(ma);
