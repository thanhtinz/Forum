/*
 * TÊN MIỀN RIÊNG CHO NHÀ PHÁT TRIỂN.
 *
 * Bảng tác giả và trang xin làm tác giả nay có cổng riêng: `developer.<tên
 * miền của cửa hàng>` — đúng lối App Store tách `developer.apple.com` khỏi
 * `apps.apple.com`.
 *
 * VÌ SAO TÁCH. Người vào cửa hàng và người đăng game lên cửa hàng là hai loại
 * khách khác hẳn nhau: một bên đi tìm game để chơi, một bên đi soạn hàng để
 * bày. Gộp hai việc vào một tên miền thì thanh điều hướng phải chở cả hai, và
 * người nào cũng phải lướt qua phân nửa số mục không phải của mình.
 *
 * NHẬN BIẾT THEO TIỀN TỐ, không theo một tên miền chép cứng: nhờ vậy nó chạy
 * y hệt ở mọi nơi — `developer.sunnystore.vn` khi bày thật, và
 * `developer.localhost` lúc dựng ở máy hay lúc chạy bộ kiểm, vì trình duyệt
 * nào cũng tự trỏ mọi tên `*.localhost` về máy mình.
 *
 * Tệp này KHÔNG import gì để bài kiểm `.mjs` nạp thẳng được.
 */

export const TIEN_TO_TAC_GIA = 'developer.';

/** Địa chỉ này có phải cổng nhà phát triển không? */
export function laHostTacGia(host: string | null | undefined): boolean {
  return (host ?? '').toLowerCase().startsWith(TIEN_TO_TAC_GIA);
}

/** Bỏ tiền tố để ra tên miền của chính cửa hàng. */
export function hostCuaHang(host: string): string {
  return laHostTacGia(host) ? host.slice(TIEN_TO_TAC_GIA.length) : host;
}

/** Ghép tiền tố để ra cổng nhà phát triển. */
export function hostTacGia(host: string): string {
  return laHostTacGia(host) ? host : TIEN_TO_TAC_GIA + host;
}

/**
 * Mấy lối đi được phép mở trên cổng nhà phát triển.
 *
 * Danh sách NGẮN và kể tên rõ ràng, không phải một phép loại trừ: cổng này chỉ
 * có đúng ba việc — bảng tác giả, xin làm tác giả, và đăng nhập để làm hai
 * việc kia. Mọi đường dẫn khác gõ vào đây đều bị đưa về cửa hàng, nên thêm
 * trang mới cho cổng này thì phải thêm tên vào đây, và đó là chủ ý: quên thêm
 * thì trang mới lặng lẽ bị đẩy về cửa hàng chứ không lặng lẽ mở toang.
 */
export const LOI_MO_TAC_GIA = ['/quan-ly', '/tac-gia/dang-ky', '/dang-nhap', '/dang-xuat'];

export function moTrenCongTacGia(duongDan: string): boolean {
  return LOI_MO_TAC_GIA.some((l) => duongDan === l || duongDan.startsWith(`${l}/`));
}
