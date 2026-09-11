'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { DauHieu } from '@/components/vo/DauHieu';
import type { KetQuaXacThuc } from '@/app/(cua-hang)/dang-nhap/viec';

/**
 * Khung biểu mẫu dùng chung cho đăng nhập và đăng ký.
 *
 * `useActionState` thay vì tự giữ trạng thái: biểu mẫu vẫn gửi được khi trình
 * duyệt chưa chạy xong JavaScript, và câu báo lỗi từ máy chủ về đúng chỗ mà
 * không cần một vòng `fetch` tự viết.
 */
export function BieuMauXacThuc({ viec, tieuDe, phu, nut, children, duoi }: {
  viec: (truoc: KetQuaXacThuc, form: FormData) => Promise<KetQuaXacThuc>;
  tieuDe: string;
  phu: string;
  nut: string;
  children: React.ReactNode;
  duoi: React.ReactNode;
}) {
  const [ketQua, gui, dangChay] = useActionState<KetQuaXacThuc, FormData>(viec, {});

  return (
    <div className="mx-auto max-w-sm py-6">
      <Link href="/" className="mx-auto mb-5 block w-fit" aria-label="SunnyStore — về trang đầu">
        <DauHieu co={44} />
      </Link>
      <h1 className="text-center text-[22px] font-bold tracking-tight">{tieuDe}</h1>
      <p className="phu mt-1 text-center">{phu}</p>

      <form action={gui} className="mt-6 space-y-3">
        {children}

        {ketQua.loi && (
          <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
            {ketQua.loi}
          </p>
        )}

        <button type="submit" disabled={dangChay} className="nut-cai-dam w-full">
          {dangChay ? 'Đang xử lý…' : nut}
        </button>
      </form>

      <div className="phu mt-5 text-center">{duoi}</div>
    </div>
  );
}
