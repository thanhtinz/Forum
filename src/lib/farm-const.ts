/**
 * Nông trại — hằng số và quy ước, dùng chung cho máy chủ lẫn giao diện.
 *
 * Chỉ để những thứ KHÔNG chạm cơ sở dữ liệu ở đây: tệp này bị cả component
 * phía trình duyệt lẫn server action nạp vào, kéo theo `db` là kéo cả Prisma
 * xuống trình duyệt.
 *
 * Bộ ảnh là của bản nông trại cũ, pixel art 32×32. Phóng to phải theo BỘI SỐ
 * NGUYÊN và `image-rendering: pixelated`, không thì từng nét bị nội suy mờ
 * nhoè, mất hẳn cái chất pixel vốn là lý do giữ lại bộ ảnh này.
 */

/** Thư mục gốc của bộ ảnh nông trại cũ. */
export const FARM_ANH = '/hoai-niem/nongtrai';

// ─────────────────────────── Ô đất ───────────────────────────

/** Ai cũng bắt đầu với bốn ô — đủ để xoay vòng mà chưa cần mua gì. */
export const O_DAT_BAN_DAU = 4;

/** Trần số ô một người có thể mở. */
export const O_DAT_TOI_DA = 40;

/**
 * Mỗi trang ruộng bày bao nhiêu ô — hai hàng bốn ô.
 *
 * Bốn mươi ô mà bày hết một lượt thì mảnh ruộng dài mười hàng, cuộn mãi không
 * hết và chẳng còn nhìn ra một khoảnh đất nữa. Chia trang thì khung cảnh luôn
 * cao đúng bằng lúc mới chơi, mở thêm bao nhiêu ô cũng vậy.
 *
 * Phải là bội số của 4 (số ô một hàng), không thì trang cuối lòi ra một hàng dở.
 */
export const O_MOI_TRANG = 8;

/**
 * Mỗi lượt mua nhiều nhất bấy nhiêu gói hạt.
 *
 * Có trần vì `so_luong` đến từ biểu mẫu, mà biểu mẫu thì người lạ gửi số nào
 * cũng được — không chặn thì một lượt gọi mua vài triệu gói, nhân với giá là
 * tràn số nguyên trước cả khi kịp kiểm đủ điểm.
 */
export const HAT_MUA_TOI_DA = 99;

/** Giá mở ô tiếp theo: càng rộng càng đắt, nên hệ số nhân thẳng với số ô đang có. */
export const GIA_MOI_O = 30;

/** Giá để mở thêm một ô khi đang có `soO` ô. */
export function giaMoODat(soO: number): number {
  return soO * GIA_MOI_O;
}

// ─────────────────────────── Việc nhà nông ───────────────────────────

/**
 * Năm việc của một vụ, ĐÚNG THỨ TỰ.
 *
 * Thứ tự này là luật của trò chứ không phải cách bày nút: xới xong mới gieo
 * được, gieo xong mới có gì để tưới. Giao diện đọc mảng này để biết việc nào
 * đang tới lượt, nên đổi thứ tự ở đây là đổi cả luật lẫn giao diện — không có
 * chỗ thứ hai để quên đồng bộ.
 */
export const VIEC_VU = ['xoi', 'gieo', 'tuoi', 'bon', 'thu'] as const;
export type ViecVu = (typeof VIEC_VU)[number];

export const VIEC_TEN: Record<ViecVu, string> = {
  xoi: 'Xới đất', gieo: 'Gieo hạt', tuoi: 'Tưới nước',
  bon: 'Bón phân', thu: 'Thu hoạch',
};

/** Một việc đang ở tình trạng nào trên thanh việc. */
export type TinhTrangViec = 'xong' | 'toi-luot' | 'chua-toi';

