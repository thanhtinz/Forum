'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { datLaiMatKhau, type KetQuaDatLai } from '@/app/(cua-hang)/dat-lai-mat-khau/viec';
import { MAT_KHAU_TOI_THIEU } from '@/lib/luat-tai-khoan-const';

/**
 * Biểu mẫu đặt lại mật khẩu bằng mã.
 *
 * Không mượn `BieuMauXacThuc`: khung ấy chỉ biết báo LỖI, mà ở đây thứ quan
 * trọng nhất lại là báo XONG — người vừa đổi xong mật khẩu đang không đăng
 * nhập, nên nếu màn hình không nói gì thì họ chẳng có cách nào biết việc đã
 * chạy hay chưa.
 *
 * Đổi xong thì THAY HẲN biểu mẫu bằng lời báo, không để nguyên ô nhập bên
 * dưới: mã đã chết rồi, mà một cái nút "Đặt lại" còn sáng ở đó chỉ mời người
 * ta bấm thêm lần nữa rồi nhận câu "mã không dùng được" — nghe như vừa hỏng
 * cái gì.
 */
export function ODatLaiMatKhau({ maSan }: { maSan?: string }) {
  const [ketQua, gui, dangChay] = useActionState<KetQuaDatLai, FormData>(datLaiMatKhau, {});

  if (ketQua.ok) {
    return (
      <div className="the mt-6 p-5 text-center">
        <p className="text-[15px] font-bold">Đã đổi mật khẩu</p>
        <p className="phu mt-1">
          Mọi thiết bị đang đăng nhập tài khoản này đều đã bị đăng xuất.
        </p>
        <Link href="/dang-nhap" className="nut-cai-dam mt-4">Đăng nhập</Link>
      </div>
    );
  }

  return (
    <form action={gui} className="mt-6 space-y-3">
      <label className="block">
        <span className="phu mb-1 block">Mã đặt lại</span>
        {/* `defaultValue` chứ không giữ trong trạng thái: mã dán từ địa chỉ vào
            thì không ai sửa nó, còn React 19 dọn biểu mẫu sau mỗi lượt gửi nên
            ô tự giữ lại vẫn phải dựng lại từ đây. */}
        <input name="ma" required defaultValue={maSan} autoComplete="off"
          spellCheck={false} placeholder="abcd-efgh-…" className="o-nhap font-mono" />
      </label>
      <label className="block">
        <span className="phu mb-1 block">Mật khẩu mới</span>
        <input name="matKhau" type="password" required minLength={MAT_KHAU_TOI_THIEU}
          autoComplete="new-password" className="o-nhap" />
      </label>
      <label className="block">
        <span className="phu mb-1 block">Nhắc lại mật khẩu mới</span>
        <input name="nhacLai" type="password" required minLength={MAT_KHAU_TOI_THIEU}
          autoComplete="new-password" className="o-nhap" />
      </label>

      {ketQua.loi && (
        <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
          {ketQua.loi}
        </p>
      )}

      <button type="submit" disabled={dangChay} className="nut-cai-dam w-full">
        {dangChay ? 'Đang đổi…' : 'Đặt lại mật khẩu'}
      </button>
    </form>
  );
}
