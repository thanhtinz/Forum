import { db } from './db';
import { grantPoints } from './points';
import {
  CHUONG_TOI_DA, DAU_MOI_NGAY, DIEM_DAU_DAU, LAI_CAP_TOI_THIEU, LAI_CHO_MS,
  LAI_TOI_DA, LECH_CAP, NGUONG_CHO_AN, SO_DOI_THU, SO_LOAI, SO_MAU,
  TANG_HANG, THE_LUC_CHOI, THE_LUC_HANG,
  type ChiSo, type Hiep, chiSo, dauNgayVN, hangTheoDiemRong, mocDatDuoc,
  muaCua, noHienGio, theLucHienGio, vuiHienGio,
} from './rong-const';

/*
 * `danhNhau` và `bocRongNgauNhien` nằm ở `rong-const.ts` chứ không ở đây.
 *
 * Cả hai là hàm THUẦN — luật chơi, không đụng cơ sở dữ liệu — mà tệp này thì
 * `import { db }`, nên bài kiểm `.mjs` (nạp thẳng tệp hằng số, không giải được
 * alias `@/`) sẽ không với tới được. Riêng `danhNhau` có sẵn tham số `tungXu`
 * để bơm ngẫu nhiên cố định vào, đúng để bài kiểm chốt kết quả một trận; để nó
 * ở tệp không kiểm được thì tham số ấy vô nghĩa.
 *
 * Xuất lại ở đây cho chỗ gọi khỏi phải biết nó nằm đâu.
 */
export { bocRongNgauNhien, danhNhau } from './rong-const';
export type { Hiep, KetQuaTran } from './rong-const';

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
  /** Ba trục chăm sóc, đã tính cả phần trôi đi tới `now`. */
  vui: number;
  doNo: number;
  theLuc: number;
  laTrung: boolean;
  /** Trứng nở được chưa (chỉ có nghĩa khi `laTrung`). */
  noDuoc: boolean;
  apXongLuc: number;
  /** Đủ đói để ăn chưa. Thay hẳn cho cái hẹn giờ nửa tiếng trước đây. */
  anDuoc: boolean;
  /** Còn đủ thể lực để chơi không. */
  choiDuoc: boolean;
  raTran: boolean;
  doi: number;
  suc: ChiSo;
}

const chonRong = {
  id: true, loai: true, mau: true, ten: true, cap: true, exp: true,
  vui: true, vuiTinhAt: true, doNo: true, noTinhAt: true,
  theLuc: true, lucTinhAt: true,
  apXongAt: true, noAt: true, raTran: true, doi: true,
} as const;

type HangRong = {
  id: string; loai: number; mau: number; ten: string | null; cap: number; exp: number;
  vui: number; vuiTinhAt: Date; doNo: number; noTinhAt: Date;
  theLuc: number; lucTinhAt: Date;
  apXongAt: Date; noAt: Date | null; raTran: boolean; doi: number;
};

