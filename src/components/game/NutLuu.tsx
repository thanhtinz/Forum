'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Bookmark } from 'lucide-react';
import { doiLuu } from '@/app/(cua-hang)/game/[duongDan]/viec-luu';

/**
 * Nút ĐÃ LƯU — trái tim/đánh dấu của trang game.
 *
 * App Store gọi là "Add to Wish List" và giấu trong bảng chia sẻ; ở đây nó là
 * một nút tròn đứng cạnh nút chia sẻ, vì hai lẽ: cửa hàng này không có bảng
 * chia sẻ của hệ điều hành trên máy bàn, và lưu lại là việc người ta làm
 * NHIỀU hơn hẳn chia sẻ — game Java tải về phải chép sang máy khác, nên nhiều
 * người mở trang ở điện thoại rồi tải ở máy bàn sau.
 *
 * ĐỔI MÀU NGAY KHI BẤM, chưa chờ máy chủ trả lời. Đường truyền ở đây chậm, mà
 * một cái nút bấm xong đứng im hai giây thì người dùng bấm lại lần nữa — tức
 * là bật rồi tắt. Máy chủ trả về trạng thái THẬT, nên nếu đoán sai thì nó tự
 * sửa lại ngay sau đó.
 *
 * Khách chưa đăng nhập vẫn thấy nút, bấm vào thì được đưa đi đăng nhập kèm
 * đường về: giấu nút đi thì họ không biết cửa hàng có thứ ấy.
 */
export function NutLuu({ gameId, duongDan, banDau, daDangNhap }: {
  gameId: string;
  duongDan: string;
  banDau: boolean;
  daDangNhap: boolean;
}) {
  const router = useRouter();
  const [bat, datBat] = useState(banDau);
  const [dangGui, batDau] = useTransition();

  const bam = () => {
    if (!daDangNhap) {
      router.push(`/dang-nhap?tiep=${encodeURIComponent(`/game/${duongDan}`)}`);
      return;
    }
    const doan = !bat;
    datBat(doan);
    batDau(async () => {
      const kq = await doiLuu(gameId);
      if (kq.loi) { datBat(!doan); return; }
      if (typeof kq.daLuu === 'boolean') datBat(kq.daLuu);
    });
  };

  return (
    <button type="button" onClick={bam} disabled={dangGui} className="nut-tron"
      aria-pressed={bat} aria-label={bat ? 'Bỏ lưu game này' : 'Lưu game này'}
      title={bat ? 'Đã lưu — bấm để bỏ' : 'Lưu lại để tải sau'}>
      <Bookmark size={18} aria-hidden
        className={bat ? 'fill-nhan text-nhan' : undefined} />
    </button>
  );
}
