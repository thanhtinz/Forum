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

  for (const nhan of ['Đánh giá', 'Lượt tải', 'Dung lượng', 'Hệ máy']) {
    kiem(`hàng số liệu có ô “${nhan}”`, html.includes(nhan));
  }

  kiem('có nút tải nổi bật', (await p.locator('a.nut-cai-dam').count()) > 0);
  kiem('có mã kiểm tra tệp', html.includes('sha256'));
  kiem('có khối cộng đồng', html.includes('Cộng đồng'));
  kiem('có mục game tương tự', html.includes('Game tương tự'));

  // Game đã gỡ / còn nháp phải trả 404, không được xem lén bằng đường dẫn.
  const nhap = await db.game.findFirst({ where: { trangThai: 'NHAP' }, select: { duongDan: true } });
  if (nhap) {
    const r = await p.goto(`${GOC}/game/${nhap.duongDan}`, { waitUntil: 'domcontentloaded' });
    kiem('game nháp trả về 404', r.status() === 404, `trả về ${r.status()}`);
  }

  await p.close();
}
