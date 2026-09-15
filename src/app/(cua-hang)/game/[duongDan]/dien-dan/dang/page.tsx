import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { BieuMauGui } from '@/components/BieuMauGui';
import { OSoanThao } from '@/components/OSoanThao';
import { dangChuDe } from '../viec';
import { NHAN, NHAN_MAC_DINH } from '@/lib/nhan-chu-de-const';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Đăng chủ đề' };

export default async function TrangDangBai({ params, searchParams }: {
  params: Promise<{ duongDan: string }>;
  searchParams: Promise<{ muc?: string }>;
}) {
  const { duongDan } = await params;
  const { muc: mucNhap } = await searchParams;

  const game = await db.game.findFirst({
    where: { duongDan, trangThai: 'DANG_HIEN' },
    select: { ten: true, duongDan: true },
  });
  if (!game) notFound();

  if (!(await nguoiHienTai())) redirect('/dang-nhap');

  const chuyenMuc = await db.chuyenMuc.findMany({
    orderBy: [{ thuTu: 'asc' }, { id: 'asc' }],
    select: { duongDan: true, ten: true, moTa: true },
  });
  // Mục chọn sẵn chỉ nhận khi CÓ THẬT trong bảng: `?muc=` tới từ địa chỉ.
  const mucSan = chuyenMuc.some((m) => m.duongDan === mucNhap) ? mucNhap : '';

  return (
    /* Không có liên kết lùi ở đây: hàng tab ngay trên đầu đã là lối lùi, và
       nó còn nói rõ mình đang ở phần nào của trang game. */
    <div className="cot-doc space-y-5">
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
          CHỌN NHÃN BẰNG Ô TRÒN BÀY HẾT RA, không phải một danh sách thả xuống.

          Bốn lựa chọn thì bày hết ra rẻ hơn một cú bấm mở danh sách, và quan
          trọng hơn: mỗi nhãn kèm được một dòng giải thích nó dành cho chuyện
          gì. Danh sách thả xuống thì chỉ còn bốn cái tên trơ trọi, và người mở
          chủ đề đoán bừa — mà đoán bừa thì bộ lọc ở trang danh sách hoá vô dụng.
        */}
        {/*
          CHUYÊN MỤC ĐỨNG TRƯỚC NHÃN, và là một danh sách thả xuống.

          Hai thứ này trông na ná nhau nên thứ tự phải nói ra được cái nào to
          hơn: chuyên mục là CHỖ NGỒI của bài — nó quyết định bài nằm ở trang
          nào — còn nhãn chỉ là một chữ dán lên bìa. Chỗ ngồi chọn trước.

          Thả xuống chứ không bày hết ra như nhãn, vì số chuyên mục do quản trị
          đặt và có thể lên tới vài chục; bốn ô tròn thì bày hết được, ba mươi
          ô tròn thì đẩy ô soạn bài xuống dưới đáy màn hình.
        */}
        {chuyenMuc.length > 0 && (
          <label className="block">
            <span className="phu mb-1 block">Chuyên mục</span>
            <select name="chuyenMuc" defaultValue={mucSan} className="o-nhap">
              <option value="">— Chưa xếp mục —</option>
              {chuyenMuc.map((m) => (
                <option key={m.duongDan} value={m.duongDan}>{m.ten}</option>
              ))}
            </select>
          </label>
        )}

        <fieldset>
          <legend className="phu mb-1.5">Chủ đề này thuộc loại nào?</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {NHAN.map((n) => (
              <label key={n.ma}
                className="vach flex cursor-pointer items-start gap-2.5 rounded-nut border p-2.5 transition-colors hover:bg-nen3/60 has-[:checked]:border-nhan has-[:checked]:bg-nhan/5">
                <input type="radio" name="nhan" value={n.ma}
                  defaultChecked={n.ma === NHAN_MAC_DINH}
                  className="mt-0.5 size-4 shrink-0 accent-[rgb(var(--nhan))]" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{n.ten}</span>
                  <span className="phu block leading-snug">{n.ta}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
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
