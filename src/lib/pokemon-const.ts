/**
 * Đảo Pokémon — hằng số và luật chơi thuần, dùng chung máy chủ lẫn giao diện.
 *
 * Dựng lại từ mã nguồn một wap game Pokémon Việt hoá chạy trên JohnCMS quãng
 * 2013 (`pokemonv_vn`). Giữ nguyên công thức, giữ nguyên số liệu, giữ nguyên
 * bộ ảnh 318 con thú. Những chỗ ĐỔI đều ghi rõ lý do ngay tại chỗ.
 */

/** Đường dẫn gốc của bộ ảnh cũ. */
export const ANH_POKE = '/hoai-niem/pokemon';

// ─────────────────────────── Mười bảy hệ ───────────────────────────

/**
 * Tên hệ đọc từ chính bộ ảnh huy hiệu `img/he/1..17.png` của bản gốc, không
 * đoán theo thứ tự quen thuộc của Pokémon thật.
 */
export const HE = [
  '', 'NORMAL', 'FIRE', 'WATER', 'ELECTRIC', 'GRASS', 'ICE', 'FIGHTING',
  'POISON', 'GROUND', 'FLYING', 'PSYCHIC', 'BUG', 'ROCK', 'GHOST', 'DRAGON',
  'DARK', 'STEEL',
] as const;

export const SO_HE = 17;

/**
 * Tên hệ tiếng Việt.
 *
 * Bản gốc để nguyên chữ Anh trên huy hiệu ảnh, mà cả game còn lại toàn tiếng
 * Việt — nên dòng "BUG đánh BUG: sát thương ×1" đọc lên nửa nạc nửa mỡ. Huy
 * hiệu vẫn là ảnh gốc, chỉ phần chữ đổi sang tiếng Việt.
 */
export const HE_VN = [
  '', 'Thường', 'Lửa', 'Nước', 'Điện', 'Cỏ', 'Băng', 'Giác Đấu',
  'Độc', 'Đất', 'Bay', 'Siêu Linh', 'Bọ', 'Đá', 'Ma', 'Rồng',
  'Bóng Tối', 'Thép',
] as const;

export function tenHe(he: number): string {
  return HE_VN[he] ?? HE_VN[1]!;
}

/** Tên gốc tiếng Anh — vẫn cần cho nhãn `alt` của huy hiệu ảnh. */
export function tenHeGoc(he: number): string {
  return HE[he] ?? HE[1]!;
}

export function anhHe(he: number): string {
  return `${ANH_POKE}/he/${he >= 1 && he <= SO_HE ? he : 1}.png`;
}

/**
 * Bảng khắc hệ, trích thẳng từ `modules/location/he.php` của bản gốc.
 *
 * Đọc là: `KHAC_HE[hệ mình][hệ đối thủ] = [nhân sát thương mình gây,
 * nhân sát thương mình chịu]`. Cặp nào không ghi thì cả hai là 1.
 *
 * MỘT ĐIỀU PHẢI NÓI RÕ: trong bản gốc tệp `he.php` KHÔNG hề được `include` ở
 * đâu cả — tác giả viết xong rồi bỏ quên, nên suốt cả game không trận nào áp
 * bảng này. Ở đây có nối vào thật. Bỏ đi thì trung thành với thứ chạy được,
 * nhưng lại vứt mất phần luật mà chính tác giả đã ngồi viết ra, và mười bảy
 * huy hiệu hệ trên mỗi con thú thành ra trang trí suông.
 */
export const KHAC_HE: Record<number, Record<number, readonly [number, number]>> = {
  1: { 13: [0.5, 1], 14: [0, 1], 16: [0.5, 1] },
  2: { 2: [0.5, 1], 3: [0.5, 2], 5: [2, 0.5], 6: [2, 0.5], 12: [2, 0.5], 13: [0.5, 2], 15: [0.5, 2], 17: [2, 1] },
  3: { 2: [2, 0.5], 3: [0.5, 2], 5: [0.5, 2], 9: [2, 0.5], 13: [2, 0.5], 15: [0.5, 2] },
  4: { 3: [2, 0.5], 4: [0.5, 2], 5: [0.5, 2], 9: [0, 2], 10: [2, 0.5], 15: [0.5, 1] },
  5: { 2: [0.5, 2], 3: [2, 0.5], 8: [0.5, 2], 9: [2, 0.5], 10: [0.5, 2], 12: [0.5, 2], 13: [2, 0.5], 15: [0.5, 1], 17: [0.5, 2] },
  6: { 2: [0.5, 2], 3: [0.5, 1], 5: [2, 1], 9: [2, 1], 10: [2, 1], 15: [2, 1], 17: [0.5, 2] },
  7: { 1: [2, 1], 6: [2, 1], 8: [0.5, 2], 10: [0.5, 2], 11: [0.5, 2], 12: [0.5, 2], 13: [2, 0.5], 14: [0, 0.5], 16: [2, 0.5], 17: [2, 0.5] },
  8: { 5: [2, 0.5], 8: [0.5, 2], 9: [0.5, 2], 13: [0.5, 2], 14: [0.5, 2], 17: [0, 2] },
  9: { 2: [2, 0.5], 4: [2, 1], 5: [0.5, 2], 8: [2, 1], 10: [0, 2], 12: [0.5, 2], 13: [2, 0.5], 17: [2, 0.5] },
  10: { 4: [0.5, 2], 5: [2, 2], 7: [2, 0.5], 12: [2, 0.5], 13: [0.5, 2], 17: [0.5, 2] },
  11: { 7: [2, 0.5], 8: [2, 0.5], 16: [0, 2], 17: [0.5, 1] },
  12: { 2: [0.5, 2], 5: [2, 0.5], 7: [0.5, 2], 8: [0.5, 2], 10: [0.5, 2], 11: [2, 0.5], 14: [0.5, 2], 16: [2, 0.5], 17: [0.5, 1] },
  13: { 2: [2, 0.5], 6: [2, 0.5], 7: [0.5, 2], 9: [0.5, 2], 10: [2, 0.5], 12: [2, 0.5], 17: [0.5, 2] },
  14: { 11: [2, 0.5], 16: [0.5, 2], 17: [0.5, 2] },
  15: { 17: [0.5, 1] },
  16: { 7: [0.5, 2], 11: [2, 0.5], 14: [2, 0.5], 17: [0.5, 1] },
  17: { 2: [0.5, 2], 3: [0.5, 2], 4: [0.5, 2], 6: [2, 0.5], 13: [2, 0.5] },};