export function doiRong(r: HangRong, now: number): RongXem {
  const vui = vuiHienGio(r.vui, r.vuiTinhAt.getTime(), now);
  const doNo = noHienGio(r.doNo, r.noTinhAt.getTime(), now);
  const theLuc = theLucHienGio(r.theLuc, r.lucTinhAt.getTime(), now);
  return {
    id: r.id,
    loai: r.loai,
    mau: r.mau,
    ten: r.ten,
    cap: r.cap,
    exp: r.exp,
    vui,
    doNo,
    theLuc,
    laTrung: r.noAt === null,
    noDuoc: r.noAt === null && now >= r.apXongAt.getTime(),
    apXongLuc: r.apXongAt.getTime(),
    anDuoc: doNo < NGUONG_CHO_AN,
    choiDuoc: theLuc >= THE_LUC_CHOI,
    raTran: r.raTran,
    doi: r.doi,
    suc: chiSo({ loai: r.loai, cap: r.cap, vui, doi: r.doi, doNo }),
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

export async function xemChuong(userId: string): Promise<ChuongRong> {
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
    dan: daNo.map((r) => doiRong(r, now)),
    soTrung: tatCa.length - daNo.length,
    conCho: Math.max(0, CHUONG_TOI_DA - tatCa.length),
  };
}

export interface TrungXem {
  id: string;
  apXongLuc: number;
  noDuoc: boolean;
}

/** Một con rồng xét ở góc độ "có lai được không". */
export interface ChaMeXem {
  id: string;
  ten: string | null;
  loai: number;
  mau: number;
  cap: number;
  doi: number;
  soLanLai: number;
  /** Lai lại được kể từ lúc này. */
  laiDuocLuc: number;
  /** Đủ mọi điều kiện của riêng nó chưa (chưa xét con còn lại). */
  sanSang: boolean;
}

export interface OApTrung {
  now: number;
  trung: TrungXem[];
  conCho: number;
  /** Rồng đã nở, để chọn cặp lai. */
  chaMe: ChaMeXem[];
}

export async function xemTrung(userId: string): Promise<OApTrung> {
  const now = Date.now();
  const tatCa = await db.rong.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    take: CHUONG_TOI_DA,
    select: {
      id: true, apXongAt: true, noAt: true, ten: true, loai: true, mau: true,
      cap: true, doi: true, soLanLai: true, laiLanCuoi: true,
    },
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
    chaMe: tatCa.filter((r) => r.noAt !== null).map((r) => {
      const laiDuocLuc = (r.laiLanCuoi?.getTime() ?? 0) + LAI_CHO_MS;
      return {
        id: r.id, ten: r.ten, loai: r.loai, mau: r.mau, cap: r.cap,
        doi: r.doi, soLanLai: r.soLanLai, laiDuocLuc,
        sanSang: r.cap >= LAI_CAP_TOI_THIEU && r.soLanLai < LAI_TOI_DA && now >= laiDuocLuc,
      };
    }),
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
const CHON_HO_SO = {
  id: true, daSuuTam: true, mocDaNhan: true, tangHang: true,
  diemDau: true, muaDau: true, thangDau: true, thuaDau: true, hoaDau: true,
} as const;

export async function hoSoRong(userId: string) {
  const co = await db.rongNguoiChoi.findUnique({ where: { userId }, select: CHON_HO_SO });
  if (co) return co;

  const daCo = await demSuuTam(db, userId);
  return db.rongNguoiChoi.upsert({
    where: { userId },
    create: { userId, daSuuTam: daCo },
    update: {},
    select: CHON_HO_SO,
  });
}

/**
 * Chốt mùa cũ cho MỘT người, chốt lười lúc họ mở trang đấu trường.
 *
 * Đảo này không có tác vụ nền nào — cũng không nên có: một mùa giải là thứ chỉ
 * cần đúng vào lúc người chơi nhìn vào nó. Cùng khuôn `chotMuaDau` của Đảo
 * Pokémon, kể cả chỗ mùa cũ nằm trong `where` để hai tab không phát thưởng
 * hai lần.
 *
 * Trả về phần thưởng vừa phát, hoặc null nếu chưa tới mùa mới.
 */
export async function chotMuaRong(userId: string, now = new Date()) {
  const mua = muaCua(now);
  const ho = await hoSoRong(userId);

  // Lần đầu tiên: chỉ ghi mùa hiện tại, không phát thưởng cho một mùa chưa đánh.
  if (ho.muaDau === 0) {
    await db.rongNguoiChoi.updateMany({
      where: { id: ho.id, muaDau: 0 }, data: { muaDau: mua },
    });
    return null;
  }
  if (ho.muaDau >= mua) return null;

  const hang = hangTheoDiemRong(ho.diemDau);

  // Đặt lại mùa VÀ phát thưởng trong cùng một giao dịch: tách ra thì có lúc
  // mùa đã sang mà tiền chưa về, và không có đường nào phát bù nữa.
  const phat = await db.$transaction(async (tx) => {
    const ghi = await tx.rongNguoiChoi.updateMany({
      where: { id: ho.id, muaDau: ho.muaDau },
      data: {
        muaDau: mua, diemDau: DIEM_DAU_DAU,
        thangDau: 0, thuaDau: 0, hoaDau: 0,
      },
    });
    if (ghi.count === 0) return false;

    if (hang) {
      await grantPoints({
        userId, amount: hang.thuong, reason: 'RONG_THANG',
        note: `Kết mùa đấu trường rồng — hạng ${hang.ten}`,
      }, tx);
    }
    return true;
  });
  if (!phat) return null;

  return { hang, diemCu: ho.diemDau, muaCu: ho.muaDau };
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
  vui: number;
  doNo: number;
  theLuc: number;
  suc: ChiSo;
}

export interface SanDau {
  now: number;
  /** Con đang được cử ra trận; chưa cử con nào thì null. */
  raTran: RongRaTran | null;
  conLaiHomNay: number;
  doiThu: DoiThu[];
  /** Chỉ số mùa này của chính người chơi. */
  diemDau: number;
  thangDau: number;
  thuaDau: number;
  hoaDau: number;
  tenHang: string | null;
  /** Mùa vừa chốt, nếu lượt mở trang này chính là lượt chốt. */
  chotMua: { ten: string | null; thuong: number; diemCu: number } | null;
}

export async function xemSanDau(userId: string): Promise<SanDau> {
  const now = Date.now();
  // Chốt mùa TRƯỚC khi đọc chỉ số: chốt sau thì trang này bày điểm mùa cũ
  // đúng một lượt tải, rồi tự đổi khi bấm lại — nhìn ra một con số nhảy loạn.
  const daChot = await chotMuaRong(userId, new Date(now));
  const ho = await hoSoRong(userId);

  const [cua, daDau] = await Promise.all([
    db.rong.findFirst({
      where: { userId, raTran: true, noAt: { not: null } },
      select: {
        id: true, loai: true, mau: true, ten: true, cap: true, doi: true,
        vui: true, vuiTinhAt: true, doNo: true, noTinhAt: true,
        theLuc: true, lucTinhAt: true,
      },
    }),
    // Cùng nguồn với chỗ chặn ở server action — xem chú thích tại `thachDau`.
    // Đếm trên `RongTran` thì con số in ra trang cũng nói dối theo mỗi lần có
    // ai đó thả rồng.
    db.rongLuotDau.count({
      where: { userId, createdAt: { gte: dauNgayVN(now) } },
    }),
  ]);

  return {
    now,
    raTran: cua
      ? {
        id: cua.id, loai: cua.loai, mau: cua.mau, ten: cua.ten, cap: cua.cap,
        vui: vuiHienGio(cua.vui, cua.vuiTinhAt.getTime(), now),
        doNo: noHienGio(cua.doNo, cua.noTinhAt.getTime(), now),
        theLuc: theLucHienGio(cua.theLuc, cua.lucTinhAt.getTime(), now),
        suc: chiSo({
          loai: cua.loai, cap: cua.cap, doi: cua.doi,
          vui: vuiHienGio(cua.vui, cua.vuiTinhAt.getTime(), now),
          doNo: noHienGio(cua.doNo, cua.noTinhAt.getTime(), now),
        }),
      }
      : null,
    conLaiHomNay: Math.max(0, DAU_MOI_NGAY - daDau),
    // Chưa cử con nào thì không việc gì phải đi tìm đối thủ.
    doiThu: cua ? await timDoiThu(userId, cua.cap) : [],
    diemDau: ho.diemDau,
    thangDau: ho.thangDau,
    thuaDau: ho.thuaDau,
    hoaDau: ho.hoaDau,
    tenHang: hangTheoDiemRong(ho.diemDau)?.ten ?? null,
    chotMua: daChot
      ? { ten: daChot.hang?.ten ?? null, thuong: daChot.hang?.thuong ?? 0, diemCu: daChot.diemCu }
      : null,
  };
}

// ── Đấu trường ───────────────────────────────────────────────────────────

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

const CHON_DOI_THU = {
  id: true, loai: true, mau: true, ten: true, cap: true, doi: true,
  vui: true, vuiTinhAt: true, doNo: true, noTinhAt: true,
  // Chỉ lấy tên để hiện và tên đăng nhập để trỏ link — id của chủ nhân không
  // dùng tới, mà đây là dữ liệu của NGƯỜI KHÁC nên lấy vừa đủ.
  user: { select: { name: true, username: true } },
} as const;

/**
 * Tìm đối thủ: rồng của người KHÁC, đã nở, đang được cử ra trận, và GẦN CẤP.
 *
 * Ba điều kiện đầu lọc ngay trong `where` chứ không lấy về rồi loại: rồng của
 * chính mình lọt vào danh sách là tự đánh mình, mà rồng chưa nở thì chưa có
 * chỉ số nào để đánh.
 *
 * Điều kiện thứ tư là chỗ vừa sửa. Trước đây hàm này lấy sáu con MỚI NHẤT bất
 * kể cấp, nên rồng cấp 1 mở trang ra gặp toàn cấp 30 — thua chắc, mà vẫn mất
 * đủ 25 điểm ghi danh mỗi trận. Nay quét trong khoảng `±LECH_CAP` trước; chỉ
 * khi không đủ người mới nới ra, vì một đấu trường trống trơn còn tệ hơn một
 * trận chênh cấp.
 */
export async function timDoiThu(
  userId: string, capCuaToi: number, soLuong = SO_DOI_THU,
): Promise<DoiThu[]> {
  const now = Date.now();
  const chung = { userId: { not: userId }, noAt: { not: null }, raTran: true } as const;

  const gan = await db.rong.findMany({
    where: { ...chung, cap: { gte: capCuaToi - LECH_CAP, lte: capCuaToi + LECH_CAP } },
    orderBy: { createdAt: 'desc' },
    take: soLuong,
    select: CHON_DOI_THU,
  });

  // Nới ra cho đủ danh sách. `notIn` để khỏi bày hai lần cùng một con.
  const thieu = soLuong - gan.length;
  const xa = thieu > 0
    ? await db.rong.findMany({
      where: { ...chung, id: { notIn: gan.map((r) => r.id) } },
      orderBy: { createdAt: 'desc' },
      take: thieu,
      select: CHON_DOI_THU,
    })
    : [];

  // Xếp lại theo độ chênh cấp: con gần cấp nhất đứng đầu, để người chơi bấm
  // trúng đối thủ vừa sức mà không phải dò cả danh sách.
  const rows = [...gan, ...xa].sort(
    (x, y) => Math.abs(x.cap - capCuaToi) - Math.abs(y.cap - capCuaToi),
  );

  return rows.map((r) => {
    const vui = vuiHienGio(r.vui, r.vuiTinhAt.getTime(), now);
    const doNo = noHienGio(r.doNo, r.noTinhAt.getTime(), now);
    return {
      rongId: r.id,
      ten: r.ten ?? '',
      chuTen: r.user.name ?? r.user.username ?? 'Ẩn danh',
      chuUsername: r.user.username ?? '',
      loai: r.loai,
      mau: r.mau,
      cap: r.cap,
      suc: chiSo({ loai: r.loai, cap: r.cap, vui, doi: r.doi, doNo }),
    };
  });
}

// ── Cửa hàng ─────────────────────────────────────────────────────────────

/** Một con rồng (hoặc quả trứng) làm đích cho món đồ. */
export interface DichDungDo {
  id: string;
  ten: string | null;
  loai: number;
  mau: number;
  cap: number;
  laTrung: boolean;
}

export interface CuaHangRong {
  diem: number;
  /** Món đang có trong túi: mã → số lượng. Món chưa có thì không xuất hiện. */
  tui: Record<string, number>;
  dan: DichDungDo[];
}

export async function xemCuaHang(userId: string): Promise<CuaHangRong> {
  const [me, tui, dan] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { points: true } }),
    db.rongDo.findMany({
      where: { chuId: userId, soLuong: { gt: 0 } },
      // Danh sách món là hằng số đóng, nên trần này không bao giờ chạm tới —
      // vẫn đặt vì mọi truy vấn danh sách trong repo đều phải có trần.
      take: 50,
      select: { ma: true, soLuong: true },
    }),
    db.rong.findMany({
      where: { userId },
      orderBy: [{ noAt: 'asc' }, { createdAt: 'asc' }],
      take: CHUONG_TOI_DA,
      select: { id: true, ten: true, loai: true, mau: true, cap: true, noAt: true },
    }),
  ]);

  return {
    diem: me?.points ?? 0,
    tui: Object.fromEntries(tui.map((d) => [d.ma, d.soLuong])),
    dan: dan.map((r) => ({
      id: r.id, ten: r.ten, loai: r.loai, mau: r.mau, cap: r.cap, laTrung: r.noAt === null,
    })),
  };
}

