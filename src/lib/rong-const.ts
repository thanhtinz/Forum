/**
 * Đảo rồng — hằng số và mấy phép tính thuần.
 *
 * Tệp này KHÔNG đụng cơ sở dữ liệu, nên trang, server action lẫn bài kiểm đều
 * gọi được, và mọi con số cân bằng trò chơi nằm gọn một chỗ để còn chỉnh.
 *
 * VÀ KHÔNG IMPORT GÌ CẢ. Đây là ràng buộc chịu lực chứ không phải sở thích:
 * bài kiểm `.mjs` nạp thẳng tệp này, mà Node chỉ bóc kiểu chứ không giải được
 * alias `@/` lẫn đường dẫn tương đối thiếu đuôi — thêm một dòng `import` là
 * bài kiểm không chạy nữa. `pokemon-const.ts` giữ đúng luật ấy vì cùng lý do.
 */

/** Thư mục ảnh lấy từ mã nguồn JohnCMS cũ. */
export const ANH_RONG = '/hoai-niem/rong';

export const SO_LOAI = 9;
export const SO_MAU = 6;
/** Sưu tầm đủ là chừng này con. */
export const DU_BO = SO_LOAI * SO_MAU;

// ── Ngũ hành ─────────────────────────────────────────────────────────────

/**
 * Năm hệ theo ngũ hành, và vòng TƯƠNG KHẮC khép kín:
 *
 *   Kim → Mộc → Thổ → Thuỷ → Hoả → Kim
 *
 * Vì sao cần: trước đây chín loài chỉ khác nhau ở ba con số công/thủ/nhanh
 * lệch qua lệch lại, nên chọn con nào ra trận cũng gần như nhau và sổ sưu tầm
 * chỉ là gom cho đủ. Có khắc chế thì mỗi con trong sổ là một quân bài — gặp
 * đối thủ hệ Hoả thì lôi con hệ Thuỷ ra.
 *
 * Chọn ngũ hành chứ không bịa ra hệ mới vì nó là một vòng ĐÓNG và ai cũng
 * thuộc: mỗi hệ khắc đúng một hệ và bị đúng một hệ khắc, không có hệ nào mạnh
 * hơn hệ nào. Bịa bảng khắc chế tự do là kiểu gì cũng có hệ hoá ra trội hẳn.
 */
export const HE = [
  { id: 1, ten: 'Kim', mau: '#c9a227', khac: 2 },
  { id: 2, ten: 'Mộc', mau: '#3f9d4f', khac: 5 },
  { id: 3, ten: 'Thuỷ', mau: '#2f7fd0', khac: 4 },
  { id: 4, ten: 'Hoả', mau: '#e0562f', khac: 1 },
  { id: 5, ten: 'Thổ', mau: '#9a6b3f', khac: 3 },
] as const;

export type MaHe = (typeof HE)[number]['id'];

/**
 * Hệ của một loài.
 *
 * Suy ra từ số hiệu loài chứ không lưu thành cột: hệ là thuộc tính của LOÀI,
 * không phải của từng con — lưu lại là mở đường cho hai con cùng loài mà khác
 * hệ, và mấy trận đã ghi từ trước cũng đọc ra hệ được ngay.
 */
export function heCua(loai: number): MaHe {
  return LOAI.find((x) => x.id === loai)?.he ?? 1;
}

export function tenHe(he: number): string {
  return HE.find((h) => h.id === he)?.ten ?? '—';
}

export function mauHe(he: number): string {
  return HE.find((h) => h.id === he)?.mau ?? '#888';
}

/** Đánh vào hệ mình khắc thì mạnh thêm chừng này. */
export const HE_KHAC = 1.5;
/** Đánh vào hệ khắc mình thì yếu đi chừng này. */
export const HE_BI_KHAC = 0.7;

/**
 * Hệ số sát thương khi bên hệ `ben` đánh vào bên hệ `doi`.
 *
 * Không cộng dồn: hai hệ không khắc nhau thì đúng 1, không có nửa vời.
 */