/**
 * Hệ của TỪNG CHIÊU, tra theo tên chiêu.
 *
 * Bốn chiêu của một con thú trong bản gốc chỉ là bốn con số sát thương, mà
 * với thú của người chơi thì bốn số ấy LUÔN BẰNG NHAU: khởi đầu 10 cả bốn,
 * mỗi lần dùng đá tiến cấp cộng 100 vào cả bốn. Nghĩa là suốt cả game, chọn
 * chiêu nào cũng y hệt nhau — bảng chiêu chỉ là bốn cái nút giống nhau, và
 * mười bảy hệ chỉ ăn thua ở hệ của CON, thứ người chơi không đổi được.
 *
 * Nay hệ đọc từ tên chiêu, nên đánh Sứa Lam hệ Nước thì chọn THUNDERBOLT chứ
 * không chọn TACKLE. Đây là chỗ khiến trận đánh có quyết định thật.
 *
 * Chiêu nào tra không ra — bản gốc có mấy tên gõ nhầm ("DFSF", "SFSDF",
 * "PHOTOSHOP STRIKE") — thì trả 0, và chỗ gọi hiểu là "dùng hệ của con thú",
 * đúng như nếp cũ. Không đoán bừa.
 */
const HE_CHIEU: Readonly<Record<string, number>> = {
  // Thường
  ATTACK: 1, BIND: 1, COVET: 1, ENDEAVOR: 1, GROWL: 1, HARDEN: 1,
  'HELPING HAND': 1, 'HYPER FANG': 1, 'HYPER VOICE': 1, 'LAST RESORT': 1,
  LEER: 1, 'QUICK ATTACK': 1, RAGE: 1, RETURN: 1, SAFEGUARD: 1,
  'SCARY FACE': 1, SMOKESCREEN: 1, SNORE: 1, SONICBOOM: 1, TACKLE: 1, UPROAR: 1,
  // Lửa
  EMBER: 2, 'FIRE BLAST': 2, 'FIRE FANG': 2, 'FIRE SPIN': 2, 'FLAME BURST': 2,
  'FLAME CHARGE': 2, FLAMETHROWER: 2, 'HEAT WAVE': 2, INFERNO: 2, OVERHEAT: 2,
  'SEARING SHOT': 2, 'SUNNY DAY': 2,
  // Nước
  'AQUA TAIL': 3, BRINE: 3, BUBBLE: 3, BUBBLEBEAM: 3, DIVE: 3, 'HYDRO PUMP': 3,
  'MUDDY WATER': 3, 'RAIN DANCE': 3, SURF: 3, 'WATER GUN': 3, 'WATER PULSE': 3,
  WATERFALL: 3, WHIRLPOOL: 3,
  // Điện. "SHOCK UAVE" là "SHOCK WAVE" gõ nhầm trong bản gốc.
  CHARGE: 4, ELECTROWEB: 4, 'FUSION BOLT': 4, 'SHOCK WAVE': 4, 'SHOCK UAVE': 4,
  SPARK: 4, TERAVOLT: 4, THUNDER: 4, THUNDERBOLT: 4, 'VOLT TACKLE': 4,
  // Cỏ. "SOLARBEAN" là "SOLARBEAM" gõ nhầm.
  ABSORB: 5, AROMATHERAPY: 5, 'BULLET SEED': 5, 'ENERGY BALL': 5, 'GIGA DRAIN': 5,
  'LEECH SEED': 5, 'MAGICAL LEAF': 5, 'MEGA DRAIN': 5, 'RAZOR LEAF': 5,
  SOLARBEAM: 5, SOLARBEAN: 5, 'VINE WHIP': 5,
  // Băng
  BLIZZARD: 6, 'ICE BALL': 6, 'ICICLE SPEAR': 6, 'POWDER SNOW': 6,
  // Giác Đấu
  'BRICK BREAK': 7, 'BULK UP': 7, 'FORCE PALM': 7, 'HI JUMP KICK': 7,
  'JUMP KICK': 7, 'KARATE CHOP': 7, 'LOW KICK': 7, REVENGE: 7, REVERSAL: 7,
  'ROLLING KICK': 7, 'VITAL THROW': 7,
  // Độc. "POSONPOWDER" là "POISONPOWDER" gõ nhầm.
  'GASTRO ACID': 8, 'POISON STING': 8, POSONPOWDER: 8, POISONPOWDER: 8, TOXIC: 8,
  // Đất
  BULLDOZE: 9, DIG: 9, 'EARTH POWER': 9, EARTHQUAKE: 9, 'MUD SHOT': 9,
  'MUD-SLAP': 9, 'SAND ATTACK': 9, 'SAND-ATTACK': 9, 'SAND TOMB': 9,
  // Bay
  'AERIAL ACE': 10, BOUNCE: 10, FLY: 10, GUST: 10, ROOST: 10, 'WING ATTACK': 10,
  // Siêu Linh
  'CALM MIND': 11, CONFUSION: 11, 'FUTURE SIGHT': 11, GRAVITY: 11,
  'MAGIC COAT': 11, PSYCHIC: 11, 'PSYCHO CUT': 11, REFLECT: 11, REST: 11,
  'SKILL SWAP': 11, 'ZEN HEADBUTT': 11,
  // Bọ. "MEGAHORM" là "MEGAHORN" gõ nhầm.
  'BUG BITE': 12, MEGAHORM: 12, MEGAHORN: 12, 'STRING SHOT': 12,
  // Đá
  'ROCK BLAST': 13, 'ROCK SLIDE': 13, 'ROCK THROW': 13, 'SUPER ROCK THROW': 13,
  SANDSTORM: 13, 'STONE EDGE': 13,
  // Ma
  ASTONISH: 14, CURSE: 14, HEX: 14, LICK: 14, 'NIGHT SHADE': 14,
  'SHADOW BALL': 14, SPITE: 14,
  // Rồng
  'DRACO METEOR': 15, 'DRAGON DANCE': 15, 'DRAGON PULSE': 15, 'DRAGON RAGE': 15,
  // Bóng Tối. "FOUL" là "FOUL PLAY" bị cắt cụt.
  ASSURANCE: 16, BITE: 16, 'DARK PULSE': 16, 'FAINT ATTACK': 16, FOUL: 16,
  'FOUL PLAY': 16, 'KNOCK OFF': 16, PURSUIT: 16,
  // Thép
  'IRON DEFENSE': 17, 'IRON HEAD': 17,
};

