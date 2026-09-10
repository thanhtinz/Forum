import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { BieuMauGame } from '@/components/quan-tri/BieuMauGame';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Thêm game' };

export default async function ThemGame() {
  const theLoai = await db.theLoai.findMany({
    orderBy: [{ thuTu: 'asc' }], take: 50, select: { id: true, ten: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Thêm game</h1>
        <p className="phu mt-0.5">
          Tạo xong game nằm ở trạng thái nháp. Gắn bản tải rồi mới bấm đăng.
        </p>
      </div>
      <BieuMauGame game={null} theLoai={theLoai} />
    </div>
  );
}
