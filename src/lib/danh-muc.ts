import type { Prisma } from '@prisma/client';
import { khongDau } from './tim-kiem-const';
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
    /*
     * Tìm trên cột đã BỎ DẤU, và bỏ dấu luôn từ khoá người ta gõ.
     *
     * Nhờ vậy "rong", "rồng", "RỒNG" đều ra "Thợ săn rồng"; "dua xe" ra mấy
     * game đua xe. Bản trước so thẳng ba cột gốc nên gõ không dấu là không ra
     * gì — mà phần lớn người dùng điện thoại gõ không dấu, nên với họ cửa hàng
     * này coi như không có game nào.
     *
     * Cắt từ khoá theo khoảng trắng và bắt khớp MỌI từ: gõ "gameloft dua" thì
     * ra game của Gameloft mà lại là game đua xe, chứ không phải mọi game khớp
     * một trong hai từ.
     */
    const tu = khongDau(loc.tuKhoa).split(' ').filter(Boolean).slice(0, 6);
    w.AND = tu.map((t) => ({ timKiem: { contains: t } }));
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

/* ──────────────────────────────────────────────────────────────────────────
 * TÌM TRONG DIỄN ĐÀN
 *
 * Ô tìm kiếm trước đây chỉ biết tìm GAME. Nhưng một nửa giá trị của kho này
 * nằm ở mấy chủ đề kiểu "bản 1.2 treo ở màn 3, sửa thế nào" — người gặp đúng
 * lỗi ấy gõ vào ô tìm rồi không ra gì, lại mở một chủ đề mới hỏi y hệt.
 *
 * Cùng lối với tìm game: so trên cột `timKiem` đã bỏ dấu, cắt từ khoá theo
 * khoảng trắng và bắt khớp MỌI từ.
 * ────────────────────────────────────────────────────────────────────────── */

/** Bao nhiêu chủ đề một trang ở trang kết quả tìm. */
export const MOI_TRANG_THAO_LUAN = 20;

export interface ChuDeTim {
  id: string;
  tieuDe: string;
  soTraLoi: number;
  traLoiCuoiLuc: Date;
  nguoi: { tenHienThi: string };
  game: { ten: string; duongDan: string };
}

function dieuKienChuDe(tuKhoa: string): Prisma.ChuDeWhereInput {
  const tu = khongDau(tuKhoa).split(' ').filter(Boolean).slice(0, 6);
  return {
    // Chủ đề của game đã gỡ thì không hiện: bấm vào là gặp 404.
    game: DANG_HIEN,
    AND: tu.map((t) => ({ timKiem: { contains: t } })),
  };
}

/** Đếm chủ đề khớp từ khoá — cho con số trên tab, khỏi kéo cả danh sách về. */
export function demChuDeTim(tuKhoa: string): Promise<number> {
  if (!tuKhoa) return Promise.resolve(0);
  return db.chuDe.count({ where: dieuKienChuDe(tuKhoa) });
}

export async function timChuDe(tuKhoa: string, trang: number): Promise<ChuDeTim[]> {
  if (!tuKhoa) return [];
  return db.chuDe.findMany({
    where: dieuKienChuDe(tuKhoa),
    // Chủ đề còn sống trước: người tìm "lỗi màn 3" cần cuộc trao đổi đang có
    // người đáp, không cần bài mở ra ba năm trước rồi im.
    orderBy: [{ traLoiCuoiLuc: 'desc' }, { id: 'desc' }],
    skip: (trang - 1) * MOI_TRANG_THAO_LUAN,
    take: MOI_TRANG_THAO_LUAN,
    select: {
      id: true, tieuDe: true, soTraLoi: true, traLoiCuoiLuc: true,
      nguoi: { select: { tenHienThi: true } },
      game: { select: { ten: true, duongDan: true } },
    },
  });
}