/**
 * Hệ của một chiêu; 0 nghĩa là không tra ra, chỗ gọi dùng hệ của con thú.
 *
 * Chuẩn hoá trước khi tra: bản gốc có "ROCK THROW 2", "ROCK THROW  3",
 * "VOLT TACKLE 1" — cùng một chiêu bị đánh số để nhét vừa bốn ô.
 */
export function heCuaChieu(ten: string | null | undefined): number {
  if (!ten) return 0;
  const chuan = ten.trim().toUpperCase().replace(/\s+/g, ' ').replace(/ \d+$/, '');
  return HE_CHIEU[chuan] ?? 0;
}

/** Hệ dùng để tính sát thương của một chiêu: của chiêu, không tra ra thì của con thú. */
export function heRaChieu(tenChieu: string | null | undefined, heThu: number): number {
  return heCuaChieu(tenChieu) || heThu;
}

/** Hệ số [gây, chịu] khi hệ `minh` gặp hệ `dich`. */
export function heSoHe(minh: number, dich: number): readonly [number, number] {
  return KHAC_HE[minh]?.[dich] ?? [1, 1];
}

// ─────────────────────────── Nhân vật ───────────────────────────

/** Ba con thú khởi đầu, đúng ba lựa chọn của bản gốc. */
export const THU_DAU = [
  // Ba con này bản gốc có ghi tên hẳn hoi nên giữ nguyên, khác 228 dòng thú
  // hoang vốn chỉ ghi "s" hay "sâu xanh" cho hàng chục mã ảnh khác nhau.
  { nguon: 1, ten: 'Sâu Xanh', he: 12, nacToiDa: 1 },
  { nguon: 3, ten: 'Rattata', he: 1, nacToiDa: 3 },
  { nguon: 4, ten: 'Spearow', he: 10, nacToiDa: 3 },
] as const;

export const VANG_DAU = 200;
export const EXP_DAU = 20;
export const SK_DAU = 20;
export const CAU_DAU = 5;

/** Chỉ số con thú lúc mới có: 20 máu, bốn chiêu đều 10 sát thương. */
export const MAU_DAU = 20;
export const CHIEU_DAU = 10;

export const TEN_TOI_THIEU = 3;
export const TEN_TOI_DA = 16;

// ─────────────────────────── Đánh nhau ───────────────────────────

/** Mỗi trận tốn 2 thể lực, y bản gốc. */
export const SK_MOI_TRAN = 2;

/**
 * Sát thương một lượt.
 *
 * Công thức gốc: mình gây `chiêu − thủ của địch`, địch gây `công của địch −
 * thủ của mình`, trong đó "thủ của mình" là TRUNG BÌNH bốn chiêu — con thú
 * không có cột phòng thủ riêng, bản gốc lấy `(p_1+p_2+p_3+p_4)/4`. Sàn 1 để
 * không bao giờ có lượt đánh không mất máu nào.
 *
 * Phần nhân theo hệ là của `he.php`, xem chú thích ở `KHAC_HE`.
 *
 * HAI HỆ SỐ NAY TÁCH RA. Phần MÌNH GÂY nhân theo hệ của CHIÊU đang ra
 * (`heRa`), phần MÌNH CHỊU vẫn nhân theo hệ của CON THÚ — đòn của địch nhằm
 * vào con chứ không nhằm vào chiêu. Bỏ `heRa` trống thì nó lấy `heMinh`, tức
 * đúng y cách cũ, nên mọi chỗ gọi cũ không đổi kết quả.
 */
export function tinhSatThuong(
  chieu: number, boThu: number, heMinh: number,
  congDich: number, thuDich: number, heDich: number,
  heRa: number = heMinh,
): { gay: number; chiu: number } {
  const nGay = heSoHe(heRa || heMinh, heDich)[0];
  const nChiu = heSoHe(heMinh, heDich)[1];
  const gay = Math.floor(Math.max(1, chieu - thuDich) * nGay);
  const chiu = Math.floor(Math.max(1, congDich - boThu) * nChiu);
  // Hệ số 0 nghĩa là miễn nhiễm hoàn toàn — giữ đúng 0, không kéo lên 1.
  return { gay: nGay === 0 ? 0 : Math.max(1, gay), chiu: nChiu === 0 ? 0 : Math.max(1, chiu) };
}

