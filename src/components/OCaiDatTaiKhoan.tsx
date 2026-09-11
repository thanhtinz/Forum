'use client';

import { useActionState } from 'react';
import { Check } from 'lucide-react';
import { doiMatKhau, luuHoSo, type KetQua } from '@/app/(cua-hang)/toi/cai-dat/viec';

/** Ô báo kết quả dùng chung cho cả hai biểu mẫu. */
function Bao({ kq }: { kq: KetQua }) {
  if (kq.loi) {
    return (
      <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
        {kq.loi}
      </p>
    );
  }
  if (kq.ok) {
    return (
      <p role="status" className="flex items-center gap-1.5 text-[13px] font-semibold text-nhan">
        <Check size={15} aria-hidden /> {kq.ok}
      </p>
    );
  }
  return null;
}

export function OHoSo({ banDau }: { banDau: { tenHienThi: string; anh: string | null } }) {
  const [kq, gui, dangChay] = useActionState<KetQua, FormData>(luuHoSo, {});

  return (
    <form action={gui} className="the space-y-3 p-4">
      <h2 className="text-[15px] font-bold">Hồ sơ</h2>

      <label className="block">
        <span className="phu mb-1 block">Tên hiển thị</span>
        <input name="tenHienThi" defaultValue={banDau.tenHienThi} required maxLength={40}
          className="o-nhap" />
        <span className="phu mt-1 block">Tên này hiện cạnh mỗi bài viết và đánh giá của bạn.</span>
      </label>

      <label className="block">
        <span className="phu mb-1 block">Địa chỉ ảnh đại diện (không bắt buộc)</span>
        <input name="anh" defaultValue={banDau.anh ?? ''} placeholder="https://…" className="o-nhap" />
        <span className="phu mt-1 block">Bỏ trống thì dùng ô màu kèm chữ cái đầu tên bạn.</span>
      </label>

      <Bao kq={kq} />

      <button type="submit" disabled={dangChay} className="nut-xam">
        {dangChay ? 'Đang lưu…' : 'Lưu hồ sơ'}
      </button>
    </form>
  );
}

export function OMatKhau() {
  const [kq, gui, dangChay] = useActionState<KetQua, FormData>(doiMatKhau, {});

  return (
    <form action={gui} className="the space-y-3 p-4">
      <h2 className="text-[15px] font-bold">Đổi mật khẩu</h2>

      <label className="block">
        <span className="phu mb-1 block">Mật khẩu hiện tại</span>
        {/* `autoComplete` đúng tên giúp trình quản lý mật khẩu điền và LƯU LẠI
            đúng chỗ; đặt sai thì nó lưu mật khẩu mới đè lên ô cũ. */}
        <input name="matKhauCu" type="password" required autoComplete="current-password"
          className="o-nhap" />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="phu mb-1 block">Mật khẩu mới</span>
          <input name="matKhauMoi" type="password" required minLength={8}
            autoComplete="new-password" className="o-nhap" />
        </label>
        <label className="block">
          <span className="phu mb-1 block">Gõ lại mật khẩu mới</span>
          <input name="matKhauLai" type="password" required minLength={8}
            autoComplete="new-password" className="o-nhap" />
        </label>
      </div>

      <p className="phu">
        Đổi xong, mọi thiết bị khác đang đăng nhập sẽ bị đăng xuất. Thiết bị này thì không.
      </p>

      <Bao kq={kq} />

      <button type="submit" disabled={dangChay} className="nut-xam">
        {dangChay ? 'Đang đổi…' : 'Đổi mật khẩu'}
      </button>
    </form>
  );
}
