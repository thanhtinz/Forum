import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyRound, MessageSquare, ShieldCheck } from 'lucide-react';
import { HAN_MA_PHUT } from '@/lib/ma-xac-minh-const';
import { DauHieu } from '@/components/vo/DauHieu';
import { OXinMaDatLai } from '@/components/OXinMaDatLai';
import { thuBat } from '@/lib/gui-thu';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Quên mật khẩu',
  description: 'Cách lấy lại tài khoản SunnyStore khi quên mật khẩu.',
};

/*
 * QUÊN MẬT KHẨU — hai dáng, tuỳ cửa hàng có gửi được thư hay không.
 *
 * KHAI ĐỦ CẤU HÌNH THƯ: một ô nhập email, bấm là mã bay đi. Lối thường gặp.
 *
 * CHƯA KHAI: bày đúng ba bước xin mã tay từ ban quản trị, và nói thẳng là
 * chưa gửi được thư. Đây mới là chỗ đáng nói: phần lớn trang web gặp cảnh này
 * vẫn bày cái ô nhập ra cho giống người ta, rồi người dùng bấm xong ngồi đợi
 * một lá thư không bao giờ tới. Thà nói mình đang thiếu gì.
 *
 * Xét ở MÁY CHỦ mỗi lượt mở trang chứ không dựng sẵn: cắm cấu hình thư vào là
 * trang đổi ngay, không phải dựng lại bản chạy.
 */
export default async function TrangQuenMatKhau() {
  const guiDuocThu = await thuBat();

  const buoc = [
    {
      icon: MessageSquare,
      ten: 'Nhắn cho ban quản trị',
      y: 'Nói rõ tên đăng nhập hoặc email của tài khoản, và một hai chi tiết chứng tỏ đó là tài khoản của bạn.',
    },
    {
      icon: ShieldCheck,
      ten: 'Ban quản trị phát mã',
      y: `Mã sáu số, dùng được một lần và tự hết hạn sau ${HAN_MA_PHUT} phút. Xin mã mới thì mã cũ chết ngay.`,
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
        {guiDuocThu
          ? 'Nhập email đã đăng ký, SunnyStore gửi cho bạn một đường dẫn đặt lại.'
          : 'SunnyStore đang chưa gửi được thư tự động, nên việc này làm qua người thật.'}
      </p>

      {guiDuocThu && <OXinMaDatLai />}

      {!guiDuocThu && (
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
      )}

      {!guiDuocThu && (
        <Link href="/dat-lai-mat-khau" className="nut-cai-dam mt-5 w-full">
          Tôi đã có mã
        </Link>
      )}
      <p className="phu mt-4 text-center">
        Nhớ ra mật khẩu rồi? <Link href="/dang-nhap" className="font-semibold text-nhan hover:underline">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
