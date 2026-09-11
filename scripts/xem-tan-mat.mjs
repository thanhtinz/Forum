import { spawn, execSync } from 'node:child_process';

/**
 * DỰNG THẬT RỒI CHỤP — một lệnh, một máy chủ.
 *
 * Vì sao cần hẳn một kịch bản cho việc tưởng như chỉ là `next start` rồi chụp:
 * gõ tay ba bước ấy đã ba lần cho ra ảnh của BẢN DỰNG CŨ. Máy chủ lần trước
 * chưa tắt vẫn giữ cổng, máy chủ mới chết ngay vì cổng bận, và trình duyệt thì
 * vẫn tải được trang — chỉ có điều là trang cũ. Lần tệ nhất còn ra một trang
 * trắng trơn không CSS, vì tệp kiểu dáng hỏi sang máy chủ mang mã dựng khác.
 *
 * Nên ở đây ba việc phải làm bằng được:
 *   1. Giết sạch máy chủ cũ rồi ĐỢI cổng thật sự nhả ra.
 *   2. Dựng lại từ đầu (xoá `.next`) — `next dev` và `next build` dùng chung
 *      thư mục ấy, và bản trộn của hai bên thì trang trả về 200 mà rỗng ruột.
 *   3. Trước khi chụp, TẢI THỬ tệp CSS. Nó mà không phải 200 thì có chụp cũng
 *      chỉ ra ảnh của một trang không kiểu dáng — thà hỏng to còn hơn hỏng lặng.
 */

const CONG = Number(process.env.CONG ?? 3100);
const GOC = `http://localhost:${CONG}`;
const TRANG = process.argv.slice(2);

function im(lenh) {
  try { return execSync(lenh, { stdio: 'pipe' }).toString(); } catch { return ''; }
}

async function cho(dieuKien, hanMs, loi) {
  const het = Date.now() + hanMs;
  while (Date.now() < het) {
    if (await dieuKien()) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(loi);
}

async function congConSong() {
  try { await fetch(GOC, { signal: AbortSignal.timeout(1500) }); return true; } catch { return false; }
}

console.log('· Tắt máy chủ cũ');
im('pkill -9 -f next-server');
im('pkill -9 -f "next start"');
await cho(async () => !(await congConSong()), 15_000, `Cổng ${CONG} vẫn có người giữ sau 15s.`);

console.log('· Dựng lại từ đầu');
im('rm -rf .next');
const dung = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
const maDung = await new Promise((r) => dung.on('exit', r));
if (maDung !== 0) { console.error('Dựng hỏng.'); process.exit(1); }

console.log('· Mở máy chủ');
const may = spawn('npx', ['next', 'start', '-p', String(CONG)], { stdio: 'ignore', detached: true });
may.unref();
await cho(congConSong, 60_000, 'Máy chủ không lên sau 60s.');

// Tải thử tệp CSS: trang có kiểu dáng hay không quyết ở đây, không phải ở mắt.
const trangChu = await (await fetch(GOC)).text();
const duongCss = trangChu.match(/\/_next\/static\/css\/[^"]+\.css/)?.[0];
if (!duongCss) throw new Error('Trang chủ không hề dẫn tới tệp CSS nào.');
const css = await fetch(GOC + duongCss);
if (!css.ok) throw new Error(`Tệp CSS trả về ${css.status} — máy chủ đang phục vụ bản dựng khác.`);
console.log(`· CSS ${css.status}, ${(await css.text()).length} ký tự`);

if (TRANG.length > 0) {
  const chup = spawn('node', ['scripts/chup.mjs', ...TRANG], {
    stdio: 'inherit', env: { ...process.env, GOC },
  });
  await new Promise((r) => chup.on('exit', r));
}

console.log(`· Xong. Máy chủ còn chạy ở ${GOC}`);