export function heSoKhac(ben: number, doi: number): number {
  if (HE.find((h) => h.id === ben)?.khac === doi) return HE_KHAC;
  if (HE.find((h) => h.id === doi)?.khac === ben) return HE_BI_KHAC;
  return 1;
}

/**
 * Chín loài, đặt tên theo đúng hình vẽ trong bộ ảnh gốc.
 *
 * `manh` là thiên hướng của loài, cộng thẳng vào chỉ số lúc đấu — để chín loài
 * đánh nhau ra khác nhau chứ không phải chín bộ da đổi màu.
 *
 * `he` gán theo NGHĨA CỦA CÁI TÊN chứ không rải cho đều: Hoả Long thở lửa thì
 * phải là Hoả, Thanh Long là rồng phương Đông nên đúng hành Mộc theo sách,
 * Rồng Giáp vảy dày như áo giáp thì là Kim. Vì thế năm hệ không chia đều chín
 * loài — Hoả chỉ có một mình Hoả Long, và đó là chủ ý.
 */
export interface Loai {
  id: number;
  ten: string;
  moTa: string;
  /** Cộng vào công / thủ / nhanh. Tổng ba số luôn là 0 cho công bằng. */
  manh: { cong: number; thu: number; nhanh: number };
  /** Hệ ngũ hành, quyết định khắc chế lúc đánh. */
  he: MaHe;
}

export const LOAI: readonly Loai[] = [
  { id: 1, ten: 'Rồng Giáp', moTa: 'Đứng hai chân, vảy dày như áo giáp.', manh: { cong: 0, thu: 3, nhanh: -3 }, he: 1 },
  { id: 2, ten: 'Rồng Mập', moTa: 'Tròn trịa, hiền lành, dai sức lạ thường.', manh: { cong: -2, thu: 4, nhanh: -2 }, he: 5 },
  { id: 3, ten: 'Dực Long', moTa: 'Cánh da mỏng, bay nhanh như tên bắn.', manh: { cong: 1, thu: -4, nhanh: 3 }, he: 2 },
  { id: 4, ten: 'Sư Long', moTa: 'Mình sư tử, cánh chim, dáng đi kiêu hãnh.', manh: { cong: 3, thu: 0, nhanh: -3 }, he: 1 },
  { id: 5, ten: 'Miêu Long', moTa: 'Nhỏ như mèo, nghịch ngợm, né đòn rất tài.', manh: { cong: -3, thu: -1, nhanh: 4 }, he: 3 },
  { id: 6, ten: 'Hoả Long', moTa: 'Rồng phương Tây cổ điển, thở ra lửa.', manh: { cong: 4, thu: -1, nhanh: -3 }, he: 4 },
  { id: 7, ten: 'Thiên Long', moTa: 'Cánh rộng, dáng thanh, đủ đường đều khá.', manh: { cong: 1, thu: 1, nhanh: -2 }, he: 5 },
  { id: 8, ten: 'Thanh Long', moTa: 'Rồng phương Đông, mình dài uốn lượn giữa mây.', manh: { cong: 2, thu: 1, nhanh: -3 }, he: 2 },
  { id: 9, ten: 'Xà Long', moTa: 'Thân rắn cuộn tròn, ra đòn hiểm.', manh: { cong: 3, thu: -2, nhanh: -1 }, he: 3 },
] as const;

export const MAU_TEN = ['Lam', 'Bạch', 'Lục', 'Tía', 'Kim', 'Huyền'] as const;

export function tenRong(loai: number, mau: number): string {
  const l = LOAI.find((x) => x.id === loai);
  return l ? `${l.ten} ${MAU_TEN[mau - 1] ?? ''}`.trim() : 'Rồng lạ';
}

export function anhRong(loai: number, mau: number): string {
  return `${ANH_RONG}/${loai}/${mau}.gif`;
}

export const ANH_TRUNG = `${ANH_RONG}/trung.gif`;
export const ANH_BONG = `${ANH_RONG}/ball.png`;
/** Lọ máu 20×20 của bộ ảnh gốc, đặt cạnh thanh máu ở màn kể lại trận. */
export const ANH_HP = `${ANH_RONG}/hp.png`;

