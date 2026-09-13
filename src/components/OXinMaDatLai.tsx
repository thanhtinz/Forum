'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { xinMaDatLai, type KetQuaXinMa } from '@/app/(cua-hang)/quen-mat-khau/viec';
import { CAU_DA_GUI } from '@/lib/dat-lai-const';

/**
 * Ô xin mã đặt lại qua thư.
 *
 * Gửi xong thì THAY HẲN biểu mẫu bằng lời báo, không để cái nút còn sáng ở
 * dưới: người vừa bấm mà vẫn thấy nút "Gửi mã" thường bấm thêm lần nữa, và mỗi
 * lần bấm là một lá thư nữa cùng một bước tới gần cửa chặn.
 */
export function OXinMaDatLai() {
  const [ketQua, gui, dangChay] = useActionState<KetQuaXinMa, FormData>(xinMaDatLai, {});

  if (ketQua.daGui) {
    return (
      <div className="the mt-6 p-5 text-center">
        <MailCheck size={22} className="mx-auto text-nhan" aria-hidden />
        <p className="mt-2 text-[15px] font-bold">Đã gửi</p>
        <p className="phu mt-1 leading-relaxed">{CAU_DA_GUI}</p>
        <Link href="/dat-lai-mat-khau" className="nut-xam mt-4">Tôi đã có mã</Link>
      </div>
    );
  }

  return (
    <form action={gui} className="mt-6 space-y-3">
      <label className="block">
        <span className="phu mb-1 block">Email đã đăng ký</span>
        <input name="email" type="email" required autoComplete="email"
          placeholder="ban@example.com" className="o-nhap" />
      </label>

      {ketQua.loi && (
        <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
          {ketQua.loi}
        </p>
      )}

      <button type="submit" disabled={dangChay} className="nut-cai-dam w-full">
        {dangChay ? 'Đang gửi…' : 'Gửi mã vào email'}
      </button>
    </form>
  );
}
