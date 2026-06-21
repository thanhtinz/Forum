// Engine Tarot — bộ bài đầy đủ 78 lá: 22 Ẩn Chính (Major) + 56 Ẩn Phụ (Minor).
// Nghĩa + mô tả + lời khuyên tiếng Việt.
export interface TarotCard {
  number: number;
  name: string;
  nameVi: string;
  upright: string[];   // nghĩa xuôi
  reversed: string[];  // nghĩa ngược
  desc: string;        // ý nghĩa tổng quát của lá bài
  adviceUp: string;    // lời khuyên khi xuôi
  adviceRev: string;   // lời khuyên khi ngược
  arcana?: 'major' | 'minor';
  suitKey?: 'wands' | 'cups' | 'swords' | 'pentacles';
  suitVi?: string;
  imageSlug?: string; // tên file ảnh cho Ẩn Phụ (vd: aceofwands)
}

export const MAJOR_ARCANA: TarotCard[] = [
  { number: 0, name: 'The Fool', nameVi: 'Gã Khờ', upright: ['khởi đầu mới', 'phiêu lưu', 'tự do'], reversed: ['liều lĩnh', 'thiếu kế hoạch', 'bốc đồng'], desc: 'Biểu tượng của sự khởi đầu, tinh thần tự do và lòng tin vào hành trình phía trước.', adviceUp: 'Hãy can đảm bước đi, đừng sợ điều chưa biết — cơ hội mới đang mở ra.', adviceRev: 'Khoan vội: hãy cân nhắc kỹ trước khi lao vào điều gì đó liều lĩnh.' },
  { number: 1, name: 'The Magician', nameVi: 'Nhà Ảo Thuật', upright: ['sáng tạo', 'kỹ năng', 'ý chí'], reversed: ['lừa dối', 'lãng phí tiềm năng', 'thiếu tập trung'], desc: 'Bạn có đủ công cụ và năng lực để biến ý tưởng thành hiện thực.', adviceUp: 'Tự tin hành động — bạn đủ khả năng để tạo ra kết quả mình muốn.', adviceRev: 'Cẩn thận với sự xao nhãng hoặc bị thao túng; tập trung vào điều cốt lõi.' },
  { number: 2, name: 'The High Priestess', nameVi: 'Nữ Tư Tế', upright: ['trực giác', 'bí ẩn', 'trí tuệ nội tâm'], reversed: ['phớt lờ trực giác', 'che giấu', 'khép kín'], desc: 'Lắng nghe tiếng nói bên trong; có những điều chưa lộ ra hết.', adviceUp: 'Tin vào trực giác và dành thời gian tĩnh lặng để thấy rõ câu trả lời.', adviceRev: 'Đừng phớt lờ cảm giác của mình; có thông tin đang bị che giấu.' },
  { number: 3, name: 'The Empress', nameVi: 'Nữ Hoàng', upright: ['sung túc', 'nuôi dưỡng', 'sáng tạo'], reversed: ['tắc nghẽn', 'phụ thuộc', 'kiệt sức'], desc: 'Năng lượng dồi dào, chăm sóc và sự phong phú trong cuộc sống.', adviceUp: 'Hãy nuôi dưỡng bản thân và những gì bạn yêu quý — thành quả sẽ đến.', adviceRev: 'Chú ý cân bằng; đừng để bản thân kiệt sức hay phụ thuộc quá mức.' },
  { number: 4, name: 'The Emperor', nameVi: 'Hoàng Đế', upright: ['quyền uy', 'ổn định', 'lãnh đạo'], reversed: ['lạm quyền', 'cứng nhắc', 'hỗn loạn'], desc: 'Cấu trúc, kỷ luật và khả năng làm chủ tình huống.', adviceUp: 'Thiết lập kế hoạch rõ ràng và giữ kỷ luật để đạt mục tiêu.', adviceRev: 'Đừng quá cứng nhắc hay kiểm soát; linh hoạt sẽ giúp ích hơn.' },
  { number: 5, name: 'The Hierophant', nameVi: 'Giáo Hoàng', upright: ['truyền thống', 'niềm tin', 'dẫn dắt'], reversed: ['nổi loạn', 'giáo điều', 'mù quáng'], desc: 'Giá trị truyền thống, sự dẫn dắt và niềm tin.', adviceUp: 'Tìm tới người cố vấn hoặc giá trị đã được kiểm chứng để định hướng.', adviceRev: 'Có thể đã đến lúc đi con đường riêng thay vì theo lối mòn.' },
  { number: 6, name: 'The Lovers', nameVi: 'Tình Nhân', upright: ['tình yêu', 'lựa chọn', 'hòa hợp'], reversed: ['bất hòa', 'chọn sai', 'mâu thuẫn'], desc: 'Kết nối sâu sắc và những lựa chọn quan trọng từ trái tim.', adviceUp: 'Hãy chọn theo giá trị thật của bạn; sự hòa hợp đang ở gần.', adviceRev: 'Xem lại một mối quan hệ hoặc quyết định đang gây mâu thuẫn nội tâm.' },
  { number: 7, name: 'The Chariot', nameVi: 'Cỗ Xe', upright: ['chiến thắng', 'ý chí', 'quyết tâm'], reversed: ['mất kiểm soát', 'lạc hướng', 'yếu đuối'], desc: 'Sức mạnh ý chí giúp bạn vượt qua trở ngại để tiến lên.', adviceUp: 'Giữ vững mục tiêu và tiến tới quyết liệt — chiến thắng trong tầm tay.', adviceRev: 'Lấy lại định hướng; bạn đang bị phân tán hoặc mất kiểm soát.' },
  { number: 8, name: 'Strength', nameVi: 'Sức Mạnh', upright: ['can đảm', 'kiên nhẫn', 'kiểm soát'], reversed: ['nghi ngờ bản thân', 'yếu đuối', 'nóng giận'], desc: 'Sức mạnh thật sự đến từ sự dịu dàng, kiên nhẫn và lòng can đảm.', adviceUp: 'Đối diện thử thách bằng sự bình tĩnh và kiên trì, không cần ép buộc.', adviceRev: 'Hãy tử tế với chính mình; lấy lại sự tự tin từng bước một.' },
  { number: 9, name: 'The Hermit', nameVi: 'Ẩn Sĩ', upright: ['nội quan', 'tìm kiếm', 'khôn ngoan'], reversed: ['cô lập', 'lạc lối', 'khép mình'], desc: 'Thời điểm hướng vào trong để tìm câu trả lời và trí tuệ.', adviceUp: 'Dành thời gian một mình để suy ngẫm; câu trả lời nằm bên trong bạn.', adviceRev: 'Đừng cô lập quá mức; hãy kết nối lại khi cần sự giúp đỡ.' },
  { number: 10, name: 'Wheel of Fortune', nameVi: 'Bánh Xe Số Phận', upright: ['vận may', 'bước ngoặt', 'chu kỳ'], reversed: ['xui xẻo', 'trì trệ', 'mất kiểm soát'], desc: 'Mọi thứ đang xoay chuyển; một chu kỳ mới đang đến.', adviceUp: 'Đón nhận thay đổi — vận may đang nghiêng về phía bạn.', adviceRev: 'Kiên nhẫn qua giai đoạn khó; chu kỳ rồi sẽ đổi chiều.' },
  { number: 11, name: 'Justice', nameVi: 'Công Lý', upright: ['công bằng', 'sự thật', 'trách nhiệm'], reversed: ['bất công', 'thiên vị', 'trốn tránh'], desc: 'Nhân quả rõ ràng: hành động của bạn quyết định kết quả.', adviceUp: 'Hãy hành động trung thực và công bằng; sự thật sẽ được sáng tỏ.', adviceRev: 'Nhìn nhận trách nhiệm của mình thay vì đổ lỗi hay né tránh.' },
  { number: 12, name: 'The Hanged Man', nameVi: 'Người Treo Ngược', upright: ['buông bỏ', 'góc nhìn mới', 'hy sinh'], reversed: ['chần chừ', 'kháng cự', 'bế tắc'], desc: 'Đôi khi dừng lại và đổi góc nhìn lại mở ra lối đi.', adviceUp: 'Buông bỏ kiểm soát và thử nhìn vấn đề theo cách khác.', adviceRev: 'Bạn đang kẹt vì kháng cự thay đổi — hãy chấp nhận để tiến lên.' },
  { number: 13, name: 'Death', nameVi: 'Cái Chết', upright: ['kết thúc', 'chuyển hóa', 'tái sinh'], reversed: ['níu kéo', 'sợ thay đổi', 'trì hoãn'], desc: 'Một chương khép lại để chương mới tốt đẹp hơn bắt đầu.', adviceUp: 'Hãy để cái cũ qua đi; sự chuyển hóa này là cần thiết.', adviceRev: 'Đừng níu kéo điều đã hết; nỗi sợ thay đổi đang kìm hãm bạn.' },
  { number: 14, name: 'Temperance', nameVi: 'Tiết Độ', upright: ['cân bằng', 'điều hòa', 'kiên nhẫn'], reversed: ['mất cân bằng', 'thái quá', 'thiếu kiên nhẫn'], desc: 'Sự hài hòa và điều độ mang lại kết quả bền vững.', adviceUp: 'Giữ chừng mực và kiên nhẫn; mọi thứ đang dần vào guồng.', adviceRev: 'Điều chỉnh lại — bạn đang thái quá hoặc mất cân bằng ở đâu đó.' },
  { number: 15, name: 'The Devil', nameVi: 'Ác Quỷ', upright: ['ràng buộc', 'cám dỗ', 'vật chất'], reversed: ['giải thoát', 'phá bỏ xiềng xích', 'tỉnh ngộ'], desc: 'Những ràng buộc, thói quen hoặc cám dỗ đang trói buộc bạn.', adviceUp: 'Nhận diện điều đang kìm hãm mình — bạn có quyền lựa chọn.', adviceRev: 'Đây là lúc giải thoát khỏi xiềng xích và thói quen tiêu cực.' },
  { number: 16, name: 'The Tower', nameVi: 'Tòa Tháp', upright: ['biến động', 'sụp đổ', 'thức tỉnh'], reversed: ['né tránh tai họa', 'sợ thay đổi', 'trì hoãn khủng hoảng'], desc: 'Một biến động bất ngờ phá vỡ điều không còn vững chắc.', adviceUp: 'Giữ bình tĩnh qua xáo trộn; nền tảng mới sẽ chắc hơn.', adviceRev: 'Đừng trì hoãn điều tất yếu; đối diện sớm sẽ nhẹ nhàng hơn.' },
  { number: 17, name: 'The Star', nameVi: 'Ngôi Sao', upright: ['hy vọng', 'cảm hứng', 'chữa lành'], reversed: ['tuyệt vọng', 'mất niềm tin', 'nản lòng'], desc: 'Niềm hy vọng và sự chữa lành sau giai đoạn khó khăn.', adviceUp: 'Giữ niềm tin và mơ ước; bình yên đang trở lại với bạn.', adviceRev: 'Đừng đánh mất hy vọng; hãy tự nuôi dưỡng lại niềm tin.' },
  { number: 18, name: 'The Moon', nameVi: 'Mặt Trăng', upright: ['ảo ảnh', 'tiềm thức', 'mơ hồ'], reversed: ['sáng tỏ', 'vượt qua sợ hãi', 'sự thật lộ ra'], desc: 'Mọi thứ chưa rõ ràng; cảm xúc và nỗi sợ có thể đánh lừa.', adviceUp: 'Cẩn trọng với điều chưa rõ; đừng vội kết luận khi còn mơ hồ.', adviceRev: 'Sương mù đang tan; sự thật và sự sáng tỏ dần hiện ra.' },
  { number: 19, name: 'The Sun', nameVi: 'Mặt Trời', upright: ['niềm vui', 'thành công', 'sức sống'], reversed: ['lạc quan thái quá', 'trì hoãn', 'thiếu năng lượng'], desc: 'Niềm vui, thành công và năng lượng tích cực tỏa sáng.', adviceUp: 'Tận hưởng và chia sẻ niềm vui; đây là giai đoạn rực rỡ.', adviceRev: 'Tìm lại nguồn năng lượng; đừng để sự trì hoãn che mất ánh sáng.' },
  { number: 20, name: 'Judgement', nameVi: 'Phán Xét', upright: ['hồi sinh', 'thức tỉnh', 'tha thứ'], reversed: ['tự trách', 'nghi ngờ', 'né tránh phán xét'], desc: 'Thời điểm nhìn lại, thức tỉnh và bước sang trang mới.', adviceUp: 'Lắng nghe tiếng gọi bên trong và tha thứ để bước tiếp.', adviceRev: 'Ngừng tự trách; hãy đối diện và rút ra bài học một cách nhẹ nhàng.' },
  { number: 21, name: 'The World', nameVi: 'Thế Giới', upright: ['hoàn thành', 'viên mãn', 'thành tựu'], reversed: ['dang dở', 'trì trệ', 'thiếu kết thúc'], desc: 'Một hành trình hoàn tất trọn vẹn và viên mãn.', adviceUp: 'Ăn mừng thành tựu — bạn đã đi đến đích của một chu kỳ.', adviceRev: 'Còn việc dang dở cần hoàn tất trước khi sang chương mới.' },
];

