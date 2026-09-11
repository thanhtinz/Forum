import { execFileSync } from 'node:child_process';
import { GOC, db, moTrang } from '../tro-giup.mjs';

/**
 * TAB "HÔM NAY" — mỗi ngày một bộ, và KHÔNG TRÙNG cho tới khi đi hết danh mục.
 *
 * Phần thuật toán kiểm bằng kịch bản `soat-vong-hom-nay.ts` chạy thẳng vào
 * hàm chia, duyệt hàng trăm ngày liền trong một tích tắc. Không có cách nào
 * kiểm "sang ngày mai có trùng không" qua trình duyệt mà không phải chờ hết
 * một đêm, hoặc phải chỉnh đồng hồ máy chủ — cả hai đều tệ hơn.
 *
 * Chạy với NHIỀU cỡ kho, nhất là mấy cỡ chia không hết (13 game, 4 mỗi ngày):
 * đó là chỗ phép chia dễ sai nhất, và cũng là chỗ kho thật hay rơi vào.
 */
export default async function chay(kiem) {
  for (const [soGame, moiNgay, soNgay] of [[12, 4, 60], [13, 4, 80], [7, 4, 40], [1, 4, 10], [200, 4, 400]]) {
    let ra;
    try {
      const chu = execFileSync('npx', ['tsx', 'scripts/soat-vong-hom-nay.ts',
        String(soGame), String(moiNgay), String(soNgay)],
        { env: { ...process.env, JSON: '1' }, encoding: 'utf8' });
      ra = JSON.parse(chu.trim().split('\n').pop());
    } catch (e) {
      kiem(`chạy được phép chia với kho ${soGame} game`, false, e.message.slice(0, 120));
      continue;
    }

    const nhan = `kho ${soGame} game, ${moiNgay} mỗi ngày`;
    kiem(`${nhan}: không game nào trùng trong một vòng`,
      ra.trungTrongVong === 0, `${ra.trungTrongVong} vòng có trùng`);
    kiem(`${nhan}: không game nào bị bỏ sót trong một vòng`,
      ra.thieuTrongVong === 0, `${ra.thieuTrongVong} vòng bị sót`);
    kiem(`${nhan}: hai ngày liền nhau không giống nhau`,
      ra.ngayLienTrung === 0 || soGame <= moiNgay,
      `${ra.ngayLienTrung} cặp giống nhau`);
    kiem(`${nhan}: gọi lại cùng một ngày vẫn ra y hệt`, ra.onDinh === true);
  }

  // ── Trên trang thật ───────────────────────────────────────────────────
  const p = await moTrang();
  await p.goto(GOC, { waitUntil: 'networkidle' });

  const tam = p.locator('article').first();
  kiem('tab Hôm nay có tấm "GAME CỦA HÔM NAY"',
    (await p.locator('text=GAME CỦA HÔM NAY').count()) > 0);

  // Bám vào TIÊU ĐỀ chứ không vào thứ tự thẻ span: đổi chút bố cục bên trong
  // tấm là dãy span xê dịch ngay, mà bài kiểm thì đỏ vì một lẽ chẳng liên quan
  // gì tới thứ nó định canh.
  const tenLan1 = (await tam.locator('h2').first().textContent())?.trim() ?? '';
  kiem('tấm lớn có tên game', tenLan1.length > 0, tenLan1);

  // Game của hôm nay phải là game ĐANG HIỆN thật, không phải nháp lọt ra.
  const co = await db.game.count({ where: { ten: tenLan1, trangThai: 'DANG_HIEN' } });
  kiem('game của hôm nay là game đang hiện trên trang', co === 1, `tìm thấy ${co}`);

  // Tải lại trang KHÔNG được đổi game — đây là chỗ `Math.random()` sẽ lộ ra.
  await p.reload({ waitUntil: 'networkidle' });
  const tenLan2 = (await p.locator('article').first().locator('h2').first().textContent())?.trim() ?? '';
  kiem('tải lại trang vẫn đúng game ấy', tenLan1 === tenLan2, `${tenLan1} → ${tenLan2}`);

  // Và người khác mở cũng phải thấy y hệt — không phụ thuộc phiên hay cookie.
  const nguoiKhac = await moTrang();
  await nguoiKhac.goto(GOC, { waitUntil: 'networkidle' });
  const tenNguoiKhac = (await nguoiKhac.locator('article').first().locator('h2').first().textContent())?.trim() ?? '';
  kiem('người khác mở cũng thấy đúng game ấy', tenLan1 === tenNguoiKhac,
    `${tenLan1} ↔ ${tenNguoiKhac}`);

  // Ba game trong thẻ bộ sưu tập không được lặp lại game của hôm nay.
  const trongBoSuuTap = await p.locator('section:has-text("CŨNG ĐÁNG THỬ") a[href^="/game/"]')
    .evaluateAll((els) => els.map((e) => e.textContent?.trim().split('\n')[0] ?? ''));
  kiem('thẻ bộ sưu tập không lặp lại game của hôm nay',
    !trongBoSuuTap.some((t) => t === tenLan1), JSON.stringify(trongBoSuuTap));

  await p.close();
  await nguoiKhac.close();
}
