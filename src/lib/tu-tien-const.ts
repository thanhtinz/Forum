/**
 * Vạn Đạo Tu Tiên — hằng số và mấy phép tính thuần.
 *
 * VÀ KHÔNG IMPORT GÌ CẢ. Đây là ràng buộc chịu lực chứ không phải sở thích:
 * bài kiểm `.mjs` nạp thẳng tệp này, mà Node chỉ bóc kiểu chứ không giải được
 * alias `@/` lẫn đường dẫn tương đối thiếu đuôi — thêm một dòng `import` là
 * bài kiểm không chạy nữa. `rong-const.ts` và `pokemon-const.ts` giữ đúng luật
 * ấy vì cùng lý do.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * VÌ SAO GAME NÀY KHÔNG CÓ ẢNH NHÂN VẬT
 *
 * Đây là dòng game chữ. Bên Trung Quốc gọi nó là 文字修仙 và nguyên tắc lõi
 * của cả dòng là 文字即界面 — CHỮ CHÍNH LÀ GIAO DIỆN: tu luyện, luyện đan,
 * tham ngộ và đánh nhau đều hiện ra bằng dòng chữ chạy chứ không phải bằng
 * hoạt cảnh. Bên Nga, dòng wap MMORPG (Бойцовский клуб, Carnage, MIST) —
 * cùng dòng dõi với JohnCMS mà cả trang này dựng lại — cũng xử trận ở máy chủ
 * rồi trả về một bản NHẬT KÝ TRẬN dạng bảng.
 *
 * Nên chỗ nào cần hình thì để một cột đường dẫn ảnh (`anh`) đứng sẵn, còn
 * giao diện thì phải đọc được KHI CỘT ẤY RỖNG. Ngày có bộ ảnh thì đổ vào dữ
 * liệu, không sửa một dòng mã nào.
 */

/** Thư mục ảnh của game, hiện chưa có tệp nào. */
export const ANH_TU_TIEN = '/tu-tien';

// ── Thuộc tính nhân vật ──────────────────────────────────────────────────

/**
 * Tám thuộc tính, đúng bảng ở mục 3 của GDD.
 *
 * Mỗi thuộc tính phải có ÍT NHẤT MỘT chỗ ăn vào luật chơi ngay từ đợt đầu,
 * không thì nó chỉ là con số trang trí trên màn hình tạo nhân vật. Cột `dung`
 * ghi rõ chỗ ấy, và bài kiểm soi chính cột này.
 */
export interface ThuocTinh {
  ma: string;
  ten: string;
  moTa: string;
  /** Nó ăn vào đâu trong luật chơi. */
  dung: string;
}

export const THUOC_TINH: readonly ThuocTinh[] = [
  { ma: 'canCot', ten: 'Căn Cốt', moTa: 'Nền tảng thân thể và khả năng hấp thụ.', dung: 'Tốc độ tu vi' },
  { ma: 'ngoTinh', ten: 'Ngộ Tính', moTa: 'Khả năng lĩnh ngộ.', dung: 'Tốc độ tu vi, mastery công pháp' },
  { ma: 'daoTam', ten: 'Đạo Tâm', moTa: 'Ổn định tinh thần.', dung: 'Tỉ lệ qua thiên kiếp' },
  { ma: 'khiVan', ten: 'Khí Vận', moTa: 'Xác suất gặp cơ duyên.', dung: 'Cơ duyên khi bế quan' },
  { ma: 'thanHon', ten: 'Thần Hồn', moTa: 'Sức mạnh linh hồn.', dung: 'Chống tâm ma, khống chế' },
  { ma: 'khiHuyet', ten: 'Khí Huyết', moTa: 'Nền tảng thể chất.', dung: 'Máu và hồi phục' },
  { ma: 'satY', ten: 'Sát Ý', moTa: 'Sát phạt tích luỹ.', dung: 'Ma đạo và Tu La' },
  { ma: 'huyetMach', ten: 'Huyết Mạch', moTa: 'Đặc tính dòng máu.', dung: 'Yêu luyện, biến dị' },
] as const;

export type MaThuocTinh = (typeof THUOC_TINH)[number]['ma'];

/**
 * Một lượt gieo thuộc tính.
 *
 * Tổng CỐ ĐỊNH, chỉ khác nhau ở cách chia. Gieo tự do thì có người ra bộ
 * thuộc tính hơn hẳn người khác ngay từ giây đầu tiên, mà đây là game dài —
 * chênh nhau ở vạch xuất phát thì đuổi cả tháng không kịp.
 */
export const TONG_THUOC_TINH = 80;
export const THUOC_TINH_TOI_THIEU = 5;
export const THUOC_TINH_TOI_DA = 18;