// ── 56 lá Ẩn Phụ (Minor Arcana): 4 chất × 14 lá ──
const SUITS = [
  { key: 'wands' as const, vi: 'Gậy', en: 'Wands', theme: 'sự nghiệp, đam mê và hành động', up: ['nhiệt huyết', 'sáng tạo'], rev: ['mất động lực', 'nóng vội'] },
  { key: 'cups' as const, vi: 'Cốc', en: 'Cups', theme: 'tình cảm và các mối quan hệ', up: ['cảm xúc', 'yêu thương'], rev: ['tổn thương', 'khép lòng'] },
  { key: 'swords' as const, vi: 'Kiếm', en: 'Swords', theme: 'lý trí, sự thật và quyết định', up: ['rõ ràng', 'quyết đoán'], rev: ['mâu thuẫn', 'lo âu'] },
  { key: 'pentacles' as const, vi: 'Tiền', en: 'Pentacles', theme: 'tiền bạc, công việc và vật chất', up: ['ổn định', 'thực tế'], rev: ['thiếu hụt', 'bất an'] },
];

const RANKS = [
  { vi: 'Át', en: 'Ace', slug: 'ace', up: ['khởi đầu mới', 'cơ hội'], rev: ['lỡ cơ hội', 'khởi đầu chậm'], desc: 'Hạt giống mới đầy tiềm năng', adv: 'Nắm bắt cơ hội mới về' },
  { vi: 'Hai', en: 'Two', slug: 'two', up: ['lựa chọn', 'cân bằng'], rev: ['phân vân', 'mất cân bằng'], desc: 'Giai đoạn cân nhắc và lựa chọn', adv: 'Cân nhắc kỹ trước khi quyết định về' },
  { vi: 'Ba', en: 'Three', slug: 'three', up: ['phát triển', 'hợp tác'], rev: ['trì trệ', 'thiếu phối hợp'], desc: 'Sự phát triển và mở rộng bước đầu', adv: 'Hợp tác và mở rộng trong' },
  { vi: 'Bốn', en: 'Four', slug: 'four', up: ['ổn định', 'nền tảng'], rev: ['trì trệ', 'bảo thủ'], desc: 'Sự ổn định và củng cố', adv: 'Củng cố nền tảng cho' },
  { vi: 'Năm', en: 'Five', slug: 'five', up: ['thử thách', 'thay đổi'], rev: ['hồi phục', 'vượt khó'], desc: 'Khó khăn hoặc xung đột tạm thời', adv: 'Bình tĩnh vượt qua thử thách trong' },
  { vi: 'Sáu', en: 'Six', slug: 'six', up: ['hồi phục', 'hài hòa'], rev: ['trì hoãn', 'lệch nhịp'], desc: 'Sự phục hồi và tiến triển tích cực', adv: 'Đón nhận sự hài hòa đang trở lại với' },
  { vi: 'Bảy', en: 'Seven', slug: 'seven', up: ['kiên trì', 'đánh giá'], rev: ['hoài nghi', 'bỏ cuộc'], desc: 'Thời điểm đánh giá lại và kiên trì', adv: 'Kiên nhẫn và xem lại hướng đi trong' },
  { vi: 'Tám', en: 'Eight', slug: 'eight', up: ['tiến triển', 'nỗ lực'], rev: ['chậm trễ', 'mất tập trung'], desc: 'Sự chuyển động và tiến bộ nhanh', adv: 'Tập trung nỗ lực để tiến nhanh trong' },
  { vi: 'Chín', en: 'Nine', slug: 'nine', up: ['gần thành công', 'sung túc'], rev: ['lo lắng', 'chưa trọn vẹn'], desc: 'Gần đạt được mục tiêu', adv: 'Giữ vững — thành quả đang đến gần về' },
  { vi: 'Mười', en: 'Ten', slug: 'ten', up: ['hoàn tất', 'viên mãn'], rev: ['gánh nặng', 'dang dở'], desc: 'Đỉnh điểm và hoàn thành một chu kỳ', adv: 'Tận hưởng thành quả trọn vẹn của' },
  { vi: 'Thị Đồng', en: 'Page', slug: 'page', up: ['học hỏi', 'tin tức mới'], rev: ['thiếu chín chắn', 'tin chưa rõ'], desc: 'Tinh thần học hỏi và khám phá', adv: 'Mở lòng học hỏi điều mới về' },
  { vi: 'Hiệp Sĩ', en: 'Knight', slug: 'knight', up: ['hành động', 'theo đuổi'], rev: ['hấp tấp', 'bốc đồng'], desc: 'Năng lượng hành động mạnh mẽ', adv: 'Chủ động theo đuổi mục tiêu trong' },
  { vi: 'Hoàng Hậu', en: 'Queen', slug: 'queen', up: ['thấu hiểu', 'làm chủ'], rev: ['quá cảm tính', 'kiểm soát'], desc: 'Sự trưởng thành và làm chủ', adv: 'Dùng sự thấu hiểu để làm chủ' },
  { vi: 'Vua', en: 'King', slug: 'king', up: ['lãnh đạo', 'bản lĩnh'], rev: ['độc đoán', 'cứng nhắc'], desc: 'Bậc thầy và người dẫn dắt', adv: 'Lãnh đạo bằng bản lĩnh và kinh nghiệm trong' },
];

