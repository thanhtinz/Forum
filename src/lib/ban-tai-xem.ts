import { cache } from 'react';
import { db } from '@/lib/db';
import type { BanXem } from '@/components/game/KhungTai';
import type { MaHeMay } from '@/lib/he-may';

/** Trần số bản kéo về một lượt — game cũ có dãy bản rất dài. */
const TOI_DA = 60;

/**
 * Đọc dãy bản tải của một game, đã chuyển sang dạng thành phần client đọc được.
 *
 * Để riêng một hàm vì nay CÓ HAI NƠI cần đúng dãy ấy: khung chung dựng nút
 * "Tải về" ở đầu trang (phải biết game có mấy hệ máy và tệp chính là tệp nào),
 * còn tab Thông tin dựng khung chọn bản. Chép câu truy vấn ra hai chỗ thì
 * thêm một trường là phải nhớ sửa hai lần, mà lần quên sẽ là lần nút đầu
 * trang trỏ vào một tệp khác với tệp khung tải đang bày.
 *
 * `Decimal` của Prisma đổi sang `number` ngay tại đây: nó không vượt qua được
 * ranh giới máy chủ — client sang.
 *
 * Bọc `cache` của React vì đúng hai nơi ấy cùng gọi trong MỘT lượt dựng trang,
 * với cùng một mã game: không bọc thì mỗi lượt xem trang game là hai câu truy
 * vấn y hệt nhau, mà đây là câu nặng nhất trang — kéo tới sáu chục bản kèm
 * danh sách tệp của từng bản. Kho nhớ ấy sống theo từng yêu cầu rồi bị vứt.
 */
export const docBanXem = cache(async function docBanXem(gameId: string): Promise<BanXem[]> {
  const ban = await db.banTai.findMany({
    where: { gameId },
    orderBy: [{ moiNhat: 'desc' }, { ngayRa: 'desc' }],
    take: TOI_DA,
    select: {
      id: true, heMay: true, soHieu: true, moiNhat: true, dungLuong: true, ngayRa: true,
      doiMoi: true, ghiChu: true, duongDanCuaHang: true,
      tep: { select: { id: true, loai: true, dungLuong: true, tenTep: true, maKiemTra: true } },
    },
  });

  return ban.map((b) => ({
    id: b.id,
    heMay: b.heMay as MaHeMay,
    soHieu: b.soHieu,
    moiNhat: b.moiNhat,
    dungLuong: b.dungLuong != null ? Number(b.dungLuong) : null,
    ngayRa: b.ngayRa ? b.ngayRa.toISOString().slice(0, 10) : null,
    doiMoi: b.doiMoi,
    ghiChu: b.ghiChu,
    duongDanCuaHang: b.duongDanCuaHang,
    tep: b.tep.map((t) => ({
      id: t.id,
      loai: t.loai,
      dungLuong: t.dungLuong != null ? Number(t.dungLuong) : null,
      tenTep: t.tenTep,
      maKiemTra: t.maKiemTra,
    })),
  }));
});
