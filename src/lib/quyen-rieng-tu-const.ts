/*
 * TÊN TIẾNG VIỆT CHO BẢNG QUYỀN RIÊNG TƯ.
 *
 * Tệp này KHÔNG import gì, để mấy bài kiểm `.mjs` nạp thẳng được — Node không
 * giải nổi bí danh `@/`.
 *
 * Thứ tự trong `MUC` là thứ tự bày trên trang, và nó có nghĩa: nặng nhất lên
 * trước. Người đọc bảng này phần lớn chỉ liếc dòng đầu, nên dòng đầu phải là
 * dòng đáng lo nhất, không phải dòng nào tình cờ xếp trước trong bảng chữ cái.
 */

export const MUC = [
  {
    ma: 'THEO_DOI',
    ten: 'Dữ liệu dùng để theo dõi bạn',
    ta: 'Mấy thứ này bị gắn với bạn rồi mang sang ứng dụng và trang của công ty khác, '
      + 'phần lớn là để nhắm quảng cáo.',
  },
  {
    ma: 'LIEN_KET',
    ten: 'Dữ liệu liên kết với bạn',
    ta: 'Thu thập và gắn thẳng vào danh tính của bạn — tài khoản, thiết bị, hay số điện thoại.',
  },
  {
    ma: 'KHONG_LIEN_KET',
    ten: 'Dữ liệu không liên kết với bạn',
    ta: 'Có thu thập, nhưng nhà phát triển cho biết không gắn với danh tính nào.',
  },
] as const;

export const LOAI = [
  { ma: 'DANH_TINH', ten: 'Danh tính', ta: 'Tên, email, số điện thoại, tài khoản' },
  { ma: 'DANH_BA', ten: 'Danh bạ', ta: 'Danh sách người liên hệ trong máy' },
  { ma: 'VI_TRI', ten: 'Vị trí', ta: 'Chỗ bạn đang đứng, chính xác hoặc áng chừng' },
  { ma: 'ANH_VA_PHIM', ten: 'Ảnh và phim', ta: 'Thư viện ảnh trong máy' },
  { ma: 'NOI_DUNG_NGUOI_DUNG', ten: 'Nội dung bạn tạo', ta: 'Tin nhắn, ảnh chụp trong game, bài viết' },
  { ma: 'LICH_SU_TIM', ten: 'Lịch sử tìm kiếm', ta: 'Những gì bạn gõ vào ô tìm' },
  { ma: 'MUA_HANG', ten: 'Lịch sử mua', ta: 'Món đã mua trong game' },
  { ma: 'DU_LIEU_SU_DUNG', ten: 'Cách bạn dùng', ta: 'Chơi bao lâu, bấm vào đâu, xem màn nào' },
  { ma: 'CHAN_DOAN', ten: 'Chẩn đoán', ta: 'Báo cáo lỗi, số liệu hiệu năng' },
  { ma: 'KHAC', ten: 'Dữ liệu khác', ta: 'Thứ không rơi vào nhóm nào ở trên' },
] as const;

export type MaMuc = (typeof MUC)[number]['ma'];
export type MaLoai = (typeof LOAI)[number]['ma'];

export const MA_MUC: readonly string[] = MUC.map((m) => m.ma);
export const MA_LOAI: readonly string[] = LOAI.map((l) => l.ma);
