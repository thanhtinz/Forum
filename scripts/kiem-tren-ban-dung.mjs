import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import net from 'node:net';

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

/**
 * Cổng có đang bị ai giữ không.
 *
 * Đây là phép kiểm TỐN CÔNG NHẤT của cả tệp này, và nó có mặt vì một lần mất
 * gần một tiếng: một `next start` cũ còn sống giữ cổng 3100, `next start` mới
 * chết ngay vì EADDRINUSE, nhưng kịch bản chỉ chờ "cổng có trả lời không" —
 * mà cổng ấy CÓ trả lời, do máy chủ cũ. Thế là cả bộ kiểm chạy vào một bản
 * dựng từ đời nào, đỏ mười lăm mục, và mọi dấu hiệu đều trỏ vào mã mới.
 */
function congDangBan(cong) {
  return new Promise((xong) => {
    const thu = net.createServer();
    thu.once('error', () => xong(true));
    thu.once('listening', () => thu.close(() => xong(false)));
    thu.listen(cong, '127.0.0.1');
  });
}

if (await congDangBan(CONG)) {
  console.error(
    `\nCổng ${CONG} đang có tiến trình khác giữ.\n` +
    `Bộ kiểm sẽ chạy nhầm vào máy chủ ấy thay vì bản vừa dựng.\n` +
    `Dọn trước: pkill -f "next-server"   (hoặc đặt cổng khác: CONG=3200 npm run kiem:that)\n`,
  );
  process.exit(1);
}

/*
 * CSDL CÓ SỐNG KHÔNG — hỏi trước, hỏi rẻ.
 *
 * Postgres ở máy này bị hạ giữa chừng vài lần (log của nó ghi "redo done",
 * tức là bị giết chứ không tắt tử tế). Khi ấy `next start` vẫn lên, nhưng mọi
 * trang ném `PrismaClientInitializationError`, kịch bản ngồi chờ đủ sáu mươi
 * giây rồi in ra một bức tường lỗi Prisma — và bức tường ấy trông y hệt lỗi
 * do mã mới gây ra. Đã mất thì giờ đọc nó hai lần.
 *
 * Một lượt gọi TCP là đủ để phân biệt, và nó nói thẳng luôn câu lệnh dựng lại.
 */
async function csdlCoSong() {
  /*
   * Đọc cổng từ `.env` chứ không từ `process.env`.
   *
   * Kịch bản này chạy bằng node trần, không có ai nạp `.env` hộ — Next mới là
   * thứ tự nạp nó. Bản đầu của phép kiểm này đọc `process.env.DATABASE_URL`,
   * gặp `undefined`, lùi về cổng mặc định 5432, rồi báo "CSDL chết" trong khi
   * CSDL đang chạy ngon lành ở 5433. Một phép kiểm báo động nhầm còn tệ hơn
   * không có phép kiểm nào: nó dạy người ta bỏ qua chính nó.
   */
  const url = process.env.DATABASE_URL
    ?? (() => { try { return readFileSync('.env', 'utf8'); } catch { return ''; } })();
  const cong = Number(url.match(/@[^:/@]+:(\d+)\//)?.[1] ?? 5432);
  return new Promise((xong) => {
    const o = net.createConnection({ host: '127.0.0.1', port: cong });
    const dong = (kq) => { o.destroy(); xong(kq); };
    o.setTimeout(3000);
    o.once('connect', () => dong(true));
    o.once('timeout', () => dong(false));
    o.once('error', () => dong(false));
  });
}

if (!(await csdlCoSong())) {
  console.error(
    '\nKhông nối được tới CSDL. Bộ kiểm sẽ đỏ hàng loạt vì lý do không liên quan gì tới mã.\n' +
    'Dựng lại:\n' +
    `  su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/nova-data -o '-p 5433' -l /tmp/pg.log start"\n`,
  );
  process.exit(1);
}

// `.next` dựng cho bản chạy thật khác hẳn bản dev, nên xoá trước cho chắc.
rmSync('.next', { recursive: true, force: true });
chay('npm', ['run', 'build'], 'Dựng bản chạy thật');

const maBanDung = readFileSync('.next/BUILD_ID', 'utf8').trim();

const may = spawn('npx', ['next', 'start', '-p', CONG], {
  stdio: ['ignore', 'pipe', 'inherit'], env: process.env,
});

// Máy chủ chết giữa chừng thì dừng hẳn, đừng ngồi chờ cho hết sáu mươi giây.
may.on('exit', (ma) => {
  if (!daXongKiem) {
    console.error(`\nMáy chủ tắt sớm (mã ${ma}). Xem lỗi ở trên.`);
    process.exit(ma ?? 1);
  }
});

let daXongKiem = false;
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

/*
 * Máy chủ đang trả lời có phải MÁY CHỦ CỦA TA không.
 *
 * Mỗi bản dựng mang một mã riêng, và chỉ máy chủ chạy đúng bản ấy mới phục vụ
 * được `/_next/static/<mã>/_buildManifest.js`. Phép kiểm cổng ở trên đã chặn
 * gần hết, nhưng cái này chặn nốt phần còn lại — và rẻ, chỉ một lượt gọi.
 */
const bangKe = await fetch(`${GOC}/_next/static/${maBanDung}/_buildManifest.js`)
  .then((r) => r.ok)
  .catch(() => false);
if (!bangKe) {
  console.error(
    `\nMáy chủ ở cổng ${CONG} KHÔNG phục vụ bản vừa dựng (${maBanDung}).\n` +
    `Nhiều khả năng là một tiến trình cũ. Dọn rồi chạy lại.\n`,
  );
  tat();
  process.exit(1);
}

const loc = process.argv[2] ?? '';
const bo = spawnSync('node', ['tests/chay.mjs', ...(loc ? [loc] : [])], {
  stdio: 'inherit', env: { ...process.env, GOC },
});

daXongKiem = true;
tat();
process.exit(bo.status ?? 1);
