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

// ── Hệ màu ───────────────────────────────────────────────────────────────

/**
 * Token màu, lấy đúng bảng ở mục 6 của bản UX/UI Blueprint.
 *
 * Để ở đây chứ không chỉ trong CSS vì hai chỗ cần tới: CSS dựng lớp áo, còn
 * mã thì cần màu accent CỦA TỪNG ĐẠO để gắn vào khung — blueprint chốt "mỗi
 * đạo có accent riêng nhưng dùng chung token", và đó là một trong năm nguyên
 * tắc hiển thị ("năm đạo phải khác nhau").
 */
export const MAU = {
  ink950: '#0B1020',
  ink800: '#151C32',
  jade: '#5ED6B3',
  gold: '#E7B85B',
  crimson: '#D85C68',
} as const;

/** Accent của từng đạo, đúng bảng token. */
export const MAU_DAO: Record<string, string> = {
  the: '#A8B3C2',
  linh: '#6DB7FF',
  ma: '#B58BFF',
  yeu: '#82C878',
  tula: '#F4A261',
};

export function mauDao(ma: string): string {
  return MAU_DAO[ma] ?? MAU.jade;
}

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

// ── Thế giới ─────────────────────────────────────────────────────────────

/**
 * Bản đồ là một LƯỚI TOẠ ĐỘ đi bằng liên kết chữ.
 *
 * Lối này học từ mấy game wap Trung Quốc cùng dòng: một màn hình là một danh
 * sách dọc — tên địa điểm kèm toạ độ, thứ có ở ô ấy, rồi "chọn lối ra" ghi rõ
 * mỗi hướng dẫn đi đâu. Không cần một tấm ảnh nào mà vẫn ra thế giới, và trên
 * màn hình điện thoại hẹp thì đọc dễ hơn hẳn một tấm bản đồ vẽ.
 *
 * LỐI RA SUY RA TỪ TOẠ ĐỘ, không khai tay: hai ô kề nhau thì đi được. Khai
 * tay thì sẽ có ngày một ô trỏ sang ô không tồn tại, hoặc trỏ một chiều — mà
 * lỗi ấy nhìn bảng dữ liệu không thấy được.
 */
export interface DiaDiem {
  ma: string;
  ten: string;
  x: number;
  y: number;
  moTa: string;
  /** Mã quái xuất hiện ở ô này, lặp mã là ô ấy có nhiều con cùng loại. */
  quai: readonly string[];
}

export const BAN_DO_TEN = 'Thanh Vân Sơn';

export const DIA_DIEM: readonly DiaDiem[] = [
  { ma: 'chan-nui', ten: 'Chân núi', x: 0, y: 0, moTa: 'Đường mòn lên núi bắt đầu từ đây.', quai: [] },
  { ma: 'rung-truc', ten: 'Rừng trúc', x: 1, y: 0, moTa: 'Trúc mọc kín, gió đi qua nghe như tiếng người.', quai: ['thao-khau', 'thao-khau'] },
  { ma: 'khe-suoi', ten: 'Khe suối', x: 2, y: 0, moTa: 'Nước chảy xiết, đá trơn.', quai: ['thao-khau', 'lang-yeu'] },
  { ma: 'doc-da', ten: 'Dốc đá', x: 0, y: 1, moTa: 'Dốc dựng, phải bám đá mà lên.', quai: ['lang-yeu'] },
  { ma: 'mieu-hoang', ten: 'Miếu hoang', x: 1, y: 1, moTa: 'Miếu bỏ lâu năm, nhang tàn còn vương mùi.', quai: ['am-linh', 'am-linh'] },
  { ma: 'ho-nuoc', ten: 'Hồ nước', x: 2, y: 1, moTa: 'Mặt hồ phẳng lặng tới mức khó chịu.', quai: ['giao-xa'] },
  { ma: 'vach-gio', ten: 'Vách gió', x: 0, y: 2, moTa: 'Gió cắt mặt, đứng lâu không nổi.', quai: ['am-linh', 'giao-xa'] },
  { ma: 'rung-thong', ten: 'Rừng thông', x: 1, y: 2, moTa: 'Thông già, rễ nổi ngang lối đi.', quai: ['giao-xa', 'thiet-bi-hung'] },
  { ma: 'dinh-vong-nguyet', ten: 'Đỉnh Vọng Nguyệt', x: 2, y: 2, moTa: 'Trên này nhìn thấy hết chân núi.', quai: ['thiet-bi-hung'] },
] as const;

export const DIA_DIEM_DAU = 'chan-nui';

export function timDiaDiem(ma: string): DiaDiem | null {
  return DIA_DIEM.find((d) => d.ma === ma) ?? null;
}

