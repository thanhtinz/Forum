/*
 * LOẠI SỰ KIỆN VÀ CÁCH BÀY NÓ.
 *
 * Bảy loại chép theo huy hiệu sự kiện của App Store (Challenge, Competition,
 * Live Event, Major Update, New Season, Premiere, Special Event). Giữ đúng bảy
 * loại ấy chứ không nghĩ thêm: một danh sách ngắn thì người bày hàng đọc hết
 * rồi chọn đúng, còn hai chục loại thì ai cũng chọn bừa cái đầu tiên.
 *
 * Mỗi loại có MÀU RIÊNG, và màu ấy là thứ nói nhanh nhất: lướt qua trang game
 * thấy vệt đỏ là biết có giải đấu, thấy vệt xanh lá là biết có bản cập nhật —
 * chưa cần đọc chữ.
 *
 * Tệp này KHÔNG import gì để bài kiểm `.mjs` nạp thẳng được.
 */

export const LOAI_SU_KIEN = [
  'THU_THACH', 'THI_DAU', 'TRUC_TIEP', 'CAP_NHAT_LON', 'MUA_MOI', 'RA_MAT', 'DAC_BIET',
] as const;

export type MaLoaiSuKien = (typeof LOAI_SU_KIEN)[number];

export const MO_TA_SU_KIEN: Record<MaLoaiSuKien, { ten: string; mau: string }> = {
  THU_THACH: { ten: 'Thử thách', mau: '#7c3aed' },
  THI_DAU: { ten: 'Thi đấu', mau: '#c8324d' },
  TRUC_TIEP: { ten: 'Phát trực tiếp', mau: '#be123c' },
  CAP_NHAT_LON: { ten: 'Cập nhật lớn', mau: '#1d8f6d' },
  MUA_MOI: { ten: 'Mùa mới', mau: '#0e7490' },
  RA_MAT: { ten: 'Ra mắt', mau: '#d4761b' },
  DAC_BIET: { ten: 'Dịp đặc biệt', mau: '#2b5fd9' },
};

export function laLoaiSuKien(v: string): v is MaLoaiSuKien {
  return (LOAI_SU_KIEN as readonly string[]).includes(v);
}

/** Bao nhiêu sự kiện bày trên một trang game. */
export const SU_KIEN_TREN_TRANG = 3;

/** Tiêu đề và mô tả ngắn có trần, vì cả hai in trên một cái thẻ cỡ cố định. */
export const SU_KIEN_TIEU_DE_TOI_DA = 80;
export const SU_KIEN_MO_TA_TOI_DA = 120;
