import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyRound, MessageSquare, ShieldCheck } from 'lucide-react';
import { HAN_MA_GIO } from '@/lib/dat-lai-const';
import { DauHieu } from '@/components/vo/DauHieu';

export const metadata: Metadata = {
  title: 'Quên mật khẩu',
  description: 'Cách lấy lại tài khoản SunnyStore khi quên mật khẩu.',
};

/*
 * QUÊN MẬT KHẨU — trang chỉ đường, không phải biểu mẫu.
 *
 * Và đây là chỗ phải nói thật thay vì bày ra một cái ô cho giống người ta:
 * cửa hàng chưa gửi được email, lại cũng chưa xác minh email lúc đăng ký, nên
 * một ô "nhập email, chúng tôi gửi mã cho bạn" vừa không chạy được vừa không
 * đáng tin — ai biết email ấy là chiếm được tài khoản.
 *
 * Nên lối thật là: xin ban quản trị, họ hỏi vài câu rồi phát mã. Trang này kể
 * đúng ba bước ấy. Ngày cắm được máy gửi thư vào thì thay bước đầu bằng một ô
 * nhập email, còn hai bước sau giữ nguyên.
 */
export default function TrangQuenMatKhau() {
  const buoc = [
    {
      icon: MessageSquare,
      ten: 'Nhắn cho ban quản trị',
      y: 'Nói rõ tên đăng nhập hoặc email của tài khoản, và một hai chi tiết chứng tỏ đó là tài khoản của bạn.',
    },
    {
      icon: ShieldCheck,
      ten: 'Ban quản trị phát mã',
      y: `Mã dùng được một lần duy nhất và tự hết hạn sau ${HAN_MA_GIO} giờ. Xin mã mới thì mã cũ chết ngay.`,
    },
    {
      icon: KeyRound,
      ten: 'Bạn tự đặt mật khẩu mới',
      y: 'Nhập mã vào trang đặt lại rồi chọn mật khẩu. Ban quản trị không biết mật khẩu bạn chọn.',
    },
  ];

  return (
    <div className="mx-auto max-w-md py-6">
      <Link href="/" className="mx-auto mb-5 block w-fit" aria-label="SunnyStore — về trang đầu">
        <DauHieu co={44} />
      </Link>
      <h1 className="text-center text-[22px] font-bold tracking-tight">Quên mật khẩu</h1>
      <p className="phu mt-1 text-center">
        SunnyStore chưa gửi được thư tự động, nên việc này làm qua người thật.
      </p>

      <ol className="mt-6 space-y-3">
        {buoc.map((b, i) => (
          <li key={b.ten} className="the flex gap-3 p-4">
            <span aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-nhan/12 text-nhan">
              <b.icon size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold">
                <span className="text-mo">Bước {i + 1}. </span>{b.ten}
              </span>
              <span className="phu mt-0.5 block leading-relaxed">{b.y}</span>
            </span>
          </li>
        ))}
      </ol>

      <Link href="/dat-lai-mat-khau" className="nut-cai-dam mt-5 w-full">
        Tôi đã có mã
      </Link>
      <p className="phu mt-4 text-center">
        Nhớ ra mật khẩu rồi? <Link href="/dang-nhap" className="font-semibold text-nhan hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
