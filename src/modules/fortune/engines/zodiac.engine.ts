// Engine 12 Cung Hoàng Đạo — dữ liệu chi tiết + tử vi hằng ngày (ổn định theo ngày).
export interface ZodiacSign {
  key: string; nameVi: string; nameEn: string; symbol: string; dateRange: string;
  element: string; planet: string; quality: string;
  traits: string[]; strengths: string[]; weaknesses: string[];
  compatible: string[]; luckyColor: string; luckyDay: string; overview: string;
  start: [number, number]; end: [number, number]; // (tháng, ngày)
}

export const ZODIACS: ZodiacSign[] = [
  { key: 'aries', nameVi: 'Bạch Dương', nameEn: 'Aries', symbol: '♈', dateRange: '21/3 – 19/4', element: 'Lửa', planet: 'Sao Hỏa', quality: 'Tiên phong',
    traits: ['nhiệt huyết', 'dũng cảm', 'thẳng thắn'], strengths: ['quyết đoán', 'tự tin', 'năng lượng dồi dào'], weaknesses: ['nóng vội', 'thiếu kiên nhẫn', 'bốc đồng'],
    compatible: ['Sư Tử', 'Nhân Mã', 'Song Tử'], luckyColor: 'Đỏ', luckyDay: 'Thứ Ba', overview: 'Người mở đường đầy nhiệt huyết, dám nghĩ dám làm và không ngại thử thách.', start: [3, 21], end: [4, 19] },
  { key: 'taurus', nameVi: 'Kim Ngưu', nameEn: 'Taurus', symbol: '♉', dateRange: '20/4 – 20/5', element: 'Đất', planet: 'Sao Kim', quality: 'Kiên định',
    traits: ['điềm tĩnh', 'thực tế', 'kiên trì'], strengths: ['đáng tin', 'bền bỉ', 'biết hưởng thụ'], weaknesses: ['bảo thủ', 'cứng đầu', 'ngại thay đổi'],
    compatible: ['Xử Nữ', 'Ma Kết', 'Cự Giải'], luckyColor: 'Xanh lá', luckyDay: 'Thứ Sáu', overview: 'Vững vàng và thực tế, theo đuổi sự ổn định và những giá trị bền lâu.', start: [4, 20], end: [5, 20] },
  { key: 'gemini', nameVi: 'Song Tử', nameEn: 'Gemini', symbol: '♊', dateRange: '21/5 – 20/6', element: 'Khí', planet: 'Sao Thủy', quality: 'Linh hoạt',
    traits: ['lanh lợi', 'tò mò', 'hoạt ngôn'], strengths: ['thích nghi nhanh', 'giao tiếp tốt', 'sáng tạo'], weaknesses: ['thiếu kiên định', 'dễ phân tâm', 'hay lo nghĩ'],
    compatible: ['Thiên Bình', 'Bảo Bình', 'Bạch Dương'], luckyColor: 'Vàng', luckyDay: 'Thứ Tư', overview: 'Trí tuệ nhanh nhạy, thích khám phá và kết nối với nhiều người.', start: [5, 21], end: [6, 20] },
  { key: 'cancer', nameVi: 'Cự Giải', nameEn: 'Cancer', symbol: '♋', dateRange: '21/6 – 22/7', element: 'Nước', planet: 'Mặt Trăng', quality: 'Tiên phong',
    traits: ['tình cảm', 'chu đáo', 'giàu trực giác'], strengths: ['biết quan tâm', 'trung thành', 'tinh tế'], weaknesses: ['nhạy cảm thái quá', 'hay giữ trong lòng', 'tâm trạng thất thường'],
    compatible: ['Bọ Cạp', 'Song Ngư', 'Kim Ngưu'], luckyColor: 'Bạc', luckyDay: 'Thứ Hai', overview: 'Trái tim ấm áp, đặt gia đình và cảm xúc lên hàng đầu.', start: [6, 21], end: [7, 22] },
  { key: 'leo', nameVi: 'Sư Tử', nameEn: 'Leo', symbol: '♌', dateRange: '23/7 – 22/8', element: 'Lửa', planet: 'Mặt Trời', quality: 'Kiên định',
    traits: ['tự tin', 'hào phóng', 'lôi cuốn'], strengths: ['lãnh đạo', 'nhiệt thành', 'trung thực'], weaknesses: ['kiêu hãnh', 'thích thể hiện', 'bướng bỉnh'],
    compatible: ['Bạch Dương', 'Nhân Mã', 'Thiên Bình'], luckyColor: 'Cam', luckyDay: 'Chủ Nhật', overview: 'Toả sáng và truyền cảm hứng, sinh ra để dẫn dắt và được chú ý.', start: [7, 23], end: [8, 22] },
  { key: 'virgo', nameVi: 'Xử Nữ', nameEn: 'Virgo', symbol: '♍', dateRange: '23/8 – 22/9', element: 'Đất', planet: 'Sao Thủy', quality: 'Linh hoạt',
    traits: ['tỉ mỉ', 'logic', 'cầu toàn'], strengths: ['chỉn chu', 'tận tâm', 'phân tích tốt'], weaknesses: ['khắt khe', 'hay lo lắng', 'soi xét'],
    compatible: ['Kim Ngưu', 'Ma Kết', 'Cự Giải'], luckyColor: 'Nâu be', luckyDay: 'Thứ Tư', overview: 'Tinh tế và thực tế, luôn hướng tới sự hoàn hảo trong từng chi tiết.', start: [8, 23], end: [9, 22] },
  { key: 'libra', nameVi: 'Thiên Bình', nameEn: 'Libra', symbol: '♎', dateRange: '23/9 – 22/10', element: 'Khí', planet: 'Sao Kim', quality: 'Tiên phong',
    traits: ['hài hoà', 'công bằng', 'duyên dáng'], strengths: ['ngoại giao', 'thẩm mỹ', 'biết lắng nghe'], weaknesses: ['do dự', 'ngại xung đột', 'thiếu quyết đoán'],
    compatible: ['Song Tử', 'Bảo Bình', 'Sư Tử'], luckyColor: 'Hồng pastel', luckyDay: 'Thứ Sáu', overview: 'Yêu cái đẹp và sự cân bằng, luôn tìm kiếm hoà hợp trong mọi mối quan hệ.', start: [9, 23], end: [10, 22] },
  { key: 'scorpio', nameVi: 'Bọ Cạp', nameEn: 'Scorpio', symbol: '♏', dateRange: '23/10 – 21/11', element: 'Nước', planet: 'Sao Diêm Vương', quality: 'Kiên định',
    traits: ['mãnh liệt', 'sâu sắc', 'bí ẩn'], strengths: ['ý chí mạnh', 'trung thành', 'nhìn thấu'], weaknesses: ['hay ghen', 'cố chấp', 'kín tiếng'],
    compatible: ['Cự Giải', 'Song Ngư', 'Ma Kết'], luckyColor: 'Đỏ đô', luckyDay: 'Thứ Ba', overview: 'Nội lực sâu thẳm và đam mê mãnh liệt, theo đuổi mục tiêu đến cùng.', start: [10, 23], end: [11, 21] },
  { key: 'sagittarius', nameVi: 'Nhân Mã', nameEn: 'Sagittarius', symbol: '♐', dateRange: '22/11 – 21/12', element: 'Lửa', planet: 'Sao Mộc', quality: 'Linh hoạt',
    traits: ['phóng khoáng', 'lạc quan', 'ưa tự do'], strengths: ['nhiệt tình', 'hài hước', 'ham học hỏi'], weaknesses: ['thiếu kiên nhẫn', 'nói thẳng', 'ngại ràng buộc'],
    compatible: ['Bạch Dương', 'Sư Tử', 'Bảo Bình'], luckyColor: 'Tím', luckyDay: 'Thứ Năm', overview: 'Tâm hồn tự do ưa khám phá, luôn hướng tới chân trời mới.', start: [11, 22], end: [12, 21] },
  { key: 'capricorn', nameVi: 'Ma Kết', nameEn: 'Capricorn', symbol: '♑', dateRange: '22/12 – 19/1', element: 'Đất', planet: 'Sao Thổ', quality: 'Tiên phong',
    traits: ['tham vọng', 'kỷ luật', 'thực tế'], strengths: ['kiên trì', 'trách nhiệm', 'bền bỉ'], weaknesses: ['cứng nhắc', 'khô khan', 'quá nghiêm túc'],
    compatible: ['Kim Ngưu', 'Xử Nữ', 'Bọ Cạp'], luckyColor: 'Đen / xám', luckyDay: 'Thứ Bảy', overview: 'Bản lĩnh và kiên định, leo từng bậc thang để chạm tới đỉnh cao.', start: [12, 22], end: [1, 19] },
  { key: 'aquarius', nameVi: 'Bảo Bình', nameEn: 'Aquarius', symbol: '♒', dateRange: '20/1 – 18/2', element: 'Khí', planet: 'Sao Thiên Vương', quality: 'Kiên định',
    traits: ['độc lập', 'sáng tạo', 'nhân văn'], strengths: ['tư duy mới', 'phóng khoáng', 'khách quan'], weaknesses: ['xa cách', 'bướng', 'khó đoán'],
    compatible: ['Song Tử', 'Thiên Bình', 'Nhân Mã'], luckyColor: 'Xanh dương', luckyDay: 'Thứ Bảy', overview: 'Tư duy vượt thời đại, độc đáo và luôn hướng tới điều tốt đẹp cho cộng đồng.', start: [1, 20], end: [2, 18] },
  { key: 'pisces', nameVi: 'Song Ngư', nameEn: 'Pisces', symbol: '♓', dateRange: '19/2 – 20/3', element: 'Nước', planet: 'Sao Hải Vương', quality: 'Linh hoạt',
    traits: ['mộng mơ', 'giàu cảm xúc', 'nhân hậu'], strengths: ['đồng cảm', 'sáng tạo', 'trực giác mạnh'], weaknesses: ['cả nể', 'dễ tổn thương', 'thiếu thực tế'],
    compatible: ['Cự Giải', 'Bọ Cạp', 'Kim Ngưu'], luckyColor: 'Xanh ngọc', luckyDay: 'Thứ Năm', overview: 'Tâm hồn nghệ sĩ giàu lòng trắc ẩn, sống bằng cảm xúc và trực giác.', start: [2, 19], end: [3, 20] },
];