/** Bốn hướng, đặt theo lối bản đồ giấy: bắc là y lớn hơn. */
export const HUONG = [
  { ma: 'bac', ten: 'Bắc', dx: 0, dy: 1 },
  { ma: 'nam', ten: 'Nam', dx: 0, dy: -1 },
  { ma: 'dong', ten: 'Đông', dx: 1, dy: 0 },
  { ma: 'tay', ten: 'Tây', dx: -1, dy: 0 },
] as const;

export interface LoiRa {
  huong: string;
  tenHuong: string;
  ma: string;
  ten: string;
}

/** Các lối ra của một ô, suy thẳng từ toạ độ. */
export function loiRaCua(ma: string): LoiRa[] {
  const d = timDiaDiem(ma);
  if (!d) return [];
  const ra: LoiRa[] = [];
  for (const h of HUONG) {
    const ke = DIA_DIEM.find((x) => x.x === d.x + h.dx && x.y === d.y + h.dy);
    if (ke) ra.push({ huong: h.ma, tenHuong: h.ten, ma: ke.ma, ten: ke.ten });
  }
  return ra;
}

/** Hai ô có kề nhau không — dùng để chặn nhảy cóc từ phía máy chủ. */
export function keNhau(tu: string, den: string): boolean {
  return loiRaCua(tu).some((r) => r.ma === den);
}

// ── Quái ─────────────────────────────────────────────────────────────────

export interface Quai {
  ma: string;
  ten: string;
  cap: number;
  hp: number;
  cong: number;
  thu: number;
  nhanh: number;
  /** Thưởng khi hạ được. */
  tuVi: number;
  linhThach: number;
}

export const QUAI: readonly Quai[] = [
  { ma: 'thao-khau', ten: 'Thảo khấu', cap: 1, hp: 60, cong: 8, thu: 4, nhanh: 6, tuVi: 18, linhThach: 4 },
  { ma: 'lang-yeu', ten: 'Lang yêu', cap: 3, hp: 95, cong: 13, thu: 6, nhanh: 11, tuVi: 34, linhThach: 8 },
  { ma: 'am-linh', ten: 'Âm linh', cap: 5, hp: 130, cong: 18, thu: 9, nhanh: 8, tuVi: 56, linhThach: 13 },
  { ma: 'giao-xa', ten: 'Giao xà', cap: 8, hp: 190, cong: 24, thu: 14, nhanh: 10, tuVi: 92, linhThach: 21 },
  { ma: 'thiet-bi-hung', ten: 'Thiết Bí Hùng', cap: 12, hp: 280, cong: 33, thu: 22, nhanh: 7, tuVi: 150, linhThach: 34 },
] as const;

export function timQuai(ma: string): Quai | null {
  return QUAI.find((q) => q.ma === ma) ?? null;
}

// ── Chiến đấu ────────────────────────────────────────────────────────────

/**
 * Máu tối đa và ba chỉ số ra trận.
 *
 * Suy từ thuộc tính và cảnh giới, KHÔNG lưu thành cột: lưu chỉ số suy ra được
 * chính là thứ ép phải chạy migration mỗi lần cân bằng lại.
 */
export interface SucChien {
  hpToiDa: number;
  cong: number;
  thu: number;
  nhanh: number;
}

export function sucChien(bo: BoThuocTinh, dao: string, bac: number, tang: number): SucChien {
  const nen = (bac - 1) * SO_TANG + tang;
  const kh = bo.khiHuyet ?? 0;
  const cc = bo.canCot ?? 0;
  const nt = bo.ngoTinh ?? 0;
  const th = bo.thanHon ?? 0;
  const sy = bo.satY ?? 0;
  const hm = bo.huyetMach ?? 0;

  // Mỗi đạo lấy sức từ chỗ khác nhau, đúng bảng tài nguyên lõi ở mục 5 GDD.
  const theo: Record<string, { cong: number; thu: number; nhanh: number; mau: number }> = {
    the: { cong: cc * 0.9 + kh * 0.5, thu: kh * 1.1 + cc * 0.4, nhanh: cc * 0.3, mau: 14 },
    linh: { cong: nt * 1.1 + th * 0.5, thu: th * 0.6, nhanh: nt * 0.5, mau: 8 },
    ma: { cong: sy * 1.0 + th * 0.6, thu: th * 0.5 + kh * 0.3, nhanh: sy * 0.4, mau: 9 },
    yeu: { cong: hm * 0.9 + cc * 0.5, thu: hm * 0.6 + kh * 0.4, nhanh: hm * 0.6, mau: 11 },
    tula: { cong: sy * 1.0 + cc * 0.6, thu: cc * 0.5, nhanh: sy * 0.5 + cc * 0.3, mau: 10 },
  };
  const t = theo[dao] ?? theo.linh!;

  return {
    hpToiDa: Math.round(40 + nen * t.mau + kh * 2.5),
    cong: Math.max(1, Math.round(4 + nen * 1.6 + t.cong)),
    thu: Math.max(1, Math.round(2 + nen * 0.9 + t.thu)),
    nhanh: Math.max(1, Math.round(3 + nen * 0.7 + t.nhanh)),
  };
}