export type BoThuocTinh = Record<string, number>;

/**
 * Gieo một bộ thuộc tính hợp lệ.
 *
 * `tungXu` bơm được để bài kiểm chốt kết quả — cùng lối `danhNhau` và
 * `bocTrungLai` bên Đảo Rồng.
 */
export function gieoThuocTinh(tungXu: () => number = Math.random): BoThuocTinh {
  const ma = THUOC_TINH.map((t) => t.ma);
  const bo: BoThuocTinh = {};
  for (const m of ma) bo[m] = THUOC_TINH_TOI_THIEU;

  let conLai = TONG_THUOC_TINH - THUOC_TINH_TOI_THIEU * ma.length;
  // Rải từng điểm một vào ô còn chỗ. Chậm hơn chia tỉ lệ nhưng KHÔNG BAO GIỜ
  // vượt trần, mà trần là thứ giữ cho không ai gieo ra một bộ dị dạng.
  let vong = 0;
  while (conLai > 0 && vong < 10_000) {
    vong += 1;
    const i = Math.floor(tungXu() * ma.length);
    const m = ma[Math.min(ma.length - 1, Math.max(0, i))]!;
    if (bo[m]! >= THUOC_TINH_TOI_DA) continue;
    bo[m] = bo[m]! + 1;
    conLai -= 1;
  }
  return bo;
}

/** Tổng của một bộ, để soát lại. */
export function tongBo(bo: BoThuocTinh): number {
  return THUOC_TINH.reduce((s, t) => s + (bo[t.ma] ?? 0), 0);
}

/** Đạo hiệu tối đa bấy nhiêu ký tự. */
export const TEN_TOI_DA = 20;

/**
 * Đạo hiệu — chỉ chặn thứ rõ ràng không phải tên.
 *
 * Để ở đây chứ không ở tệp server action: tệp `'use server'` chỉ được export
 * hàm async, mà hàm này thì cả máy chủ lẫn trình duyệt đều cần gọi.
 */
export function loiTenDao(ten: string): string | null {
  const t = ten.trim();
  if (t.length < 2) return 'Đạo hiệu phải có ít nhất hai ký tự.';
  if (t.length > TEN_TOI_DA) return `Đạo hiệu tối đa ${TEN_TOI_DA} ký tự.`;
  if (/[<>]/.test(t)) return 'Đạo hiệu không được chứa dấu < hoặc >.';
  return null;
}

// ── Linh căn ─────────────────────────────────────────────────────────────

/**
 * Năm linh căn chính và ba dị linh căn, đúng mục 3 của GDD.
 *
 * Dị linh căn hiếm hơn và mạnh hơn một chút, nhưng KHÔNG khoá cứng người
 * chơi: GDD nói thẳng "linh căn nên có cơ chế mở rộng về sau". Ở đợt này nó
 * chỉ đổi hệ số hiệu suất, chưa khoá công pháp nào.
 */
export interface LinhCan {
  id: number;
  ten: string;
  /** Dị linh căn — hiếm hơn. */
  di: boolean;
  /** Nhân vào hiệu suất tu luyện. */
  heSo: number;
}

export const LINH_CAN: readonly LinhCan[] = [
  { id: 1, ten: 'Kim', di: false, heSo: 1 },
  { id: 2, ten: 'Mộc', di: false, heSo: 1 },
  { id: 3, ten: 'Thuỷ', di: false, heSo: 1 },
  { id: 4, ten: 'Hoả', di: false, heSo: 1 },
  { id: 5, ten: 'Thổ', di: false, heSo: 1 },
  { id: 6, ten: 'Băng', di: true, heSo: 1.12 },
  { id: 7, ten: 'Lôi', di: true, heSo: 1.12 },
  { id: 8, ten: 'Phong', di: true, heSo: 1.12 },
] as const;

/** Dị linh căn ra với tỉ lệ này khi gieo. */
export const TI_LE_DI_LINH_CAN = 0.18;

export function tenLinhCan(id: number): string {
  return LINH_CAN.find((x) => x.id === id)?.ten ?? '—';
}

export function heSoLinhCan(id: number): number {
  return LINH_CAN.find((x) => x.id === id)?.heSo ?? 1;
}

export function gieoLinhCan(tungXu: () => number = Math.random): number {
  const di = tungXu() < TI_LE_DI_LINH_CAN;
  const bo = LINH_CAN.filter((x) => x.di === di);
  const i = Math.floor(tungXu() * bo.length);
  return bo[Math.min(bo.length - 1, Math.max(0, i))]!.id;
}

// ── Năm đại đạo ──────────────────────────────────────────────────────────

