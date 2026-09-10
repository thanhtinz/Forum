'use client';

import { useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { chamSao } from '@/app/game/[duongDan]/viec';
import { gop } from '@/lib/tien-ich';

/**
 * Ô chấm sao và viết đánh giá.
 *
 * Năm ngôi sao BẤM ĐƯỢC, và mỗi ngôi là một <button> riêng có nhãn đọc được —
 * không phải một dãy <span> nghe sự kiện chuột. Bộ đọc màn hình phải gọi được
 * tên "3 sao" rồi bấm, mà một cái span thì nó không nhìn thấy.
 *
 * Ô chữ chỉ hiện SAU khi đã chọn sao: bắt viết trước rồi mới chấm thì phần lớn
 * người ta bỏ dở, còn chấm sao thì chỉ tốn một cái bấm.
 */
export function ODanhGia({ gameId, banDau, daDangNhap }: {
  gameId: string;
  banDau: { sao: number; noiDung: string | null } | null;
  daDangNhap: boolean;
}) {
  const [sao, datSao] = useState(banDau?.sao ?? 0);
  const [chu, datChu] = useState(banDau?.noiDung ?? '');
  const [loi, datLoi] = useState<string | null>(null);
  const [xong, datXong] = useState(false);
  const [dangGui, batDau] = useTransition();

  if (!daDangNhap) {
    return (
      <div className="the p-4 text-center">
        <p className="text-[13px] font-semibold">Bạn đã chơi game này?</p>
        <p className="phu mt-0.5">Đăng nhập để chấm sao và để lại vài dòng.</p>
        <Link href="/dang-nhap" className="nut-xam mt-3">Đăng nhập</Link>
      </div>
    );
  }

  const gui = () => {
    datLoi(null);
    batDau(async () => {
      const r = await chamSao(gameId, sao, chu);
      if (r.loi) { datLoi(r.loi); return; }
      datXong(true);
    });
  };

  return (
    <div className="the p-4">
      <p className="text-[13px] font-semibold">{banDau ? 'Đánh giá của bạn' : 'Chấm sao cho game này'}</p>

      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => { datSao(n); datXong(false); }}
            aria-label={`${n} sao`} aria-pressed={sao === n}
            className="p-0.5 transition-transform hover:scale-110">
            <Star size={28} className={gop(n <= sao ? 'fill-canh text-canh' : 'fill-nen3 text-vien')} />
          </button>
        ))}
      </div>

      {sao > 0 && (
        <>
          <textarea value={chu} onChange={(e) => { datChu(e.target.value); datXong(false); }}
            rows={3} maxLength={2000} placeholder="Máy bạn chạy có mượt không? Có lỗi gì không? (không bắt buộc)"
            className="o-nhap mt-3" />
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={gui} disabled={dangGui} className="nut-cai-dam !min-h-[38px] !px-5 !text-[13px]">
              {dangGui ? 'Đang gửi…' : banDau ? 'Cập nhật' : 'Gửi đánh giá'}
            </button>
            {xong && <span className="text-[13px] font-semibold text-nhan">Đã lưu. Cảm ơn bạn!</span>}
            {loi && <span className="text-[13px] font-semibold text-xau">{loi}</span>}
          </div>
        </>
      )}
    </div>
  );
}
