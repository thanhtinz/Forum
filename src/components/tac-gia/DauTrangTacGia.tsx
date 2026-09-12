'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, FilePen, Gamepad2, LayoutDashboard, Menu, UserRound, X,
} from 'lucide-react';
import { gop } from '@/lib/tien-ich';

const HINH = { LayoutDashboard, Gamepad2, UserRound, FilePen };

export interface MucTacGia {
  dich: string;
  ten: string;
  hinh: keyof typeof HINH;
  /** Con số nhỏ nằm cạnh tên, đếm sẵn ở máy chủ. Không có thì không hiện. */
  so?: number;
}

/**
 * Mục nào đang được chọn.
 *
 * `/quan-ly` là tiền tố của mọi lối đi khác nên phải so khớp TUYỆT ĐỐI, không
 * thì "Tổng quan" sáng ở cả trang game lẫn trang hồ sơ và người ta không còn
 * biết mình đang đứng đâu.
 */
function dangChon(hienTai: string, dich: string): boolean {
  if (dich === '/quan-ly') return hienTai === '/quan-ly';
  return hienTai === dich || hienTai.startsWith(`${dich}/`);
}

/**
 * ĐẦU TRANG CỦA CỔNG NHÀ PHÁT TRIỂN — dùng chung cho cả phần mở (đăng ký) lẫn
 * phần trong (bảng tác giả).
 *
 * Thanh NGANG, không phải thanh bên: cổng nhà phát triển là một trang riêng
 * ở tên miền riêng, người ta đọc nó như đọc một trang web chứ không dùng nó
 * như dùng một phần mềm — mà trang web thì menu nằm trên đầu. Cửa hàng vẫn
 * giữ thanh bên của cửa hàng; hai vỏ khác nhau là cố ý, để người vừa bán hàng
 * vừa mua hàng nhìn một cái là biết mình đang ở bên nào.
 *
 * Danh sách lối đi truyền từ ngoài vào: phần mở chỉ có một mục (đăng ký), phần
 * trong có ba. Một thành phần, hai cảnh — chứ không phải hai thanh trên gần
 * giống nhau rồi sửa cái này quên cái kia.
 */
export function DauTrangTacGia({ loiDi, trangChu, ten }: {
  loiDi: MucTacGia[];
  /** Bấm vào tên trang thì về đâu. */
  trangChu: string;
  /** Tên người đang đăng nhập; chưa đăng nhập thì bỏ trống. */
  ten?: string | null;
}) {
  const duongDan = usePathname();
  const [mo, datMo] = useState(false);

  // Đổi trang thì đóng menu: Next đổi trang mà không dựng lại thành phần, nên
  // tấm menu sẽ nằm nguyên đó che mất trang vừa mở.
  useEffect(() => { datMo(false); }, [duongDan]);

  return (
    <header className="kinh-tren sticky top-0 z-40">
      <div className="khung flex items-center gap-2 py-2.5">
        <Link href={trangChu} className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bieu-tuong-192.png" alt="" width={28} height={28}
            style={{ width: 28, height: 28 }} className="shrink-0" />
          <span className="text-[15px] font-bold tracking-tight">
            {/* Dòng "cho nhà phát triển" hiện ở MỌI khổ, kể cả điện thoại:
                thiếu nó thì thanh trên chỉ còn chữ "SunnyStore" y hệt cửa hàng,
                mà đây là hai trang khác nhau ở hai tên miền khác nhau. */}
            SunnyStore <span className="font-medium text-mo">cho nhà phát triển</span>
          </span>
        </Link>

        <nav className="ml-5 hidden items-center gap-0.5 lg:flex" aria-label="Lối đi cổng nhà phát triển">
          {loiDi.map((l) => {
            const H = HINH[l.hinh];
            const chon = dangChon(duongDan, l.dich);
            return (
              <Link key={l.dich} href={l.dich} aria-current={chon ? 'page' : undefined}
                className={gop(
                  'flex items-center gap-1.5 rounded-nut px-2.5 py-1.5 text-[13.5px] font-semibold transition-colors',
                  chon ? 'bg-nen3 text-chu' : 'text-mo hover:bg-nen3/60 hover:text-chu',
                )}>
                <H size={16} aria-hidden /> {l.ten}
                {!!l.so && (
                  <span className="rounded-full bg-cam/20 px-1.5 text-[11px] font-bold text-canh">{l.so}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/*
            Lối về cửa hàng là đường dẫn THƯỜNG, không phải địa chỉ tuyệt đối:
            người đứng ở cổng nhà phát triển bấm vào thì phần mềm trung gian tự
            đưa về đúng tên miền cửa hàng, còn người đang ở chính cửa hàng thì
            nó chỉ là lối về trang đầu.
          */}
          <Link href="/" className="hidden items-center gap-1.5 text-[13px] font-semibold text-mo hover:text-chu sm:flex">
            <ArrowLeft size={15} aria-hidden /> Về cửa hàng
          </Link>

          {/* Tên người dùng đứng SAU lối về cửa hàng và có vạch ngăn: để liền
              nhau thì hai thứ đọc dính thành một câu, mà tên hiển thị lắm khi
              lại chính là tên một cửa hàng. */}
          {ten && (
            <span className="hidden border-l border-vien pl-2 text-[13px] font-semibold sm:inline">{ten}</span>
          )}

          {/* Nút mở menu chỉ có nghĩa khi có nhiều hơn một lối đi để bày ra. */}
          <button type="button" onClick={() => datMo((v) => !v)}
            aria-label={mo ? 'Đóng menu' : 'Mở menu'} aria-expanded={mo}
            className="nut-tron size-9 lg:hidden">
            {mo ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mo && (
        <nav className="khung pb-3 lg:hidden" aria-label="Lối đi cổng nhà phát triển">
          {loiDi.map((l) => {
            const H = HINH[l.hinh];
            const chon = dangChon(duongDan, l.dich);
            return (
              <Link key={l.dich} href={l.dich} aria-current={chon ? 'page' : undefined}
                className={gop(
                  'flex items-center gap-2.5 rounded-nut px-2.5 py-2 text-[14px] font-medium',
                  chon ? 'bg-nen3 text-chu' : 'text-mo hover:bg-nen3 hover:text-chu',
                )}>
                <H size={17} aria-hidden /> {l.ten}
                {!!l.so && (
                  <span className="ml-auto rounded-full bg-cam/20 px-1.5 text-[11px] font-bold text-canh">{l.so}</span>
                )}
              </Link>
            );
          })}
          <Link href="/" className="flex items-center gap-2.5 rounded-nut px-2.5 py-2 text-[14px] font-medium text-mo hover:bg-nen3 hover:text-chu">
            <ArrowLeft size={17} aria-hidden /> Về cửa hàng
          </Link>
          {ten && <p className="phu mt-1 px-2.5">{ten}</p>}
        </nav>
      )}
    </header>
  );
}
