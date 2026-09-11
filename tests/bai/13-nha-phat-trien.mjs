import { GOC, db, moTrang } from '../tro-giup.mjs';

/**
 * Trang nhà phát triển — bấm tên hãng ở trang game là ra hết game của hãng ấy.
 *
 * Tên hãng là một CHUỖI trên bảng Game chứ không phải một bảng riêng, nên chỗ
 * dễ sai nhất là cách tra: gõ hoa thường khác nhau phải ra cùng một hãng, và
 * tên có dấu cách phải qua được URL.
 */
export default async function chay(kiem) {
  // Lấy hãng có nhiều game nhất, để mục "liệt kê đủ" có cái mà đếm.
  const theoHang = await db.game.groupBy({
    by: ['nhaPhatTrien'],
    where: { trangThai: 'DANG_HIEN', nhaPhatTrien: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { nhaPhatTrien: 'desc' } },
    take: 1,
  });
  const hang = theoHang[0]?.nhaPhatTrien;
  if (!hang) { kiem('có nhà phát triển trong dữ liệu mẫu', false); return; }

  const cuaHang = await db.game.findMany({
    where: { trangThai: 'DANG_HIEN', nhaPhatTrien: hang },
    select: { ten: true, duongDan: true },
  });

  const p = await moTrang();

  // ── Bấm từ trang game ────────────────────────────────────────────────
  await p.goto(`${GOC}/game/${cuaHang[0].duongDan}`, { waitUntil: 'networkidle' });
  const lienKet = p.locator(`a[href^="/nha-phat-trien/"]`).first();
  kiem('tên hãng ở trang game bấm được', (await lienKet.count()) > 0);

  await lienKet.click();
  await p.waitForURL('**/nha-phat-trien/**', { timeout: 15_000 }).catch(() => {});
  kiem('bấm vào thì sang trang nhà phát triển',
    p.url().includes('/nha-phat-trien/'), p.url());

  const chu = await p.locator('main').textContent();
  kiem('trang hiện tên hãng', chu.includes(hang), chu.slice(0, 80));

  // Phải liệt kê ĐỦ game của hãng, không sót con nào.
  const thieu = cuaHang.filter((g) => !chu.includes(g.ten)).map((g) => g.ten);
  kiem('liệt kê đủ mọi game của hãng', thieu.length === 0, `sót: ${thieu.join(', ')}`);

  // Và KHÔNG được lẫn game của hãng khác.
  /*
   * Hai điều kiện, HAI khoá khác nhau.
   *
   * Bản trước viết `{ not: hang, not: null }` — hai khoá `not` trùng tên trong
   * cùng một object, nên JavaScript lặng lẽ giữ cái sau và vứt cái trước. Bộ
   * lọc hoá ra chỉ còn "hãng khác rỗng", nên nó trả về được cả game của CHÍNH
   * hãng đang xem, và mục kiểm đỏ oan. Bấy lâu nay nó xanh nhờ may: `findFirst`
   * không có `orderBy` nên trả về hàng nào tuỳ CSDL, mà hàng ấy tình cờ thuộc
   * hãng khác. Thêm `orderBy` để lần sau hỏng thì hỏng ổn định, không hỏng lúc
   * được lúc không.
   */
  const hangKhac = await db.game.findFirst({
    where: {
      trangThai: 'DANG_HIEN',
      nhaPhatTrien: { not: null },
      NOT: { nhaPhatTrien: hang },
    },
    orderBy: { ten: 'asc' },
    select: { ten: true },
  });
  if (hangKhac) {
    kiem('không lẫn game của hãng khác', !chu.includes(hangKhac.ten), hangKhac.ten);
  }

  // ── Gõ hoa thường khác nhau vẫn ra đúng hãng ─────────────────────────
  const r = await p.goto(`${GOC}/nha-phat-trien/${encodeURIComponent(hang.toUpperCase())}`,
    { waitUntil: 'domcontentloaded' });
  kiem('gõ tên hãng viết hoa vẫn ra đúng trang', r.status() === 200, `trả về ${r.status()}`);

  // ── Hãng không có thật thì 404, không phải trang rỗng ────────────────
  const r2 = await p.goto(`${GOC}/nha-phat-trien/hang-khong-co-that-dau`,
    { waitUntil: 'domcontentloaded' });
  kiem('hãng không có thật thì trả 404', r2.status() === 404, `trả về ${r2.status()}`);

  await p.close();
}
