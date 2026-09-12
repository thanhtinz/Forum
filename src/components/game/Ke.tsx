'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { gop } from '@/lib/tien-ich';

/**
 * KỆ CUỘN NGANG — có nút lật và dải mờ ở mép.
 *
 * Trên điện thoại, quẹt ngang bằng ngón cái là xong, và mẩu thẻ ló ra ở mép
 * đã tự nói "còn nữa". Trên máy bàn thì không: chuột không quẹt ngang được,
 * nên tấm thẻ bị cắt ngang ở mép phải trông như trang vỡ chứ không như một
 * lời mời lật tiếp. Nên máy bàn cần hai thứ mà điện thoại không cần:
 *
 *   - HAI NÚT LẬT, chỉ hiện khi còn chỗ để lật về phía ấy. Nút lúc nào cũng
 *     hiện mà bấm không ăn thì tệ hơn là không có nút.
 *   - DẢI MỜ ở đúng mép còn nội dung. Nó biến chỗ bị cắt thành chỗ mờ dần,
 *     và mắt đọc ra ngay là "còn nữa bên kia" chứ không phải "hỏng".
 *
 * Lật đi 85% bề ngang khung chứ không phải 100%: chừa lại một mẩu của tấm cũ
 * làm mốc, để sau cú lật người xem còn biết mình vừa ở đâu.
 */
export function Ke({ children, className, nhan, theoTam, the: The = 'div' }: {
  children: React.ReactNode;
  className?: string;
  /**
   * Thẻ HTML của đường cuộn. Mặc định `div`.
   *
   * Có chỗ cần `dl`: hàng số liệu dưới tên game là một danh sách định nghĩa
   * thật — nhãn là `dt`, con số là `dd`. Bọc thêm một `div` vào giữa `dl` và
   * `dt` là phá đúng cái quan hệ khiến bộ đọc màn hình đọc ra "đánh giá: 4,0".
   */
  the?: 'div' | 'dl';
  /** Nhãn đọc được của cả kệ, ghép vào nhãn hai nút lật. */
  nhan?: string;
  /**
   * Báo ra tấm nào đang ở giữa khung, cho ai cần vẽ chấm trang.
   *
   * Tính bằng vị trí cuộn chia cho bề ngang khung, vì kệ dùng dáng này có mỗi
   * tấm rộng gần bằng cả khung — rẻ hơn nhiều so với dựng một bộ theo dõi cho
   * từng tấm, mà ra cùng một con số.
   */
  theoTam?: (i: number) => void;
}) {
  // `HTMLElement` chứ không `HTMLDivElement`: đường cuộn có thể là `dl`, và
  // mọi thứ đọc ở đây (`scrollLeft`, `clientWidth`) đều là của `HTMLElement`.
  const oRef = useRef<HTMLElement>(null);
  const [conTrai, datConTrai] = useState(false);
  const [conPhai, datConPhai] = useState(false);

  const doLai = useCallback(() => {
    const o = oRef.current;
    if (!o) return;
    // Trừ hao 2px: bề rộng sau khi trình duyệt làm tròn hiếm khi khớp tuyệt
    // đối, nên so bằng dấu bằng thì nút phải không bao giờ chịu tắt.
    datConTrai(o.scrollLeft > 2);
    datConPhai(o.scrollLeft + o.clientWidth < o.scrollWidth - 2);
    theoTam?.(Math.round(o.scrollLeft / Math.max(1, o.clientWidth)));
  }, [theoTam]);

  useEffect(() => {
    const o = oRef.current;
    if (!o) return;
    doLai();
    // Cửa sổ đổi bề ngang thì chỗ để lật cũng đổi theo; không nghe thì nút
    // kẹt ở trạng thái tính từ lần dựng đầu.
    const theoDoi = new ResizeObserver(doLai);
    theoDoi.observe(o);
    return () => theoDoi.disconnect();
  }, [doLai]);

  const lat = (huong: -1 | 1) => {
    const o = oRef.current;
    if (!o) return;
    o.scrollBy({ left: huong * o.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className="group/ke relative">
      <The ref={oRef as React.RefObject<HTMLDivElement & HTMLDListElement>}
        onScroll={doLai} className={gop('ke', className)}>
        {children}
      </The>

      {/* Dải mờ chỉ để NGẮM, không bắt chuột — đặt trên đường cuộn mà ăn chuột
          thì mép kệ thành chỗ bấm không ra gì. */}
      <Mo ben="trai" hien={conTrai} />
      <Mo ben="phai" hien={conPhai} />

      <NutLat ben="trai" hien={conTrai} nhan={nhan} onClick={() => lat(-1)} />
      <NutLat ben="phai" hien={conPhai} nhan={nhan} onClick={() => lat(1)} />
    </div>
  );
}

function Mo({ ben, hien }: { ben: 'trai' | 'phai'; hien: boolean }) {
  return (
    <span aria-hidden
      className={gop(
        'pointer-events-none absolute inset-y-0 hidden w-14 transition-opacity duration-200 lg:block',
        ben === 'trai'
          ? '-left-1 bg-gradient-to-r from-nen to-transparent'
          : '-right-1 bg-gradient-to-l from-nen to-transparent',
        hien ? 'opacity-100' : 'opacity-0',
      )} />
  );
}

function NutLat({ ben, hien, nhan, onClick }: {
  ben: 'trai' | 'phai';
  hien: boolean;
  nhan?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} tabIndex={hien ? 0 : -1} aria-hidden={!hien}
      aria-label={`${ben === 'trai' ? 'Lùi lại' : 'Lật tiếp'}${nhan ? ` ${nhan}` : ''}`}
      className={gop(
        'absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full',
        'border border-vien bg-nen2 text-chu shadow-noi transition-opacity duration-200',
        'hover:bg-nen3 lg:grid',
        ben === 'trai' ? '-left-3' : '-right-3',
        /*
         * Hiện THẲNG khi còn chỗ lật, không đợi rê chuột vào.
         *
         * Bản trước giấu nút tới lúc trỏ chuột chạm vào kệ. Nhưng nút ấy là
         * lối đi DUY NHẤT tới phần nội dung bị khuất trên máy bàn — giấu lối
         * đi duy nhất sau một cử chỉ mà người dùng phải đoán ra là hỏng.
         * CH Play cũng để chevron hiện sẵn ở hai đầu kệ, đúng vì lẽ ấy.
         */
        hien ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}>
      {ben === 'trai' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  );
}
