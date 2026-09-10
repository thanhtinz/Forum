import { GOC, db, doiToi, moTrang, moTrangDaDangNhap } from '../tro-giup.mjs';

/**
 * Chấm sao: ghi đúng, sửa được, và con số trung bình luôn khớp với dữ liệu.
 *
 * Mục cuối là mục đáng giá nhất. `tongSao`/`soLuotDanhGia` lưu sẵn ở bảng Game
 * để khỏi đếm lại mỗi lần in, nên chúng RẤT dễ trôi khỏi sự thật — nhất là lúc
 * người ta sửa điểm cũ. Bài kiểm đếm lại từ bảng đánh giá rồi so.
 */
export default async function chay(kiem) {
  const game = await db.game.findFirst({
    where: { trangThai: 'DANG_HIEN' }, select: { id: true, duongDan: true },
  });
  const nguoi = await db.nguoiDung.findFirst({ where: { tenDangNhap: 'anhthu' }, select: { id: true } });
  if (!game || !nguoi) { kiem('có dữ liệu mẫu', false); return; }

  await db.danhGia.deleteMany({ where: { gameId: game.id, nguoiId: nguoi.id } });
  await lamMoiBoDem(game.id);

  // ── Khách chưa đăng nhập thì được mời đăng nhập, không thấy ô chấm ──
  const khach = await moTrang();
  await khach.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });
  kiem('khách được mời đăng nhập để đánh giá',
    (await khach.locator('text=Bạn đã chơi game này?').count()) > 0);
  kiem('khách không có nút chấm sao',
    (await khach.locator('button[aria-label="5 sao"]').count()) === 0);
  await khach.close();

  // ── Chấm 5 sao ───────────────────────────────────────────────────────
  const p = await moTrangDaDangNhap('anhthu', 'thanhvien123');
  await p.goto(`${GOC}/game/${game.duongDan}`, { waitUntil: 'networkidle' });

  await p.click('button[aria-label="5 sao"]');
  await p.fill('textarea', 'Chạy mượt trên máy cũ của mình.');
  await p.click('button:has-text("Gửi đánh giá")');

  const daGhi = await doiToi(async () =>
    (await db.danhGia.count({ where: { gameId: game.id, nguoiId: nguoi.id, sao: 5 } })) === 1);
  kiem('chấm 5 sao thì ghi đúng 5 sao', daGhi);
  kiem('bộ đếm khớp sau khi chấm', await boDemKhop(game.id));

  // ── Chấm lại: SỬA bài cũ, không đẻ bài mới ───────────────────────────
  await p.reload({ waitUntil: 'networkidle' });
  await p.click('button[aria-label="2 sao"]');
  await p.click('button:has-text("Cập nhật")');

  const daSua = await doiToi(async () =>
    (await db.danhGia.count({ where: { gameId: game.id, nguoiId: nguoi.id, sao: 2 } })) === 1);
  kiem('chấm lại thì sửa bài cũ', daSua);

  const soBai = await db.danhGia.count({ where: { gameId: game.id, nguoiId: nguoi.id } });
  kiem('mỗi người chỉ có một đánh giá cho một game', soBai === 1, `đếm được ${soBai}`);
  kiem('bộ đếm khớp sau khi sửa điểm', await boDemKhop(game.id));

  await db.danhGia.deleteMany({ where: { gameId: game.id, nguoiId: nguoi.id } });
  await lamMoiBoDem(game.id);
  await p.close();
}

/** Đếm lại từ bảng đánh giá rồi so với con số đang lưu ở bảng Game. */
async function boDemKhop(gameId) {
  const [gom, g] = await Promise.all([
    db.danhGia.aggregate({ where: { gameId }, _sum: { sao: true }, _count: { _all: true } }),
    db.game.findUnique({ where: { id: gameId }, select: { tongSao: true, soLuotDanhGia: true } }),
  ]);
  return g.tongSao === (gom._sum.sao ?? 0) && g.soLuotDanhGia === gom._count._all;
}

async function lamMoiBoDem(gameId) {
  const gom = await db.danhGia.aggregate({ where: { gameId }, _sum: { sao: true }, _count: { _all: true } });
  await db.game.update({
    where: { id: gameId },
    data: { tongSao: gom._sum.sao ?? 0, soLuotDanhGia: gom._count._all },
  });
}
