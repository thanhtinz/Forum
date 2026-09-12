import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ExternalLink, Gamepad2, LayoutDashboard, UserRound } from 'lucide-react';
import '../globals.css';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { MA_DAT_NEN } from '@/lib/dat-nen';
import { MenuTacGia } from '@/components/tac-gia/MenuTacGia';
import { LOI_DI_TAC_GIA as LOI_DI } from '@/lib/tac-gia-loi-di';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Bảng tác giả · SunnyStore', template: '%s · Bảng tác giả' },
  // Không có gì ở đây đáng cho máy tìm kiếm lập chỉ mục, mà lộ danh sách đường
  // dẫn ra thì chỉ tổ mời người ta tới gõ cửa.
  robots: { index: false, follow: false },
};

const HINH = { LayoutDashboard, Gamepad2, UserRound };

/*
 * BẢNG TÁC GIẢ — BỐ CỤC GỐC THỨ BA.
 *
 * Ngang hàng với cửa hàng và khu quản trị, không nằm trong cái nào: tệp này tự
 * dựng <html> và <body>. Người đang soạn game của mình không cần thanh tìm
 * game, không cần thanh tab đáy — họ cần danh sách game của họ và trạng thái
 * của từng cái.
 *
 * Vỏ cố ý KHÁC khu quản trị: thanh bên sáng, không sẫm. Một người vừa là tác
 * giả vừa là quản trị phải nhìn ra ngay mình đang đứng ở vai nào, vì hai vai
 * ấy làm được những việc rất khác nhau.
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

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MA_DAT_NEN }} />
      </head>
      <body className="bg-nen">
        <a href="#noi-dung" className="nhay-toi-noi-dung">Tới nội dung chính</a>

        <aside className="vach-phai fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col border-r bg-nen2 px-3 py-4 lg:flex">
          <Link href="/quan-ly" className="mb-5 block px-2.5 text-[17px] font-bold tracking-tight">
            SunnyStore <span className="font-medium text-mo">Tác giả</span>
          </Link>

          <nav className="space-y-0.5">
            {LOI_DI.map((l) => {
              const H = HINH[l.hinh];
              return (
                <Link key={l.dich} href={l.dich}
                  className="flex items-center gap-2.5 rounded-nut px-2.5 py-2 text-[14px] font-medium text-mo transition-colors hover:bg-nen3 hover:text-chu">
                  <H size={17} aria-hidden /> {l.ten}
                  {l.dich === '/quan-ly/game' && choDuyet + tuChoi > 0 && (
                    <span className="ml-auto rounded-full bg-cam/20 px-1.5 py-0.5 text-[11px] font-bold text-canh">
                      {choDuyet + tuChoi}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-1 px-2.5 pt-4 text-[13px]">
            <p className="font-semibold">{nguoi.tenHienThi}</p>
            <Link href="/" className="inline-flex items-center gap-1 text-mo hover:text-chu">
              Xem cửa hàng <ExternalLink size={12} aria-hidden />
            </Link>
          </div>
        </aside>

        <div className="min-h-screen lg:pl-[236px]">
          <MenuTacGia loiDi={LOI_DI.map((l) => ({ dich: l.dich, ten: l.ten }))}
            ten={nguoi.tenHienThi} />
          <main id="noi-dung" className="khung py-5 sm:py-7">{children}</main>
        </div>
      </body>
    </html>
  );
}