/** Bộ thủ của một con thú: trung bình bốn chiêu. */
export function boThu(c: { c1: number; c2: number; c3: number; c4: number }): number {
  return Math.floor((c.c1 + c.c2 + c.c3 + c.c4) / 4);
}

// ─────────────────────────── Bắt thú ───────────────────────────

/** Bản gốc: `rand(0,5) == 1`, tức đúng một phần sáu, không phụ thuộc máu. */
export const CO_HOI_BAT = 1 / 6;

// ─────────────────────────── Tiến cấp và tiến hoá ───────────────────────────

/**
 * Lên cấp bằng ĐÁ TIẾN CẤP: tốn 1 viên, cộng 100 vào cả bốn chiêu lẫn máu tối
 * đa, y bản gốc.
 *
 * ĐỔI MỘT CHỖ: bản gốc đòi `exp >= 1000` rồi lại ghi `exp = exp * 3` — nhân
 * lên chứ không trừ đi, nên qua lần đầu là ngưỡng vĩnh viễn thoả, kinh nghiệm
 * hoá ra chẳng để làm gì. Đó là lỗi gõ nhầm chứ không phải luật: ở đây TRỪ
 * đúng ngưỡng ấy.
 */
export const EXP_MOI_CAP = 1000;
export const CONG_MOI_CAP = 100;

/**
 * Tiến hoá: ảnh nấc sau nằm ở `id + 500`, nấc ba ở `id + 1000` — đúng quy ước
 * đánh số của bộ ảnh gốc. Nấc 2 mở ở cấp 6, nấc 3 ở cấp 10, và chỉ những con
 * có `nacToiDa` đủ lớn mới tiến được.
 */
export const CAP_TIEN_HOA = [0, 6, 10] as const;
export const BUOC_ANH_TIEN_HOA = 500;

export function anhThu(nguon: number, nac = 1): string {
  return `${ANH_POKE}/thu/${nguon + (nac - 1) * BUOC_ANH_TIEN_HOA}.gif`;
}

/** Con thú có tiến hoá được lúc này không, và lên nấc mấy. */
export function nacTienHoaMoi(cap: number, nac: number, nacToiDa: number): number | null {
  for (let n = nacToiDa; n >= 2; n--) {
    if (nac < n && n <= 3 && cap >= CAP_TIEN_HOA[n - 1]!) return n;
  }
  return null;
}

// ─────────────────────────── Trạm y tế ───────────────────────────

/** Bản gốc: 20 máu mỗi 5 phút, 10 thể lực mỗi 2 phút, chung một lần chờ. */
export const YTE_MAU = 20;
export const YTE_MAU_CHO_MS = 5 * 60_000;
export const YTE_SK = 10;
export const YTE_SK_CHO_MS = 2 * 60_000;

// ─────────────────────────── Cửa hàng ───────────────────────────

export const GIA_CAU = 20;
export const GIA_DA = 500;
export const MUA_TOI_DA = 99;

// ─────────────────────────── Các khu trên đảo ───────────────────────────

/**
 * Bản gốc để mỗi khu một thư mục `modules/` và một bảng cơ sở dữ liệu riêng
 * (`pokemon2`, `pokemon3`, `nuoc3`, `lanhtho`…) tuy nội dung y hệt nhau. Ở đây
 * gộp làm một danh sách; `bac` là mức khó, dùng để xếp thứ tự và để khoá khu
 * khó lại cho tới khi nhân vật đủ cấp.
 */
export const KHU = [
  { ma: 'co', ten: 'Khu Cỏ', bac: 1, mo: 'Bãi cỏ ngay cạnh làng, thú yếu nhất đảo.' },
  { ma: 'ao', ten: 'Ao Sen', bac: 2, mo: 'Mặt nước lặng, toàn thú hệ nước.' },
  { ma: 'map2', ten: 'Rừng Xanh', bac: 2, mo: 'Rừng rậm um tùm, nhiều thú hệ bọ.' },
  { ma: 'dong', ten: 'Hang Động', bac: 3, mo: 'Tối om, thú hệ đá và độc ẩn trong ngách.' },
  { ma: 'map3', ten: 'Núi Đá', bac: 3, mo: 'Vách đá dựng đứng, thú to xác.' },
  { ma: 'ho3', ten: 'Hồ Ba', bac: 4, mo: 'Hồ nước sâu ở chân núi.' },
  { ma: 'ho4', ten: 'Hồ Bốn', bac: 4, mo: 'Nước xoáy, thú khoẻ hơn hồ Ba.' },
  { ma: 'map4', ten: 'Hoang Mạc', bac: 4, mo: 'Cát nóng, thú hệ đất và thép.' },
  { ma: 'ho5', ten: 'Hồ Năm', bac: 5, mo: 'Hồ trên cao, nước lạnh buốt.' },
  { ma: 'ho7', ten: 'Hồ Bảy', bac: 5, mo: 'Sương phủ quanh năm.' },
  { ma: 'map5', ten: 'Đỉnh Tuyết', bac: 5, mo: 'Đỉnh cao nhất đảo, thú hệ băng.' },
  { ma: 'ho9', ten: 'Hồ Chín', bac: 6, mo: 'Vực nước đen, ít ai dám xuống.' },
  { ma: 'ho11', ten: 'Hồ Mười Một', bac: 6, mo: 'Nơi sâu nhất trong chuỗi hồ.' },
  { ma: 'lanhtho', ten: 'Lãnh Thổ', bac: 7, mo: 'Chiến trường tranh đoạt — thắng ở đây được điểm chiến công.' },
  { ma: 'huyenthoai', ten: 'Hang Huyền Thoại', bac: 8, mo: 'Ba con mạnh nhất đảo. Phải đủ mười bốn huy chương mới vào được.' },
  // Năm khu dưới đây KHÔNG có trong bản gốc — bản gốc dừng ở bậc 8 và hết
  // đường đi. Thú lấy từ bảng chỉ số công khai của PokeAPI (đời bốn và đời
  // năm, những đời mà bản wap 2013 chưa kịp có), sức mạnh nối tiếp bậc 6 rồi
  // nhân dần lên; phần thưởng cũng tăng theo — khác bản gốc vốn để exp và
  // vàng đứng yên ở mức hai chữ số suốt từ đầu tới cuối.
  { ma: 'gio', ten: 'Thảo Nguyên Gió', bac: 9, mo: 'Đồng cỏ lộng gió sau Hang Huyền Thoại, thú hệ bay và cỏ.' },
  { ma: 'nuiLua', ten: 'Núi Lửa Đỏ', bac: 10, mo: 'Miệng núi còn nóng, thú hệ lửa và đá.' },
  { ma: 'bien', ten: 'Vực Biển Sâu', bac: 11, mo: 'Dưới đáy vực không thấy mặt trời, thú hệ nước và băng.' },
  { ma: 'thanh', ten: 'Thành Cổ Hoang', bac: 12, mo: 'Phế tích bỏ hoang, thú hệ ma và tà.' },
  { ma: 'rong', ten: 'Vực Rồng', bac: 13, mo: 'Tận cùng đảo. Chỉ rồng ở được.' },
] as const;