export const MINOR_ARCANA: TarotCard[] = SUITS.flatMap((s, si) =>
  RANKS.map((r, ri) => ({
    number: 100 + si * 14 + ri,
    name: `${r.en} of ${s.en}`,
    nameVi: `${r.vi} ${s.vi}`,
    upright: [...r.up, ...s.up],
    reversed: [...r.rev, ...s.rev],
    desc: `${r.desc} trong lĩnh vực ${s.theme}.`,
    adviceUp: `${r.adv} ${s.theme}.`,
    adviceRev: `Hãy chú ý: ${s.rev.join(', ')} có thể ảnh hưởng tới ${s.theme}.`,
    arcana: 'minor' as const,
    suitKey: s.key,
    suitVi: s.vi,
    imageSlug: `${r.slug}of${s.key}`,
  })),
);

export const FULL_DECK: TarotCard[] = [
  ...MAJOR_ARCANA.map((c) => ({ ...c, arcana: 'major' as const })),
  ...MINOR_ARCANA,
];

export interface DrawnCard {
  number: number;
  name: string;
  nameVi: string;
  reversedOrientation: boolean;
  meaning: string[];      // nghĩa theo hướng đang hiện
  upright: string[];
  reversed: string[];
  desc: string;
  advice: string;         // lời khuyên theo hướng đang hiện
  image: string;          // chỉ Major Arcana có ảnh; Minor để rỗng (frontend vẽ thẻ màu)
  arcana: 'major' | 'minor';
  suitKey?: string;
  suitVi?: string;
  element: string;        // Nguyên tố: Lửa / Nước / Khí / Đất
  zodiac: string;         // Cung hoàng đạo liên hệ
  astro: string;          // Chiêm tinh (hành tinh trong cung / decan)
}

