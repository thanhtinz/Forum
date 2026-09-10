import type { Prisma } from '@prisma/client';
import { db } from './db';
import { CHON_THE, thanhThe, type TheGame } from '@/components/game/the-game';
import { laHeMay, type MaHeMay } from './he-may';
import { kep } from './tien-ich';

/** Chỉ game ĐANG HIỆN mới lộ ra ngoài — game nháp và game đã gỡ thì không. */
export const DANG_HIEN = { trangThai: 'DANG_HIEN' as const };

export const CACH_SAP = [
  { ma: 'moi', ten: 'Mới nhất' },
  { ma: 'tai-nhieu', ten: 'Tải nhiều nhất' },
  { ma: 'diem-cao', ten: 'Điểm cao nhất' },
  { ma: 'ten', ten: 'Theo tên A→Z' },
] as const;

export type MaCachSap = (typeof CACH_SAP)[number]['ma'];

export interface BoLoc {
  he?: MaHeMay;
  theLoai?: string;
  vietHoa?: boolean;
  tuKhoa?: string;
  sap: MaCachSap;
  trang: number;
}

export const MOI_TRANG = 24;

/** Đọc bộ lọc từ tham số URL. Thứ gì không hiểu thì bỏ, không báo lỗi. */
export function docBoLoc(sp: Record<string, string | string[] | undefined>): BoLoc {
  const lay = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) as string | undefined;
  const sapRaw = lay('sap');
  return {
    he: laHeMay(lay('he')) ? (lay('he') as MaHeMay) : undefined,
    theLoai: lay('the-loai') || undefined,
    vietHoa: lay('viet-hoa') === '1' || undefined,
    tuKhoa: (lay('q') ?? '').trim() || undefined,
    sap: (CACH_SAP.find((c) => c.ma === sapRaw)?.ma ?? 'moi') as MaCachSap,
    trang: kep(lay('trang'), 1, 500, 1),
  };
}

/** Bộ lọc → chuỗi truy vấn, giữ nguyên mọi lựa chọn khác khi đổi một thứ. */
export function thanhTruyVan(loc: BoLoc, doi: Partial<BoLoc> = {}): string {
  const l = { ...loc, ...doi };
  const p = new URLSearchParams();
  if (l.tuKhoa) p.set('q', l.tuKhoa);
  if (l.he) p.set('he', l.he);
  if (l.theLoai) p.set('the-loai', l.theLoai);
  if (l.vietHoa) p.set('viet-hoa', '1');
  if (l.sap !== 'moi') p.set('sap', l.sap);
  // Đổi bộ lọc thì phải về trang 1: đang ở trang 7 mà lọc lại còn 2 trang thì
  // người dùng rơi thẳng vào một trang rỗng và tưởng là không có game nào.
  if (l.trang > 1 && doi.trang !== undefined) p.set('trang', String(l.trang));
  const s = p.toString();
  return s ? `?${s}` : '';
}

function dieuKien(loc: BoLoc): Prisma.GameWhereInput {
  const w: Prisma.GameWhereInput = { ...DANG_HIEN };
  if (loc.he) w.banTai = { some: { heMay: loc.he } };
  if (loc.theLoai) w.theLoai = { some: { theLoai: { duongDan: loc.theLoai } } };
  if (loc.vietHoa) w.vietHoa = true;
  if (loc.tuKhoa) {
    w.OR = [
      { ten: { contains: loc.tuKhoa, mode: 'insensitive' } },
      { tenViet: { contains: loc.tuKhoa, mode: 'insensitive' } },
      { nhaPhatTrien: { contains: loc.tuKhoa, mode: 'insensitive' } },
    ];
  }
  return w;
}

/*
 * Khoá phụ `id` ở MỌI cách sắp.
 *
 * Hai game cùng ngày đăng (rất hay gặp: nhập kho một mẻ) mà không có khoá phụ
 * thì Postgres trả về thứ tự tuỳ hứng — và người bấm sang trang 2 sẽ thấy lại
 * đúng cái game vừa xem ở trang 1, hoặc mất hẳn một game không bao giờ hiện.
 */
const SAP_THEO: Record<MaCachSap, Prisma.GameOrderByWithRelationInput[]> = {
  moi: [{ dangLuc: 'desc' }, { id: 'desc' }],
  'tai-nhieu': [{ soLuotTai: 'desc' }, { id: 'desc' }],
  'diem-cao': [{ soLuotDanhGia: 'desc' }, { tongSao: 'desc' }, { id: 'desc' }],
  ten: [{ ten: 'asc' }, { id: 'asc' }],
};

export interface KetQuaDuyet {
  game: TheGame[];
  tong: number;
  trang: number;
}

export async function duyetDanhMuc(loc: BoLoc): Promise<KetQuaDuyet> {
  const where = dieuKien(loc);
  const tong = await db.game.count({ where });
  // Kẹp trang vào khoảng thật: gõ `?trang=999` không được ra trang rỗng.
  const trang = Math.min(loc.trang, Math.max(1, Math.ceil(tong / MOI_TRANG)));

  const hang = await db.game.findMany({
    where,
    orderBy: SAP_THEO[loc.sap],
    skip: (trang - 1) * MOI_TRANG,
    take: MOI_TRANG,
    select: CHON_THE,
  });

  return { game: hang.map(thanhThe), tong, trang };
}

/** Lấy một danh sách ngắn cho một kệ. */
export async function layKe(
  where: Prisma.GameWhereInput,
  orderBy: Prisma.GameOrderByWithRelationInput[],
  soLuong = 12,
): Promise<TheGame[]> {
  const hang = await db.game.findMany({
    where: { ...DANG_HIEN, ...where },
    orderBy,
    take: soLuong,
    select: CHON_THE,
  });
  return hang.map(thanhThe);
}