export type MaKhu = (typeof KHU)[number]['ma'];

export function timKhu(ma: string) {
  return KHU.find((k) => k.ma === ma);
}

/**
 * Cấp nhân vật tối thiểu để vào một khu.
 *
 * Bản gốc KHÔNG khoá khu nào — ai cũng đi thẳng vào Lãnh Thổ được, gặp con
 * 8000 máu rồi mất trắng thể lực mà chẳng hiểu vì sao. Thêm ngưỡng cấp để thứ
 * tự các khu có nghĩa, và để người mới không lạc ngay vào chỗ chết.
 */
export function capVaoKhu(bac: number): number {
  return bac <= 1 ? 1 : (bac - 1) * 3;
}

/**
 * Khu Lãnh Thổ là chiến trường: thắng ở đây được thêm điểm chiến công, và
 * mỗi con hạ được tính vào bảng "số quái đã diệt".
 */
export const KHU_CHIEN_TRUONG = 'lanhtho';

/**
 * Hang Huyền Thoại mở bằng HUY CHƯƠNG chứ không bằng cấp.
 *
 * Ba con trong đó — Landorus, Victini, Mewtwo, máu 17.000 tới 25.000 — nằm
 * lẫn trong bảng của Rừng Xanh ở bản gốc, nhưng Rừng Xanh chỉ bốc `rand(1,20)`
 * còn khu huyền thoại bốc thẳng `rand(1044,1046)`. Lúc gộp mười bốn bảng làm
 * một, tôi bê nguyên cả bảng nên Rừng Xanh bậc 2 có thể nhả ra Mewtwo — đã
 * tách ra thành khu riêng.
 */
export const KHU_HUYEN_THOAI = 'huyenthoai';

/** Điều kiện vào khu: trả về lời nhắc nếu chưa đủ, rỗng nghĩa là vào được. */
export function canVaoKhu(bac: number, ma: string, cap: number, huyChuong: number): string | null {
  if (ma === KHU_HUYEN_THOAI) {
    return huyChuong >= SO_GYM ? null : `Cần đủ ${SO_GYM} huy chương Gym`;
  }
  // Năm khu bậc 9 trở lên nằm SAU Hang Huyền Thoại nên cũng đòi đủ huy chương,
  // nếu không thì đi vòng qua hang là vào thẳng được chỗ mạnh hơn cả hang.
  if (bac >= BAC_SAU_HUYEN_THOAI && huyChuong < SO_GYM) {
    return `Cần đủ ${SO_GYM} huy chương Gym`;
  }
  const can = capVaoKhu(bac);
  return cap >= can ? null : `Mở từ cấp ${can}`;
}

/** Bậc đầu tiên của phần đảo mở ra sau Hang Huyền Thoại. */
export const BAC_SAU_HUYEN_THOAI = 9;

// ─────────────────────────── Điểm danh hằng ngày ───────────────────────────

/**
 * Quà điểm danh theo chuỗi ngày liên tiếp — bản gốc không có mục này.
 *
 * Chuỗi tính theo NGÀY LỊCH giờ Việt Nam, không theo 24 giờ trôi: đếm theo giờ
 * thì ai vào lúc 23h hôm nay rồi 8h sáng mai sẽ bị coi là đứt chuỗi, mà đó lại
 * đúng là hai ngày liền.
 */
export const QUA_DIEM_DANH = [
  { ngay: 1, vang: 200, cau: 1, ngoc: 0 },
  { ngay: 2, vang: 400, cau: 1, ngoc: 0 },
  { ngay: 3, vang: 800, cau: 2, ngoc: 1 },
  { ngay: 4, vang: 1200, cau: 2, ngoc: 1 },
  { ngay: 5, vang: 2000, cau: 3, ngoc: 2 },
  { ngay: 6, vang: 3000, cau: 3, ngoc: 3 },
  { ngay: 7, vang: 5000, cau: 5, ngoc: 5 },
] as const;