// ── Tương ứng chiêm tinh (hệ Golden Dawn) cho từng lá ──
const PLANET_VI: Record<string, string> = {
  Sun: 'Mặt Trời', Moon: 'Mặt Trăng', Mercury: 'Sao Thủy', Venus: 'Sao Kim',
  Mars: 'Sao Hỏa', Jupiter: 'Sao Mộc', Saturn: 'Sao Thổ',
  Uranus: 'Thiên Vương Tinh', Neptune: 'Hải Vương Tinh', Pluto: 'Diêm Vương Tinh',
};
const SIGN_VI: Record<string, string> = {
  Aries: 'Bạch Dương', Taurus: 'Kim Ngưu', Gemini: 'Song Tử', Cancer: 'Cự Giải',
  Leo: 'Sư Tử', Virgo: 'Xử Nữ', Libra: 'Thiên Bình', Scorpio: 'Bọ Cạp',
  Sagittarius: 'Nhân Mã', Capricorn: 'Ma Kết', Aquarius: 'Bảo Bình', Pisces: 'Song Ngư',
};
const ELEMENT_VI: Record<string, string> = { fire: 'Lửa', water: 'Nước', air: 'Khí', earth: 'Đất' };
const SUIT_ELEMENT: Record<string, 'fire' | 'water' | 'air' | 'earth'> = {
  wands: 'fire', cups: 'water', swords: 'air', pentacles: 'earth',
};
const sgn = (en: string) => `${SIGN_VI[en]} (${en})`;
const plt = (en: string) => `${PLANET_VI[en]} (${en})`;

