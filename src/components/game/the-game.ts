import type { Prisma } from '@prisma/client';
import { diemSao } from '@/lib/tien-ich';
import type { MaHeMay } from '@/lib/he-may';

/*
 * Hình dạng dữ liệu MỘT THẺ GAME, khai báo đúng một lần.
 *
 * Mọi trang bày game (trang chủ, duyệt, tìm, thư viện, game liên quan) đều lấy
 * đúng ngần này cột — không hơn. Trước giờ mỗi trang tự viết `select` lấy thì
 * kiểu gì cũng có trang lỡ tay kéo cả `gioiThieu` dài mấy nghìn chữ về chỉ để
 * in ra một cái tên.
 */
export const CHON_THE = {
  id: true,
  duongDan: true,
  ten: true,
  tenViet: true,
  icon: true,
  vietHoa: true,
  tongSao: true,
  soLuotDanhGia: true,
  soLuotTai: true,
  theLoai: { select: { theLoai: { select: { ten: true, duongDan: true } } }, take: 2 },
  banTai: { select: { heMay: true }, distinct: ['heMay'] as const, take: 4 },
} satisfies Prisma.GameSelect;

export interface TheGame {
  id: string;
  duongDan: string;
  ten: string;
  tenViet: string | null;
  icon: string | null;
  vietHoa: boolean;
  sao: number;
  soLuotDanhGia: number;
  soLuotTai: number;
  theLoai: { ten: string; duongDan: string }[];
  heMay: MaHeMay[];
}

type HangGame = Prisma.GameGetPayload<{ select: typeof CHON_THE }>;

/** Hàng lấy từ CSDL → dữ liệu thẻ. Ép sẵn điểm sao để thẻ khỏi tự tính. */
export function thanhThe(g: HangGame): TheGame {
  return {
    id: g.id,
    duongDan: g.duongDan,
    ten: g.ten,
    tenViet: g.tenViet,
    icon: g.icon,
    vietHoa: g.vietHoa,
    sao: diemSao(g.tongSao, g.soLuotDanhGia),
    soLuotDanhGia: g.soLuotDanhGia,
    soLuotTai: g.soLuotTai,
    theLoai: g.theLoai.map((t) => t.theLoai),
    heMay: g.banTai.map((b) => b.heMay),
  };
}