/** Chuỗi dài hơn bảy ngày thì lặp lại mức ngày thứ bảy. */
export function quaDiemDanh(chuoi: number) {
  const i = Math.min(Math.max(1, chuoi), QUA_DIEM_DANH.length) - 1;
  return QUA_DIEM_DANH[i]!;
}

/** Múi giờ dùng để cắt ngày. Cả game là game Việt nên cắt theo giờ Việt Nam. */
export const LECH_GIO_VN = 7 * 60 * 60 * 1000;

/** Mốc đầu ngày (giờ Việt Nam) chứa thời điểm `t`, trả về dưới dạng UTC. */
export function dauNgayVN(t: Date): Date {
  const v = t.getTime() + LECH_GIO_VN;
  return new Date(Math.floor(v / 86_400_000) * 86_400_000 - LECH_GIO_VN);
}

/**
 * Chuỗi mới sau khi điểm danh vào `homNay`, biết lần trước là `truoc`.
 * Trả `null` nghĩa là hôm nay đã điểm danh rồi.
 */
export function chuoiDiemDanh(truoc: Date | null, chuoi: number, homNay: Date): number | null {
  if (!truoc) return 1;
  const cach = Math.round((homNay.getTime() - dauNgayVN(truoc).getTime()) / 86_400_000);
  if (cach <= 0) return null;
  return cach === 1 ? chuoi + 1 : 1;
}

// ─────────────────────────── Cấp nhân vật ───────────────────────────

/**
 * Cấp nhân vật tính từ tổng kinh nghiệm: cấp n cần `25·n·(n−1)` điểm.
 *
 * PHẢI THÊM, bản gốc thiếu hẳn. Ở đó cột `chars.lvl` được ghi '1' lúc tạo
 * nhân vật rồi không câu lệnh nào trong 291 tệp đụng vào nữa — kinh nghiệm cứ
 * cộng dồn mà cấp đứng yên mãi ở 1. Không có phép này thì mười ba khu sau khoá
 * vĩnh viễn, mà thứ tự các khu cũng chẳng còn nghĩa gì.
 *
 * Chọn hàm bậc hai chứ không tuyến tính để đoạn đầu đi nhanh (cấp 2 chỉ cần
 * 50 điểm, quãng chục con thú ở Khu Cỏ) rồi chậm dần về sau, khớp với việc thú
 * ở khu sau cho nhiều kinh nghiệm hơn hẳn.
 */
export const EXP_HE_SO_CAP = 25;

export function expChoCap(cap: number): number {
  return EXP_HE_SO_CAP * cap * (cap - 1);
}

export function capTheoExp(exp: number): number {
  let cap = 1;
  while (expChoCap(cap + 1) <= exp && cap < 99) cap++;
  return cap;
}

// ─────────────────────────── Mười bốn Gym ───────────────────────────

export const SO_GYM = 14;

/**
 * Huy chương: mỗi Gym một cái, lấy đúng ảnh `img/bot/N/huychuong` của bản gốc.
 *
 * Bộ ảnh chỉ có mười ba cái — Gym 14 thiếu. Không mượn tạm huy chương của Gym
 * khác cho đủ mâm: chỗ ấy để trống và nói rõ là thiếu, chứ hai Gym cùng một
 * huy chương thì người sưu tầm nhìn vào không hiểu vì sao.
 */
export const SO_HUY_CHUONG = 13;

export function anhHuyChuong(so: number): string | null {
  return so >= 1 && so <= SO_HUY_CHUONG ? `${ANH_POKE}/huychuong/${so}.png` : null;
}

export function anhGym(so: number): string {
  return `${ANH_POKE}/gym/${so}.gif`;
}

/**
 * Gym đánh THEO THỨ TỰ: hạ xong Gym n mới vào được Gym n+1.
 *
 * Bản gốc chỉ chặn đánh lại Gym đã qua (`if bot >= id`) chứ không chặn nhảy
 * cóc, mà thắng lại ghi `bot = id` — nên hạ Gym 5 trước là mặc nhiên coi như
 * xong luôn Gym 1 đến 4 dù chưa hề đánh, còn hạ Gym 14 trước thì khoá sạch cả
 * mười ba Gym còn lại. Cột `bot` rõ ràng được nghĩ ra để đếm số Gym đã qua,
 * nên ở đây ép đúng thứ tự.
 */
export function gymDuocVao(so: number, daHa: number): boolean {
  return so === daHa + 1;
}

/**
 * Ngọc thưởng cho mỗi Gym.
 *
 * PHẢI SUY RA. Bản gốc trả ngọc bằng cột `tree` của bảng Gym, nhưng trong bản
 * kết xuất cơ sở dữ liệu chỉ Gym 1 còn dòng dữ liệu (20 ngọc); mười ba bảng
 * `monster2`…`monster14` đều rỗng phần ấy. Cho tăng dần theo số hiệu Gym để
 * Gym sau vẫn đáng đánh hơn Gym trước.
 */
export function ngocGym(so: number): number {
  return 10 + so * 5;
}

/** Đổi ngọc lấy đá tiến cấp — chỗ tiêu ngọc, bản gốc dùng ngọc mua đồ ở tiệm. */
export const NGOC_MOI_DA = 5;

// ─────────────────────────── Đấu trường ───────────────────────────

/**
 * Sát thương ở đấu trường: chiêu số n của mình TRỪ chiêu số n của đối thủ.
 *
 * Khác hẳn công thức đánh thú hoang, và đó là chủ ý của bản gốc: ở đây không
 * có "bộ thủ" nào cả, mà là đoán xem đối thủ yếu ở chiêu nào rồi nhè đúng
 * chiêu ấy mà đánh. Sàn 1 như mọi chỗ khác.
 *
 * KHÔNG áp bảng khắc hệ ở đấu trường, dù cả phần đánh thú hoang đều có. Thêm
 * vào thì con mang hệ khắc thắng bất kể chỉ số, mà phần đoán chiêu — điểm hay
 * duy nhất của luật này — thành vô nghĩa.
 */
