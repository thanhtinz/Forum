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
/**
 * Lấy nhiều nhất chừng này một lượt.
 *
 * Hàng chờ vơi từ ĐẦU — duyệt xong là game rời hàng — nên người trực không bao
 * giờ cần đi tới cuối; cái họ cần là mấy cái đợi lâu nhất, và chúng luôn nằm
 * trên đầu.
 */
const MOT_LUOT = 50;

export default async function ChoDuyet() {
  const [tong, game] = await Promise.all([
    /*
     * ĐẾM RIÊNG, không lấy `game.length` làm tổng.
     *
     * Bản cũ in thẳng `game.length` sau một câu `take: 50`, nên sáu mươi game
     * đang đợi thì dòng chữ nói "50 game đang đợi xem xét" — một con số sai,
     * ở đúng chỗ người trực nhìn để biết còn bao nhiêu việc.
     */
    db.game.count({ where: { trangThai: 'CHO_DUYET' } }),
    db.game.findMany({
    where: { trangThai: 'CHO_DUYET' },
    orderBy: [{ guiDuyetLuc: 'asc' }, { id: 'asc' }],
    take: MOT_LUOT,
    select: {
      id: true, ten: true, icon: true, duongDan: true, gioiThieu: true, guiDuyetLuc: true,
      tacGia: { select: { tenHienThi: true, tenDangNhap: true } },
      theLoai: { select: { theLoai: { select: { ten: true } } } },
      _count: { select: { banTai: true, anhChup: true } },
    },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="tieu-de-trang">Chờ duyệt</h1>
        <p className="phu mt-1">
          {tong === 0 ? 'Không có game nào đang đợi' : `${tong} game đang đợi xem xét`}
          {/* Nói thẳng ra là đang cắt, chứ không im lặng bày 50 cái rồi thôi:
              người trực phải biết duyệt hết trang này vẫn còn việc. */}
          {tong > game.length && ` · bày ${game.length} cái đợi lâu nhất`}
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
