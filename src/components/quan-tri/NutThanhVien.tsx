'use client';

import { Lock, LockOpen, Shield, ShieldOff } from 'lucide-react';
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
export function NutThanhVien({ id, ten, laQuanTri, dangKhoa, laToi }: {
  id: string;
  ten: string;
  laQuanTri: boolean;
  dangKhoa: boolean;
  laToi: boolean;
}) {
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
        <NutViec nho={`Phong quản trị cho ${ten}`} nhan={<><Shield size={13} aria-hidden /> Phong quản trị</>}
          xacNhan={`Phong ${ten} làm quản trị? Họ sẽ sửa và xoá được mọi thứ trong kho.`}
          lam={() => doiVaiTro(id, true)} />
      )}
    </span>
  );
}
