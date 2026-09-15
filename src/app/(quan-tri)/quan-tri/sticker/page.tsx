import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { KhungSticker } from '@/components/quan-tri/KhungSticker';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Gói sticker' };

export default async function StickerQuanTri() {
  const goi = await db.goiSticker.findMany({
    orderBy: [{ thuTu: 'asc' }, { id: 'asc' }],
    select: {
      id: true, ten: true,
      sticker: { orderBy: [{ thuTu: 'asc' }, { id: 'asc' }], select: { id: true, anh: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="tieu-de-trang">Gói sticker</h1>
        <p className="phu mt-1">Dùng chung cho cả cửa hàng</p>
      </div>

      <KhungSticker goi={goi} />
    </div>
  );
}
