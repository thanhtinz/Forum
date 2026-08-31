import { db } from './db';
import {
  CHUONG_TOI_DA, DAU_MOI_NGAY, SO_HIEP, SO_LOAI, SO_MAU,
  type ChiSo, chiSo, dauNgayVN, mocDatDuoc, vuiHienGio,
} from './rong-const';

/**
 * Đảo rồng — phần hỏi cơ sở dữ liệu.
 *
 * Độ vui KHÔNG được ghi giảm dần bằng một tác vụ chạy nền: trò này không có
 * cron, mà có cũng không nên — thay vào đó cột `vui` giữ giá trị tại mốc
 * `vuiTinhAt`, còn phần tụt đi thì tính lúc đọc (`vuiHienGio`). Ghi lại chỉ khi
 * người chơi thật sự làm gì đó với con rồng.
 */

export interface RongXem {
  id: string;
  loai: number;
  mau: number;
  ten: string | null;
  cap: number;
  exp: number;
  vui: number;
  laTrung: boolean;
  /** Trứng nở được chưa (chỉ có nghĩa khi `laTrung`). */
  noDuoc: boolean;
  apXongLuc: number;
  anDuocLuc: number;
  choiDuocLuc: number;
  raTran: boolean;
  suc: ChiSo;
}

const chonRong = {
  id: true, loai: true, mau: true, ten: true, cap: true, exp: true,
  vui: true, vuiTinhAt: true, apXongAt: true, noAt: true,
  anLanCuoi: true, choiLanCuoi: true, raTran: true,
} as const;

type HangRong = {
  id: string; loai: number; mau: number; ten: string | null; cap: number; exp: number;
  vui: number; vuiTinhAt: Date; apXongAt: Date; noAt: Date | null;
  anLanCuoi: Date | null; choiLanCuoi: Date | null; raTran: boolean;
};

export function doiRong(r: HangRong, now: number, anChoMs: number, choiChoMs: number): RongXem {
  const vui = vuiHienGio(r.vui, r.vuiTinhAt.getTime(), now);
  return {
    id: r.id,
    loai: r.loai,
    mau: r.mau,
    ten: r.ten,
    cap: r.cap,
    exp: r.exp,
    vui,
    laTrung: r.noAt === null,
    noDuoc: r.noAt === null && now >= r.apXongAt.getTime(),
    apXongLuc: r.apXongAt.getTime(),
    anDuocLuc: (r.anLanCuoi?.getTime() ?? 0) + anChoMs,
    choiDuocLuc: (r.choiLanCuoi?.getTime() ?? 0) + choiChoMs,
    raTran: r.raTran,
    suc: chiSo({ loai: r.loai, cap: r.cap, vui }),
  };
}

/**
 * Bốn hàm đọc, mỗi trang một hàm.
 *
 * Trước đây chỉ có `xemDao()` lấy MỌI thứ cho MỘT trang: đàn rồng, bộ sưu tập
 * 54 ô, số trận còn lại, số điểm. Nay đảo tách làm sáu trang nên trang chuồng
 * không việc gì phải quét bảng sưu tầm, còn trang sưu tầm không cần biết hôm
 * nay còn mấy trận. Gọi chung một hàm to thì mỗi lần mở trang là ba câu truy
 * vấn thừa.
 */

export interface ChuongRong {
  now: number;
  /** CHỈ rồng đã nở. Trứng nằm ở trang ấp trứng. */
  dan: RongXem[];
  /** Số trứng đang ấp — để nhắc sang trang bên kia. */
  soTrung: number;
  /** Chỗ trống còn lại, tính cả trứng lẫn rồng. */
  conCho: number;
}

export async function xemChuong(userId: string, anChoMs: number, choiChoMs: number): Promise<ChuongRong> {
  const now = Date.now();
  const tatCa = await db.rong.findMany({
    where: { userId },
    orderBy: [{ raTran: 'desc' }, { createdAt: 'asc' }],
    take: CHUONG_TOI_DA,
    select: chonRong,
  });

  const daNo = tatCa.filter((r) => r.noAt !== null);
  return {
    now,
    dan: daNo.map((r) => doiRong(r, now, anChoMs, choiChoMs)),
    soTrung: tatCa.length - daNo.length,
    conCho: Math.max(0, CHUONG_TOI_DA - tatCa.length),
  };
}

export interface TrungXem {
  id: string;
  apXongLuc: number;
  noDuoc: boolean;
}

export interface OApTrung {
  now: number;
  trung: TrungXem[];
  conCho: number;
  /** Số rồng đã nở — trang ấp trứng cần biết để bày phần lai tạo. */
  soRong: number;
}

export async function xemTrung(userId: string): Promise<OApTrung> {
  const now = Date.now();
  const tatCa = await db.rong.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: CHUONG_TOI_DA,
    select: { id: true, apXongAt: true, noAt: true },
  });

  const trung = tatCa.filter((r) => r.noAt === null);
  return {
    now,
    trung: trung.map((r) => ({
      id: r.id,
      apXongLuc: r.apXongAt.getTime(),
      noDuoc: now >= r.apXongAt.getTime(),
    })),
    conCho: Math.max(0, CHUONG_TOI_DA - tatCa.length),
    soRong: tatCa.length - trung.length,
  };
}

