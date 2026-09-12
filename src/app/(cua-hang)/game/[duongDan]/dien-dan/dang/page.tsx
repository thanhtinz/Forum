import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { BieuMauGui } from '@/components/BieuMauGui';
import { OSoanThao } from '@/components/OSoanThao';
import { dangChuDe } from '../viec';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Đăng chủ đề' };

export default async function TrangDangBai({ params }: { params: Promise<{ duongDan: string }> }) {
  const { duongDan } = await params;

  const game = await db.game.findFirst({
    where: { duongDan, trangThai: 'DANG_HIEN' },
    select: { ten: true, duongDan: true },
  });
  if (!game) notFound();

  if (!(await nguoiHienTai())) redirect('/dang-nhap');

  return (
    /* Không có liên kết lùi ở đây: hàng tab ngay trên đầu đã là lối lùi, và
       nó còn nói rõ mình đang ở phần nào của trang game. */
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-[20px] font-bold tracking-tight">Đăng chủ đề</h1>
        <p className="phu mt-0.5">Bài này sẽ nằm trong khu diễn đàn của {game.ten}.</p>
      </div>

      <BieuMauGui viec={dangChuDe} nut="Đăng chủ đề" nutDangChay="Đang đăng…">
        <input type="hidden" name="duongDan" value={game.duongDan} />
        <label className="block">
          <span className="phu mb-1 block">Tiêu đề</span>
          <input name="tieuDe" required minLength={5} maxLength={150} className="o-nhap"
            placeholder="Hỏi gì, kể gì, hay báo lỗi gì?" />
        </label>
        {/*
          TRÌNH SOẠN THẢO, không còn là ô chữ trần.

          Diễn đàn của một cửa hàng game cũ sống bằng mấy bài kể cách vượt màn
          và báo lỗi — mà hai loại bài ấy cần đúng những thứ ô chữ trần không
          có: ẢNH CHỤP màn hình lúc kẹt, danh sách các bước, và khối mã cho
          mấy dòng cấu hình. Cổng nhận ảnh cho diễn đàn đã có sẵn từ đợt kho
          ảnh (`dien-dan`, có cửa chặn đếm lượt) mà tới giờ chưa nơi nào dùng.
        */}
        <OSoanThao ten="noiDung" nhan="Nội dung" giaTri="" dong={9} gon choAnh="dien-dan"
          goYy="Máy bạn đời nào, chạy bản nào, kẹt ở đoạn nào… càng rõ càng dễ có người giúp.
            Dán thẳng ảnh chụp vào ô là nó tự tải lên." />
      </BieuMauGui>
    </div>
  );
}