/**
 * Việc nào xong, việc nào tới lượt, việc nào còn phải chờ.
 *
 * Gom vào một hàm thuần ở đây thay vì rải điều kiện trong JSX, vì cùng một
 * luật ấy còn phải trả lời câu "bấm nút này có ăn thua gì không" — hai chỗ
 * viết riêng thì sẽ có lúc nút sáng lên mà bấm vào chẳng làm gì.
 *
 * "Tới lượt" là việc ĐẦU TIÊN chưa xong theo thứ tự `VIEC_VU`. Tưới và bón
 * đều bỏ qua được — bỏ thì thu ít hơn chứ không kẹt — nên khi cây đã chín thì
 * thu hoạch giành lấy lượt, không bắt phải tưới bù.
 */
export function tinhTrangViec(
  o: { tilled: boolean; cropKey: number | null; watered: boolean; fertKind: number | null },
  chin: boolean,
): Record<ViecVu, TinhTrangViec> {
  const dangTrong = o.cropKey != null;
  const xong: Record<ViecVu, boolean> = {
    xoi: o.tilled || dangTrong,
    gieo: dangTrong,
    tuoi: dangTrong && o.watered,
    bon: dangTrong && o.fertKind != null,
    thu: false,
  };

  let toiLuot: ViecVu | null = null;
  if (!xong.xoi) toiLuot = 'xoi';
  else if (!dangTrong) toiLuot = 'gieo';
  else if (chin) toiLuot = 'thu';
  else if (!o.watered) toiLuot = 'tuoi';
  else if (o.fertKind == null) toiLuot = 'bon';

  return Object.fromEntries(VIEC_VU.map((v) => [
    v, xong[v] ? 'xong' : v === toiLuot ? 'toi-luot' : 'chua-toi',
  ])) as Record<ViecVu, TinhTrangViec>;
}

// ─────────────────────────── Phân bón ───────────────────────────

/**
 * Năm loại phân, càng đắt càng bồi nhiều.
 *
 * `kind` vừa là khoá vừa là tên tệp ảnh (`phan-bon/{kind}.png`), cùng quy ước
 * với `FarmCrop.key`. Bậc thang giá và mức bồi đi đều nhau để không có loại
 * nào "ngon bất thường" — lệch một bậc là mọi người chỉ mua đúng bậc ấy, bốn
 * loại kia bày ra cho có.
 */
export const PHAN_LOAI = [
  { kind: 1, ten: 'Phân chuồng', gia: 8, them: 1 },
  { kind: 2, ten: 'Phân xanh', gia: 15, them: 2 },
  { kind: 3, ten: 'Phân lân', gia: 24, them: 3 },
  { kind: 4, ten: 'Phân NPK', gia: 35, them: 4 },
  { kind: 5, ten: 'Phân vi sinh', gia: 48, them: 5 },
] as const;

export type LoaiPhan = (typeof PHAN_LOAI)[number];

/** Tra một loại phân theo `kind`; `null` nếu số không hợp lệ. */
export function loaiPhan(kind: number | null | undefined): LoaiPhan | null {
  return PHAN_LOAI.find((p) => p.kind === kind) ?? null;
}

/** Ảnh một bao phân. */
export function anhPhan(kind: number): string {
  return `${FARM_ANH}/phan-bon/${kind}.png`;
}

/** Mỗi lượt mua nhiều nhất bấy nhiêu bao — cùng lý do có trần với hạt giống. */
export const PHAN_MUA_TOI_DA = 99;

// ─────────────────────────── Bảng đơn hàng ───────────────────────────

/** Bảng ghi chú treo bao nhiêu đơn cùng lúc. */
export const DON_TREN_BANG = 4;

/**
 * Thưởng của một đơn = tổng giá bán số hàng phải giao, nhân hệ số này.
 *
 * Phải LỚN HƠN 1: giao đơn tốn công gom đúng món đúng số, mà trả bằng đúng
 * giá bán thì chẳng ai giao — nhất là khi nông trại không còn lái buôn nào
 * mua lẻ nữa, đơn hàng là đường duy nhất đổi nông sản ra điểm.
 */
export const DON_HE_SO = 1.5;

/** Hệ số nhân theo kiểu đơn. */
export const DON_NHAN: Record<'THUONG' | 'DAC_BIET' | 'SIEU_TOC', number> = {
  THUONG: 1, DAC_BIET: 2, SIEU_TOC: 3,
};

