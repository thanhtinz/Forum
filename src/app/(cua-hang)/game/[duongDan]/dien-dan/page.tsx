import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MessageSquare, PenLine, Pin } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { PhanTrang } from '@/components/PhanTrang';
import { cachDay, gonSo, kep, soTrang } from '@/lib/tien-ich';

/*
 * Mỗi trang bao nhiêu chủ đề.
 *
 * Trước đây danh sách lấy `take: 50` rồi thôi — game nào bàn tán sôi nổi thì
 * chủ đề thứ năm mươi mốt trở đi KHÔNG CÓ LỐI NÀO TỚI ĐƯỢC, kể cả khi người
 * ta vừa đăng nó xong: bài mới nhất đẩy bài cũ tụt xuống, mà tụt khỏi năm
 * mươi là mất. Chỗ này không phải "lười tải thêm", nó là mất nội dung.
 */
const MOI_TRANG = 20;

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
export default async function TabDienDan({ params, searchParams }: {
  params: Promise<{ duongDan: string }>;
  searchParams: Promise<{ trang?: string }>;
}) {
  const { duongDan } = await params;
  const { trang: trangNhap } = await searchParams;

  const game = await db.game.findFirst({
    where: { duongDan, ...DANG_HIEN },
    select: { id: true, duongDan: true },
  });
  if (!game) notFound();

  const tong = await db.chuDe.count({ where: { gameId: game.id } });
  // Kẹp trang vào khoảng có thật: `?trang=99` trên diễn đàn hai trang thì đưa
  // về trang cuối, chứ không trả một danh sách rỗng trông như diễn đàn chết.
  const trang = kep(trangNhap, 1, soTrang(tong, MOI_TRANG), 1);

  const chuDe = await db.chuDe.findMany({
    where: { gameId: game.id },
    /*
      Khoá phụ `id` là thứ bắt buộc, không phải cho đẹp.
      Hai chủ đề cùng `traLoiCuoiLuc` (rất dễ xảy ra: chủ đề vừa tạo lấy mốc
      `now()`) mà không có khoá phụ thì Postgres được quyền xếp tuỳ ý mỗi lần
      hỏi — sang trang 2 có thể gặp lại đúng chủ đề đã thấy ở trang 1, và một
      chủ đề khác thì không trang nào có.
    */
    orderBy: [{ ghim: 'desc' }, { traLoiCuoiLuc: 'desc' }, { id: 'desc' }],
    skip: (trang - 1) * MOI_TRANG,
    take: MOI_TRANG,
    select: {
      id: true, tieuDe: true, ghim: true, khoa: true, soTraLoi: true, traLoiCuoiLuc: true,
      nguoi: { select: { tenHienThi: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="phu">
          {tong > 0 ? `${gonSo(tong)} chủ đề` : 'Chưa có chủ đề nào'}
        </p>
        <Link href={`/game/${game.duongDan}/dien-dan/dang`}
          className="nut-cai-dam shrink-0 !min-h-[36px] !px-4 !text-[13px]">
          <PenLine size={15} aria-hidden /> Đăng bài
        </Link>
      </div>

      {tong === 0 ? (
        <div className="the p-8 text-center">
          <MessageSquare size={24} className="mx-auto text-mo" aria-hidden />
          <p className="mt-2 text-[14px] font-semibold">Chưa ai mở lời</p>
          <p className="phu mt-1">
            Hỏi cách qua màn, báo lỗi gặp phải, hay chỉ để nói chuyện về game này.
          </p>
        </div>
      ) : (
        <>
        <ul aria-label="Danh sách chủ đề" className="the divide-y divide-vien">
          {chuDe.map((c) => (
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
        <PhanTrang trang={trang} tongTrang={soTrang(tong, MOI_TRANG)}
          dungDuong={(t) => `/game/${game.duongDan}/dien-dan${t > 1 ? `?trang=${t}` : ''}`} />
        </>
      )}
    </div>
  );
}