/**
 * Đếm số cặp loài+màu đã TỪNG nở của một người.
 *
 * Nhận `tx` để gọi được cả ngoài lẫn trong transaction: lúc trứng nở phải đếm
 * lại NGAY trong cùng giao dịch, không thì có lúc `daSuuTam` đi sau sự thật.
 */
export async function demSuuTam(tx: KhachDb, userId: string): Promise<number> {
  const tung = await tx.rong.findMany({
    where: { userId, noAt: { not: null } },
    distinct: ['loai', 'mau'],
    take: SO_LOAI * SO_MAU,
    select: { loai: true },
  });
  return tung.length;
}

/** Chỗ nào cũng nhận được: `db` hay `tx` bên trong `$transaction`. */
type KhachDb = Pick<typeof db, 'rong' | 'rongNguoiChoi'>;

/**
 * Hồ sơ Đảo Rồng của một người, tự tạo nếu chưa có.
 *
 * `daSuuTam` lúc tạo lấy từ số đếm THẬT chứ không để 0: người đã nuôi rồng từ
 * trước ngày có bảng này vẫn phải thấy đúng số con mình đã sưu tầm, mà không
 * cần bộ nạp lại nào.
 */
export async function hoSoRong(userId: string) {
  const co = await db.rongNguoiChoi.findUnique({
    where: { userId },
    select: { id: true, daSuuTam: true, mocDaNhan: true },
  });
  if (co) return co;

  const daCo = await demSuuTam(db, userId);
  return db.rongNguoiChoi.upsert({
    where: { userId },
    create: { userId, daSuuTam: daCo },
    update: {},
    select: { id: true, daSuuTam: true, mocDaNhan: true },
  });
}

export interface SuuTam {
  /** Số cặp loài+màu đã từng nở. */
  daCo: number;
  /** Cặp `loài-màu` đã từng có, để tô sáng trong sổ. */
  boSuuTap: string[];
  /** Số mốc đã lĩnh thưởng. */
  mocDaNhan: number;
  /** Số mốc đủ điều kiện lĩnh — lớn hơn `mocDaNhan` là có thưởng chờ. */
  mocDatDuoc: number;
}

/**
 * Sổ sưu tầm tính trên MỌI con từng nở, kể cả con đã thả — đã từng có thì coi
 * như đã sưu tầm được.
 *
 * Cái sổ đọc THẲNG từ bảng `Rong` chứ không tin cột `daSuuTam`: cột ấy chỉ
 * sinh ra để xếp hạng. Lệch nhau thì sửa cột lại theo bảng, và chỉ ghi khi
 * thật sự lệch — mở trang không được là một lượt ghi cơ sở dữ liệu.
 */
export async function xemSuuTam(userId: string): Promise<SuuTam> {
  const [tung, ho] = await Promise.all([
    db.rong.findMany({
      where: { userId, noAt: { not: null } },
      distinct: ['loai', 'mau'],
      take: SO_LOAI * SO_MAU,
      select: { loai: true, mau: true },
    }),
    hoSoRong(userId),
  ]);

  if (ho.daSuuTam !== tung.length) {
    // Ghi có điều kiện: hai tab cùng mở thì tab sau đếm được 0 dòng và thôi.
    await db.rongNguoiChoi.updateMany({
      where: { id: ho.id, daSuuTam: ho.daSuuTam },
      data: { daSuuTam: tung.length },
    });
  }

  return {
    daCo: tung.length,
    boSuuTap: tung.map((x) => `${x.loai}-${x.mau}`),
    mocDaNhan: ho.mocDaNhan,
    mocDatDuoc: mocDatDuoc(tung.length),
  };
}

export interface RongRaTran {
  id: string;
  loai: number;
  mau: number;
  ten: string | null;
  cap: number;
  suc: ChiSo;
}

export interface SanDau {
  now: number;
  /** Con đang được cử ra trận; chưa cử con nào thì null. */
  raTran: RongRaTran | null;
  conLaiHomNay: number;
  doiThu: DoiThu[];
}

export async function xemSanDau(userId: string): Promise<SanDau> {
  const now = Date.now();
  const [cua, daDau] = await Promise.all([
    db.rong.findFirst({
      where: { userId, raTran: true, noAt: { not: null } },
      select: { id: true, loai: true, mau: true, ten: true, cap: true, vui: true, vuiTinhAt: true },
    }),
    // Cùng nguồn với chỗ chặn ở server action — xem chú thích tại `thachDau`.
    // Đếm trên `RongTran` thì con số in ra trang cũng nói dối theo mỗi lần có
    // ai đó thả rồng.
    db.miniGamePlay.count({
      where: { userId, game: 'RONGDAU', createdAt: { gte: dauNgayVN(now) } },
    }),
  ]);

  return {
    now,
    raTran: cua
      ? {
        id: cua.id, loai: cua.loai, mau: cua.mau, ten: cua.ten, cap: cua.cap,
        suc: chiSo({ loai: cua.loai, cap: cua.cap, vui: vuiHienGio(cua.vui, cua.vuiTinhAt.getTime(), now) }),
      }
      : null,
    conLaiHomNay: Math.max(0, DAU_MOI_NGAY - daDau),
    // Chưa cử con nào thì không việc gì phải đi tìm đối thủ.
    doiThu: cua ? await timDoiThu(userId) : [],
  };
}

