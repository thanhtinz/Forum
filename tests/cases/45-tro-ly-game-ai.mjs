import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BASE, db, openPage } from '../helpers.mjs';

const chay = promisify(execFile);

/**
 * Trợ lý AI ở trang đăng game.
 *
 * KHÔNG kiểm chất lượng chữ AI viết: cái đó không có đáp án đúng, mà gọi API
 * thật trong bộ kiểm thì vừa tốn tiền vừa đỏ oan mỗi lần mạng chập. Bài này
 * soi đúng hai chỗ mà hỏng là mất thật:
 *
 *  • PHÂN QUYỀN — bốn hàm AI đều là endpoint POST công khai, mà mỗi lượt gọi
 *    tiêu tiền thật của khoá API. Người lạ gọi được là người lạ tiêu tiền hộ.
 *  • SSRF ở hàm tải ảnh — máy chủ tự đi lấy một địa chỉ do MODEL đề xuất.
 *    Không chặn thì trỏ vào `https://localhost:5433` là chọc thẳng cơ sở dữ
 *    liệu, trỏ vào `169.254.169.254` là đọc thông tin máy chủ đám mây.
 */
export default async function run(check) {
  const thuong = await db.user.findFirst({
    where: { username: 'huytran' }, select: { id: true, role: true },
  });
  if (!thuong) { check('có dữ liệu mẫu', false, 'thiếu tài khoản'); return; }
  check('tài khoản dùng để thử không phải quản trị',
    thuong.role !== 'ADMIN', `vai trò ${thuong.role}`);

  // ── Phân quyền ───────────────────────────────────────────────────────
  const p = await openPage('huytran');
  await p.goto(`${BASE}/admin/games`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
  check('người thường không vào được danh sách game của quản trị',
    !p.url().includes('/admin/games'), p.url());

  const ma = await p.evaluate(async ([base]) => {
    const fd = new FormData();
    fd.set('ten', 'Contra');
    const r = await fetch(`${base}/admin/games/new`, {
      method: 'POST', body: fd, headers: { 'Next-Action': 'x'.repeat(40) },
    }).catch(() => null);
    return r ? r.status : 0;
  }, [BASE]);
  check('gọi thẳng hàm AI bằng tài khoản thường thì không được phục vụ',
    ma !== 200, `mã ${ma}`);

  // ── Chặn SSRF ────────────────────────────────────────────────────────
  // Chạy phần chặn địa chỉ đứng một mình bằng `tsx`: đây là luật của máy chủ
  // chứ không phải của giao diện, nên kiểm thẳng chứ không qua trình duyệt.
  let ket = [];
  try {
    const { stdout } = await chay('npx', ['tsx', 'tests/kiem-dia-chi-anh.ts'], {
      cwd: process.cwd(), timeout: 90_000,
    });
    const dong = stdout.split('\n').find((d) => d.startsWith('@@KQ@@'));
    ket = dong ? JSON.parse(dong.slice(6)) : [];
  } catch (e) {
    check('chạy được phần kiểm địa chỉ ảnh', false, String(e).slice(0, 160));
    return;
  }
  check('phần kiểm địa chỉ ảnh có chạy', ket.length > 0, `${ket.length} mục`);
  for (const m of ket) check(m.ten, m.dat, m.ghi);
}