export function satThuongDau(chieuMinh: number, chieuDich: number): number {
  return Math.max(1, chieuMinh - chieuDich);
}

/** Mỗi lượt có 10 phút; quá hạn thì bên đến lượt xử thua. Y bản gốc. */
export const DAU_HAN_MS = 10 * 60_000;

/** Thắng được 5 vàng và 5 kinh nghiệm; thua mất 5 vàng và thú tụt về 10 máu. */
export const DAU_VANG = 5;
export const DAU_EXP = 5;
export const DAU_MAU_THUA = 10;

export const DAU_CAP_MIN = 1;
export const DAU_CAP_MAX = 100;

/**
 * Giờ vàng của đấu trường: 21 giờ (giờ Việt Nam).
 *
 * Bản gốc `if ($hour>=21 and $hour<=21)` — ĐÓNG CỬA đấu trường suốt 23 tiếng
 * còn lại trong ngày. Ý tưởng giờ vàng thì hay, nhưng khoá cứng như thế thì
 * trên một diễn đàn nhỏ gần như chẳng ai gặp được ai. Ở đây mở cả ngày, còn
 * giờ vàng thì THƯỞNG GẤP ĐÔI — giữ được lý do để mọi người cùng lên vào một
 * giờ mà không biến tính năng thành đồ trưng bày.
 */
export const DAU_GIO_VANG = 21;

export function laGioVang(now: Date = new Date()): boolean {
  return Math.floor((now.getTime() / 3600000 + 7) % 24) === DAU_GIO_VANG;
}

// ─────────────────────────── Cường hoá ───────────────────────────

/**
 * Sáu cấp huyền tinh. Dùng viên cấp n để nâng con thú từ cấp cường hoá n−1
 * lên n; mỗi cấp cộng thẳng vào MÁU TỐI ĐA.
 *
 * Số liệu lấy đúng từ `modules/cuonghoa/`: cấp 1 và 2 cộng 500 máu, cấp 3
 * cộng 1500, cấp 4 cộng 2000, cấp 5 cộng 2500, cấp 6 cộng 3000. Giá thì cấp
 * 1–3 trả bằng vàng (10.000 / 50.000 / 100.000) còn cấp 4–6 trả bằng ngọc
 * (50 / 100 / 150) — thang giá vàng cao hơn hẳn mọi thứ khác trong game, đó
 * là chủ ý: đây là hàng cuối chặng.
 *
 * Riêng cấp 6 có RỦI RO: `rand(1,10)`, năm số đầu thành công, năm số sau
 * thất bại và tụt một cấp cường hoá.
 */
export const HUYEN_TINH = [
  { cap: 1, mau: 500, vang: 10_000, ngoc: 0, coHoi: 1 },
  { cap: 2, mau: 500, vang: 50_000, ngoc: 0, coHoi: 1 },
  { cap: 3, mau: 1500, vang: 100_000, ngoc: 0, coHoi: 1 },
  { cap: 4, mau: 2000, vang: 0, ngoc: 50, coHoi: 1 },
  { cap: 5, mau: 2500, vang: 0, ngoc: 100, coHoi: 1 },
  { cap: 6, mau: 3000, vang: 0, ngoc: 150, coHoi: 0.5 },
] as const;

export const CAP_CUONG_TOI_DA = 6;

export function timHuyenTinh(cap: number) {
  return HUYEN_TINH.find((h) => h.cap === cap);
}

export function anhHuyenTinh(cap: number): string {
  return `${ANH_POKE}/huyentinh/${cap}.png`;
}

// ─────────────────────────── Chợ thú ───────────────────────────

/** Chợ tính bằng NGỌC chứ không phải vàng, y bản gốc. */
export const CHO_GIA_MIN = 1;
export const CHO_GIA_MAX = 9999;

// ─────────────────────────── Bang hội ───────────────────────────

/** Lập bang tốn 500 ngọc; muốn vào bang phải từ cấp 15. Y bản gốc. */
export const BANG_GIA_NGOC = 500;
export const BANG_CAP_TOI_THIEU = 15;
export const BANG_SUC_CHUA = 5;
export const BANG_CONG_DAU = 10;
export const BANG_THU_DAU = 10;
export const BANG_TEN_TOI_THIEU = 3;
export const BANG_TEN_TOI_DA = 20;

// ─────────────────────────── Nhiệm vụ ───────────────────────────

/**
 * Chuỗi nhiệm vụ nhập môn.
 *
 * Bản gốc có bốn nhiệm vụ nhưng KHÔNG có chỗ nào đánh dấu hoàn thành: cột
 * `quest` chỉ nhảy từ số lẻ lên số chẵn khi tự nó đọc thấy số lẻ, mà không
 * đoạn mã nào trong 291 tệp đặt nó thành số lẻ cả — nên người chơi kẹt vĩnh
 * viễn ở nhiệm vụ đầu. Ở đây mốc hoàn thành đọc thẳng từ dữ liệu thật (số thú
 * trong kho, số huy chương, số trận thắng đấu trường…), nên không có cột nào
 * để lệch.
 */
