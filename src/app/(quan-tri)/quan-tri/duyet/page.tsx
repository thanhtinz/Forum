import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { OXetDuyet } from '@/components/quan-tri/OXetDuyet';
import { cachDay } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Chờ duyệt' };

/*
 * HÀNG CHỜ DUYỆT.
 *
 * Xếp theo AI GỬI TRƯỚC, không theo game mới sửa gần nhất: người gửi hôm qua
 * mà cứ bị đẩy xuống cuối mỗi lần có người khác gửi thì họ chờ mãi không tới
 * lượt. Khoá phụ `id` vì hai lượt gửi cùng một giây là chuyện có thật.
 */
export default async function ChoDuyet() {
  const game = await db.game.findMany({
    where: { trangThai: 'CHO_DUYET' },
    orderBy: [{ guiDuyetLuc: 'asc' }, { id: 'asc' }],
    take: 50,
    select: {
      id: true, ten: true, icon: true, duongDan: true, gioiThieu: true, guiDuyetLuc: true,
      tacGia: { select: { tenHienThi: true, tenDangNhap: true } },
      theLoai: { select: { theLoai: { select: { ten: true } } } },
      _count: { select: { banTai: true, anhChup: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="tieu-de-trang">Chờ duyệt</h1>
        <p className="phu mt-1">
          {game.length > 0 ? `${game.length} game đang đợi xem xét` : 'Không có game nào đang đợi'}
        </p>
      </div>

      {game.length === 0 ? (
        <div className="the p-8 text-center">
          <p className="text-[14px] font-semibold">Hàng chờ trống</p>
          <p className="phu mt-1">Tác giả gửi game lên thì nó hiện ở đây.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {game.map((g) => (
            <li key={g.id} className="the p-4">
              <div className="flex items-start gap-3">
                <BieuTuongGame ten={g.ten} icon={g.icon} co={52} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{g.ten}</p>
                  <p className="phu mt-0.5 truncate">
                    {g.tacGia
                      ? <>của <Link href={`/tac-gia/${g.tacGia.tenDangNhap}`}
                          className="font-semibold text-nhan hover:underline">{g.tacGia.tenHienThi}</Link></>
                      : 'không rõ tác giả'}
                    {g.guiDuyetLuc && ` · gửi ${cachDay(g.guiDuyetLuc)}`}
                  </p>
                  <p className="phu mt-0.5 truncate">
                    {g.theLoai.map((t) => t.theLoai.ten).join(' · ') || 'chưa chọn thể loại'}
                    {' · '}{g._count.banTai} bản tải · {g._count.anhChup} ảnh
                  </p>
                </div>
              </div>

              {g.gioiThieu && (
                <p className="phu mt-3 line-clamp-3 whitespace-pre-line">{g.gioiThieu}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* Mở trang sửa của khu quản trị để xem đủ mọi thứ trước khi
                    quyết — duyệt mà chỉ nhìn ba dòng tóm tắt thì duyệt bừa. */}
                <Link href={`/quan-tri/game/${g.id}`} className="nut-vien !min-h-[34px] !px-3 !text-[13px]">
                  Xem chi tiết
                </Link>
                <OXetDuyet gameId={g.id} ten={g.ten} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
