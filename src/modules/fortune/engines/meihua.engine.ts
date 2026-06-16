// Engine Mai Hoa Dịch Số — lập quẻ từ số (tiên thiên bát quái), phân tích Thể-Dụng theo ngũ hành.
interface Trigram { num: number; name: string; nameVi: string; symbol: string; nature: string; wuxing: string; }

// Tiên thiên bát quái số: Càn1 Đoài2 Ly3 Chấn4 Tốn5 Khảm6 Cấn7 Khôn8
const TRIGRAMS: Record<number, Trigram> = {
  1: { num: 1, name: '乾', nameVi: 'Càn', symbol: '☰', nature: 'Trời', wuxing: 'Kim' },
  2: { num: 2, name: '兌', nameVi: 'Đoài', symbol: '☱', nature: 'Đầm', wuxing: 'Kim' },
  3: { num: 3, name: '離', nameVi: 'Ly', symbol: '☲', nature: 'Lửa', wuxing: 'Hỏa' },
  4: { num: 4, name: '震', nameVi: 'Chấn', symbol: '☳', nature: 'Sấm', wuxing: 'Mộc' },
  5: { num: 5, name: '巽', nameVi: 'Tốn', symbol: '☴', nature: 'Gió', wuxing: 'Mộc' },
  6: { num: 6, name: '坎', nameVi: 'Khảm', symbol: '☵', nature: 'Nước', wuxing: 'Thủy' },
  7: { num: 7, name: '艮', nameVi: 'Cấn', symbol: '☶', nature: 'Núi', wuxing: 'Thổ' },
  8: { num: 8, name: '坤', nameVi: 'Khôn', symbol: '☷', nature: 'Đất', wuxing: 'Thổ' },
};

const SHENG: Record<string, string> = { Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc' };
const KE: Record<string, string> = { Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim', Kim: 'Mộc' };

function tri(n: number): Trigram {
  const idx = n % 8 === 0 ? 8 : n % 8;
  return TRIGRAMS[idx];
}

// Quan hệ Thể (ti) và Dụng (yong)
function relation(ti: Trigram, yong: Trigram): { verdict: string; detail: string } {
  if (ti.wuxing === yong.wuxing) return { verdict: 'Bình hòa — Cát', detail: 'Thể Dụng đồng hành, hỗ trợ lẫn nhau, sự việc thuận lợi.' };
  if (SHENG[yong.wuxing] === ti.wuxing) return { verdict: 'Đại cát', detail: 'Dụng sinh Thể: được trợ giúp, thuận lợi, có quý nhân.' };
  if (SHENG[ti.wuxing] === yong.wuxing) return { verdict: 'Tiểu hung', detail: 'Thể sinh Dụng: hao tổn sức lực, cho đi nhiều, mệt mỏi.' };
  if (KE[yong.wuxing] === ti.wuxing) return { verdict: 'Hung', detail: 'Dụng khắc Thể: gặp trở ngại, bị áp lực, nên thận trọng.' };
  if (KE[ti.wuxing] === yong.wuxing) return { verdict: 'Tiểu cát', detail: 'Thể khắc Dụng: làm được việc nhưng tốn công sức.' };
  return { verdict: 'Bình', detail: 'Quan hệ trung tính.' };
}

export interface MeihuaInput { num1?: number; num2?: number; question?: string; }

export function computeMeihua(input: MeihuaInput) {
  // Nếu không nhập số -> dùng thời điểm hiện tại
  const now = new Date();
  const n1 = input.num1 && input.num1 > 0 ? input.num1 : now.getHours() + now.getDate();
  const n2 = input.num2 && input.num2 > 0 ? input.num2 : now.getMinutes() + now.getMonth() + 1;

  const upper = tri(n1);                 // thượng quái
  const lower = tri(n2);                 // hạ quái
  const movingLine = (n1 + n2) % 6 === 0 ? 6 : (n1 + n2) % 6; // hào động 1-6

  // Hào động ở 3 hào dưới -> hạ quái biến (là Dụng); ngược lại thượng quái biến
  const lowerIsYong = movingLine <= 3;
  const ti = lowerIsYong ? upper : lower;   // Thể = quái không biến
  const yong = lowerIsYong ? lower : upper;  // Dụng = quái có hào động
  const rel = relation(ti, yong);

  return {
    input: { num1: n1, num2: n2, question: input.question ?? null },
    hexagram: {
      upper: { ...upper, role: lowerIsYong ? 'Thể' : 'Dụng' },
      lower: { ...lower, role: lowerIsYong ? 'Dụng' : 'Thể' },
      name: `${upper.nameVi} trên ${lower.nameVi} dưới`,
      symbol: `${upper.symbol}\n${lower.symbol}`,
    },
    movingLine,
    ti: { ...ti, label: 'Thể (bản thân)' },
    yong: { ...yong, label: 'Dụng (sự việc)' },
    verdict: rel.verdict,
    analysis: `Thể ${ti.nameVi} (${ti.wuxing}) · Dụng ${yong.nameVi} (${yong.wuxing}). ${rel.detail}`,
  };
}
