import Link from 'next/link';
import type { Metadata } from 'next';
import { Flag, Inbox, Mail, MessageSquare } from 'lucide-react';
import { docTrang } from '@/lib/cai-dat';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Liên hệ' };

/*
 * LIÊN HỆ.
 *
 * Bày ĐÚNG mấy lối đi có thật trong cửa hàng, và xếp theo thứ tự nào đến đúng
 * người nhanh nhất — chứ không dồn mọi chuyện vào một địa chỉ thư rồi để người
 * ta chờ.
 *
 * Địa chỉ thư đọc từ cài đặt, KHÔNG chép cứng. Chưa ai đặt thì nói thẳng là
 * chưa có, chứ không bày một liên kết `mailto:` trỏ vào chỗ trống — bấm vào
 * mở ra một lá thư không người nhận thì tệ hơn hẳn là không có nút nào.
 */

function Loi({ hinh, de, children }: {
  hinh: React.ReactNode;
  de: string;
  children: React.ReactNode;
}) {
  return (
    <li className="the flex gap-3.5 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-nen3 text-nhan">
        {hinh}
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-[15px] font-bold">{de}</p>
        <div className="text-[14px] leading-relaxed text-mo">{children}</div>
      </div>
    </li>
  );
}

export default async function LienHe() {
  const trang = await docTrang();

  return (
    <div className="cot space-y-7">
      <header>
        <h1 className="tieu-de-trang">Liên hệ</h1>
        <p className="phu mt-1">Tuỳ chuyện gì mà đi lối nào — mỗi lối tới một chỗ khác nhau.</p>
      </header>

      <ul className="space-y-3">
        <Loi hinh={<Flag size={17} aria-hidden />} de="Báo một bài viết hay một bài đánh giá">
          Mỗi bài đều có nút báo xấu ngay dưới nó. Đó là lối nhanh nhất: bài bị báo
          vào thẳng hàng chờ của ban quản trị, kèm sẵn đường dẫn tới đúng chỗ.
        </Loi>

        <Loi hinh={<MessageSquare size={17} aria-hidden />} de="Hỏi về một game">
          Hỏi ngay trong diễn đàn của chính game ấy. Ở đó có cả người đang chơi lẫn
          người làm ra game — nhanh hơn hỏi ban quản trị, vốn không chơi hết mọi game.
        </Loi>

        <Loi hinh={<Inbox size={17} aria-hidden />} de="Xin thêm một game">
          <Link href="/yeu-cau" className="font-semibold text-nhan hover:underline">
            Gửi yêu cầu game
          </Link>{' '}
          — nêu tên game và hệ máy. Yêu cầu nằm công khai nên người khác thấy trùng
          thì khỏi gửi lại.
        </Loi>

        <Loi hinh={<Mail size={17} aria-hidden />} de="Mọi chuyện khác">
          {trang.emailLienHe ? (
            <>
              Khiếu nại bản quyền, hay chuyện không tiện nói công khai, thì gửi thư
              tới{' '}
              <a href={`mailto:${trang.emailLienHe}`}
                className="font-semibold text-nhan hover:underline">
                {trang.emailLienHe}
              </a>
              .
            </>
          ) : (
            /* Chưa đặt thì nói thẳng, và chỉ sang lối còn dùng được. Giấu đi rồi
               để người ta đi tìm là đẩy việc sang cho họ. */
            <>
              Ban quản trị chưa đặt địa chỉ thư liên hệ. Trong lúc chờ, mấy lối ở
              trên vẫn tới được người trực — kể cả khiếu nại bản quyền, cứ báo xấu
              thẳng vào bài hoặc game có vấn đề.
            </>
          )}
        </Loi>
      </ul>

      <p className="phu">
        Luật chơi đầy đủ nằm ở trang{' '}
        <Link href="/dieu-khoan" className="font-semibold text-nhan hover:underline">
          Điều khoản
        </Link>
        . Còn {trang.ten} là gì thì{' '}
        <Link href="/gioi-thieu" className="font-semibold text-nhan hover:underline">
          xem ở đây
        </Link>
        .
      </p>
    </div>
  );
}
