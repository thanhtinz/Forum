// Engine Bát Tự (Tứ Trụ) — dùng lunar-javascript (cùng lib taibu-core), kỹ thuật chuẩn.
import { Solar } from 'lunar-javascript';

const GAN_VI: Record<string, string> = {
  甲: 'Giáp', 乙: 'Ất', 丙: 'Bính', 丁: 'Đinh', 戊: 'Mậu',
  己: 'Kỷ', 庚: 'Canh', 辛: 'Tân', 壬: 'Nhâm', 癸: 'Quý',
};
const ZHI_VI: Record<string, string> = {
  子: 'Tý', 丑: 'Sửu', 寅: 'Dần', 卯: 'Mão', 辰: 'Thìn', 巳: 'Tỵ',
  午: 'Ngọ', 未: 'Mùi', 申: 'Thân', 酉: 'Dậu', 戌: 'Tuất', 亥: 'Hợi',
};
const GAN_WUXING: Record<string, string> = {
  甲: 'Mộc', 乙: 'Mộc', 丙: 'Hỏa', 丁: 'Hỏa', 戊: 'Thổ',
  己: 'Thổ', 庚: 'Kim', 辛: 'Kim', 壬: 'Thủy', 癸: 'Thủy',
};
const ZHI_WUXING: Record<string, string> = {
  子: 'Thủy', 丑: 'Thổ', 寅: 'Mộc', 卯: 'Mộc', 辰: 'Thổ', 巳: 'Hỏa',
  午: 'Hỏa', 未: 'Thổ', 申: 'Kim', 酉: 'Kim', 戌: 'Thổ', 亥: 'Thủy',
};
const ZODIAC_VI: Record<string, string> = {
  鼠: 'Tý (Chuột)', 牛: 'Sửu (Trâu)', 虎: 'Dần (Hổ)', 兔: 'Mão (Mèo)',
  龙: 'Thìn (Rồng)', 蛇: 'Tỵ (Rắn)', 马: 'Ngọ (Ngựa)', 羊: 'Mùi (Dê)',
  猴: 'Thân (Khỉ)', 鸡: 'Dậu (Gà)', 狗: 'Tuất (Chó)', 猪: 'Hợi (Heo)',
};

function pillar(ganZhi: string) {
  const gan = ganZhi[0];
  const zhi = ganZhi[1];
  return {
    ganZhi,
    can: GAN_VI[gan] ?? gan,
    chi: ZHI_VI[zhi] ?? zhi,
    canChi: `${GAN_VI[gan] ?? gan} ${ZHI_VI[zhi] ?? zhi}`,
    wuxing: [GAN_WUXING[gan], ZHI_WUXING[zhi]].filter(Boolean),
  };
}

export interface BaziInput {
  year: number; month: number; day: number; hour: number; minute?: number;
}

export function computeBazi(input: BaziInput) {
  const { year, month, day, hour, minute = 0 } = input;
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const pillars = {
    year: pillar(ec.getYear()),
    month: pillar(ec.getMonth()),
    day: pillar(ec.getDay()),
    hour: pillar(ec.getTime()),
  };

  // Đếm ngũ hành 8 chữ
  const count: Record<string, number> = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  for (const p of Object.values(pillars)) for (const w of p.wuxing) count[w] = (count[w] ?? 0) + 1;
  const missing = Object.keys(count).filter((k) => count[k] === 0);

  const dayGan = ec.getDay()[0];

  return {
    input,
    lunarDate: `Âm lịch ${lunar.getYearInChinese?.() ?? lunar.getYear()} - ${lunar.getMonthInChinese?.() ?? lunar.getMonth()} - ${lunar.getDayInChinese?.() ?? lunar.getDay()}`,
    zodiac: ZODIAC_VI[lunar.getYearShengXiao()] ?? lunar.getYearShengXiao(),
    pillars,
    dayMaster: { gan: GAN_VI[dayGan] ?? dayGan, wuxing: GAN_WUXING[dayGan] },
    wuxingCount: count,
    wuxingMissing: missing,
    summary:
      `Nhật chủ ${GAN_VI[dayGan]} (${GAN_WUXING[dayGan]}). ` +
      (missing.length ? `Thiếu hành: ${missing.join(', ')}.` : 'Ngũ hành đủ cả 5.'),
  };
}
