import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * Kiểm một địa chỉ ảnh ngoài trước khi máy chủ tự đi tải.
 *
 * Tách riêng khỏi phần tải và lưu vì đây là phần DUY NHẤT mang tính an toàn,
 * và tách ra thì chạy thử được đứng một mình — không kéo theo kho ảnh, cơ sở
 * dữ liệu hay `server-only`.
 *
 * Chặn cái gì và vì sao: máy chủ tự đi lấy một địa chỉ do MODEL đề xuất là lỗ
 * SSRF sách vở. Trỏ vào `https://localhost:5433` là chọc thẳng cơ sở dữ liệu,
 * trỏ vào `169.254.169.254` là đọc thông tin máy chủ đám mây.
 */

export class AnhKhongHopLeError extends Error {}

/** Địa chỉ nội bộ, vòng lặp, link-local — những chỗ không được phép chạm. */
export function laDiaChiRiengTu(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||           // link-local, gồm cả metadata đám mây
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      a >= 224                              // multicast và dải dành riêng
    );
  }
  const t = ip.toLowerCase();
  return (
    t === '::' || t === '::1' ||
    t.startsWith('fc') || t.startsWith('fd') ||   // unique local
    t.startsWith('fe80') ||                        // link-local
    t.startsWith('::ffff:')                        // IPv4 đội lốt IPv6
  );
}

/**
 * Trả về địa chỉ đã kiểm, hoặc ném `AnhKhongHopLeError`.
 *
 * Phân giải tên miền RA ĐỊA CHỈ rồi mới xét, chứ xét chuỗi tên miền là vô
 * dụng: ai cũng trỏ được một tên miền của mình về 127.0.0.1.
 *
 * `choHttp` mở cho ảnh người dùng dán vào — nhiều trang ảnh game cũ vẫn chỉ
 * có http. Nới chỗ này KHÔNG làm yếu phần chặn SSRF, vì lớp chặn thật là phép
 * xét địa chỉ ở dưới chứ không phải tên giao thức; mà byte tải về thì cũng
 * nằm lại trong kho của mình rồi phục vụ qua https.
 */
export async function kiemDiaChiAnh(diaChi: string, choHttp = false): Promise<URL> {
  let u: URL;
  try {
    u = new URL(diaChi);
  } catch {
    throw new AnhKhongHopLeError('Địa chỉ ảnh không hợp lệ.');
  }
  const hop = u.protocol === 'https:' || (choHttp && u.protocol === 'http:');
  if (!hop) {
    throw new AnhKhongHopLeError(
      choHttp ? 'Chỉ nhận ảnh qua http hoặc https.' : 'Chỉ nhận ảnh qua https.',
    );
  }

  const ban = await dns.lookup(u.hostname, { all: true }).catch(() => []);
  if (ban.length === 0) throw new AnhKhongHopLeError('Không phân giải được tên miền.');
  // MỌI địa chỉ phải sạch, không phải chỉ địa chỉ đầu: một tên miền trả về
  // nhiều bản ghi thì lượt tải có thể rơi vào bất kỳ cái nào.
  if (ban.some((d) => laDiaChiRiengTu(d.address))) {
    throw new AnhKhongHopLeError('Địa chỉ này trỏ vào mạng nội bộ.');
  }
  return u;
}