export const NHIEM_VU = [
  { ten: 'Người mới đến đảo', mo: 'Bắt con thú thứ hai bằng quả cầu.', exp: 10, vang: 50, ngoc: 0 },
  { ten: 'Thử sức ở Gym', mo: 'Hạ Gym đầu tiên và lấy huy chương.', exp: 20, vang: 0, ngoc: 1 },
  { ten: 'Đi cho biết đó biết đây', mo: 'Đạt cấp 3 để mở khu thứ hai.', exp: 40, vang: 0, ngoc: 1 },
  { ten: 'Ra sàn đấu', mo: 'Thắng một trận ở đấu trường.', exp: 40, vang: 0, ngoc: 1 },
] as const;

// ─────────────────────────── Lãnh thổ: điểm chiến công ───────────────────────────

/**
 * Thắng một trận ở Lãnh Thổ được 1 điểm chiến công và tính 1 con vào bảng
 * diệt quái. Đủ 100 điểm thì đổi một phần quà bốc ngẫu nhiên.
 *
 * Bảy phần quà lấy đúng của bản gốc, sửa hai chỗ hỏng:
 *  • Phần "5 quả cầu" bản gốc ghi nhầm vào cột NGỌC (`tree`) chứ không phải
 *    cột cầu (`ball`) — chữ nói một đằng, số vào một nẻo.
 *  • Bản gốc bốc `rand(1,7)` nhưng lại viết thêm nhánh quà thứ 8, nên nhánh
 *    ấy không bao giờ trúng. Ở đây bảy phần là bảy phần.
 */
export const DIEM_DOI_QUA = 100;

export const QUA_LANH_THO = [
  { ten: 'Một viên đá tiến cấp', da: 1, cau: 0, vang: 0, ngoc: 0, skToiDa: 0 },
  { ten: 'Một quả cầu', da: 0, cau: 1, vang: 0, ngoc: 0, skToiDa: 0 },
  { ten: 'Năm quả cầu', da: 0, cau: 5, vang: 0, ngoc: 0, skToiDa: 0 },
  { ten: 'Thêm 10 thể lực tối đa', da: 0, cau: 0, vang: 0, ngoc: 0, skToiDa: 10 },
  { ten: '100 vàng', da: 0, cau: 0, vang: 100, ngoc: 0, skToiDa: 0 },
  { ten: '200 vàng', da: 0, cau: 0, vang: 200, ngoc: 0, skToiDa: 0 },
  { ten: '10 ngọc', da: 0, cau: 0, vang: 0, ngoc: 10, skToiDa: 0 },
] as const;

// ─────────────────────────── Trang bị ───────────────────────────

/**
 * Bốn ô trang bị, tên cột lấy đúng của bản gốc (`golova` là tiếng Nga —
 * "đầu", tức cái mũ; bảng `shop` giữ nguyên chữ ấy).
 *
 * GIỐNG HỆT BẢNG KHẮC HỆ: bản gốc dựng đủ bốn ô, bán đủ ba mươi tám món từ
 * +1 tới +500, cho mặc vào bằng cột `dressed` — rồi KHÔNG trận nào cộng chỉ
 * số trang bị vào sát thương. Mua xong mặc vào là hết chuyện. Ở đây có nối
 * vào thật.
 */
export const O_TRANG_BI = [
  { loai: 'weapon', ten: 'Vũ khí', anh: 'vukhi', cot: 'cong' as const, mo: 'Cộng thẳng vào sát thương gây ra.' },
  { loai: 'shield', ten: 'Khiên', anh: 'khien', cot: 'thu' as const, mo: 'Cộng vào bộ thủ, giảm sát thương phải chịu.' },
  { loai: 'golova', ten: 'Mũ', anh: 'mu', cot: 'mu' as const, mo: 'Cộng vào bộ thủ.' },
  { loai: 'body', ten: 'Giáp', anh: 'giap', cot: 'giap' as const, mo: 'Cộng vào bộ thủ.' },
] as const;

/**
 * Ảnh của từng ô. Bộ ảnh lấy từ game-icons.net (CC BY 3.0) — bản gốc không có
 * icon vật phẩm nào cả, thư mục `nhanvat` chỉ là mấy mảnh ghép hình nhân vật
 * cỡ 23×11 điểm ảnh và còn thiếu hẳn cái khiên.
 *
 * CC BY BẮT BUỘC ghi công, khác bộ Kenney dùng cho sóc đĩa vốn là CC0 —
 * nên phần ghi công hiện ngay trên trang chứ không giấu trong tệp NGUON.txt.
 */
export function anhTrangBi(loai: string): string {
  const o = O_TRANG_BI.find((x) => x.loai === loai);
  return `${ANH_POKE}/trangbi/${o?.anh ?? 'thuoc'}.svg`;
}

export const GHI_CONG_TRANG_BI = 'Ảnh trang bị: Lorc và sbed trên game-icons.net (CC BY 3.0).';

export type LoaiDo = (typeof O_TRANG_BI)[number]['loai'] | 'elixir';

export function tenLoaiDo(loai: string): string {
  return O_TRANG_BI.find((o) => o.loai === loai)?.ten ?? (loai === 'elixir' ? 'Thuốc' : loai);
}

/** Chỉ số cộng thêm từ những món đang mặc. */
export function congTrangBi(
  doDangMac: readonly { cong: number; thu: number; mu: number; giap: number }[],
): { cong: number; thu: number } {
  let cong = 0;
  let thu = 0;
  for (const d of doDangMac) {
    cong += d.cong;
    // Khiên, mũ và giáp đều đổ vào một chỗ: bản gốc để ba cột riêng nhưng
    // chưa bao giờ dùng tới, nên chẳng có gì nói ba cột ấy khác nhau ra sao.
    // Gộp làm bộ thủ thì mọi món đều có tác dụng và luật chỉ có một dòng.
    thu += d.thu + d.mu + d.giap;
  }
  return { cong, thu };
}

export const MUA_DO_TOI_DA = 20;
