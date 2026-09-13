'use client';

import { useActionState } from 'react';
import { Check } from 'lucide-react';
import {
  doiMatKhau, luuHoSo, xoaTaiKhoan, type KetQua,
} from '@/app/(cua-hang)/toi/cai-dat/viec';
import { CAU_XAC_NHAN } from '@/lib/xoa-tai-khoan-const';
import { ONhapGiu } from '@/components/ONhapGiu';

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

export function OHoSo({ banDau, guiDuocThu }: {
  banDau: { tenHienThi: string; anh: string | null; thuThongBao: boolean };
  /** Cửa hàng có gửi được thư không — tắt thì đừng bày công tắc vô nghĩa. */
  guiDuocThu: boolean;
}) {
  const [kq, gui, dangChay] = useActionState<KetQua, FormData>(luuHoSo, {});

  return (
    <form action={gui} className="the space-y-3 p-4">
      <h2 className="text-[15px] font-bold">Hồ sơ</h2>

      <label className="block">
        <span className="phu mb-1 block">Tên hiển thị</span>
        <ONhapGiu name="tenHienThi" banDau={banDau.tenHienThi} required maxLength={40}
          className="o-nhap" />
        <span className="phu mt-1 block">Tên này hiện cạnh mỗi bài viết và đánh giá của bạn.</span>
      </label>

      <label className="block">
        <span className="phu mb-1 block">Địa chỉ ảnh đại diện (không bắt buộc)</span>
        <ONhapGiu name="anh" banDau={banDau.anh ?? ''} placeholder="https://…" className="o-nhap" />
        <span className="phu mt-1 block">Bỏ trống thì dùng ô màu kèm chữ cái đầu tên bạn.</span>
      </label>

      {/*
        Chỉ bày công tắc khi cửa hàng gửi được thư. Bày một cái công tắc bật
        lên chẳng dẫn tới lá thư nào là nói dối người dùng bằng giao diện.
      */}
      {guiDuocThu && (
        <label className="vach flex items-start gap-3 border-t pt-3">
          <input type="checkbox" name="thuThongBao" defaultChecked={banDau.thuThongBao}
            className="cong-tac mt-0.5 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold">Báo qua email</span>
            <span className="phu mt-0.5 block leading-relaxed">
              Gửi thư mỗi khi có thông báo mới — ai đó trả lời bài của bạn,
              game bạn gửi duyệt đã xong, game bạn đã lưu có bản mới.
            </span>
          </span>
        </label>
      )}

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

/**
 * Vùng nguy hiểm: tự xoá tài khoản.
 *
 * GẤP LẠI SẴN. Đây là việc duy nhất trên trang này không lùi lại được, mà nó
 * lại nằm ngay dưới hai biểu mẫu người ta vào ra hằng ngày — bày sẵn một cái
 * nút đỏ ở đó thì sớm muộn cũng có người bấm nhầm trong lúc định bấm "Lưu hồ
 * sơ". Phải tự tay mở ra, rồi gõ mật khẩu, rồi gõ đúng một câu dài.
 */
export function OXoaTaiKhoan() {
  const [kq, gui, dangChay] = useActionState<KetQua, FormData>(xoaTaiKhoan, {});

  return (
    <details className="the p-4" data-viec="vung-nguy-hiem">
      <summary className="cursor-pointer text-[15px] font-bold text-xau">
        Xoá tài khoản
      </summary>

      <div className="mt-3 space-y-3">
        <p className="phu leading-relaxed">
          Email, mật khẩu, ảnh đại diện, danh sách đã lưu và hộp thông báo của bạn
          sẽ đi hẳn, và bạn bị đăng xuất khỏi mọi thiết bị. Việc này KHÔNG lùi lại
          được.
        </p>
        <p className="phu leading-relaxed">
          Đánh giá, chủ đề và lời đáp cũ thì ở lại nhưng không còn mang tên bạn —
          gỡ chúng đi là khoét thủng những cuộc trò chuyện có người khác tham gia.
        </p>

        <form action={gui} className="space-y-3">
          <label className="block">
            <span className="phu mb-1 block">Mật khẩu hiện tại</span>
            <input name="matKhau" type="password" required autoComplete="current-password"
              className="o-nhap" />
          </label>

          <label className="block">
            <span className="phu mb-1 block">
              Gõ đúng câu <b className="text-chu">{CAU_XAC_NHAN}</b> để xác nhận
            </span>
            <ONhapGiu name="xacNhan" required autoComplete="off" className="o-nhap" />
          </label>

          <Bao kq={kq} />

          <button type="submit" disabled={dangChay} className="nut-xau">
            {dangChay ? 'Đang xoá…' : 'Xoá tài khoản của tôi'}
          </button>
        </form>
      </div>
    </details>
  );
}