// Ẩn Chính 0–21: [element, planet?, sign?]
const MAJOR_ASTRO: Record<number, { element: string; planet?: string; sign?: string }> = {
  0: { element: 'air', planet: 'Uranus', sign: 'Aquarius' },
  1: { element: 'air', planet: 'Mercury', sign: 'Gemini' },
  2: { element: 'water', planet: 'Moon', sign: 'Cancer' },
  3: { element: 'earth', planet: 'Venus', sign: 'Taurus' },
  4: { element: 'fire', sign: 'Aries' },
  5: { element: 'earth', sign: 'Taurus' },
  6: { element: 'air', sign: 'Gemini' },
  7: { element: 'water', sign: 'Cancer' },
  8: { element: 'fire', sign: 'Leo' },
  9: { element: 'earth', sign: 'Virgo' },
  10: { element: 'fire', planet: 'Jupiter', sign: 'Sagittarius' },
  11: { element: 'air', sign: 'Libra' },
  12: { element: 'water', planet: 'Neptune', sign: 'Pisces' },
  13: { element: 'water', sign: 'Scorpio' },
  14: { element: 'fire', sign: 'Sagittarius' },
  15: { element: 'earth', sign: 'Capricorn' },
  16: { element: 'fire', planet: 'Mars', sign: 'Aries' },
  17: { element: 'air', sign: 'Aquarius' },
  18: { element: 'water', sign: 'Pisces' },
  19: { element: 'fire', planet: 'Sun', sign: 'Leo' },
  20: { element: 'fire', planet: 'Pluto', sign: 'Scorpio' },
  21: { element: 'earth', planet: 'Saturn', sign: 'Capricorn' },
};