export const DON_TEN: Record<'THUONG' | 'DAC_BIET' | 'SIEU_TOC', string> = {
  THUONG: 'Đơn thường', DAC_BIET: 'Đơn đặc biệt', SIEU_TOC: 'Đơn siêu tốc',
};

/** Đơn siêu tốc phải giao trong bấy nhiêu mili giây kể từ lúc lên bảng. */
export const DON_SIEU_TOC_HAN_MS = 2 * 60 * 60 * 1000;

/** Tên khách đặt hàng — lấy tên Việt cho hợp giọng cả trang. */
export const DON_KHACH = [
  'Bác Tư', 'Cô Sáu', 'Chú Bảy', 'Dì Ba', 'Anh Hùng', 'Chị Lan',
  'Ông Năm', 'Bà Tám', 'Thầy Chín', 'Cô Mai',
] as const;

// ─────────────────────────── Tưới nước ───────────────────────────

/**
 * Tưới rút bớt bao nhiêu phần thời gian CÒN LẠI.
 *
 * Rút theo phần còn lại chứ không theo tổng thời gian vụ: tưới sớm thì lợi
 * nhiều, tưới lúc cây sắp chín thì gần như chẳng lợi gì — đúng như việc chăm
 * cây thật, và tự nó khuyến khích người chơi quay lại sớm.
 */
export const TUOI_RUT_NGAN = 0.2;

// ─────────────────────────── Cây khế ───────────────────────────

/** Mỗi giờ hái cây khế được một lần. */
export const KHE_CHU_KY_MS = 60 * 60 * 1000;

/** Hái một lần được từng này tới từng này điểm. */
export const KHE_MIN = 1;
export const KHE_MAX = 3;

// ─────────────────────────── Ngày và đêm ───────────────────────────

/** Giờ hiện tại theo múi giờ Việt Nam (UTC+7), 0–23. */
export function gioVN(now: Date = new Date()): number {
  return Math.floor((now.getTime() / 3600000 + 7) % 24);
}

/** Trời đang nghiêng về ban ngày hay ban đêm — dùng cho cái nhãn trên trang. */
export function laBanNgay(now: Date = new Date()): boolean {
  return doToiTroi(now) < 0.5;
}

/**
 * Trời tối tới mức nào, 0 là ban ngày hẳn và 1 là ban đêm hẳn.
 *
 * Trả về số THỰC chứ không phải ngày/đêm đúng-sai, để cảnh chuyển dần chứ
 * không giật một nhát: 5–7 giờ sáng trời sáng dần, 17–19 giờ tối dần. Bản
 * trước chỉ có một cái cờ, nên đúng 6 giờ là cả bầu trời, tấm nền, mặt trời
 * và lớp phủ đêm cùng đổi trong một khung hình.
 *
 * Nội suy tuyến tính là đủ: mắt không đọc ra đường cong của hoàng hôn trên
 * một dải chuyển màu cao trăm điểm ảnh, mà một hàm bậc nhất thì đọc mã là
 * biết ngay giờ nào trời ra sao.
 */
export function doToiTroi(now: Date = new Date()): number {
  // Giờ THẬP PHÂN, không dùng `gioVN` vì hàm ấy làm tròn xuống — trời sẽ
  // nhảy từng nấc một giờ thay vì trôi.
  const g = (now.getTime() / 3600000 + 7) % 24;
  if (g >= 7 && g < 17) return 0;
  if (g >= 19 || g < 5) return 1;
  if (g < 7) return (7 - g) / 2;   // 5h → 7h: 1 xuống 0
  return (g - 17) / 2;             // 17h → 19h: 0 lên 1
}

// ─────────────────────────── Đường dẫn ảnh ───────────────────────────

/**
 * Ba chặng một ô đất đi qua: vừa gieo → đang lớn → đã chín.
 *
 * Tách riêng chặng "mầm" vì mọi loại cây dùng chung một ảnh `gieohat.png`;
 * chỉ từ chặng thứ hai ảnh mới phân biệt theo loại.
 */
export type ChangCay = 'mam' | 'lon' | 'chin';

/** Mầm chiếm phần đầu vụ — dưới mốc này thì ô mới chỉ là mầm. */
export const MOC_MAM = 0.3;