// ── Kể lại trận ──────────────────────────────────────────────────────────

/** Một bên trên màn kể lại trận. */
export interface BenDau {
  ten: string;
  loai: number;
  mau: number;
  cap: number;
}

/**
 * Đủ thứ để dựng lại một trận đấu trên màn hình.
 *
 * `RongTran.dienBien` ghi đủ từng hiệp từ ngày đầu mà KHÔNG nơi nào đọc — trận
 * đấu xong chỉ hiện đúng một dòng "thắng rồi, được 25 điểm". Kiểu này là chỗ
 * để cả server action lẫn trang lịch sử cùng dựng một màn kể.
 */
export interface KeLaiTran {
  id?: string;
  dienBien: Hiep[];
  ai: 'a' | 'b' | 'hoa';
  a: BenDau;
  b: BenDau;
  /** Điểm diễn đàn bên thách đấu được (âm nếu thua). */
  duoc: number;
  /** Điểm Elo bên thách đấu được (âm nếu thua, 0 nếu hoà). */
  diemDoi?: number;
  luc?: number;
}

const MOI_TRANG_TRAN = 8;

export interface LichSuTran {
  tran: KeLaiTran[];
  tong: number;
}

/**
 * Lịch sử đấu của một người.
 *
 * Chỉ còn lại trận của những con rồng ĐANG NUÔI: `RongTran` cascade theo cả
 * hai con, mà thả rồng thì lúc nào cũng thả được. Đó là chủ ý — trần trận mỗi
 * ngày đếm ở `RongLuotDau` chính vì thế (xem chú thích tại `thachDau`).
 */
