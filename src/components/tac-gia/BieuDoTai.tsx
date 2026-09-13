'use client';

import { useState } from 'react';
import { MO_TA_HE, type MaHeMay } from '@/lib/he-may';
import { gonSo, gop } from '@/lib/tien-ich';

export interface ONgayXem {
  /** Mốc ngày, chỉ để làm khoá — không dựng lại Date ở trình duyệt. */
  khoa: number;
  nhan: string;
  tong: number;
  /** Từng hệ máy có bao nhiêu lượt trong ngày ấy, đã bỏ hệ bằng 0. */
  he: { ma: string; so: number }[];
}

/**
 * BIỂU ĐỒ LƯỢT TẢI 30 NGÀY — cột chồng theo hệ máy, rê vào đọc được số.
 *
 * Bản đầu là ba mươi cái cột một màu, và nó nói được đúng một chuyện: hôm nào
 * đông hơn hôm nào. Chồng màu theo hệ máy thì cùng chừng ấy chỗ trả lời thêm
 * được câu đắt hơn nhiều — đợt tăng tuần này là do bản Android mới hay do có
 * người nhắc tới bản Java ở đâu đó.
 *
 * SỐ ĐỌC Ở MỘT CHỖ CỐ ĐỊNH phía trên, không phải cái bong bóng bám theo con
 * trỏ. Bong bóng thì che mất mấy cột bên cạnh — đúng mấy cột người ta đang so
 * — và trên điện thoại thì không có con trỏ nào để mà bám.
 *
 * Mỗi cột là một <button> thật: rê chuột đọc được thì bấm phím Tab cũng phải
 * đọc được, mà một cái <div> nghe sự kiện chuột thì bàn phím không tới nổi.
 */
export function BieuDoTai({ ngay, caoNhat }: { ngay: ONgayXem[]; caoNhat: number }) {
  // Mặc định chỉ ngày cuối: mở trang ra là thấy ngay số của hôm nay, chứ không
  // phải một dòng trống chờ người ta rê vào mới chịu nói gì.
  const [chon, datChon] = useState(ngay.length - 1);
  const o = ngay[Math.min(Math.max(0, chon), ngay.length - 1)];

  return (
    <div>
      <div className="vach mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-3">
        <span className="text-[15px] font-bold">{o.nhan}</span>
        <span className="text-[15px] font-bold tabular-nums">{gonSo(o.tong)} lượt</span>
        {o.he.length > 0 && (
          <span className="phu flex flex-wrap items-center gap-x-3 gap-y-1">
            {o.he.map((h) => (
              <span key={h.ma} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2 shrink-0 rounded-[2px]"
                  style={{ background: MO_TA_HE[h.ma as MaHeMay]?.mau ?? '#64748b' }} />
                {MO_TA_HE[h.ma as MaHeMay]?.ten ?? h.ma} {h.so}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="flex h-32 items-end gap-[3px]">
        {ngay.map((n, i) => (
          <button key={n.khoa} type="button"
            onMouseEnter={() => datChon(i)}
            onFocus={() => datChon(i)}
            onClick={() => datChon(i)}
            aria-label={`${n.nhan}: ${n.tong} lượt tải`}
            className={gop(
              'cot-tai group flex h-full flex-1 flex-col justify-end rounded-t-[3px]',
              'outline-none transition-opacity',
              i === chon ? 'opacity-100' : 'opacity-70 hover:opacity-100 focus-visible:opacity-100',
            )}
            style={{ animationDelay: `${i * 12}ms` }}>
            {/*
              Ngày không có lượt nào vẫn giữ một vạch mỏng: bỏ trống hẳn thì mắt
              đọc ra "chỗ này bị thiếu dữ liệu", mà sự thật là "hôm ấy không ai
              tải" — hai chuyện khác hẳn nhau.
            */}
            {n.tong === 0 ? (
              <span className="h-[3px] w-full rounded-[2px] bg-vien" />
            ) : (
              <span className="flex w-full flex-col justify-end overflow-hidden rounded-t-[3px]"
                style={{ height: `${Math.max(3, (n.tong / caoNhat) * 100)}%` }}>
                {n.he.map((h) => (
                  <span key={h.ma} className="w-full shrink-0"
                    style={{
                      height: `${(h.so / n.tong) * 100}%`,
                      background: MO_TA_HE[h.ma as MaHeMay]?.mau ?? '#64748b',
                    }} />
                ))}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="phu mt-1.5 flex justify-between">
        <span>{ngay[0]?.nhan}</span>
        <span>{ngay[ngay.length - 1]?.nhan}</span>
      </div>
    </div>
  );
}