// ── Giá cả và thời gian ──────────────────────────────────────────────────

/** Giá một quả trứng. */
export const GIA_TRUNG = 80;
/** Trứng nở sau chừng này. Bản gốc để 12 giờ; giữ nguyên cho đúng vị. */
export const AP_MS = 12 * 60 * 60 * 1000;
/** Trả thêm chừng này điểm thì trứng nở ngay. */
export const GIA_NO_NGAY = 40;

/** Nuôi tối đa mấy con một lúc — kể cả trứng chưa nở. */
export const CHUONG_TOI_DA = 6;

// ── Ba trục chăm sóc ─────────────────────────────────────────────────────

/**
 * Vui, no, thể lực.
 *
 * TRƯỚC ĐÂY con rồng chỉ có MỘT trục là độ vui, còn hai việc chăm sóc thì
 * chặn bằng hai cái hẹn giờ vô hình — "cho ăn xong chờ nửa tiếng", "chơi xong
 * chờ hai mươi phút". Hai cái hẹn ấy chẳng nói lên điều gì về con rồng, người
 * chơi chỉ thấy nút mờ đi mà không hiểu vì sao.
 *
 * Nay chính hai trục mới làm việc chặn ấy, và chặn thì có nghĩa:
 *
 *   cho ăn   chỉ khi con rồng CHƯA NO   (no tụt dần, hai chục tiếng thì cạn)
 *   chơi     tốn THỂ LỰC                (thể lực hồi dần, mười ba tiếng đầy)
 *
 * Ba trục kéo lẫn nhau chứ không cùng đi xuống một nhịp: vui và no tụt, thể
 * lực hồi; mà chơi thì được vui nhưng mất lực. Bỏ bê cả hai thì con rồng ra
 * trận chỉ còn hơn một phần ba sức.
 */
export const TOI_DA_CHAM = 100;

export const GIA_AN = 12;
export const EXP_MOI_BUA = 18;
/** Một bữa no thêm chừng này. */
export const NO_MOI_BUA = 35;
/** Còn no hơn mức này thì nó không ăn nữa. */
export const NGUONG_CHO_AN = 90;
/** Độ no tụt chừng này mỗi giờ. */
export const NO_TUT_MOI_GIO = 5;

/** Chơi bóng không mất điểm, nhưng tốn thể lực. */
export const THE_LUC_CHOI = 10;
export const VUI_MOI_LAN = 20;
export const EXP_MOI_LAN_CHOI = 6;

/** Độ vui tụt chừng này mỗi giờ nếu bỏ bê. */
export const VUI_TUT_MOI_GIO = 4;
/** Thể lực hồi chừng này mỗi giờ. */
export const LUC_HOI_MOI_GIO = 8;

export const CAP_TOI_DA = 30;
/** Kinh nghiệm cần để lên cấp `cap` tiếp theo. */
export function expCanDe(cap: number): number {
  return 40 + (cap - 1) * 28;
}

// ── Xếp hạng và mùa giải ─────────────────────────────────────────────────

/** Chênh lệch giờ Việt Nam so với UTC, tính bằng mili giây. */
export const LECH_GIO_VN = 7 * 3600 * 1000;

/**
 * Điểm đấu trường kiểu Elo.
 *
 * Chép công thức từ `pokemon-const.ts` chứ không import — xem ràng buộc "không
 * import gì" ở đầu tệp. Bốn dòng số học, chép rẻ hơn là phá vỡ ràng buộc ấy;
 * và hai đảo cân bằng riêng nên có ngày hai bản số sẽ khác nhau thật.
 */
export const DIEM_DAU_DAU = 1000;
export const HE_SO_K = 32;

