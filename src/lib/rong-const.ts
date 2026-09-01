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

/**
 * Chín loài, đặt tên theo đúng hình vẽ trong bộ ảnh gốc.
 *
 * `manh` là thiên hướng của loài, cộng thẳng vào chỉ số lúc đấu — để chín loài
 * đánh nhau ra khác nhau chứ không phải chín bộ da đổi màu.
 */
export interface Loai {
  id: number;
  ten: string;
  moTa: string;
  /** Cộng vào công / thủ / nhanh. Tổng ba số luôn là 0 cho công bằng. */
  manh: { cong: number; thu: number; nhanh: number };
}

export const LOAI: readonly Loai[] = [
  { id: 1, ten: 'Rồng Giáp', moTa: 'Đứng hai chân, vảy dày như áo giáp.', manh: { cong: 0, thu: 3, nhanh: -3 } },
  { id: 2, ten: 'Rồng Mập', moTa: 'Tròn trịa, hiền lành, dai sức lạ thường.', manh: { cong: -2, thu: 4, nhanh: -2 } },
  { id: 3, ten: 'Dực Long', moTa: 'Cánh da mỏng, bay nhanh như tên bắn.', manh: { cong: 1, thu: -4, nhanh: 3 } },
  { id: 4, ten: 'Sư Long', moTa: 'Mình sư tử, cánh chim, dáng đi kiêu hãnh.', manh: { cong: 3, thu: 0, nhanh: -3 } },
  { id: 5, ten: 'Miêu Long', moTa: 'Nhỏ như mèo, nghịch ngợm, né đòn rất tài.', manh: { cong: -3, thu: -1, nhanh: 4 } },
  { id: 6, ten: 'Hoả Long', moTa: 'Rồng phương Tây cổ điển, thở ra lửa.', manh: { cong: 4, thu: -1, nhanh: -3 } },
  { id: 7, ten: 'Thiên Long', moTa: 'Cánh rộng, dáng thanh, đủ đường đều khá.', manh: { cong: 1, thu: 1, nhanh: -2 } },
  { id: 8, ten: 'Thanh Long', moTa: 'Rồng phương Đông, mình dài uốn lượn giữa mây.', manh: { cong: 2, thu: 1, nhanh: -3 } },
  { id: 9, ten: 'Xà Long', moTa: 'Thân rắn cuộn tròn, ra đòn hiểm.', manh: { cong: 3, thu: -2, nhanh: -1 } },
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

export const GIA_AN = 12;
/** Cho ăn xong phải chờ chừng này mới cho ăn tiếp. */
export const AN_CHO_MS = 30 * 60 * 1000;
export const EXP_MOI_BUA = 18;

/** Chơi bóng không mất điểm, nhưng cũng phải chờ. */
export const CHOI_CHO_MS = 20 * 60 * 1000;
export const VUI_MOI_LAN = 20;
export const EXP_MOI_LAN_CHOI = 6;

/** Độ vui tụt chừng này mỗi giờ nếu bỏ bê. */
export const VUI_TUT_MOI_GIO = 4;

export const CAP_TOI_DA = 30;
/** Kinh nghiệm cần để lên cấp `cap` tiếp theo. */
export function expCanDe(cap: number): number {
  return 40 + (cap - 1) * 28;
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
export interface ChiSo { cong: number; thu: number; nhanh: number }

export function chiSo(r: { loai: number; cap: number; vui: number; doi?: number }): ChiSo {
  const l = LOAI.find((x) => x.id === r.loai)?.manh ?? { cong: 0, thu: 0, nhanh: 0 };
  const nen = 10 + r.cap * 2;
  // Vui 100 → giữ nguyên sức; vui 0 → còn một nửa.
  const heSo = 0.5 + (Math.max(0, Math.min(100, r.vui)) / 100) * 0.5;
  // Đời cộng SAU hệ số vui: cộng trước thì con đời 5 bị bỏ đói vẫn ăn nguyên
  // phần thưởng của đời, mà cả ý của độ vui là bỏ bê thì yếu đi.
  const themDoi = Math.max(0, Math.min(DOI_TOI_DA, r.doi ?? 1) - 1);
  const lam = (x: number) =>
    Math.max(1, Math.round((nen + x * r.cap * 0.4 + x) * heSo) + themDoi);
  return { cong: lam(l.cong), thu: lam(l.thu), nhanh: lam(l.nhanh) };
}

/** Độ vui còn lại sau khi trừ phần tụt vì bỏ bê. */
export function vuiHienGio(vui: number, tinhLuc: number, bayGio: number): number {
  const gio = Math.max(0, (bayGio - tinhLuc) / 3_600_000);
  return Math.max(0, Math.min(100, Math.round(vui - gio * VUI_TUT_MOI_GIO)));
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
  const lech = 7 * 3600 * 1000;
  return new Date(Math.floor((now + lech) / 86_400_000) * 86_400_000 - lech);
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
