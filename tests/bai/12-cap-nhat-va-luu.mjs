import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * "Bản cập nhật" và "Đã lưu" — hai mục cửa hàng nào cũng có.
 *
 * Mục cập nhật không có bảng riêng: nó so số hiệu bản đã tải (`LuotTai`) với
 * bản mang cờ `moiNhat` của đúng hệ máy ấy. Nên bài kiểm phải dựng đúng tình
 * huống người dùng thật rơi vào — tải một bản cũ rồi để đấy — chứ không thể
 * chỉ mở trang lên xem có chữ gì không.
 */
export default async function chay(kiem) {
  const nguoi = await db.nguoiDung.findFirst({ where: { tenDangNhap: 'minhdev' }, select: { id: true } });

  // Cần một game có từ hai bản trở lên trên cùng một hệ máy.
  const game = await db.game.findFirst({
    where: { trangThai: 'DANG_HIEN', banTai: { some: { moiNhat: false } } },
    select: {
      id: true, ten: true, duongDan: true,
      banTai: { select: { heMay: true, soHieu: true, moiNhat: true } },
    },
  });
  if (!nguoi || !game) { kiem('có dữ liệu mẫu', false, 'thiếu game nhiều bản'); return; }

  const moiNhat = game.banTai.find((b) => b.moiNhat);
  const banCu = game.banTai.find((b) => !b.moiNhat && b.heMay === moiNhat?.heMay);
  if (!moiNhat || !banCu) { kiem('có bản cũ và bản mới cùng hệ máy', false); return; }

  /*
   * Dọn TOÀN BỘ lượt tải của người này, không chỉ của game đang kiểm.
   *
   * Bài kiểm có một mục khẳng định trạng thái TOÀN CỤC — "mọi thứ đều mới
   * nhất" — nên chỉ cần sót một lượt tải bản cũ của game khác là nó đỏ, dù mã
   * đúng hoàn toàn. Đã dính đúng chuyện ấy vì một lượt chụp ảnh để lại ba
   * hàng. Dữ liệu mẫu không tạo lượt tải nào, nên xoá sạch là an toàn.
   */
  const don = async () => {
    await db.luotTai.deleteMany({ where: { nguoiId: nguoi.id } });
    await db.daLuu.deleteMany({ where: { nguoiId: nguoi.id } });
  };
  await don();

  try {
    // ── Khách không vào được hai mục này ──────────────────────────────
    const khach = await moTrang();
    for (const [ten, url] of [['bản cập nhật', '/cap-nhat'], ['đã lưu', '/da-luu']]) {
      await khach.goto(GOC + url, { waitUntil: 'networkidle' });
      kiem(`khách bị đưa sang trang đăng nhập ở mục ${ten}`,
        khach.url().includes('/dang-nhap'), khach.url());
    }
    await khach.close();

    const p = await moTrangDaDangNhap('minhdev', 'thanhvien123');

    // ── Chưa tải gì thì không có bản cập nhật nào ──────────────────────
    await p.goto(`${GOC}/cap-nhat`, { waitUntil: 'networkidle' });
    kiem('chưa tải gì thì báo mọi thứ đều mới nhất',
      (await p.locator('text=Mọi thứ đều mới nhất').count()) > 0);

    // ── Tải một bản CŨ → phải hiện ra ─────────────────────────────────
    await db.luotTai.create({
      data: { nguoiId: nguoi.id, gameId: game.id, heMay: banCu.heMay, soHieu: banCu.soHieu },
      select: { id: true },
    });
    await p.reload({ waitUntil: 'networkidle' });

    const chu = await p.locator('main').textContent();
    kiem('game tải bản cũ thì hiện ở mục cập nhật', chu.includes(game.ten), chu.slice(0, 120));
    kiem('nói rõ đang ở bản nào', chu.includes(banCu.soHieu), `chờ ${banCu.soHieu}`);
    kiem('nói rõ sẽ lên bản nào', chu.includes(moiNhat.soHieu), `chờ ${moiNhat.soHieu}`);

    // ── Đổi sang bản MỚI NHẤT → phải biến mất ─────────────────────────
    await db.luotTai.updateMany({
      where: { nguoiId: nguoi.id, gameId: game.id },
      data: { soHieu: moiNhat.soHieu, heMay: moiNhat.heMay },
    });
    await p.reload({ waitUntil: 'networkidle' });
    kiem('tải bản mới nhất rồi thì hết báo cập nhật',
      (await p.locator('text=Mọi thứ đều mới nhất').count()) > 0);

    /*
     * Game CHƯA TẢI mà chỉ lưu thì KHÔNG được báo cập nhật.
     * Đây là lý do "đã lưu" và "thư viện" phải là hai bảng khác nhau: nhắc
     * bản mới của một game người ta chưa tải bao giờ là vô nghĩa.
     */
    const gameKhac = await db.game.findFirst({
      where: { trangThai: 'DANG_HIEN', id: { not: game.id }, banTai: { some: { moiNhat: false } } },
      select: { id: true, ten: true, duongDan: true },
    });
    if (gameKhac) {
      await db.daLuu.create({ data: { nguoiId: nguoi.id, gameId: gameKhac.id }, select: { id: true } });
      await p.reload({ waitUntil: 'networkidle' });
      kiem('game chỉ lưu mà chưa tải thì không bị báo cập nhật',
        !(await p.locator('main').textContent()).includes(gameKhac.ten));
      await db.daLuu.deleteMany({ where: { nguoiId: nguoi.id } });
    }

    // ── Nút lưu trên trang game ───────────────────────────────────────
    await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    const nut = p.locator('button:has-text("Lưu để dành")');
    kiem('trang game có nút lưu', (await nut.count()) > 0);

    await nut.click();
    const daLuu = await doiToi(async () =>
      (await db.daLuu.count({ where: { nguoiId: nguoi.id, gameId: game.id } })) === 1);
    kiem('bấm lưu thì ghi vào danh sách', daLuu);
    kiem('bấm xong nút đổi thành "Đã lưu"',
      (await p.locator('button:has-text("Đã lưu")').count()) > 0);

    await p.goto(`${GOC}/da-luu`, { waitUntil: 'networkidle' });
    kiem('game vừa lưu hiện ở trang Đã lưu',
      (await p.locator(`a[href="/game/${game.duongDan}"]`).count()) > 0);

    // ── Bấm lần nữa thì bỏ lưu ────────────────────────────────────────
    await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
    await p.locator('button:has-text("Đã lưu")').click();
    const daBo = await doiToi(async () =>
      (await db.daLuu.count({ where: { nguoiId: nguoi.id, gameId: game.id } })) === 0);
    kiem('bấm lần nữa thì bỏ lưu', daBo);

    // ── Lưu KHÔNG phải là tải: thư viện không được lẫn ────────────────
    await db.daLuu.create({ data: { nguoiId: nguoi.id, gameId: gameKhac?.id ?? game.id }, select: { id: true } });
    await p.goto(`${GOC}/thu-vien`, { waitUntil: 'networkidle' });
    if (gameKhac) {
      kiem('game mới lưu KHÔNG lọt vào thư viện',
        !(await p.locator('main').textContent()).includes(gameKhac.ten));
    }

    await p.close();
  } finally {
    await don();
  }
}