/** Điểm mới của cả hai bên sau một trận. Trả về cả hai để chỗ gọi ghi một lượt. */
export function diemSauTran(
  cuaToi: number, cuaDich: number, thang: boolean,
): { toi: number; dich: number; doi: number } {
  const kyVong = 1 / (1 + 10 ** ((cuaDich - cuaToi) / 400));
  const doi = Math.round(HE_SO_K * ((thang ? 1 : 0) - kyVong));
  // Sàn 100: điểm âm thì bảng xếp hạng đọc lên vô nghĩa, mà thua liên tục là
  // chuyện thường của người mới.
  return {
    toi: Math.max(100, cuaToi + doi),
    dich: Math.max(100, cuaDich - doi),
    doi,
  };
}

/** Số hiệu mùa của một mốc thời gian: năm × 100 + tháng, theo lịch giờ Việt Nam. */
export function muaCua(t: Date): number {
  const vn = new Date(t.getTime() + LECH_GIO_VN);
  return vn.getUTCFullYear() * 100 + (vn.getUTCMonth() + 1);
}

/**
 * Thưởng cuối mùa, xét theo ĐIỂM của chính mình chứ không theo thứ hạng.
 *
 * Xét theo hạng thì phải chụp lại bảng lúc hết mùa, mà chốt lười thì mỗi người
 * chốt vào một lúc khác nhau nên bảng ấy không có thời điểm nào là đúng. Xét
 * theo điểm thì chỉ cần đúng hàng của người ấy, và mốc điểm cũng là thứ người
 * chơi ngắm được suốt mùa.
 *
 * Thưởng trả bằng ĐIỂM DIỄN ĐÀN, cùng thang giá với 80 điểm một quả trứng —
 * đảo này không có tiền tệ riêng.
 */
export const HANG_MUA_RONG = [
  { moc: 1600, ten: 'Cao thủ', thuong: 600 },
  { moc: 1400, ten: 'Kỳ cựu', thuong: 300 },
  { moc: 1200, ten: 'Khá', thuong: 150 },
  { moc: 1050, ten: 'Có góp mặt', thuong: 60 },
] as const;

export function hangTheoDiemRong(diem: number) {
  return HANG_MUA_RONG.find((h) => diem >= h.moc) ?? null;
}

// ── Cửa hàng ─────────────────────────────────────────────────────────────

/**
 * Món đồ trong cửa hàng rồng.
 *
 * Danh sách ĐÓNG, để trong hằng số chứ không thành bảng: giá và tác dụng là
 * luật chơi, đọc ở máy chủ, không cho quản trị sửa và trình duyệt cũng không
 * gửi lên được. Bảng `RongDo` chỉ giữ đúng "ai đang có mấy cái".
 *
 * Mỗi món một tác dụng TỨC THÌ, không có buff kéo dài: trạng thái tạm thời
 * chẳng có chỗ nào để lưu, mà lưu rồi thì lại phải có người dọn khi nó hết —
 * mà đảo này không có tác vụ nền nào cả.
 */
export type ViecDo = 'an' | 'vui' | 'no' | 'exp' | 'lai';

export interface MonDo {
  ma: string;
  ten: string;
  moTa: string;
  gia: number;
  viec: ViecDo;
  /** Trị số của tác dụng — nghĩa tuỳ `viec`. */
  so: number;
  /** Dùng lên TRỨNG (true) hay lên rồng đã nở (false). */
  choTrung: boolean;
}

export const RONG_DO: readonly MonDo[] = [
  {
    ma: 'thit-thuong-hang', ten: 'Thịt thượng hạng', gia: 40, viec: 'an', so: 2, choTrung: false,
    moTa: 'Một bữa no ngay, không phải chờ, và ăn vào gấp đôi kinh nghiệm.',
  },
  {
    ma: 'banh-vui', ten: 'Bánh vui', gia: 25, viec: 'vui', so: 35, choTrung: false,
    moTa: 'Cộng thẳng 35 độ vui. Vui cao thì ra trận đánh mạnh hơn.',
  },
  {
    ma: 'da-thuc-no', ten: 'Đá thúc nở', gia: 55, viec: 'no', so: 0, choTrung: true,
    moTa: 'Cho một quả trứng nở ngay, không tốn thêm điểm nào nữa.',
  },
  {
    ma: 'sach-kinh-nghiem', ten: 'Sách kinh nghiệm', gia: 70, viec: 'exp', so: 80, choTrung: false,
    moTa: 'Cộng 80 kinh nghiệm, đủ thì lên cấp luôn.',
  },
  {
    ma: 'long-vu-lai', ten: 'Lông vũ lai tạo', gia: 90, viec: 'lai', so: 0, choTrung: false,
    moTa: 'Xoá thời gian nghỉ sau khi lai, cho ghép lại ngay.',
  },
] as const;