const POOLS = {
  love: [
    'Năng lượng tình cảm dồi dào — hãy chủ động bày tỏ.',
    'Một cuộc trò chuyện chân thành sẽ gắn kết hai người hơn.',
    'Người độc thân có cơ hội gặp gỡ thú vị, hãy mở lòng.',
    'Giữ sự bình tĩnh trước hiểu lầm nhỏ, đừng vội kết luận.',
    'Dành thời gian chất lượng cho người thương sẽ được đền đáp.',
    'Lắng nghe nhiều hơn nói, mối quan hệ sẽ êm đẹp.',
  ],
  career: [
    'Ý tưởng mới được đánh giá cao — mạnh dạn trình bày.',
    'Hợp tác đúng người giúp công việc tiến nhanh.',
    'Tập trung hoàn thành việc dang dở trước khi nhận thêm.',
    'Một cơ hội bất ngờ xuất hiện, hãy nắm bắt khéo léo.',
    'Kiên nhẫn với thử thách hôm nay, kết quả sẽ tới sớm.',
    'Sắp xếp lại ưu tiên giúp bạn làm chủ thời gian.',
  ],
  money: [
    'Quản lý chi tiêu hợp lý, tránh mua sắm bốc đồng.',
    'Có khoản thu nhỏ ngoài dự kiến — đừng tiêu vội.',
    'Thời điểm tốt để lập kế hoạch tiết kiệm dài hạn.',
    'Cân nhắc kỹ trước khi cho vay hay đầu tư.',
    'Tài chính ổn định, có thể thưởng cho bản thân chút ít.',
    'Xem lại các khoản định kỳ để cắt giảm lãng phí.',
  ],
  health: [
    'Ngủ đủ giấc và uống nhiều nước để giữ năng lượng.',
    'Vận động nhẹ giúp tinh thần phấn chấn cả ngày.',
    'Giảm caffeine, tăng rau xanh cho cơ thể nhẹ nhõm.',
    'Đừng quên nghỉ ngơi giữa giờ làm việc.',
    'Tâm trạng tốt là liều thuốc quý — hãy cười nhiều hơn.',
    'Hít thở sâu vài phút giúp giảm căng thẳng hiệu quả.',
  ],
  mood: ['Hứng khởi', 'Bình yên', 'Tập trung', 'Lãng mạn', 'Quyết đoán', 'Sáng tạo', 'Thư giãn'],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

export function signFromDate(month: number, day: number): ZodiacSign {
  for (const z of ZODIACS) {
    const [sm, sd] = z.start, [em, ed] = z.end;
    if (sm <= em) { if ((month === sm && day >= sd) || (month === em && day <= ed) || (month > sm && month < em)) return z; }
    else { // bắc qua năm (Ma Kết)
      if ((month === sm && day >= sd) || (month === em && day <= ed) || month > sm || month < em) return z;
    }
  }
  return ZODIACS[0];
}

export function dailyHoroscope(signKey: string, dateStr: string) {
  const pick = (arr: string[], salt: string) => arr[hash(signKey + dateStr + salt) % arr.length];
  const star = (salt: string) => 2 + (hash(signKey + dateStr + salt) % 4); // 2..5
  return {
    date: dateStr,
    love: { text: pick(POOLS.love, 'love'), star: star('love') },
    career: { text: pick(POOLS.career, 'career'), star: star('career') },
    money: { text: pick(POOLS.money, 'money'), star: star('money') },
    health: { text: pick(POOLS.health, 'health'), star: star('health') },
    mood: pick(POOLS.mood, 'mood'),
    luckyNumber: 1 + (hash(signKey + dateStr + 'num') % 99),
  };
}
