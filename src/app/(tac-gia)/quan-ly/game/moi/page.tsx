import type { Metadata } from 'next';
import { BieuMauGame } from '@/components/quan-tri/BieuMauGame';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Thêm game' };

export default async function ThemGameTacGia() {
  const theLoai = await db.theLoai.findMany({
    orderBy: [{ thuTu: 'asc' }], take: 50, select: { id: true, ten: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="tieu-de-trang">Thêm game</h1>
        <p className="phu mt-1">
          Tạo xong game nằm ở nháp. Gắn bản tải và ảnh rồi mới gửi duyệt được.
        </p>
      </div>
      {/* Dùng lại đúng biểu mẫu của khu quản trị: hai bên nhập cùng một thứ,
          mà hai bản chép tay thì sớm muộn lệch nhau ở đúng chỗ khó thấy nhất.
          Ô "đưa lên băng nổi bật" tự ẩn vì nó chỉ vẽ cho quản trị. */}
      <BieuMauGame game={null} theLoai={theLoai} laQuanTri={false} veSau="tac-gia" />
    </div>
  );
}
