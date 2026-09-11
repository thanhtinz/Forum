/**
 * Lý do báo xấu, và câu chữ hiện ra cho người dùng.
 *
 * Tệp này KHÔNG import gì, để mấy kịch bản `.mjs` nạp thẳng được — Node không
 * giải được alias `@/` lẫn đường dẫn thiếu đuôi.
 */
export const LY_DO = [
  { ma: 'RAC', ten: 'Spam hoặc quảng cáo' },
  { ma: 'XUC_PHAM', ten: 'Lời lẽ xúc phạm' },
  { ma: 'SAI_SU_THAT', ten: 'Sai sự thật, gây hiểu nhầm' },
  { ma: 'KHAC', ten: 'Lý do khác' },
] as const;

export type MaLyDo = (typeof LY_DO)[number]['ma'];

export function laLyDo(x: string): x is MaLyDo {
  return LY_DO.some((l) => l.ma === x);
}

export function tenLyDo(ma: string): string {
  return LY_DO.find((l) => l.ma === ma)?.ten ?? ma;
}

/** Ghi chú tối đa — đủ một hai câu, không thành chỗ tâm sự. */
export const GHI_CHU_TOI_DA = 300;
