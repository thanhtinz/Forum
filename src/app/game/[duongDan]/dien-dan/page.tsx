import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MessageSquare, PenLine, Pin } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { cachDay } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ duongDan: string }> }): Promise<Metadata> {
  const { duongDan } = await params;
  const g = await db.game.findFirst({ where: { duongDan }, select: { ten: true } });
  return { title: g ? `Diễn đàn ${g.ten}` : 'Diễn đàn' };
}

/*
 * TAB "DIỄN ĐÀN" của một game.
 *
 * Không có bảng chuyên mục nào cả: người ta bàn về MỘT GAME cụ thể, không bàn
 * về "chuyên mục game hành động". Vào được đây tức là đã ở trong trang của
 * game ấy rồi, nên khung chung đã lo phần tên game và nút tải.
 */
export default async function TabDienDan({ params }: { params: Promise<{ duongDan: string }> }) {
  const { duongDan } = await params;

  const game = await db.game.findFirst({
    where: { duongDan, ...DANG_HIEN },
    select: {
      duongDan: true,
      chuDe: {
        orderBy: [{ ghim: 'desc' }, { traLoiCuoiLuc: 'desc' }],
        take: 50,
        select: {
          id: true, tieuDe: true, ghim: true, khoa: true, soTraLoi: true, traLoiCuoiLuc: true,
          nguoi: { select: { tenHienThi: true } },
        },
      },
    },
  });
  if (!game) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="phu">
          {game.chuDe.length > 0
            ? `${game.chuDe.length} chủ đề`
            : 'Chưa có chủ đề nào'}
        </p>
        <Link href={`/game/${game.duongDan}/dien-dan/dang`}
          className="nut-cai-dam shrink-0 !min-h-[36px] !px-4 !text-[13px]">
          <PenLine size={15} aria-hidden /> Đăng bài
        </Link>
      </div>

      {game.chuDe.length === 0 ? (
        <div className="the p-8 text-center">
          <MessageSquare size={24} className="mx-auto text-mo" aria-hidden />
          <p className="mt-2 text-[14px] font-semibold">Chưa ai mở lời</p>
          <p className="phu mt-1">
            Hỏi cách qua màn, báo lỗi gặp phải, hay chỉ để nói chuyện về game này.
          </p>
        </div>
      ) : (
        <ul className="the divide-y divide-vien">
          {game.chuDe.map((c) => (
            <li key={c.id}>
              <Link href={`/game/${game.duongDan}/dien-dan/${c.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-nen3">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    {c.ghim && <Pin size={12} className="shrink-0 text-nhan" aria-label="ghim" />}
                    <span className="truncate text-[14px] font-medium">{c.tieuDe}</span>
                  </span>
                  <span className="phu mt-0.5 block truncate">
                    {c.nguoi.tenHienThi} · {cachDay(c.traLoiCuoiLuc)}
                    {c.khoa && ' · đã khoá'}
                  </span>
                </span>
                <span className="phu flex shrink-0 items-center gap-1">
                  <MessageSquare size={12} aria-hidden /> {c.soTraLoi}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