/**
 * Năm đạo, đúng bảng mục 5 của GDD.
 *
 * Nguyên tắc số một của GDD: "5 đạo phải có cơ chế lõi khác nhau, không chỉ
 * đổi tên tài nguyên." Ở đợt này mới có phần TU LUYỆN, nên chỗ khác nhau nằm
 * ở thuộc tính nào nuôi tốc độ tu vi của đạo ấy — Luyện Thể ăn Căn Cốt và Khí
 * Huyết, Linh Tu ăn Ngộ Tính, Ma Luyện ăn Sát Ý… Cơ chế chiến đấu riêng của
 * từng đạo là việc của đợt sau, và `manh`/`yeu` dưới đây là bản mô tả trước
 * cho nó.
 */
export interface Dao {
  ma: string;
  ten: string;
  taiNguyen: string;
  loiChoi: string;
  manh: string;
  yeu: string;
  /** Hai thuộc tính nuôi tốc độ tu vi của đạo này. */
  nuoi: [string, string];
  /** Chỗ cắm ảnh, rỗng thì giao diện dựng bằng chữ. Xem đầu tệp. */
  anh: string;
}

export const DAO: readonly Dao[] = [
  {
    ma: 'the', ten: 'Luyện Thể', taiNguyen: 'Khí Huyết, Thể Lực',
    loiChoi: 'Cận chiến, chịu đòn, phá giáp',
    manh: 'Sinh tồn, khó bị ngắt đòn', yeu: 'Tầm đánh ngắn',
    nuoi: ['canCot', 'khiHuyet'], anh: '',
  },
  {
    ma: 'linh', ten: 'Linh Tu', taiNguyen: 'Linh Lực, Thần Thức',
    loiChoi: 'Pháp thuật, nguyên tố, khống chế',
    manh: 'Đa dụng', yeu: 'Dễ bị áp sát',
    nuoi: ['ngoTinh', 'thanHon'], anh: '',
  },
  {
    ma: 'ma', ten: 'Ma Luyện', taiNguyen: 'Ma Khí, Ma Tâm',
    loiChoi: 'Hút máu, gây suy yếu, bùng nổ',
    manh: 'Sát thương và duy trì', yeu: 'Phản phệ, tâm ma',
    nuoi: ['satY', 'thanHon'], anh: '',
  },
  {
    ma: 'yeu', ten: 'Yêu Luyện', taiNguyen: 'Yêu Lực, Huyết Mạch',
    loiChoi: 'Biến hình, tiến hoá',
    manh: 'Thích nghi, biến dị', yeu: 'Phụ thuộc huyết mạch',
    nuoi: ['huyetMach', 'canCot'], anh: '',
  },
  {
    ma: 'tula', ten: 'Tu La', taiNguyen: 'Sát Khí, Chiến Ý',
    loiChoi: 'Càng đánh càng mạnh',
    manh: 'Trận dài, đấu người', yeu: 'Mất đà là mất sức',
    nuoi: ['satY', 'canCot'], anh: '',
  },
] as const;

export type MaDao = (typeof DAO)[number]['ma'];

export function timDao(ma: string): Dao | null {
  return DAO.find((d) => d.ma === ma) ?? null;
}

// ── Cảnh giới ────────────────────────────────────────────────────────────

/**
 * Ba đại cảnh giới đầu, mỗi cái bốn tầng — đúng phạm vi MVP mà chính GDD chốt
 * ở mục 29 ("cảnh giới đầu").
 *
 * Tên cảnh giới KHÁC NHAU THEO ĐẠO, đúng bảng mục 4: cùng một bậc mà Linh Tu
 * gọi là Trúc Cơ, Luyện Thể gọi là Thiết Cốt, còn Ma/Yêu/Tu La thì Ma Tướng /
 * Yêu Tướng / Tu La Tướng. Đây không phải chuyện đặt tên cho vui — người chơi
 * đọc cảnh giới của người khác là biết ngay họ đi đạo nào.
 */
export interface BacCanhGioi {
  bac: number;
  /** Tên theo từng đạo, khoá là `Dao.ma`. */
  ten: Record<string, string>;
  /** Tu vi cần cho MỖI tầng của bậc này. */
  tuViMoiTang: number;
}

export const TANG_TEN = ['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ', 'Viên mãn'] as const;
export const SO_TANG = TANG_TEN.length;

