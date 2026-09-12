'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gop } from '@/lib/tien-ich';

export interface MucLuanPhien {
  ma: string;
  chu: string;
  dich: string;
}

/** Mấy giây thì đổi sang mục sau. */
const NHIP_MS = 3500;

/**
 * DÒNG LUÂN PHIÊN dưới tên game — nhà phát hành, rồi thể loại, rồi lại quay lại.
 *
 * App Store dùng đúng lối này: dưới tên ứng dụng chỉ có MỘT dòng, mà dòng ấy
 * mấy giây lại đổi nội dung. Lý do rất thực dụng: chỗ dưới tên game chỉ đủ một
 * dòng, mà có tới ba bốn thứ đều đáng in ra — tên hãng, thể loại, có bản Việt
 * hoá. Nhồi hết vào một dòng thì nó dài quá phải cắt cụt; xuống dòng thì đầu
 * trang phình ra và đẩy nút tải xuống. Luân phiên thì mỗi thứ đều có lượt, mà
 * bố cục không nhích một điểm ảnh nào.
 *
 * MỌI MỤC ĐỀU NẰM TRONG DOM CÙNG LÚC, chỉ khác độ mờ. Ba lẽ:
 *
 *   • Máy tìm và bộ đọc màn hình thấy đủ cả ba, không phải chờ hết vòng.
 *   • Bố cục đứng yên: các mục xếp chồng trong cùng một ô lưới, nên ô ấy cao
 *     bằng mục cao nhất và không co giãn theo mục đang hiện.
 *   • Không phải dựng lại thẻ `<a>` mỗi lượt đổi, nên không có cảnh cú bấm rơi
 *     vào khoảng trống giữa hai lượt.
 *
 * DỪNG XOAY KHI NGƯỜI TA ĐANG NHẮM BẤM. Rê chuột vào là dừng; và mục nào được
 * bàn phím Tab tới thì nhảy hẳn sang mục ấy. Không có hai điều đó thì đúng lúc
 * ngón tay hạ xuống, chữ dưới ngón đổi thành chữ khác — tức là bấm vào "Nokia"
 * mà mở ra trang "Phiêu lưu".
 */
export function DongLuanPhien({ muc, className }: { muc: MucLuanPhien[]; className?: string }) {
  const [chiSo, datChiSo] = useState(0);
  const [dungLai, datDungLai] = useState(false);
  /* `null` = chưa biết máy có xin giảm chuyển động hay không; lúc ấy vẽ bản
     tĩnh trước, để lượt dựng ở máy chủ và lượt dựng đầu ở trình duyệt khớp nhau. */
  const [xoayDuoc, datXoayDuoc] = useState<boolean | null>(null);
  const soMuc = useRef(muc.length);
  soMuc.current = muc.length;

  useEffect(() => {
    const xin = window.matchMedia('(prefers-reduced-motion: reduce)');
    const doLai = () => datXoayDuoc(!xin.matches);
    doLai();
    xin.addEventListener('change', doLai);
    return () => xin.removeEventListener('change', doLai);
  }, []);

  useEffect(() => {
    if (!xoayDuoc || dungLai || muc.length < 2) return;
    const dong = window.setInterval(
      () => datChiSo((i) => (i + 1) % soMuc.current),
      NHIP_MS,
    );
    return () => window.clearInterval(dong);
  }, [xoayDuoc, dungLai, muc.length]);

  if (muc.length === 0) return null;

  /*
   * MÁY XIN GIẢM CHUYỂN ĐỘNG thì in hết ra một dòng, phân cách bằng dấu chấm
   * giữa — không xoay, và cũng không giấu mục nào đi. Người đã nói mình khó
   * chịu với chuyển động thì không được đổi lại bằng việc phải chờ hết vòng
   * mới đọc được thứ mình cần.
   */
  if (xoayDuoc === false) {
    return (
      <p className={gop('phu', className)}>
        {muc.map((m, i) => (
          <span key={m.ma}>
            {i > 0 && ' · '}
            <Link href={m.dich} className="hover:text-chu hover:underline">{m.chu}</Link>
          </span>
        ))}
      </p>
    );
  }

  return (
    <p className={gop('phu grid', className)}
      onMouseEnter={() => datDungLai(true)}
      onMouseLeave={() => datDungLai(false)}>
      {muc.map((m, i) => (
        <Link key={m.ma} href={m.dich}
          onFocus={() => { datChiSo(i); datDungLai(true); }}
          onBlur={() => datDungLai(false)}
          aria-current={i === chiSo ? 'true' : undefined}
          className={gop(
            '[grid-area:1/1] justify-self-start transition-opacity duration-300 hover:text-chu hover:underline',
            i === chiSo ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}>
          {m.chu}
        </Link>
      ))}
    </p>
  );
}