// Decan Ẩn Phụ pip (2–10) theo chất: [planet, sign, decan(0/1/2)]
const PIP_DECAN: Record<string, Record<number, [string, string, number]>> = {
  wands: { 2: ['Mars', 'Aries', 0], 3: ['Sun', 'Aries', 1], 4: ['Venus', 'Aries', 2], 5: ['Saturn', 'Leo', 0], 6: ['Jupiter', 'Leo', 1], 7: ['Mars', 'Leo', 2], 8: ['Mercury', 'Sagittarius', 0], 9: ['Moon', 'Sagittarius', 1], 10: ['Saturn', 'Sagittarius', 2] },
  cups: { 2: ['Venus', 'Cancer', 0], 3: ['Mercury', 'Cancer', 1], 4: ['Moon', 'Cancer', 2], 5: ['Mars', 'Scorpio', 0], 6: ['Sun', 'Scorpio', 1], 7: ['Venus', 'Scorpio', 2], 8: ['Saturn', 'Pisces', 0], 9: ['Jupiter', 'Pisces', 1], 10: ['Mars', 'Pisces', 2] },
  swords: { 2: ['Moon', 'Libra', 0], 3: ['Saturn', 'Libra', 1], 4: ['Jupiter', 'Libra', 2], 5: ['Venus', 'Aquarius', 0], 6: ['Mercury', 'Aquarius', 1], 7: ['Moon', 'Aquarius', 2], 8: ['Jupiter', 'Gemini', 0], 9: ['Mars', 'Gemini', 1], 10: ['Sun', 'Gemini', 2] },
  pentacles: { 2: ['Jupiter', 'Capricorn', 0], 3: ['Mars', 'Capricorn', 1], 4: ['Sun', 'Capricorn', 2], 5: ['Mercury', 'Taurus', 0], 6: ['Moon', 'Taurus', 1], 7: ['Saturn', 'Taurus', 2], 8: ['Sun', 'Virgo', 0], 9: ['Venus', 'Virgo', 1], 10: ['Mercury', 'Virgo', 2] },
};
// Court (Thị Đồng/Hiệp Sĩ/Hoàng Hậu/Vua) → cung chính (hệ Golden Dawn)
const COURT_SIGN: Record<string, Record<number, string>> = {
  // rankIndex: 11=Hiệp Sĩ, 12=Hoàng Hậu, 13=Vua (Thị Đồng=10 chỉ theo nguyên tố)
  wands: { 11: 'Sagittarius', 12: 'Aries', 13: 'Leo' },
  cups: { 11: 'Pisces', 12: 'Cancer', 13: 'Scorpio' },
  swords: { 11: 'Gemini', 12: 'Libra', 13: 'Aquarius' },
  pentacles: { 11: 'Virgo', 12: 'Capricorn', 13: 'Taurus' },
};
const DECAN_DEG = ['0°–10°', '10°–20°', '20°–30°'];

