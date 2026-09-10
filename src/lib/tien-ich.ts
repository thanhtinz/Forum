/**
 * Mấy phép biến đổi thuần, không đụng CSDL và không đụng React.
 *
 * Tệp này CHẠY CẢ Ở TRÌNH DUYỆT (thẻ game là thành phần client), nên tuyệt đối
 * không được `import` Prisma vào đây.
 */

/** Gộp danh sách lớp CSS, bỏ qua thứ rỗng/undefined. */
export function gop(...phan: (string | false | null | undefined)[]): string {
  return phan.filter(Boolean).join(' ');
}

/** "kho game 2024!" → "kho-game-2024" */
export function thanhDuongDan(chu: string): string {
  return chu
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * 12345 → "12,3K". Dùng ở chỗ con số chỉ để ước lượng.
 *
 * ĐỪNG dùng trong trang quản trị: 1.500 và 1.549 cùng ra "1,5K", mà người sửa
 * số liệu thì cần thấy đúng con số họ đang sửa.
 */
export function gonSo(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) < 1000) return String(n);
  if (Math.abs(n) < 1_000_000) return `${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')}M`;
}

/** 5_242_880 → "5 MB". `null` ra dấu gạch, không ra "0 B" gây hiểu nhầm. */
export function gonDungLuong(byte: number | bigint | null | undefined): string {
  if (byte == null) return '—';
  const n = Number(byte);
  if (!Number.isFinite(n) || n <= 0) return '—';
  const donVi = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < donVi.length - 1) { v /= 1024; i++; }
  return `${v < 10 && i > 0 ? v.toFixed(1).replace('.', ',') : Math.round(v)} ${donVi[i]}`;
}

/** "3 ngày trước". Mốc trong tương lai coi như vừa xong. */
export function cachDay(luc: Date | string): string {
  const t = typeof luc === 'string' ? new Date(luc) : luc;
  const giay = Math.floor((Date.now() - t.getTime()) / 1000);
  if (giay < 60) return 'vừa xong';
  const phut = Math.floor(giay / 60);
  if (phut < 60) return `${phut} phút trước`;
  const gio = Math.floor(phut / 60);
  if (gio < 24) return `${gio} giờ trước`;
  const ngay = Math.floor(gio / 24);
  if (ngay < 30) return `${ngay} ngày trước`;
  const thang = Math.floor(ngay / 30);
  if (thang < 12) return `${thang} tháng trước`;
  return `${Math.floor(thang / 12)} năm trước`;
}

/** Điểm sao trung bình, làm tròn một chữ số. Chưa ai chấm thì trả 0. */
export function diemSao(tongSao: number, soLuot: number): number {
  if (soLuot <= 0) return 0;
  return Math.round((tongSao / soLuot) * 10) / 10;
}

/** Số trang cần có cho `tong` mục, mỗi trang `moiTrang` mục — ít nhất là 1. */
export function soTrang(tong: number, moiTrang: number): number {
  return Math.max(1, Math.ceil(tong / Math.max(1, moiTrang)));
}

/** Ép một số do người dùng gửi lên về khoảng cho phép. */
export function kep(thoRaw: unknown, min: number, max: number, mac: number): number {
  const n = typeof thoRaw === 'number' ? thoRaw : parseInt(String(thoRaw ?? ''), 10);
  if (!Number.isFinite(n)) return mac;
  return Math.min(max, Math.max(min, n));
}

/** Cắt chữ dài, thêm dấu ba chấm — dùng cho thẻ mô tả và tiêu đề trang. */
export function catChu(chu: string, dai: number): string {
  const s = chu.trim();
  return s.length <= dai ? s : `${s.slice(0, dai - 1).trimEnd()}…`;
}
