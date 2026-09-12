'use client';

import { Lock, LockOpen, Shield, ShieldOff, UserPlus } from 'lucide-react';
import { NutViec } from './NutViec';
import { doiVaiTro, khoaThanhVien } from '@/app/(quan-tri)/quan-tri/viec';

/**
 * Hai nút của một hàng thành viên: khoá / mở khoá, và phong / hạ quyền.
 *
 * Là thành phần khách vì `NutViec` cần một hàm để gọi, mà hàm ấy phải đóng gói
 * sẵn id — không truyền hàm từ thành phần máy chủ xuống được.
 *
 * Nút KHÔNG vẽ ra cho chính mình và cho quản trị viên khác (với nút khoá), y
 * như luật ở máy chủ. Nhưng đó chỉ là để đỡ mời người ta bấm vào chỗ chắc chắn
 * bị từ chối — luật thật nằm trong `khoaThanhVien` và `doiVaiTro`, vì một hàm
 * `'use server'` thì ai cũng gọi được, không cần nhìn thấy nút.
 */
export function NutThanhVien({ id, ten, vaiTro, dangKhoa, laToi }: {
  id: string;
  ten: string;
  vaiTro: string;
  dangKhoa: boolean;
  laToi: boolean;
}) {
  const laQuanTri = vaiTro === 'QUAN_TRI';
  const laTacGia = vaiTro === 'TAC_GIA';
  if (laToi) return <span className="phu">chính bạn</span>;

  return (
    <span className="flex items-center justify-end gap-1">
      {!laQuanTri && (
        dangKhoa ? (
          <NutViec nho={`Mở khoá ${ten}`} nhan={<><LockOpen size={13} aria-hidden /> Mở khoá</>}
            lam={() => khoaThanhVien(id, false)} />
        ) : (
          <NutViec kieu="nguyHiem" nho={`Khoá ${ten}`} nhan={<><Lock size={13} aria-hidden /> Khoá</>}
            xacNhan={`Khoá tài khoản ${ten}? Họ sẽ không đăng nhập được nữa, và mọi phiên đang mở bị đóng.`}
            lam={() => khoaThanhVien(id, true)} />
        )
      )}

      {laQuanTri ? (
        <NutViec kieu="nguyHiem" nho={`Hạ quyền ${ten}`} nhan={<><ShieldOff size={13} aria-hidden /> Hạ quyền</>}
          xacNhan={`Hạ quyền quản trị của ${ten}?`}
          lam={() => doiVaiTro(id, false)} />
      ) : (
        <>
          {/*
            PHONG TÁC GIẢ, tách hẳn khỏi phong quản trị.

            Lối thường để thành tác giả là gửi đơn ở trang "Đăng game của bạn"
            rồi ban quản trị xét — nút này là lối tắt cho người đã quen mặt,
            hoặc cho lúc cần phong lại sau khi hạ quyền. Không có nó thì quyền
            tác giả chỉ cấp được qua đơn, mà đơn thì phải người ta tự gửi.
          */}
          {!laTacGia && (
            <NutViec nho={`Phong tác giả cho ${ten}`} nhan={<><UserPlus size={13} aria-hidden /> Phong tác giả</>}
              xacNhan={`Cho ${ten} quyền tác giả? Họ sẽ tự thêm game và gửi duyệt được.`}
              lam={() => doiVaiTro(id, true, 'TAC_GIA')} />
          )}
          {laTacGia && (
            <NutViec kieu="nguyHiem" nho={`Hạ quyền tác giả của ${ten}`}
              nhan={<><ShieldOff size={13} aria-hidden /> Hạ quyền tác giả</>}
              xacNhan={`Hạ quyền tác giả của ${ten}? Game họ đã đăng vẫn còn, nhưng họ không thêm được game mới.`}
              lam={() => doiVaiTro(id, false)} />
          )}
          <NutViec nho={`Phong quản trị cho ${ten}`} nhan={<><Shield size={13} aria-hidden /> Phong quản trị</>}
            xacNhan={`Phong ${ten} làm quản trị? Họ sẽ sửa và xoá được mọi thứ trong cửa hàng.`}
            lam={() => doiVaiTro(id, true)} />
        </>
      )}
    </span>
  );
}
