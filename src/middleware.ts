import { NextResponse, type NextRequest } from 'next/server';
import { hostCuaHang, laHostTacGia, moTrenCongTacGia } from '@/lib/ten-mien-const';

/*
 * CỔNG NHÀ PHÁT TRIỂN — `developer.<tên miền cửa hàng>`.
 *
 * Cùng một bản dựng phục vụ cả hai tên miền; chỗ phân luồng chỉ có đúng ở đây.
 * Dựng hai ứng dụng riêng thì phải chép đôi mọi thứ dùng chung — phiên đăng
 * nhập, cơ sở dữ liệu, kho ảnh, hệ màu — mà rồi hai bản sẽ trôi khỏi nhau.
 *
 * Ba luật, và chỉ ba:
 *
 *   1. Vào gốc của cổng ấy thì THẤY NGAY bảng tác giả. Viết lại đường dẫn chứ
 *      không chuyển hướng: người ta gõ `developer.sunnystore.vn` thì địa chỉ
 *      trên thanh phải vẫn là thế, không nhảy thành `/quan-ly`.
 *   2. Mấy lối đi của cổng thì mở bình thường.
 *   3. MỌI ĐƯỜNG DẪN KHÁC bị đưa về cửa hàng, giữ nguyên phần đường dẫn: gõ
 *      `developer.sunnystore.vn/game/bounce-tales` thì ra đúng trang game ấy
 *      ở cửa hàng, chứ không ra trang 404 của một cổng không có game nào.
 *
 * KHÔNG đụng tới `/api`, `/_next` và mấy tệp tĩnh: cổng nhà phát triển vẫn
 * phải gọi được cổng tải ảnh, tải tệp, và vẫn phải nạp được mã nguồn giao
 * diện — đó là cùng một ứng dụng.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get('host');
  if (!laHostTacGia(host)) return NextResponse.next();

  const { pathname, search } = req.nextUrl;

  if (pathname === '/') {
    const den = req.nextUrl.clone();
    den.pathname = '/quan-ly';
    return NextResponse.rewrite(den);
  }

  if (moTrenCongTacGia(pathname)) return NextResponse.next();

  const ve = req.nextUrl.clone();
  ve.host = hostCuaHang(host ?? '');
  ve.pathname = pathname;
  ve.search = search;
  return NextResponse.redirect(ve);
}

export const config = {
  /*
   * Bỏ qua mọi thứ không phải trang: mã nguồn giao diện, cổng API, và mấy tệp
   * có đuôi. Chạy phần mềm trung gian cho từng tấm ảnh là trả giá cho mỗi lượt
   * gọi mà chẳng được gì.
   */
  matcher: ['/((?!_next/|api/|.*\\..*).*)'],
};