/** Máu hồi mỗi giờ khi không đánh nhau. */
export const HP_HOI_MOI_GIO = 12;

export function hpHienGio(hp: number, hpToiDa: number, tinhLuc: number, bayGio: number): number {
  const gio = Math.max(0, (bayGio - tinhLuc) / 3_600_000);
  return Math.max(0, Math.min(hpToiDa, Math.round(hp + gio * HP_HOI_MOI_GIO)));
}

export const SO_HIEP_TOI_DA = 12;

/** Ma tâm dâng chừng này mỗi hiệp, và cắn ngược khi vượt mốc dưới. */
export const MA_TAM_MOI_HIEP = 18;
export const MA_TAM_PHAN_PHE = 55;

/** Một dòng nhật ký trận. */
export interface DongTran {
  hiep: number;
  /** Ai ra đòn. */
  ben: 'ta' | 'dich';
  /** Câu kể, đã viết sẵn thành tiếng Việt. */
  cau: string;
  satThuong: number;
  hpTa: number;
  hpDich: number;
}

export interface KetQuaTran {
  dienBien: DongTran[];
  thang: boolean;
  /** Máu còn lại của mình sau trận. */
  hpConLai: number;
}

/**
 * Đánh nhau, xử ở máy chủ rồi trả về NHẬT KÝ TRẬN.
 *
 * Đây là hình thức của cả hai dòng game mà bản thiết kế này dựa vào — game
 * chữ Trung Quốc và wap MMORPG Nga đều làm y hệt: trình duyệt không mô phỏng
 * gì cả, nó chỉ đọc lại một bản ghi.
 *
 * NĂM ĐẠO CÓ NĂM CƠ CHẾ KHÁC NHAU, không phải năm cái tên của cùng một phép
 * trừ. Đây là nguyên tắc số một của GDD ("5 đạo phải có cơ chế lõi khác nhau,
 * không chỉ đổi tên tài nguyên"), nên chỗ này là chỗ phải làm cho đúng:
 *
 *   Luyện Thể  PHÁ GIÁP tích theo đòn — mỗi đòn trúng bào mòn thủ của địch,
 *              càng đánh lâu càng xuyên. Đổi lại ra đòn chậm.
 *   Linh Tu    LINH LỰC có hạn — pháp thuật mạnh nhưng tiêu linh lực, hết thì
 *              chỉ còn đòn thường yếu hẳn. Phải biết dừng.
 *   Ma Luyện   MA TÂM tự dâng theo từng đòn — càng cao càng mạnh, nhưng quá
 *              ngưỡng thì phản phệ, tự mất máu. Kèm hút máu.
 *   Yêu Luyện  BIẾN HÌNH theo ngưỡng máu — nhân hình, bán yêu, nguyên hình;
 *              mỗi dạng một bộ chỉ số. Càng bị dồn càng đổi dạng.
 *   Tu La      CHIẾN Ý tích theo đòn TRÚNG — càng đánh trúng càng mạnh, mà
 *              trượt một đòn là tụt hẳn. Được đà thì cuốn, mất đà thì thôi.
 *
 * `tungXu` bơm được để bài kiểm chốt kết quả.
 */
