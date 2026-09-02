import { db } from './db';
import {
  BAC_TOI_DA, DIA_DIEM_DAU, type DongTran, type Quai, SO_TANG,
  type BoThuocTinh, type SucChien, THUOC_TINH,
  bacKeTiep, hpHienGio, laDotPha, loiRaCua, phanTramBeQuan, sucChien,
  tenCanhGioi, tenLinhCan, timDao, timDiaDiem, timQuai,
  tuViBeQuan, tuViCanDe, tuViMoiPhut,
} from './tu-tien-const';

/*
 * Vạn Đạo Tu Tiên — phần hỏi cơ sở dữ liệu.
 *
 * Tu vi ngoại tuyến KHÔNG được cộng dần bằng tác vụ nền: trang này không có
 * cron, mà GDD mục 27 cũng chốt đúng cách ấy — máy chủ giữ mốc `tuLuyenTu`,
 * lúc người chơi mở trang thì tính `min(quãng trôi, trần) × tốc độ` rồi ghi
 * một lần. `bayGio` luôn lấy ở máy chủ, không nhận từ trình duyệt.
 */

export interface NhanVatXem {
  id: string;
  ten: string;
  dao: string;
  tenDao: string;
  linhCan: number;
  tenLinhCan: string;
  bac: number;
  tang: number;
  tenCanhGioi: string;
  tuVi: number;
  tuViCan: number;
  /** Đã kịch trần cảnh giới của đợt này chưa. */
  kichTran: boolean;
  /** Lên tầng kế tiếp là ĐỘT PHÁ (qua bậc mới) hay chỉ lên tầng. */
  laDotPha: boolean;
  thuocTinh: BoThuocTinh;
  linhThach: number;
  /** Tu vi mỗi phút với bộ thuộc tính và cảnh giới hiện tại. */
  moiPhut: number;
  /** Phần trăm đã đầy của trần bế quan. */
  phanTramBeQuan: number;
  /** Tu vi đang chờ nhận, chưa ghi vào sổ. */
  choNhan: number;
  /** Ô đang đứng và ba chỉ số ra trận. */
  viTri: string;
  tenViTri: string;
  hp: number;
  suc: SucChien;
}

const CHON_NV = {
  id: true, ten: true, dao: true, linhCan: true,
  bac: true, tang: true, tuVi: true, tuLuyenTu: true, linhThach: true,
  viTri: true, hp: true, hpTinhAt: true,
  canCot: true, ngoTinh: true, daoTam: true, khiVan: true,
  thanHon: true, khiHuyet: true, satY: true, huyetMach: true,
} as const;

type HangNV = {
  id: string; ten: string; dao: string; linhCan: number;
  bac: number; tang: number; tuVi: number; tuLuyenTu: Date; linhThach: number;
  viTri: string; hp: number; hpTinhAt: Date;
  canCot: number; ngoTinh: number; daoTam: number; khiVan: number;
  thanHon: number; khiHuyet: number; satY: number; huyetMach: number;
};

/** Tách tám cột thuộc tính ra thành một bộ để mấy hàm thuần dùng được. */
export function boCua(r: HangNV): BoThuocTinh {
  const bo: BoThuocTinh = {};
  for (const t of THUOC_TINH) bo[t.ma] = (r as unknown as Record<string, number>)[t.ma] ?? 0;
  return bo;
}

function doiNhanVat(r: HangNV, now: number): NhanVatXem {
  const bo = boCua(r);
  const moiPhut = tuViMoiPhut(bo, r.dao, r.linhCan, r.bac);
  const kichTran = r.bac >= BAC_TOI_DA && r.tang >= SO_TANG;
  const suc = sucChien(bo, r.dao, r.bac, r.tang);
  return {
    id: r.id,
    ten: r.ten,
    dao: r.dao,
    tenDao: timDao(r.dao)?.ten ?? '—',
    linhCan: r.linhCan,
    tenLinhCan: tenLinhCan(r.linhCan),
    bac: r.bac,
    tang: r.tang,
    tenCanhGioi: tenCanhGioi(r.bac, r.tang, r.dao),
    tuVi: r.tuVi,
    tuViCan: tuViCanDe(r.bac, r.tang),
    kichTran,
    laDotPha: laDotPha(r.tang),
    thuocTinh: bo,
    linhThach: r.linhThach,
    moiPhut,
    phanTramBeQuan: phanTramBeQuan(r.tuLuyenTu.getTime(), now),
    // Kịch trần thì không gom thêm nữa, khỏi bày một con số chẳng dùng vào đâu.
    choNhan: kichTran ? 0 : tuViBeQuan(moiPhut, r.tuLuyenTu.getTime(), now),
    viTri: r.viTri,
    tenViTri: timDiaDiem(r.viTri)?.ten ?? '—',
    hp: hpHienGio(r.hp, suc.hpToiDa, r.hpTinhAt.getTime(), now),
    suc,
  };
}

