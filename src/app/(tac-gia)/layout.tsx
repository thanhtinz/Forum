import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import '../globals.css';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { MA_DAT_NEN } from '@/lib/dat-nen';
import { LOI_DI_TAC_GIA as LOI_DI } from '@/lib/tac-gia-loi-di';
import { DauTrangTacGia } from '@/components/tac-gia/DauTrangTacGia';
import { ChanTrangTacGia } from '@/components/tac-gia/ChanTrangTacGia';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Bảng tác giả · SunnyStore', template: '%s · Bảng tác giả' },
  // Không có gì ở đây đáng cho máy tìm kiếm lập chỉ mục, mà lộ danh sách đường
  // dẫn ra thì chỉ tổ mời người ta tới gõ cửa.
  robots: { index: false, follow: false },
};

/*
 * BẢNG TÁC GIẢ — BỐ CỤC GỐC THỨ BA.
 *
 * Ngang hàng với cửa hàng và khu quản trị, không nằm trong cái nào: tệp này tự
 * dựng <html> và <body>. Người đang soạn game của mình không cần thanh tìm
 * game, không cần thanh tab đáy — họ cần danh sách game của họ và trạng thái
 * của từng cái.
 *
 * Vỏ là vỏ CỔNG NHÀ PHÁT TRIỂN, dùng chung với trang đăng ký: thanh trên ngang
 * và chân trang, không phải thanh bên như cửa hàng hay khu quản trị. Một người
 * vừa bán hàng vừa mua hàng nhìn cái vỏ là biết mình đang đứng bên nào.
 *
 * CỔNG CHẶN đặt ở đây, không ở từng trang con: thêm trang mới mà quên chép
 * đoạn kiểm quyền là cả trang ấy mở toang. Nhưng đây chỉ chặn GIAO DIỆN — mỗi
 * hàm `'use server'` vẫn phải tự kiểm quyền, vì nó là địa chỉ POST công khai.
 */
export default async function GocTacGia({ children }: { children: React.ReactNode }) {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap');
  // Quản trị vào được để xem bảng tác giả trông thế nào, nhưng họ không sở hữu
  // game nào nên danh sách sẽ trống — đúng như thật.
  if (nguoi.vaiTro !== 'TAC_GIA' && nguoi.vaiTro !== 'QUAN_TRI') redirect('/tac-gia/dang-ky');

  const [choDuyet, tuChoi] = await Promise.all([
    db.game.count({ where: { tacGiaId: nguoi.id, trangThai: 'CHO_DUYET' } }),
    db.game.count({ where: { tacGiaId: nguoi.id, trangThai: 'TU_CHOI' } }),
  ]);

  // Con số đếm ở máy chủ rồi gắn thẳng vào mục, để thanh trên không phải biết
  // gì về game hay trạng thái game.
  const loiDi = LOI_DI.map((l) => ({
    ...l,
    so: l.dich === '/quan-ly/game' ? choDuyet + tuChoi : undefined,
  }));

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MA_DAT_NEN }} />
      </head>
      <body className="bg-nen">
        <a href="#noi-dung" className="nhay-toi-noi-dung">Tới nội dung chính</a>

        <div className="flex min-h-screen flex-col">
          <DauTrangTacGia loiDi={loiDi} trangChu="/quan-ly" ten={nguoi.tenHienThi} />
          <main id="noi-dung" className="khung flex-1 py-5 sm:py-7">{children}</main>
          <ChanTrangTacGia laTacGia />
        </div>
      </body>
    </html>
  );
}
