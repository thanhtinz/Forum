import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle2, Send, ShieldCheck, Upload } from 'lucide-react';
import { nguoiHienTai } from '@/lib/xac-thuc';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Đăng game lên SunnyStore' };

/*
 * TRANG MỜI LÀM TÁC GIẢ.
 *
 * Cố ý KHÔNG cho tự bấm một cái là thành tác giả. Ai cũng tự phong được thì
 * hàng chờ duyệt ngập bài rác trong một tuần, và ban quản trị mất đúng thứ họ
 * cần nhất: thời gian để xem tử tế mấy game thật.
 *
 * Nên ở đây chỉ nói rõ đường đi và mời liên hệ. Việc phong quyền làm ở trang
 * Thành viên của khu quản trị — chỗ ấy đã có sẵn nút, và có luật canh.
 */
export default async function MoiLamTacGia() {
  const nguoi = await nguoiHienTai();
  // Đã là tác giả rồi thì vào thẳng bảng của mình, đừng bắt đọc lại lời mời.
  if (nguoi?.vaiTro === 'TAC_GIA' || nguoi?.vaiTro === 'QUAN_TRI') redirect('/quan-ly');

  return (
    <div className="mx-auto max-w-[640px] space-y-6">
      <header>
        <h1 className="tieu-de-trang">Đăng game của bạn lên SunnyStore</h1>
        <p className="phu mt-1.5 text-[14px]">
          Tác giả có bảng điều khiển riêng: tự thêm game, gắn bản tải cho từng hệ máy,
          tải ảnh lên, và xem số lượt tải của mình.
        </p>
      </header>

      <ol className="the-noi danh-sach-the">
        <Buoc so={1} hinh={<ShieldCheck size={18} />} ten="Được cấp quyền tác giả"
          mo="Nhắn cho ban quản trị kèm vài dòng về game bạn định đăng." />
        <Buoc so={2} hinh={<Upload size={18} />} ten="Soạn game trong bảng tác giả"
          mo="Tên, mô tả, ảnh chụp, và ít nhất một bản tải. Game nằm ở nháp, chưa ai thấy." />
        <Buoc so={3} hinh={<Send size={18} />} ten="Gửi duyệt"
          mo="Ban quản trị xem rồi duyệt, hoặc trả lại kèm lý do để bạn sửa." />
        <Buoc so={4} hinh={<CheckCircle2 size={18} />} ten="Game lên kệ"
          mo="Game có trang riêng, khu diễn đàn riêng, và hiện ở trang tác giả của bạn." />
      </ol>

      <div className="the p-4">
        <p className="text-[14px] font-semibold">Chưa có quyền tác giả?</p>
        <p className="phu mt-1">
          {nguoi
            ? 'Nhắn cho ban quản trị để được cấp. Tài khoản của bạn đã sẵn sàng.'
            : 'Đăng nhập trước đã, rồi nhắn cho ban quản trị.'}
        </p>
        {!nguoi && <Link href="/dang-nhap" className="nut-cai-dam mt-3">Đăng nhập</Link>}
      </div>
    </div>
  );
}

function Buoc({ so, hinh, ten, mo }: {
  so: number; hinh: React.ReactNode; ten: string; mo: string;
}) {
  return (
    <li className="flex items-start gap-3 p-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-nhan/12 text-nhan">
        {hinh}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">
          <span className="phu mr-1.5 tabular-nums">{so}.</span>{ten}
        </span>
        <span className="phu mt-0.5 block">{mo}</span>
      </span>
    </li>
  );
}