/**
 * Chặng của một ô: mầm ở đầu vụ, rồi cây đang lớn, tới mốc thì chín.
 *
 * Để ở đây chứ không ở `farm.ts` vì giao diện phải tự tính lại mỗi giây: mốc
 * chín gửi xuống một lần, còn "đã tới chưa" thì đồng hồ trong máy người xem
 * trả lời, không phải chờ hỏi lại máy chủ.
 */
export function changCua(
  plantedAt: number | null,
  readyAt: number | null,
  now: number,
): ChangCay | null {
  if (plantedAt == null || readyAt == null) return null;
  if (now >= readyAt) return 'chin';
  // Vụ có thể bị tưới rút ngắn tới sát mốc; chia cho 0 thì ra NaN.
  const daQua = readyAt > plantedAt ? (now - plantedAt) / (readyAt - plantedAt) : 1;
  return daQua < MOC_MAM ? 'mam' : 'lon';
}

/**
 * Vụ đã đi được bao nhiêu phần, 0 tới 1 — để vẽ thanh tiến độ.
 *
 * Tưới nước kéo mốc chín gần lại nên phần trăm nhảy vọt một cái: đấy là ý
 * muốn, người chơi thấy ngay công tưới đáng bao nhiêu.
 */
export function tienDoVu(
  plantedAt: number | null,
  readyAt: number | null,
  now: number,
): number {
  if (plantedAt == null || readyAt == null) return 0;
  if (now >= readyAt) return 1;
  if (readyAt <= plantedAt) return 1;
  return Math.max(0, Math.min(1, (now - plantedAt) / (readyAt - plantedAt)));
}

/** Ảnh của một ô đất theo loại cây và chặng đang đứng. */
export function anhODat(cropKey: number | null, chang: ChangCay | null): string {
  if (cropKey == null || chang == null) return `${FARM_ANH}/o-dat/0.png`;
  if (chang === 'mam') return `${FARM_ANH}/o-dat/gieohat.png`;
  return `${FARM_ANH}/o-dat/${cropKey}${chang === 'chin' ? '-chin' : ''}.png`;
}

/**
 * Ảnh nông sản đã thu, dùng trong nhà kho, cửa hàng và bảng đơn hàng.
 *
 * Khế (key 0) mượn ảnh CÂY khế chín vì bộ ảnh cũ không có quả khế rời — chỗ
 * `nong-san/0.png` là một bao đất, dán vào thì thành ra kho chứa đất.
 */
export function anhNongSan(cropKey: number): string {
  if (cropKey === KHE_KEY) return ANH_CAY_KHE_CHIN;
  return `${FARM_ANH}/nong-san/${cropKey}.png`;
}

/** `key` của quả khế trong bảng `FarmCrop`. */
export const KHE_KEY = 0;

/** Icon công trình trên trang. */
export const ANH_CUA_HANG = `${FARM_ANH}/o-dat/cuahang.png`;
export const ANH_NHA_KHO = `${FARM_ANH}/o-dat/nhakho.png`;
export const ANH_MUA_DAT = `${FARM_ANH}/o-dat/muadat.png`;
export const ANH_FARM = `${FARM_ANH}/o-dat/farm.png`;
/** Tấm biển "BẢNG XẾP HẠNG" của bản gốc — chữ Việt sẵn trong ảnh. */
export const ANH_BXH = `${FARM_ANH}/o-dat/bxh.png`;
/**
 * Tấm biển "ĐƠN HÀNG", dựng từ chính `bxh.png` bằng
 * `scripts/ve-bien-don-hang.mjs` — cùng khung, cùng nét chữ, chỉ khác chữ.
 */
export const ANH_BANG_DON = `${FARM_ANH}/o-dat/bangdon.png`;
export const ANH_CAY_KHE = `${FARM_ANH}/o-dat/caykhe.png`;
export const ANH_CAY_KHE_CHIN = `${FARM_ANH}/o-dat/caykhechin.png`;
export const ANH_NEN_NGAY = `${FARM_ANH}/nen/nennongtrai.png`;
export const ANH_NEN_DEM = `${FARM_ANH}/nen/nennongtrai-toi.png`;
export const ANH_MAY_1 = `${FARM_ANH}/nen/may1.png`;
export const ANH_MAY_2 = `${FARM_ANH}/nen/may2.png`;
export const ANH_TUOI_NUOC = `${FARM_ANH}/o-dat/tuoinuoc.gif`;

