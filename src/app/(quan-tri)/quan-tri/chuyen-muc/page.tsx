import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { KhungChuyenMuc } from '@/components/quan-tri/KhungChuyenMuc';
import { CHUYEN_MUC_TOI_DA } from '@/lib/chuyen-muc-const';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Chuyên mục diễn đàn' };

export default async function ChuyenMucQuanTri() {
  const muc = await db.chuyenMuc.findMany({
    orderBy: [{ thuTu: 'asc' }, { id: 'asc' }],
    take: CHUYEN_MUC_TOI_DA,
    select: {
      id: true, ten: true, duongDan: true, moTa: true, anh: true,
      _count: { select: { chuDe: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="tieu-de-trang">Chuyên mục diễn đàn</h1>
        {/* Câu này ở lại: không có nó thì người quản trị tưởng mình đang sửa
            diễn đàn của một game, rồi ngạc nhiên khi thấy nó hiện khắp nơi. */}
        <p className="phu mt-1">Dùng chung cho diễn đàn của mọi game</p>
      </div>

      <KhungChuyenMuc
        muc={muc.map((m) => ({
          id: m.id, ten: m.ten, duongDan: m.duongDan,
          moTa: m.moTa ?? '', anh: m.anh ?? '', soChuDe: m._count.chuDe,
        }))} />
    </div>
  );
}