export async function lichSuTran(
  userId: string, trang: number, moiTrang = MOI_TRANG_TRAN,
): Promise<LichSuTran> {
  const cua = await db.rong.findMany({
    where: { userId }, take: CHUONG_TOI_DA, select: { id: true },
  });
  if (cua.length === 0) return { tran: [], tong: 0 };

  const ids = cua.map((r) => r.id);
  const loc = { OR: [{ aId: { in: ids } }, { bId: { in: ids } }] };
  const chonBen = { select: { loai: true, mau: true, ten: true, cap: true } };

  const [tong, rows] = await Promise.all([
    db.rongTran.count({ where: loc }),
    db.rongTran.findMany({
      where: loc,
      // Khoá phụ `id`: hai trận cùng mốc thời gian mà không có khoá phụ thì
      // thứ tự giữa hai lần đọc có thể đảo, và phân trang sẽ nhảy dòng.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: Math.max(0, (trang - 1) * moiTrang),
      take: moiTrang,
      select: {
        id: true, thangId: true, duoc: true, createdAt: true, dienBien: true,
        diemDoi: true, aId: true, a: chonBen, b: chonBen,
      },
    }),
  ]);

  return {
    tong,
    tran: rows.map((t) => ({
      id: t.id,
      dienBien: (Array.isArray(t.dienBien) ? t.dienBien : []) as unknown as Hiep[],
      ai: t.thangId === null ? 'hoa' : t.thangId === t.aId ? 'a' : 'b',
      a: { ten: t.a.ten ?? '', loai: t.a.loai, mau: t.a.mau, cap: t.a.cap },
      b: { ten: t.b.ten ?? '', loai: t.b.loai, mau: t.b.mau, cap: t.b.cap },
      duoc: t.duoc,
      diemDoi: t.diemDoi,
      luc: t.createdAt.getTime(),
    })),
  };
}