/** Mỗi lần bấm mua nhiều nhất chừng này — chặn ngay ở máy chủ. */
export const MUA_TOI_DA = 10;

export function timDo(ma: string): MonDo | null {
  return RONG_DO.find((d) => d.ma === ma) ?? null;
}

// ── Lai tạo ──────────────────────────────────────────────────────────────

/**
 * Ghép hai con rồng lấy một quả trứng.
 *
 * Vì sao cần: mua trứng thường thì loài và màu bốc hoàn toàn ngẫu nhiên trong
 * 54 cửa, nên săn cho đủ sổ sưu tầm là chuyện của may rủi thuần tuý — chăm con
 * rồng cấp 30 chẳng giúp gì cho việc ấy. Lai tạo là đường DUY NHẤT mà công
 * nuôi nấng đổi được thành một quả trứng đoán trước được phần nào.
 */
export const LAI_CAP_TOI_THIEU = 10;
/** Mỗi con lai được mấy lần rồi thôi — không thì một cặp đẻ ra cả đảo. */
export const LAI_TOI_DA = 3;
export const LAI_CHO_MS = 24 * 60 * 60 * 1000;
export const GIA_LAI = 60;
export const DOI_TOI_DA = 5;

/**
 * Tỉ lệ đột biến: bốc lại hoàn toàn ngẫu nhiên thay vì lấy của cha mẹ.
 *
 * Không có nó thì người chơi khoá cứng vào đúng những loài mình đã có — lai
 * mãi cũng chỉ ra đi ra lại chín cửa ấy, và sổ 54 ô không bao giờ đầy được
 * bằng đường lai tạo.
 */
export const TI_LE_DOT_BIEN = 0.15;

/**
 * Trứng lai ra con gì.
 *
 * `tungXu` bơm được như `danhNhau`, để bài kiểm chốt được kết quả thay vì
 * đoán mò trên một hàm ngẫu nhiên.
 */
export function bocTrungLai(
  cha: { loai: number; mau: number; doi: number },
  me: { loai: number; mau: number; doi: number },
  tungXu: () => number = Math.random,
): { loai: number; mau: number; doi: number } {
  const doi = Math.min(DOI_TOI_DA, Math.max(cha.doi, me.doi) + 1);
  if (tungXu() < TI_LE_DOT_BIEN) {
    return {
      loai: 1 + Math.floor(tungXu() * SO_LOAI),
      mau: 1 + Math.floor(tungXu() * SO_MAU),
      doi,
    };
  }
  // Loài và màu bốc RỜI nhau: lấy nguyên bộ của một bên thì lai ra bản sao của
  // cha hoặc của mẹ, chẳng bao giờ ra một cửa mới trong sổ.
  return {
    loai: tungXu() < 0.5 ? cha.loai : me.loai,
    mau: tungXu() < 0.5 ? cha.mau : me.mau,
    doi,
  };
}

// ── Sổ sưu tầm ───────────────────────────────────────────────────────────

/**
 * Mốc thưởng của sổ sưu tầm.
 *
 * Sổ 54 ô mà không có mốc nào thì chỉ là một cái bảng đếm: người chơi nở đủ
 * năm mươi tư con cũng chẳng được gì ngoài việc bảng hết xám. Mốc thưa dần và
 * thưởng dốc lên vì mười con đầu chỉ cần mua trứng đều tay, còn mười con cuối
 * là chuyện của may rủi kéo dài.
 *
 * Thứ tự trong mảng CHÍNH LÀ số mốc đã lĩnh (`RongNguoiChoi.mocDaNhan`), nên
 * chỉ được THÊM VÀO CUỐI, không chèn giữa và không sắp lại.
 */