// ─────────────────────────── Dựng cảnh ───────────────────────────

/**
 * Tấm nền `nennongtrai.png` cao 141 pixel, nhưng chỉ 51 hàng cuối là có cảnh
 * (rặng cây, thửa ruộng xa, hàng rào); phía trên chỉ là trời trơn. Cắt lấy
 * đúng phần cảnh rồi vẽ trời bằng CSS: trời CSS cao bao nhiêu cũng được mà
 * không phải kéo giãn ảnh, nên không còn chỗ nối ngang giữa lưng chừng trời.
 */
export const NEN_CAO = 141;
export const NEN_RONG = 95;
export const NEN_DAI_CANH = 51;

/**
 * Màu trời của chính tấm nền, lấy ngay tại hàng bị cắt (hàng 90).
 *
 * Dải chuyển của trời CSS phải kết thúc đúng bằng màu này, không thì chỗ nối
 * giữa trời CSS và mép trên tấm ảnh hiện ra thành một vạch ngang.
 */
export const TROI_NGAY = ['#5dbef7', '#addbf5'] as const;
export const TROI_DEM = ['#264e86', '#465985'] as const;

/** Màu đất của bộ ảnh ô đất — nền ruộng CSS phải cùng tông thì mới liền. */
export const DAT_SANG = '#a67b21';
export const DAT_VUA = '#8f5e0a';
export const DAT_TOI = '#624400';

// ─────────────────────────── Hiển thị ───────────────────────────

/** "2 giờ 5 phút", "45 phút", "30 giây" — đọc lướt là biết còn bao lâu. */
export function moTaConLai(ms: number): string {
  if (ms <= 0) return 'đã chín';
  const giay = Math.ceil(ms / 1000);
  if (giay < 60) return `${giay} giây`;
  const phut = Math.ceil(giay / 60);
  if (phut < 60) return `${phut} phút`;
  const gio = Math.floor(phut / 60);
  const du = phut % 60;
  return du === 0 ? `${gio} giờ` : `${gio} giờ ${du} phút`;
}

/**
 * Bản rút gọn CHỈ dùng cho nhãn dưới chân ô đất: "11h58" thay cho
 * "11 giờ 58 phút".
 *
 * Ô đất là một ô vuông bé — ở khổ 390px nhãn chỉ được 77px, mà cách viết đầy
 * đủ cần tới 102px nên bị cắt cụt thành "11 giờ 58…". Chữ cụt còn khó đọc hơn
 * chữ ngắn.
 *
 * Không đổi `moTaConLai`: cách viết đầy đủ vẫn giữ nguyên ở mọi chỗ khác, kể
 * cả thanh việc ngay bên dưới mảnh đất — bấm vào ô là đọc được đủ chữ. Chỉ
 * phần giờ mới phải nén, còn dưới một giờ thì cách viết cũ đã vừa chỗ.
 */
export function moTaConLaiNgan(ms: number): string {
  if (ms <= 0) return 'đã chín';
  const giay = Math.ceil(ms / 1000);
  if (giay < 60) return `${giay} giây`;
  const phut = Math.ceil(giay / 60);
  if (phut < 60) return `${phut} phút`;
  const gio = Math.floor(phut / 60);
  const du = phut % 60;
  return du === 0 ? `${gio}h` : `${gio}h${String(du).padStart(2, '0')}`;
}

/** "5 phút", "1 giờ 30 phút" — mô tả độ dài một vụ trong cửa hàng. */
export function moTaVu(phut: number): string {
  if (phut < 60) return `${phut} phút`;
  const gio = Math.floor(phut / 60);
  const du = phut % 60;
  return du === 0 ? `${gio} giờ` : `${gio} giờ ${du} phút`;
}
