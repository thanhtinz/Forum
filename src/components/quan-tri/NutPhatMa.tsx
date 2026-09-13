'use client';

import { useState, useTransition } from 'react';
import { useXacNhan } from '@/components/HopXacNhan';
import { KeyRound, X } from 'lucide-react';
import { phatMaDatLai } from '@/app/(quan-tri)/quan-tri/viec';
import { HAN_MA_PHUT } from '@/lib/ma-xac-minh-const';

/**
 * Nút phát mã đặt lại mật khẩu, và chỗ hiện mã.
 *
 * Không dùng `NutViec` như mấy nút bên cạnh vì việc này TRẢ VỀ MỘT THỨ phải
 * đọc: mã chỉ hiện đúng một lần, trong cơ sở dữ liệu chỉ còn bản băm. Một cái
 * nút chỉ biết báo "xong" thì mã bay mất ngay lúc nó xong.
 *
 * BÀY CẢ MÃ LẪN ĐƯỜNG DẪN. Mã sáu số thì đọc qua điện thoại được — đó là lối
 * hay dùng nhất khi người ta nhắn tin cho ban quản trị; còn đường dẫn thì gửi
 * qua tin nhắn, bấm một cái là vào thẳng trang đặt lại với mã điền sẵn.
 *
 * Đường dẫn nằm trong một ô nhập CHỈ ĐỌC chứ không phải một dòng chữ, và nút
 * chép thì không có: `navigator.clipboard` đòi trang chạy trên https và vẫn bị
 * chặn ở vài trình duyệt, nên một cái nút chép hỏng lặng lẽ còn tệ hơn là
 * không có. Ô nhập thì bấm vào là chọn hết, ở đâu cũng vậy.
 *
 * Hỏi xác nhận bằng hộp của cửa hàng (`useXacNhan`), không phải
 * `window.confirm`: hộp của trình duyệt thì chữ không dịch được, mà mấy nút
 * khác trên cùng hàng này đều dùng hộp kia — hai kiểu hộp trên một hàng là hai
 * thói quen bấm khác nhau cho cùng một việc.
 */
export function NutPhatMa({ id, ten }: { id: string; ten: string }) {
  const [ma, datMa] = useState<{ so: string; dan: string } | null>(null);
  const [loi, datLoi] = useState<string | null>(null);
  const [dangChay, batDau] = useTransition();
  const { hoi, hop } = useXacNhan();

  const phat = async () => {
    const dong = await hoi(
      `Phát mã đặt lại mật khẩu cho ${ten}? Mã cũ chưa dùng của họ sẽ chết ngay.`,
    );
    if (!dong) return;
    datLoi(null);
    batDau(async () => {
      const r = await phatMaDatLai(id);
      if (r.loi || !r.ma || !r.email) { datLoi(r.loi ?? 'Không phát được mã.'); return; }
      // Dựng địa chỉ ở trình duyệt: máy chủ không chắc biết mình đang được mở
      // qua tên miền nào, mà người nhận thì phải mở đúng cái tên miền ấy.
      const so = r.ma.replace(/\D+/g, '');
      datMa({
        so: r.ma,
        dan: `${window.location.origin}/dat-lai-mat-khau`
          + `?email=${encodeURIComponent(r.email)}&ma=${so}`,
      });
    });
  };

  if (ma) {
    return (
      <span className="the-noi flex w-[300px] max-w-full flex-col gap-1.5 p-2.5 text-left">
        <span className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold">Mã cho {ten}</span>
          <button type="button" onClick={() => datMa(null)} aria-label="Đóng, giấu mã đi"
            className="shrink-0 text-mo hover:text-chu">
            <X size={14} aria-hidden />
          </button>
        </span>
        <span className="text-center font-mono text-[20px] font-bold tracking-[0.12em]">
          {ma.so}
        </span>
        <input readOnly value={ma.dan} onFocus={(e) => e.currentTarget.select()}
          aria-label={`Đường dẫn đặt lại mật khẩu của ${ten}`}
          className="o-nhap !py-1.5 font-mono !text-[11px]" />
        <span className="phu leading-snug">
          Đọc mã cho {ten}, hoặc gửi đường dẫn. Chỉ hiện một lần,
          sống {HAN_MA_PHUT} phút, dùng được một lần.
        </span>
      </span>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1">
      {hop}
      <button type="button" onClick={phat} disabled={dangChay}
        aria-label={`Phát mã đặt lại mật khẩu cho ${ten}`}
        className="nut-xam !min-h-[30px] gap-1.5 !px-2.5 !text-[12px]">
        <KeyRound size={13} aria-hidden />
        {dangChay ? 'Đang phát…' : 'Phát mã'}
      </button>
      {loi && <span className="text-[11px] font-semibold text-xau">{loi}</span>}
    </span>
  );
}
