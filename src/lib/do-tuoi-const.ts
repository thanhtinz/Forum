/*
 * ĐỘ TUỔI KHUYẾN NGHỊ — thang của App Store.
 *
 * Bốn mức, đúng bốn mức Apple dùng: 4+, 9+, 12+, 17+. Không tự nghĩ thêm mức
 * nào, và cũng không mượn thang PEGI hay ESRB: người Việt mở cửa hàng ứng dụng
 * hằng ngày đã quen đọc "12+" ở đúng dáng ấy rồi.
 *
 * Mỗi mức có một câu GIẢI THÍCH ngắn, vì con số trần thì không nói được vì sao.
 * "12+" đứng một mình khiến người ta đoán; "12+ · Có cảnh đánh nhau nhẹ" thì
 * người mua game cho trẻ con quyết được ngay tại chỗ.
 *
 * Tệp này KHÔNG import gì để bài kiểm `.mjs` nạp thẳng được.
 */

export const DO_TUOI = [4, 9, 12, 17] as const;

export type MaDoTuoi = (typeof DO_TUOI)[number];

export const MO_TA_TUOI: Record<MaDoTuoi, { nhan: string; y: string }> = {
  4: { nhan: '4+', y: 'Hợp với mọi lứa tuổi' },
  9: { nhan: '9+', y: 'Có cảnh hoạt hoạ gây căng thẳng nhẹ' },
  12: { nhan: '12+', y: 'Có cảnh đánh nhau, chút máu me kiểu hoạt hình' },
  17: { nhan: '17+', y: 'Bạo lực rõ, nội dung dành cho người lớn' },
};

export function laDoTuoi(v: number): v is MaDoTuoi {
  return (DO_TUOI as readonly number[]).includes(v);
}

/**
 * Về mức hợp lệ gần nhất. Hàng cũ trong cơ sở dữ liệu có thể mang số lạ.
 *
 * Phải gán `v ?? 4` ra một biến rồi mới xét: bản đầu viết
 * `laDoTuoi(v ?? 4) ? (v as MaDoTuoi) : 4`, tức là xét trên số đã thay mặc
 * định nhưng lại TRẢ VỀ số gốc — nên `null` đi qua được câu xét rồi ra thẳng
 * `null`. Bài kiểm 44 bắt được đúng chỗ ấy.
 */
export function napDoTuoi(v: number | null | undefined): MaDoTuoi {
  const n = v ?? 4;
  return laDoTuoi(n) ? n : 4;
}