function cardAstro(card: TarotCard): { element: string; zodiac: string; astro: string } {
  if (card.arcana !== 'minor') {
    const a = MAJOR_ASTRO[card.number] || { element: 'air' };
    const el = ELEMENT_VI[a.element];
    if (a.sign && a.planet) {
      // Ẩn Chính theo hành tinh: hành tinh cai quản cung
      return { element: el, zodiac: sgn(a.sign), astro: `${plt(a.planet)} cai quản ${SIGN_VI[a.sign]}` };
    }
    if (a.sign) {
      return { element: el, zodiac: sgn(a.sign), astro: `Cung ${sgn(a.sign)} · nguyên tố ${el}` };
    }
    return { element: el, zodiac: '—', astro: `Nguyên tố ${el}` };
  }
  const suit = card.suitKey || 'wands';
  const el = ELEMENT_VI[SUIT_ELEMENT[suit]];
  const ri = (card.number - 100) % 14; // 0=Át … 9=Mười, 10=Thị Đồng, 11=Hiệp Sĩ, 12=Hoàng Hậu, 13=Vua
  const rankNum = ri + 1; // Át=1 … Mười=10
  if (rankNum >= 2 && rankNum <= 10) {
    const d = PIP_DECAN[suit]?.[rankNum];
    if (d) {
      const [planet, sign, decan] = d;
      return { element: el, zodiac: sgn(sign), astro: `${plt(planet)} trong ${SIGN_VI[sign]} ${DECAN_DEG[decan]}` };
    }
  }
  if (rankNum === 1) {
    // Át — cội nguồn nguyên tố
    return { element: el, zodiac: `Toàn cung nguyên tố ${el}`, astro: `Cội nguồn (Ace) của nguyên tố ${el}` };
  }
  // Court
  const sign = COURT_SIGN[suit]?.[ri];
  if (sign) return { element: el, zodiac: sgn(sign), astro: `Lá hình người · chủ về ${SIGN_VI[sign]} (nguyên tố ${el})` };
  return { element: el, zodiac: `Nguyên tố ${el}`, astro: `Lá hình người · nguyên tố ${el}` };
}

// Bốc `n` lá không trùng từ nguyên bộ 78 lá
export function drawTarot(n = 3): DrawnCard[] {
  const count = Math.min(Math.max(n, 1), 10);
  const deck = [...FULL_DECK];
  const drawn: DrawnCard[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * deck.length);
    const card = deck.splice(idx, 1)[0];
    const reversed = Math.random() < 0.5;
    const astro = cardAstro(card);
    drawn.push({
      number: card.number,
      name: card.name,
      nameVi: card.nameVi,
      reversedOrientation: reversed,
      meaning: reversed ? card.reversed : card.upright,
      upright: card.upright,
      reversed: card.reversed,
      desc: card.desc,
      advice: reversed ? card.adviceRev : card.adviceUp,
      image: card.arcana === 'minor' && card.imageSlug
        ? `/game-assets/tarot/${card.imageSlug}.jpg`
        : `/game-assets/tarot/${card.number}.jpg`,
      arcana: card.arcana ?? 'major',
      suitKey: card.suitKey,
      suitVi: card.suitVi,
      element: astro.element,
      zodiac: astro.zodiac,
      astro: astro.astro,
    });
  }
  return drawn;
}
