import Link from 'next/link';
import type { Metadata } from 'next';
import { CircleCheck } from 'lucide-react';
import { TEN_DA_XOA } from '@/lib/xoa-tai-khoan-const';

export const metadata: Metadata = {
  title: 'Đã xoá tài khoản',
  // Trang này chỉ có nghĩa với đúng một người, đúng một lần.
  robots: { index: false, follow: false },
};

/*
 * CHỖ ĐÁP XUỐNG SAU KHI XOÁ TÀI KHOẢN.
 *
 * Xoá xong mà ném thẳng về trang đầu thì người ta không biết việc đã xong hay
 * vừa hỏng — họ vừa bấm một nút không lùi lại được, và thứ duy nhất thấy là
 * mình bỗng thành khách. Một trang nói rõ "xong rồi, và đây là những gì còn
 * lại" rẻ hơn nhiều so với một lá thư hỏi "tài khoản tôi mất đâu rồi".
 */
export default function TamBiet() {
  return (
    <div className="mx-auto max-w-lg space-y-5 py-10 text-center">
      <CircleCheck size={44} className="mx-auto text-nhan" aria-hidden />

      <div>
        <h1 className="tieu-de-trang">Đã xoá tài khoản</h1>
        <p className="phu mt-2 leading-relaxed">
          Email, mật khẩu, ảnh đại diện, danh sách đã lưu và hộp thông báo của bạn
          đã đi khỏi cửa hàng. Bạn cũng đã được đăng xuất khỏi mọi thiết bị.
        </p>
      </div>

      <div className="the p-4 text-left">
        <h2 className="text-[15px] font-bold">Những gì còn ở lại</h2>
        <p className="phu mt-2 leading-relaxed">
          Đánh giá, chủ đề và lời đáp cũ của bạn vẫn nằm nguyên chỗ, nhưng đứng
          tên “{TEN_DA_XOA}” — gỡ chúng đi thì những cuộc trò chuyện có người
          khác tham gia sẽ thủng lỗ chỗ. Muốn gỡ hẳn một bài nào đó thì nhắn cho
          ban quản trị.
        </p>
      </div>

      <Link href="/" className="nut-xam inline-flex">Về cửa hàng</Link>
    </div>
  );
}