export const MOC_SUU_TAM: readonly { so: number; thuong: number }[] = [
  { so: 10, thuong: 120 },
  { so: 20, thuong: 300 },
  { so: 30, thuong: 700 },
  { so: 40, thuong: 1400 },
  { so: DU_BO, thuong: 3000 },
] as const;

/** Số mốc lĩnh được với `daCo` con trong sổ — luôn ≥ số đã lĩnh. */
export function mocDatDuoc(daCo: number): number {
  let n = 0;
  for (const m of MOC_SUU_TAM) if (daCo >= m.so) n += 1;
  return n;
}

// ── Đấu trường ───────────────────────────────────────────────────────────

export const DAU_MOI_NGAY = 10;

/**
 * Ghép đối thủ trong khoảng cấp này trước.
 *
 * Trước đây danh sách chỉ là SÁU CON MỚI NHẤT ở đấu trường, bất kể cấp — nên
 * con cấp 1 mở trang ra gặp toàn cấp 30, đánh trận nào thua trận ấy, mà mỗi
 * trận vẫn mất 25 điểm ghi danh. Nay quét trong khoảng cấp trước; thiếu người
 * thì mới nới ra cho đủ danh sách, chứ một đấu trường trống trơn còn tệ hơn.
 */
export const LECH_CAP = 3;
export const SO_DOI_THU = 12;
/** Phí ghi danh mỗi trận; thắng thì ăn gấp đôi. */
export const PHI_DAU = 25;
export const THUONG_THANG = 50;
export const SO_HIEP = 3;

export interface Hiep {
  hiep: number;
  aDanh: number;
  bDanh: number;
  aMau: number;
  bMau: number;
}

/** Bên A khắc bên B, bị khắc, hay ngang nhau — để màn kể lại nói ra được. */
export type TheKhac = 'khac' | 'bi-khac' | 'ngang';