export const CANH_GIOI: readonly BacCanhGioi[] = [
  {
    bac: 1, tuViMoiTang: 120,
    ten: { the: 'Đoán Thể', linh: 'Luyện Khí', ma: 'Ma Đồ', yeu: 'Yêu Linh', tula: 'Tu La Đồ' },
  },
  {
    bac: 2, tuViMoiTang: 420,
    ten: { the: 'Thiết Cốt', linh: 'Trúc Cơ', ma: 'Ma Tướng', yeu: 'Yêu Tướng', tula: 'Tu La Tướng' },
  },
  {
    bac: 3, tuViMoiTang: 1_100,
    ten: { the: 'Ngọc Cốt', linh: 'Kim Đan', ma: 'Ma Vương', yeu: 'Yêu Vương', tula: 'Tu La Vương' },
  },
] as const;

export const BAC_TOI_DA = CANH_GIOI.length;

export function timBac(bac: number): BacCanhGioi | null {
  return CANH_GIOI.find((c) => c.bac === bac) ?? null;
}

/** Ví dụ: "Trúc Cơ Hậu kỳ". Bậc hoặc tầng sai thì trả về chuỗi trung tính. */
export function tenCanhGioi(bac: number, tang: number, dao: string): string {
  const c = timBac(bac);
  const t = TANG_TEN[tang - 1];
  if (!c || !t) return 'Phàm nhân';
  return `${c.ten[dao] ?? c.ten.linh} ${t}`;
}

/** Tu vi cần để lên tầng kế tiếp. Đã kịch trần thì trả 0. */
export function tuViCanDe(bac: number, tang: number): number {
  const c = timBac(bac);
  if (!c) return 0;
  if (bac >= BAC_TOI_DA && tang >= SO_TANG) return 0;
  // Tầng sau trong cùng một bậc đắt dần, để tầng Viên mãn là cả một chặng chứ
  // không phải bốn nhịp bằng nhau.
  return Math.round(c.tuViMoiTang * (1 + (tang - 1) * 0.45));
}

/** Bậc và tầng kế tiếp. Đã kịch trần thì trả về chính nó. */
export function bacKeTiep(bac: number, tang: number): { bac: number; tang: number } {
  if (tang < SO_TANG) return { bac, tang: tang + 1 };
  if (bac < BAC_TOI_DA) return { bac: bac + 1, tang: 1 };
  return { bac, tang };
}

/** Lên bậc mới (không phải chỉ lên tầng) mới gọi là ĐỘT PHÁ, phải độ kiếp. */
export function laDotPha(tang: number): boolean {
  return tang >= SO_TANG;
}

// ── Tu luyện ─────────────────────────────────────────────────────────────

/**
 * Tu vi mỗi phút.
 *
 * Hai thuộc tính NUÔI của đạo cộng vào, linh căn nhân vào, cảnh giới càng cao
 * càng chậm — đúng lẽ tu tiên, và cũng là thứ giữ cho chặng sau không trôi
 * qua trong một buổi tối.
 */
export const TU_VI_NEN = 1.2;

export function tuViMoiPhut(
  bo: BoThuocTinh, dao: string, linhCan: number, bac: number,
): number {
  const d = timDao(dao);
  if (!d) return 0;
  const nuoi = d.nuoi.reduce((s, m) => s + (bo[m] ?? 0), 0);
  const chamDan = 1 / (1 + (bac - 1) * 0.75);
  return Math.max(0.1, (TU_VI_NEN + nuoi * 0.16) * heSoLinhCan(linhCan) * chamDan);
}

/**
 * Trần tu luyện ngoại tuyến.
 *
 * GDD mục 27: `reward = min(duration, cap) × rate`. Có trần thì người vào mỗi
 * ngày một lần không bị bỏ lại quá xa, mà cũng không ai bỏ game một tháng rồi
 * quay lại thành cao thủ.
 */
export const BE_QUAN_TRAN_MS = 12 * 60 * 60 * 1000;

/**
 * Tu vi gom được trong quãng ngoại tuyến.
 *
 * Hàm THUẦN, nhận mốc từ máy chủ. GDD mục 27 nói thẳng: "Không tin timestamp
 * từ client" — nên chỗ gọi phải truyền `bayGio` của máy chủ vào đây.
 */
export function tuViBeQuan(
  moiPhut: number, tuLuc: number, bayGio: number, tranMs = BE_QUAN_TRAN_MS,
): number {
  const troi = Math.min(Math.max(0, bayGio - tuLuc), tranMs);
  return Math.floor((troi / 60_000) * moiPhut);
}

/** Phần trăm đã đầy của trần bế quan, để vẽ thanh tiến độ. */
export function phanTramBeQuan(tuLuc: number, bayGio: number, tranMs = BE_QUAN_TRAN_MS): number {
  const troi = Math.min(Math.max(0, bayGio - tuLuc), tranMs);
  return Math.round((troi / tranMs) * 100);
}
