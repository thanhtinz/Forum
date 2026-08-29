import { db } from './db';
import {
  CHUONG_TOI_DA, DAU_MOI_NGAY, SO_HIEP, SO_LOAI, SO_MAU,
  type ChiSo, chiSo, vuiHienGio,
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

export interface DaoRong {
  now: number;
  diem: number;
  dan: RongXem[];
  /** Số con đã sưu tầm được, tính theo cặp loài+màu chứ không theo số con nuôi. */
  daCo: number;
  /** Cặp `loài-màu` đã từng có, để tô sáng trong bộ sưu tập. */
  boSuuTap: string[];
  conLaiHomNay: number;
}

/** Mốc 00:00 giờ Việt Nam của hôm nay, tính theo UTC. */
function dauNgayVN(now: number): Date {
  const lech = 7 * 3600 * 1000;
  return new Date(Math.floor((now + lech) / 86_400_000) * 86_400_000 - lech);
}

export async function xemDao(userId: string, anChoMs: number, choiChoMs: number): Promise<DaoRong> {
  const now = Date.now();
  const [me, dan, daDau] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { points: true } }),
    db.rong.findMany({
      where: { userId },
      orderBy: [{ noAt: 'asc' }, { createdAt: 'asc' }],
      take: CHUONG_TOI_DA,
      select: chonRong,
    }),
    // Cùng nguồn với chỗ chặn ở server action — xem chú thích tại `thachDau`.
    // Đếm trên `RongTran` thì con số in ra trang cũng nói dối theo mỗi lần có
    // ai đó thả rồng.
    db.miniGamePlay.count({
      where: { userId, game: 'RONGDAU', createdAt: { gte: dauNgayVN(now) } },
    }),
  ]);

  // Bộ sưu tập tính trên MỌI con từng nở, kể cả con đã không còn nuôi nữa —
  // đã từng có thì coi như đã sưu tầm được.
  const tung = await db.rong.findMany({
    where: { userId, noAt: { not: null } },
    distinct: ['loai', 'mau'],
    take: SO_LOAI * SO_MAU,
    select: { loai: true, mau: true },
  });

  return {
    now,
    diem: me?.points ?? 0,
    dan: dan.map((r) => doiRong(r, now, anChoMs, choiChoMs)),
    daCo: tung.length,
    boSuuTap: tung.map((x) => `${x.loai}-${x.mau}`),
    conLaiHomNay: Math.max(0, DAU_MOI_NGAY - daDau),
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
