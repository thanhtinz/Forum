import { cache } from 'react';
import { db } from '@/lib/db';
import type { MaHeMay } from '@/lib/he-may';

export interface TepXem {
  id: string;
  loai: string;
  dungLuong: number | null;
  /** Tên tệp gốc — để người tải biết mình sắp nhận về cái gì. */
  tenTep: string | null;
  maKiemTra: string | null;
}

/**
 * MỘT BẢN TẢI, đã chuyển sang dạng thành phần client đọc được.
 *
 * Kiểu này ở lại lib chứ không nằm trong thành phần vẽ ra nó: trước đây nó
 * khai trong `KhungTai.tsx`, nên tệp lib phải import ngược lên một thành phần
 * client chỉ để lấy một cái kiểu — và ngày `KhungTai` bị gỡ đi thì cả chỗ đọc
 * dữ liệu vỡ theo, dù nó chẳng liên quan gì tới việc vẽ.
 */
export interface BanXem {
  id: string;
  heMay: MaHeMay;
  soHieu: string;
  moiNhat: boolean;
  dungLuong: number | null;
  ngayRa: string | null;
  doiMoi: string | null;
  ghiChu: string | null;
  duongDanCuaHang: string | null;
  tep: TepXem[];
}

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
    /*
     * `nulls: 'last'`, và khoá phụ `id`.
     *
     * `ngayRa` cho phép rỗng, mà Postgres xếp NULL LÊN ĐẦU khi sắp giảm dần —
     * nên một bản chưa điền ngày ra lại đứng trên bản mới nhất thật, ngay ở
     * khung tải của trang game.
     *
     * Khoá phụ `id` vì có `take`: hai bản cùng mốc mà thiếu nó thì mỗi lượt
     * dựng trang lại chọn cắt một bản khác đi, và hai chỗ cùng gọi hàm này
     * trong một trang có thể trỏ vào hai tệp khác nhau.
     */
    orderBy: [{ moiNhat: 'desc' }, { ngayRa: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
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
