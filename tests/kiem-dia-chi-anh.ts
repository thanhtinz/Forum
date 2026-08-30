/**
 * Chạy phần chặn địa chỉ ảnh đứng một mình, in kết quả ra JSON.
 *
 * Bài kiểm là `.mjs` nên không nạp thẳng `.ts` được; tệp này chạy bằng `tsx`
 * rồi bài kiểm đọc kết quả. Nhờ `dia-chi-anh.ts` không nhập `server-only` và
 * không đụng kho ảnh nên nó chạy được ngoài Next.
 */
import { kiemDiaChiAnh, AnhKhongHopLeError, laDiaChiRiengTu } from '../src/lib/dia-chi-anh';

const PHAI_CHAN = [
  ['http://example.com/a.png', 'không phải https'],
  ['ftp://example.com/a.png', 'giao thức lạ'],
  ['https://localhost/a.png', 'trỏ vào chính máy chủ'],
  ['https://127.0.0.1/a.png', 'trỏ vào vòng lặp'],
  ['https://169.254.169.254/a.png', 'metadata đám mây'],
  ['https://10.0.0.5/a.png', 'mạng nội bộ 10.x'],
  ['https://192.168.1.1/a.png', 'mạng nội bộ 192.168.x'],
  ['https://172.16.0.1/a.png', 'mạng nội bộ 172.16-31.x'],
  ['khong-phai-dia-chi', 'không phải địa chỉ'],
];

const IP_RIENG = ['10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.0.1', '::1', 'fd00::1'];
const IP_CHUNG = ['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700::1'];

async function chay() {
  const kq: { ten: string; dat: boolean; ghi?: string }[] = [];

  for (const [dia, vi] of PHAI_CHAN) {
    let dat = false; let ghi = 'không bị chặn';
    try { await kiemDiaChiAnh(dia); } catch (e) {
      dat = e instanceof AnhKhongHopLeError;
      ghi = (e as Error).message;
    }
    kq.push({ ten: `chặn ảnh ${vi}`, dat, ghi });
  }
  for (const ip of IP_RIENG) kq.push({ ten: `${ip} là địa chỉ riêng tư`, dat: laDiaChiRiengTu(ip) });
  for (const ip of IP_CHUNG) kq.push({ ten: `${ip} là địa chỉ công cộng`, dat: !laDiaChiRiengTu(ip) });

  console.log(`@@KQ@@${JSON.stringify(kq)}`);
}
chay();
