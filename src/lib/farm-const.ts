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

/** Giá mở ô tiếp theo: càng rộng càng đắt, nên hệ số nhân thẳng với số ô đang có. */
export const GIA_MOI_O = 30;

/** Giá để mở thêm một ô khi đang có `soO` ô. */
export function giaMoODat(soO: number): number {
  return soO * GIA_MOI_O;
}

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

/** 6h–18h giờ Việt Nam là ban ngày, còn lại là ban đêm. */
export function laBanNgay(now: Date = new Date()): boolean {
  const g = gioVN(now);
  return g >= 6 && g < 18;
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

/** Ảnh nông sản đã thu, dùng trong nhà kho và cửa hàng hạt giống. */
export function anhNongSan(cropKey: number): string {
  return `${FARM_ANH}/nong-san/${cropKey}.png`;
}

/** Icon công trình trên trang. */
export const ANH_CUA_HANG = `${FARM_ANH}/o-dat/cuahang.png`;
export const ANH_NHA_KHO = `${FARM_ANH}/o-dat/nhakho.png`;
export const ANH_MUA_DAT = `${FARM_ANH}/o-dat/muadat.png`;
export const ANH_FARM = `${FARM_ANH}/o-dat/farm.png`;
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