export function theKhac(ben: number, doi: number): TheKhac {
  const h = heSoKhac(ben, doi);
  return h > 1 ? 'khac' : h < 1 ? 'bi-khac' : 'ngang';
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
 *
 * KHẮC CHẾ nhân vào sát thương SAU khi đã trừ thủ, không phải trước: nhân
 * trước thì con thủ dày nuốt trọn phần lợi của hệ, và cả cái vòng ngũ hành
 * thành ra vô nghĩa với mấy loài dày.
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
    const thoc = (ben.cong * 2 - doi.thu) * heSoKhac(ben.he, doi.he);
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

/** Một con rồng ngẫu nhiên. Mọi cặp loài+màu đều có cơ hội như nhau. */
export function bocRongNgauNhien(): { loai: number; mau: number } {
  return {
    loai: 1 + Math.floor(Math.random() * SO_LOAI),
    mau: 1 + Math.floor(Math.random() * SO_MAU),
  };
}

/**
 * Ba chỉ số của một con rồng lúc ra trận.
 *
 * Cấp là nền, thiên hướng của loài cộng thêm, còn độ vui thì nhân vào tất cả:
 * con bị bỏ đói cả tuần vẫn ra trận được, nhưng đánh chỉ còn một nửa sức. Nhờ
 * vậy chăm rồng mới có ý nghĩa, chứ không phải cứ mua trứng rồi bỏ đó.
 */
export interface ChiSo { cong: number; thu: number; nhanh: number; he: MaHe }

export function chiSo(
  r: { loai: number; cap: number; vui: number; doi?: number; doNo?: number },
): ChiSo {
  const loai = LOAI.find((x) => x.id === r.loai);
  const l = loai?.manh ?? { cong: 0, thu: 0, nhanh: 0 };
  const nen = 10 + r.cap * 2;
  // Vui 100 → giữ nguyên sức; vui 0 → còn một nửa.
  const heSo = 0.5 + (kep(r.vui) / TOI_DA_CHAM) * 0.5;
  // Đói ăn ÍT hơn vào sức so với buồn (0,7–1 chứ không 0,5–1): đói là chuyện
  // sửa được bằng một bữa mười hai điểm, còn vui thì phải chơi mà chơi lại tốn
  // thể lực — thứ khó gỡ hơn thì phạt nặng hơn.
  const heSoNo = 0.7 + (kep(r.doNo ?? TOI_DA_CHAM) / TOI_DA_CHAM) * 0.3;
  // Đời cộng SAU hệ số vui: cộng trước thì con đời 5 bị bỏ đói vẫn ăn nguyên
  // phần thưởng của đời, mà cả ý của độ vui là bỏ bê thì yếu đi.
  const themDoi = Math.max(0, Math.min(DOI_TOI_DA, r.doi ?? 1) - 1);
  const lam = (x: number) =>
    Math.max(1, Math.round((nen + x * r.cap * 0.4 + x) * heSo * heSoNo) + themDoi);
  return { cong: lam(l.cong), thu: lam(l.thu), nhanh: lam(l.nhanh), he: loai?.he ?? 1 };
}

/** Kẹp một trục chăm sóc về khoảng hợp lệ. */
function kep(x: number): number {
  return Math.max(0, Math.min(TOI_DA_CHAM, Math.round(x)));
}

/** Số giờ đã trôi kể từ mốc, không bao giờ âm. */
function gioTu(tinhLuc: number, bayGio: number): number {
  return Math.max(0, (bayGio - tinhLuc) / 3_600_000);
}

/** Độ vui còn lại sau khi trừ phần tụt vì bỏ bê. */
export function vuiHienGio(vui: number, tinhLuc: number, bayGio: number): number {
  return kep(vui - gioTu(tinhLuc, bayGio) * VUI_TUT_MOI_GIO);
}

/** Độ no còn lại. Cùng lối với độ vui, chỉ khác nhịp tụt. */
export function noHienGio(doNo: number, tinhLuc: number, bayGio: number): number {
  return kep(doNo - gioTu(tinhLuc, bayGio) * NO_TUT_MOI_GIO);
}

/** Thể lực hiện có. Trục DUY NHẤT đi lên theo thời gian. */
export function theLucHienGio(theLuc: number, tinhLuc: number, bayGio: number): number {
  return kep(theLuc + gioTu(tinhLuc, bayGio) * LUC_HOI_MOI_GIO);
}

/**
 * Còn bao lâu nữa, viết cho người đọc. Rồng không đếm giây, chỉ tính phút.
 *
 * Chép lại phép tính của `moTaThoiLuong` trong `src/lib/utils.ts` chứ không
 * import — xem lý do ở đầu tệp. Bốn dòng số học, chép rẻ hơn là phá vỡ ràng
 * buộc "không import gì".
 */
export function moTaConLai(ms: number): string {
  if (ms <= 0) return 'xong rồi';
  const phut = Math.max(1, Math.ceil(ms / 60_000));
  if (phut < 60) return `${phut} phút`;
  const gio = Math.floor(phut / 60);
  const du = phut % 60;
  return du === 0 ? `${gio} giờ` : `${gio} giờ ${du} phút`;
}

/**
 * Mốc 00:00 hôm nay theo giờ Việt Nam, quy về UTC.
 *
 * Trước đây chép ở hai chỗ (`rong.ts` và `actions.ts`) mà chẳng chỗ nào biết
 * chỗ kia — sửa một bên là hai bên cắt ngày khác nhau. Nay một bản ở đây.
 */
export function dauNgayVN(now: number = Date.now()): Date {
  return new Date(
    Math.floor((now + LECH_GIO_VN) / 86_400_000) * 86_400_000 - LECH_GIO_VN,
  );
}

export const TEN_TOI_DA = 24;

/** Tên rồng người chơi tự đặt — chỉ chặn thứ rõ ràng không phải tên. */
export function loiTenRong(ten: string): string | null {
  const t = ten.trim();
  if (t.length === 0) return 'Chưa đặt tên.';
  if (t.length > TEN_TOI_DA) return `Tên tối đa ${TEN_TOI_DA} ký tự.`;
  if (/[<>]/.test(t)) return 'Tên không được chứa dấu < hoặc >.';
  return null;
}
