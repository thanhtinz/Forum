'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Bookmark } from 'lucide-react';
import { batTatLuu } from '@/app/da-luu/viec';
import { gop } from '@/lib/tien-ich';

/**
 * Nút lưu game để dành.
 *
 * Đổi hình NGAY khi bấm rồi mới gửi lên máy chủ, và trả về hình cũ nếu máy
 * chủ từ chối. Chờ mạng xong mới đổi thì trên mạng chậm người ta bấm hai ba
 * lần vì tưởng hụt — mà mỗi lần bấm là một lần bật/tắt, nên bấm ba lần lại
 * thành chưa lưu.
 *
 * Khách chưa đăng nhập vẫn thấy nút, bấm vào thì được mời đăng nhập. Giấu nút
 * đi thì họ không biết trang có chức năng ấy để mà muốn.
 */
export function NutLuu({ gameId, daLuuLucDau, daDangNhap }: {
  gameId: string;
  daLuuLucDau: boolean;
  daDangNhap: boolean;
}) {
  const router = useRouter();
  const [daLuu, datDaLuu] = useState(daLuuLucDau);
  const [dangGui, batDau] = useTransition();

  const bam = () => {
    if (!daDangNhap) { router.push('/dang-nhap'); return; }

    const truoc = daLuu;
    datDaLuu(!truoc);
    batDau(async () => {
      const r = await batTatLuu(gameId);
      if (r.loi) { datDaLuu(truoc); return; }
      datDaLuu(!!r.daLuu);
    });
  };

  return (
    <button type="button" onClick={bam} disabled={dangGui}
      aria-pressed={daLuu}
      className={gop('nut-vien w-full', daLuu && '!border-nhan !text-nhan')}>
      <Bookmark size={16} className={daLuu ? 'fill-current' : ''} aria-hidden />
      {daLuu ? 'Đã lưu' : 'Lưu để dành'}
    </button>
  );
}