/** Một con rồng ngẫu nhiên. Mọi cặp loài+màu đều có cơ hội như nhau. */
export function bocRongNgauNhien(): { loai: number; mau: number } {
  return {
    loai: 1 + Math.floor(Math.random() * SO_LOAI),
    mau: 1 + Math.floor(Math.random() * SO_MAU),
  };
}

// ── Đấu trường ───────────────────────────────────────────────────────────

export interface Hiep {
  hiep: number;
  aDanh: number;
  bDanh: number;
  aMau: number;
  bMau: number;
}

export interface KetQuaTran {
  dienBien: Hiep[];
  /** 'a' | 'b' | 'hoa' */
  ai: 'a' | 'b' | 'hoa';
}

/**
 * Đánh ba hiệp rồi tính ai còn nhiều máu hơn.
 *
 * Có ngẫu nhiên, nhưng ngẫu nhiên trong một khoảng hẹp (±20%) và luôn gây ít
 * nhất 1 sát thương: con mạnh hơn phải thắng phần lớn số trận, chứ nếu may rủi
 * quyết định tất thì chăm rồng thành vô nghĩa. `nhanh` cho cơ hội né hẳn một
 * đòn, đó là chỗ để loài nhanh có đường thắng loài dày.
 */
export function danhNhau(a: ChiSo, b: ChiSo, tungXu: () => number = Math.random): KetQuaTran {
  const MAU_DAU = 100;
  let aMau = MAU_DAU;
  let bMau = MAU_DAU;
  const dienBien: Hiep[] = [];

  const motDon = (ben: ChiSo, doi: ChiSo): number => {
    // Né: chênh lệch nhanh càng lớn thì càng dễ né, nhưng không bao giờ quá 40%.
    const coNe = Math.min(0.4, Math.max(0, (doi.nhanh - ben.nhanh) / 100));
    if (tungXu() < coNe) return 0;
    const thoc = ben.cong * 2 - doi.thu;
    const bienDo = 0.8 + tungXu() * 0.4;
    return Math.max(1, Math.round(thoc * bienDo));
  };

  for (let i = 1; i <= SO_HIEP; i++) {
    const aDanh = motDon(a, b);
    bMau = Math.max(0, bMau - aDanh);
    const bDanh = bMau > 0 ? motDon(b, a) : 0;
    aMau = Math.max(0, aMau - bDanh);
    dienBien.push({ hiep: i, aDanh, bDanh, aMau, bMau });
    if (aMau === 0 || bMau === 0) break;
  }

  const ai = aMau === bMau ? 'hoa' : aMau > bMau ? 'a' : 'b';
  return { dienBien, ai };
}

export interface DoiThu {
  rongId: string;
  ten: string;
  chuTen: string;
  chuUsername: string;
  loai: number;
  mau: number;
  cap: number;
  suc: ChiSo;
}

/**
 * Tìm đối thủ: rồng của người KHÁC, đã nở, đang được cử ra trận.
 *
 * Lọc ngay trong `where` chứ không lấy về rồi loại: rồng của chính mình lọt vào
 * danh sách là tự đánh mình, mà rồng chưa nở thì chưa có chỉ số nào để đánh.
 */
export async function timDoiThu(userId: string, soLuong = 6): Promise<DoiThu[]> {
  const now = Date.now();
  const rows = await db.rong.findMany({
    where: { userId: { not: userId }, noAt: { not: null }, raTran: true },
    orderBy: { createdAt: 'desc' },
    take: soLuong,
    select: {
      id: true, loai: true, mau: true, ten: true, cap: true, vui: true, vuiTinhAt: true,
      // Chỉ lấy tên để hiện và tên đăng nhập để trỏ link — id của chủ nhân
      // không dùng tới, mà đây là dữ liệu của NGƯỜI KHÁC nên lấy vừa đủ.
      user: { select: { name: true, username: true } },
    },
  });

  return rows.map((r) => {
    const vui = vuiHienGio(r.vui, r.vuiTinhAt.getTime(), now);
    return {
      rongId: r.id,
      ten: r.ten ?? '',
      chuTen: r.user.name ?? r.user.username ?? 'Ẩn danh',
      chuUsername: r.user.username ?? '',
      loai: r.loai,
      mau: r.mau,
      cap: r.cap,
      suc: chiSo({ loai: r.loai, cap: r.cap, vui }),
    };
  });
}