export { MOI_TRANG_TRAN };

// ── Hang Rồng ────────────────────────────────────────────────────────────

/** Một tầng hang, kèm trạng thái của riêng người đang xem. */
export interface TangXem {
  so: number;
  ten: string;
  loai: number;
  mau: number;
  cap: number;
  thuong: number;
  expThuong: number;
  roi?: string;
  /** Chỉ số con canh cửa — bày sẵn để người chơi liệu sức trước khi vào. */
  suc: ChiSo;
  /** Đã vượt chưa. */
  daQua: boolean;
  /** Đúng tầng tiếp theo phải đánh. */
  keTiep: boolean;
}

export interface HangXem {
  tangCaoNhat: number;
  theLucHang: number;
  /** Con đang cử ra trận — cũng là con vào hang. */
  raTran: RongRaTran | null;
  tang: TangXem[];
}

/**
 * Hang Rồng.
 *
 * Dùng CHUNG con "đang ra trận" với đấu trường chứ không cho chọn riêng: một
 * người chỉ cử được một con, và có hai chỗ chọn con khác nhau thì người chơi
 * phải nhớ mình đang cử con nào ở đâu.
 */
export async function xemHang(userId: string): Promise<HangXem> {
  const now = Date.now();
  const [ho, cua] = await Promise.all([
    hoSoRong(userId),
    db.rong.findFirst({
      where: { userId, raTran: true, noAt: { not: null } },
      select: {
        id: true, loai: true, mau: true, ten: true, cap: true, doi: true,
        vui: true, vuiTinhAt: true, doNo: true, noTinhAt: true,
        theLuc: true, lucTinhAt: true,
      },
    }),
  ]);

  return {
    tangCaoNhat: ho.tangHang,
    theLucHang: THE_LUC_HANG,
    raTran: cua
      ? {
        id: cua.id, loai: cua.loai, mau: cua.mau, ten: cua.ten, cap: cua.cap,
        vui: vuiHienGio(cua.vui, cua.vuiTinhAt.getTime(), now),
        doNo: noHienGio(cua.doNo, cua.noTinhAt.getTime(), now),
        theLuc: theLucHienGio(cua.theLuc, cua.lucTinhAt.getTime(), now),
        suc: chiSo({
          loai: cua.loai, cap: cua.cap, doi: cua.doi,
          vui: vuiHienGio(cua.vui, cua.vuiTinhAt.getTime(), now),
          doNo: noHienGio(cua.doNo, cua.noTinhAt.getTime(), now),
        }),
      }
      : null,
    // Con canh cửa luôn no đủ và vui vẻ: nó là thước đo, mà thước đo thì phải
    // đứng yên — để nó cũng đói dần thì mỗi hôm một khác, không ai liệu được.
    tang: TANG_HANG.map((t) => ({
      ...t,
      suc: chiSo({ loai: t.loai, cap: t.cap, vui: 100 }),
      daQua: t.so <= ho.tangHang,
      keTiep: t.so === ho.tangHang + 1,
    })),
  };
}
