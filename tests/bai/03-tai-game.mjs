import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * Đường tải chạy được từ đầu tới cuối, và ghi đúng sổ.
 *
 * Đây là việc quan trọng nhất của cả trang, nên kiểm bằng cách BẤM THẬT rồi
 * soi lại con số trong CSDL, chứ không chỉ xem cái nút có hiện ra hay không.
 */
export default async function chay(kiem) {
  const tep = await db.tepTai.findFirst({
    where: { ban: { game: { trangThai: 'DANG_HIEN' } } },
    select: { id: true, duongDan: true, ban: { select: { gameId: true, game: { select: { duongDan: true } } } } },
  });
  if (!tep) { kiem('có tệp mẫu để tải', false); return; }

  const gameId = tep.ban.gameId;
  const truoc = (await db.game.findUnique({ where: { id: gameId }, select: { soLuotTai: true } })).soLuotTai;

  // ── Khách vãng lai vẫn tải được: cửa hàng không bắt đăng nhập mới cho tải ──
  const khach = await moTrang();
  const r = await khach.request.get(`${GOC}/api/tai/${tep.id}`, { maxRedirects: 0 });
  kiem('khách tải được, và được chuyển tới tệp', r.status() === 302, `trả về ${r.status()}`);
  kiem('chuyển đúng tới địa chỉ tệp', (r.headers().location ?? '').includes(tep.duongDan));

  const tang = await doiToi(async () =>
    (await db.game.findUnique({ where: { id: gameId }, select: { soLuotTai: true } })).soLuotTai > truoc);
  kiem('lượt tải của game tăng lên', tang);

  // ── Người đã đăng nhập thì tệp vào thư viện ──────────────────────────
  const nguoi = await db.nguoiDung.findFirst({ where: { tenDangNhap: 'minhdev' }, select: { id: true } });
  await db.luotTai.deleteMany({ where: { nguoiId: nguoi.id, gameId } });

  const p = await moTrangDaDangNhap('minhdev', 'thanhvien123');
  await p.request.get(`${GOC}/api/tai/${tep.id}`, { maxRedirects: 0 });

  const vaoThuVien = await doiToi(async () =>
    (await db.luotTai.count({ where: { nguoiId: nguoi.id, gameId } })) === 1);
  kiem('game vào thư viện của người tải', vaoThuVien);

  await p.goto(`${GOC}/thu-vien`, { waitUntil: 'networkidle' });
  kiem('thư viện hiện game vừa tải',
    (await p.locator(`a[href="/game/${tep.ban.game.duongDan}"]`).count()) > 0);

  // ── Tệp của game đã gỡ thì không tải được ────────────────────────────
  const anh = await db.game.findFirst({ where: { trangThai: 'NHAP' }, select: { id: true } });
  if (anh) {
    const tepAn = await db.tepTai.findFirst({
      where: { ban: { gameId: anh.id } }, select: { id: true },
    });
    if (tepAn) {
      const r2 = await khach.request.get(`${GOC}/api/tai/${tepAn.id}`, { maxRedirects: 0 });
      kiem('tệp của game chưa đăng thì chặn', r2.status() === 404, `trả về ${r2.status()}`);
    }
  }

  await khach.close();
  await p.close();
}
