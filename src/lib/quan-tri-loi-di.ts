/**
 * Lối đi trong khu quản trị.
 *
 * Tách khỏi `duong-di.ts` của cửa hàng: hai khu là hai bố cục gốc khác nhau,
 * và gộp chung một danh sách thì sớm muộn một mục của khu này lọt sang thanh
 * điều hướng của khu kia.
 *
 * `demCho` nói mục ấy lấy con số huy hiệu từ đâu. Chỉ những mục có VIỆC TỒN
 * ĐỌNG mới cần huy hiệu — đếm tổng số game rồi in lên cạnh chữ "Game" thì đó
 * là một con số không ai phải làm gì với nó, chỉ tổ làm nhiễu hai con số kia.
 */
export type MaDem = 'yeuCauCho' | 'gameNhap' | 'danhGiaChuaDap' | 'baoXauCho' | 'choDuyet';

export interface LoiQuanTri {
  duongDan: string;
  ten: string;
  icon: string;
  demCho?: MaDem;
  /** Nhóm để xếp thành từng cụm trên thanh bên. */
  nhom: 'Kho hàng' | 'Cộng đồng';
}

export const LOI_QUAN_TRI: LoiQuanTri[] = [
  { duongDan: '/quan-tri', ten: 'Tổng quan', icon: 'LayoutDashboard', nhom: 'Kho hàng' },
  { duongDan: '/quan-tri/game', ten: 'Game', icon: 'Gamepad2', demCho: 'gameNhap', nhom: 'Kho hàng' },
  { duongDan: '/quan-tri/duyet', ten: 'Chờ duyệt', icon: 'ClipboardCheck', demCho: 'choDuyet', nhom: 'Kho hàng' },
  { duongDan: '/quan-tri/the-loai', ten: 'Thể loại', icon: 'Tags', nhom: 'Kho hàng' },
  { duongDan: '/quan-tri/danh-gia', ten: 'Đánh giá', icon: 'Star', demCho: 'danhGiaChuaDap', nhom: 'Cộng đồng' },
  { duongDan: '/quan-tri/bao-xau', ten: 'Báo xấu', icon: 'Flag', demCho: 'baoXauCho', nhom: 'Cộng đồng' },
  { duongDan: '/quan-tri/dien-dan', ten: 'Diễn đàn', icon: 'MessageSquare', nhom: 'Cộng đồng' },
  { duongDan: '/quan-tri/yeu-cau', ten: 'Yêu cầu game', icon: 'Inbox', demCho: 'yeuCauCho', nhom: 'Cộng đồng' },
  { duongDan: '/quan-tri/thanh-vien', ten: 'Thành viên', icon: 'Users', nhom: 'Cộng đồng' },
];

export const NHOM_QUAN_TRI = ['Kho hàng', 'Cộng đồng'] as const;

/**
 * Mục nào đang mở.
 *
 * "Tổng quan" so khớp TUYỆT ĐỐI, mấy mục kia so theo tiền tố: `/quan-tri` là
 * tiền tố của mọi đường dẫn trong khu này, nên so theo tiền tố thì nó sáng ở
 * khắp nơi và chẳng còn chỉ ra được đang đứng ở đâu.
 */
export function dangOQuanTri(duongDanHienTai: string, muc: string): boolean {
  if (muc === '/quan-tri') return duongDanHienTai === '/quan-tri';
  return duongDanHienTai === muc || duongDanHienTai.startsWith(`${muc}/`);
}
