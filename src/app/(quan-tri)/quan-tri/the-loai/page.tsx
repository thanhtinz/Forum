import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { KhungTheLoai } from '@/components/quan-tri/KhungTheLoai';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Thể loại' };

export default async function TheLoaiQuanTri() {
  const theLoai = await db.theLoai.findMany({
    orderBy: [{ thuTu: 'asc' }, { id: 'asc' }],
    take: 100,
    select: { id: true, ten: true, duongDan: true, _count: { select: { game: true } } },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="tieu-de-trang">Thể loại</h1>
        <p className="phu mt-1">
          Thứ tự ở đây quyết định thứ tự hiện ra trong lưới thể loại và cột lọc
        </p>
      </div>

      <KhungTheLoai
        theLoai={theLoai.map((t) => ({
          id: t.id, ten: t.ten, duongDan: t.duongDan, soGame: t._count.game,
        }))} />
    </div>
  );
}