/** Nhân vật của một tài khoản, chưa tạo thì null. */
export async function xemNhanVat(userId: string): Promise<NhanVatXem | null> {
  const r = await db.tienNhanVat.findUnique({ where: { userId }, select: CHON_NV });
  return r ? doiNhanVat(r, Date.now()) : null;
}

/** Tên đạo hiệu đã có ai dùng chưa. */
export async function trungTen(ten: string): Promise<boolean> {
  return (await db.tienNhanVat.count({ where: { ten } })) > 0;
}

export interface KetQuaBeQuan {
  nhan: number;
  lenTang: number;
  canhGioiMoi: string | null;
  /** Đã tới cửa đột phá, phải độ kiếp mới qua được. */
  chanDotPha: boolean;
}

/**
 * Chốt tu vi ngoại tuyến cho MỘT người.
 *
 * Chốt lười, gọi ở đầu mọi trang của game. Ba tính chất khiến nó an toàn:
 *
 *  • MỐC CŨ NẰM TRONG `where`. Hai tab cùng mở thì tab sau đếm được 0 dòng và
 *    không cộng lần thứ hai — không cần khoá hàng, không cần vòng thử lại.
 *  • KHÔNG GHI GÌ KHI CHƯA GOM ĐƯỢC TU VI NÀO. Mở lại trang trong cùng một
 *    phút thì không tốn một lượt ghi cơ sở dữ liệu nào.
 *  • DỪNG Ở CỬA ĐỘT PHÁ. Lên tầng trong cùng một bậc thì tự động, nhưng qua
 *    bậc mới thì phải độ kiếp — nên chỗ này chỉ dồn tu vi tới sát cửa rồi
 *    dừng, chứ không cho trôi qua trong lúc người chơi đang ngủ.
 */
export async function chotBeQuan(userId: string, bayGio = Date.now()): Promise<KetQuaBeQuan | null> {
  const r = await db.tienNhanVat.findUnique({ where: { userId }, select: CHON_NV });
  if (!r) return null;

  if (r.bac >= BAC_TOI_DA && r.tang >= SO_TANG) return null;

  const moiPhut = tuViMoiPhut(boCua(r), r.dao, r.linhCan, r.bac);
  const nhan = tuViBeQuan(moiPhut, r.tuLuyenTu.getTime(), bayGio);
  if (nhan <= 0) return null;

  let bac = r.bac;
  let tang = r.tang;
  let tuVi = r.tuVi + nhan;
  let lenTang = 0;
  let chanDotPha = false;

  // Tràn tu vi thì lên tầng, nhưng CHỈ trong cùng một bậc.
  for (;;) {
    const can = tuViCanDe(bac, tang);
    if (can <= 0 || tuVi < can) break;
    if (laDotPha(tang)) { chanDotPha = true; tuVi = can; break; }
    tuVi -= can;
    const ke = bacKeTiep(bac, tang);
    bac = ke.bac;
    tang = ke.tang;
    lenTang += 1;
  }

  const ghi = await db.tienNhanVat.updateMany({
    where: { id: r.id, tuLuyenTu: r.tuLuyenTu },
    data: { bac, tang, tuVi, tuLuyenTu: new Date(bayGio) },
  });
  if (ghi.count === 0) return null;

  return {
    nhan,
    lenTang,
    canhGioiMoi: lenTang > 0 ? tenCanhGioi(bac, tang, r.dao) : null,
    chanDotPha,
  };
}

// ── Thế giới và trận đánh ────────────────────────────────────────────────

export interface QuaiXem extends Quai {
  /** Số thứ tự trong ô — hai con cùng loài thì phân biệt bằng số này. */
  thu: number;
}

export interface OXem {
  ma: string;
  ten: string;
  x: number;
  y: number;
  moTa: string;
  quai: QuaiXem[];
  loiRa: ReturnType<typeof loiRaCua>;
}

/** Ô người chơi đang đứng, kèm quái và lối ra. */
export function xemO(ma: string): OXem | null {
  const d = timDiaDiem(ma);
  if (!d) return null;
  return {
    ma: d.ma, ten: d.ten, x: d.x, y: d.y, moTa: d.moTa,
    quai: d.quai
      .map((q, i) => {
        const x = timQuai(q);
        return x ? { ...x, thu: i + 1 } : null;
      })
      .filter((x): x is QuaiXem => x !== null),
    loiRa: loiRaCua(d.ma),
  };
}

export interface KeLaiTran {
  dienBien: DongTran[];
  thang: boolean;
  tenTa: string;
  tenDich: string;
  hpToiDa: number;
  hpDichDau: number;
  /** Thu được khi thắng; khi thua thì là phần tu vi mất đi (số âm). */
  tuVi: number;
  linhThach: number;
}

/** Ô đầu bản đồ — chỗ người thua trận bị đưa về. */
export { DIA_DIEM_DAU };