export function danhQuai(
  ta: SucChien, hpTa: number, quai: Quai, dao: string,
  tungXu: () => number = Math.random,
): KetQuaTran {
  const dienBien: DongTran[] = [];
  let mauTa = Math.max(1, hpTa);
  let mauDich = quai.hp;

  // Trạng thái riêng của từng đạo.
  let phaGiap = 0;
  let linhLuc = Math.round(ta.cong * 2.2);
  let maTam = 0;
  let chienY = 0;
  let dang = 0; // 0 nhân hình, 1 bán yêu, 2 nguyên hình

  const them = (hiep: number, ben: 'ta' | 'dich', cau: string, satThuong: number) => {
    dienBien.push({ hiep, ben, cau, satThuong, hpTa: mauTa, hpDich: mauDich });
  };

  for (let hiep = 1; hiep <= SO_HIEP_TOI_DA && mauTa > 0 && mauDich > 0; hiep += 1) {
    // ── Lượt của mình ────────────────────────────────────────────────
    let cong = ta.cong;
    let thuDich = quai.thu;
    let cau = '';
    let tuThuong = 0;
    let hut = 0;

    if (dao === 'the') {
      thuDich = Math.max(0, quai.thu - phaGiap);
      cau = phaGiap > 0
        ? `dồn sức đấm tới, giáp địch đã mòn ${phaGiap} tầng`
        : 'nghiến răng lao vào cận chiến';
    } else if (dao === 'linh') {
      if (linhLuc >= 10) {
        linhLuc -= 10;
        cong = Math.round(cong * 1.55);
        cau = `vận linh lực phóng pháp thuật (còn ${linhLuc} linh lực)`;
      } else {
        cong = Math.round(cong * 0.6);
        cau = 'cạn linh lực, chỉ còn đánh chay';
      }
    } else if (dao === 'ma') {
      /*
       * Ma tâm phải DÂNG ĐỦ NHANH để cái giá của nó thật sự tới.
       *
       * Bản đầu dâng 14 mỗi hiệp và phản phệ ở mốc 70, tức phải sang hiệp thứ
       * sáu mới cắn ngược — mà phần lớn trận kết thúc trước đó, nên rủi ro chỉ
       * có trên giấy còn thực tế toàn phần thưởng. Bài kiểm bắt được đúng chỗ
       * ấy. Nay dâng 18 và cắn từ mốc 55, nên một trận vừa phải là đã phải trả
       * giá — đúng như bảng ở mục 11 của GDD, nơi ma tâm 41–70 đã "bắt đầu
       * xuất hiện tâm ma".
       */
      maTam = Math.min(100, maTam + MA_TAM_MOI_HIEP);
      cong = Math.round(cong * (1 + maTam / 130));
      cau = `ma khí dâng lên, ma tâm ${maTam}`;
      if (maTam > MA_TAM_PHAN_PHE) {
        tuThuong = Math.round(ta.hpToiDa * 0.04);
        cau += ' — phản phệ cắn ngược';
      }
    } else if (dao === 'yeu') {
      const conLai = mauTa / ta.hpToiDa;
      const dangMoi = conLai < 0.35 ? 2 : conLai < 0.7 ? 1 : 0;
      if (dangMoi > dang) {
        dang = dangMoi;
        cau = dang === 2 ? 'huyết mạch bùng lên, hiện nguyên hình' : 'nửa người nửa thú, vuốt mọc dài';
      } else {
        cau = ['ra đòn bằng tay không', 'chồm tới cào một nhát', 'gầm một tiếng rồi vồ'][dang]!;
      }
      cong = Math.round(cong * [1, 1.25, 1.55][dang]!);
    } else {
      // Tu La
      cong = Math.round(cong * (1 + chienY * 0.12));
      cau = chienY > 0 ? `chiến ý ${chienY} tầng, đao càng lúc càng nặng` : 'nhập trận, đao vừa rút';
    }

    // Né: chênh lệch nhanh, không bao giờ quá 35%.
    const neDich = Math.min(0.35, Math.max(0, (quai.nhanh - ta.nhanh) / 110));
    let satThuong = 0;
    if (tungXu() < neDich) {
      if (dao === 'tula') chienY = 0;
      them(hiep, 'ta', `${cau}, nhưng địch né được`, 0);
    } else {
      const thoc = cong * 2 - thuDich;
      satThuong = Math.max(1, Math.round(thoc * (0.85 + tungXu() * 0.3)));
      mauDich = Math.max(0, mauDich - satThuong);
      if (dao === 'the') phaGiap = Math.min(quai.thu, phaGiap + 3);
      if (dao === 'tula') chienY = Math.min(6, chienY + 1);
      if (dao === 'ma') hut = Math.round(satThuong * 0.22);
      them(hiep, 'ta', cau, satThuong);
    }

    if (tuThuong > 0) {
      mauTa = Math.max(1, mauTa - tuThuong);
      them(hiep, 'ta', `ma khí phản phệ, tự mất ${tuThuong} máu`, 0);
    }
    if (hut > 0 && mauTa < ta.hpToiDa) {
      mauTa = Math.min(ta.hpToiDa, mauTa + hut);
      them(hiep, 'ta', `hút về ${hut} máu`, 0);
    }
    if (mauDich <= 0) break;

    // ── Lượt của quái ────────────────────────────────────────────────
    const neTa = Math.min(0.35, Math.max(0, (ta.nhanh - quai.nhanh) / 110));
    // Câu kể KHÔNG mang tên: chỗ hiển thị đã in tên rồi, nhét vào đây nữa là
    // ra "Âm linh Âm linh phản kích".
    if (tungXu() < neTa) {
      them(hiep, 'dich', 'bổ tới, bị né', 0);
    } else {
      const thoc = quai.cong * 2 - ta.thu;
      const st = Math.max(1, Math.round(thoc * (0.85 + tungXu() * 0.3)));
      mauTa = Math.max(0, mauTa - st);
      them(hiep, 'dich', 'phản kích', st);
    }
  }

  return { dienBien, thang: mauDich <= 0 && mauTa > 0, hpConLai: mauTa };
}

/** Thua thì mất chừng này phần tu vi đang có. */
export const PHAT_THUA = 0.1;
