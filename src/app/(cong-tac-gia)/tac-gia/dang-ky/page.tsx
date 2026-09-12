import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCircle2, Send, ShieldCheck, Upload } from 'lucide-react';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { db } from '@/lib/db';
import { ODon } from '@/components/tac-gia/ODon';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Đăng game lên SunnyStore' };

/*
 * TRANG MỜI LÀM TÁC GIẢ.
 *
 * Cố ý KHÔNG cho tự bấm một cái là thành tác giả. Ai cũng tự phong được thì
 * hàng chờ duyệt ngập bài rác trong một tuần, và ban quản trị mất đúng thứ họ
 * cần nhất: thời gian để xem tử tế mấy game thật.
 *
 * Nhưng bản trước đi quá xa về phía kia: nó chỉ nói "nhắn cho ban quản trị",
 * tức là lối đi duy nhất nằm NGOÀI cửa hàng — người muốn đăng game phải tự
 * tìm cách liên lạc, mà ban quản trị cũng chẳng có chỗ nào để xem ai đã nhắn.
 * Một trang mời làm việc gì đó mà không có chỗ bấm thì là một trang cụt.
 *
 * Nay có ĐƠN: gửi ngay tại đây, ban quản trị xét ở khu riêng, đồng ý hay trả
 * lại đều báo về cho người gửi. Vẫn không ai tự phong được cho mình.
 */
export default async function MoiLamTacGia() {
  const nguoi = await nguoiHienTai();
  // Đã là tác giả rồi thì vào thẳng bảng của mình, đừng bắt đọc lại lời mời.
  if (nguoi?.vaiTro === 'TAC_GIA' || nguoi?.vaiTro === 'QUAN_TRI') redirect('/quan-ly');

  const don = nguoi
    ? await db.donTacGia.findUnique({
        where: { nguoiId: nguoi.id },
        select: { trangThai: true, tenTacGia: true, gioiThieu: true, lyDo: true, loiNhan: true },
      })
    : null;

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
        <Buoc so={1} hinh={<ShieldCheck size={18} />} ten="Gửi đơn xin làm tác giả"
          mo="Ngay dưới trang này. Kể vài dòng về game bạn định đăng — ban quản trị đọc rồi trả lời." />
        <Buoc so={2} hinh={<Upload size={18} />} ten="Soạn game trong bảng tác giả"
          mo="Tên, mô tả, ảnh chụp, và ít nhất một bản tải. Game nằm ở nháp, chưa ai thấy." />
        <Buoc so={3} hinh={<Send size={18} />} ten="Gửi duyệt"
          mo="Ban quản trị xem rồi duyệt, hoặc trả lại kèm lý do để bạn sửa." />
        <Buoc so={4} hinh={<CheckCircle2 size={18} />} ten="Game lên kệ"
          mo="Game có trang riêng, khu diễn đàn riêng, và hiện ở trang tác giả của bạn." />
      </ol>

      {nguoi ? <ODon don={don} /> : (
        <div className="the p-4">
          <p className="text-[14px] font-semibold">Chưa có quyền tác giả?</p>
          <p className="phu mt-1">Đăng nhập trước đã, rồi gửi đơn ngay tại trang này.</p>
          <Link href="/dang-nhap" className="nut-cai-dam mt-3">Đăng nhập</Link>
        </div>
      )}

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
