'use client';

import { useActionState } from 'react';
import { xacMinhDangKy } from '@/app/(cua-hang)/dang-nhap/viec';
import type { KetQuaXacThuc } from '@/app/(cua-hang)/dang-nhap/viec';
import { SO_CHU_SO } from '@/lib/ma-xac-minh-const';

/**
 * Ô gõ mã xác minh email.
 *
 * Không có trạng thái "xong" nào cả: gõ đúng là `xacMinhDangKy` mở phiên rồi
 * chuyển thẳng về trang chủ — người dùng đang đăng nhập luôn, khỏi phải gõ lại
 * mật khẩu vừa đặt cách đó một phút.
 */
export function OXacMinhDangKy({ email }: { email: string }) {
  const [ketQua, gui, dangChay] = useActionState<KetQuaXacThuc, FormData>(xacMinhDangKy, {});

  return (
    <form action={gui} className="mt-6 space-y-3">
      <input type="hidden" name="email" value={email} />

      <label className="block">
        <span className="phu mb-1 block">Mã trong thư</span>
        {/* `autoComplete="one-time-code"` để iOS và Android mời điền thẳng mã
            vừa nhận, khỏi phải chuyển qua ứng dụng thư rồi chép tay. */}
        <input name="ma" required autoFocus autoComplete="one-time-code"
          inputMode="numeric" maxLength={SO_CHU_SO + 2} spellCheck={false}
          placeholder="123 456"
          className="o-nhap text-center font-mono !text-[20px] tracking-[0.3em]" />
      </label>

      {ketQua.loi && (
        <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
          {ketQua.loi}
        </p>
      )}

      <button type="submit" disabled={dangChay} className="nut-cai-dam w-full">
        {dangChay ? 'Đang kiểm…' : 'Xác minh và vào cửa hàng'}
      </button>
    </form>
  );
}
