import { GOC, db, moTrang } from '../tro-giup.mjs';

/** Trang game bày đủ những thứ người ta vào đây để tìm. */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    where: { trangThai: 'DANG_HIEN', banTai: { some: { heMay: 'JAVA' } } },
    select: { duongDan: true, ten: true, nhaPhatTrien: true, gioiThieu: true },
  });
  if (!game) { kiem('có game mẫu để kiểm', false); return; }

  const p = await moTrang();
  await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
  const html = await p.content();

  kiem('có tên game', html.includes(game.ten));
  kiem('có nhà phát triển', !game.nhaPhatTrien || html.includes(game.nhaPhatTrien));
  kiem('có phần giới thiệu', !game.gioiThieu || html.includes(game.gioiThieu.slice(0, 40)));

  /*
   * Hàng số liệu: BA ô, số to trên và nhãn nhỏ dưới — đúng dáng CH Play.
   * Kiểm bằng nhãn ở dòng dưới chứ không bằng nhãn in hoa: nhãn in hoa đã bỏ
   * vì nó là dòng chữ thứ ba thừa ra trong một khối chỉ cần hai.
   */
  const soLieu = await p.locator('dl').first().textContent();
  for (const nhan of ['đánh giá', 'lượt tải']) {
    kiem(`hàng số liệu có ô “${nhan}”`, (soLieu ?? '').includes(nhan), soLieu ?? '');
  }
  kiem('hàng số liệu nói dung lượng của bản mới nhất',
    /bản \S+/.test(soLieu ?? ''), soLieu ?? '');

  // Ô "Hệ máy" đã bỏ khỏi hàng số liệu: dãy chip chọn hệ ngay bên dưới đã nói
  // đúng điều ấy, lại còn liệt kê ra hết thay vì gộp thành "+4 hệ nữa".
  kiem('hàng số liệu không lặp lại hệ máy',
    !/hệ nữa|hệ máy/.test(soLieu ?? ''), soLieu ?? '');

  kiem('có nút tải nổi bật', (await p.locator('a.nut-cai-dam').count()) > 0);
  kiem('có mục game tương tự', html.includes('Game tương tự'));

  /*
   * DIỄN ĐÀN LÀ MỘT TAB, không phải một khối nhét cuối trang.
   *
   * Tab dựng bằng <Link> sang đường dẫn riêng chứ không phải nút đổi trạng
   * thái, nên phải kiểm đúng ba thứ: có tab, bấm sang được, và địa chỉ đổi
   * theo — có địa chỉ riêng thì mới dán cho người khác và mới lùi lại được.
   */
  const tab = p.locator('nav[aria-label="Phần của trang game"] a');
  const tenTab = await tab.evaluateAll((els) => els.map((e) => e.textContent?.trim() ?? ''));
  kiem('trang game có hàng tab', tenTab.length === 2, JSON.stringify(tenTab));
  kiem('tab đầu là Thông tin', (tenTab[0] ?? '').startsWith('Thông tin'), tenTab[0] ?? '');
  kiem('tab sau là Diễn đàn', (tenTab[1] ?? '').startsWith('Diễn đàn'), tenTab[1] ?? '');

  await tab.nth(1).click();
  await p.waitForURL('**/dien-dan', { timeout: 15_000 }).catch(() => {});
  kiem('bấm tab Diễn đàn thì đổi sang đường dẫn riêng',
    p.url().endsWith('/dien-dan'), p.url());

  // Phần đầu (tên game + nút tải) phải ĐỨNG YÊN khi đổi tab — nó nằm ở khung
  // chung, nên người đọc không mất chỗ tải khi sang xem thảo luận.
  kiem('đổi tab thì tên game vẫn còn', (await p.content()).includes(game.ten));
  kiem('đổi tab thì nút tải vẫn còn', (await p.locator('a.nut-cai-dam').count()) > 0);

  // Game đã gỡ / còn nháp phải trả 404, không được xem lén bằng đường dẫn.
  const nhap = await db.game.findFirst({ where: { trangThai: 'NHAP' }, select: { duongDan: true } });
  if (nhap) {
    const r = await p.goto(`${GOC}/game/${nhap.duongDan}`, { waitUntil: 'domcontentloaded' });
    kiem('game nháp trả về 404', r.status() === 404, `trả về ${r.status()}`);
  }

  await p.close();
}
