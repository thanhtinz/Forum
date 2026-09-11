import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowUpCircle, CheckCircle2 } from 'lucide-react';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { timBanMoi } from '@/lib/cap-nhat';
import { MO_TA_HE } from '@/lib/he-may';
import { cachDay } from '@/lib/tien-ich';
import { nguoiHienTai } from '@/lib/xac-thuc';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bản cập nhật' };

/*
 * "CÓ BẢN CẬP NHẬT".
 *
 * CH Play để mục này ở "Quản lý ứng dụng", và ở một cửa hàng game cũ thì nó
 * còn đáng giá hơn: người ta tải một bản JAR về máy rồi để đấy hàng tháng,
 * không có cách nào biết bản vá lỗi treo máy đã ra.
 *
 * Mỗi dòng nói rõ ĐANG CÓ BẢN NÀO và SẼ LÊN BẢN NÀO, kèm câu "có gì mới" —
 * để người dùng tự quyết có đáng tải lại không. Cửa hàng thật tự cập nhật hộ
 * nên chỉ cần một nút; ở đây người ta phải tự chép tệp vào máy, nên phải cho
 * họ đủ cơ sở để quyết.
 */
export default async function TrangCapNhat() {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap');

  const banMoi = await timBanMoi(nguoi.id);

  return (
    <div className="mx-auto max-w-[680px] space-y-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Bản cập nhật</h1>
        <p className="phu mt-0.5">
          {banMoi.length > 0
            ? `${banMoi.length} game bạn đã tải có bản mới hơn`
            : 'So bản bạn đã tải với bản mới nhất trên trang'}
        </p>
      </div>

      {banMoi.length === 0 ? (
        <div className="the p-8 text-center">
          <CheckCircle2 size={24} className="mx-auto text-nhan" aria-hidden />
          <p className="mt-2 text-[14px] font-semibold">Mọi thứ đều mới nhất</p>
          <p className="phu mt-1">
            Game nào có bản mới hơn bản bạn đã tải sẽ tự hiện ở đây.
          </p>
          <Link href="/thu-vien" className="nut-xam mt-4">Xem thư viện</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {banMoi.map((b) => (
            <li key={`${b.game.id}-${b.heMay}`} className="the p-4">
              <div className="flex items-center gap-3">
                <BieuTuongGame ten={b.game.ten} icon={b.game.icon} co={52} />
                <div className="min-w-0 flex-1">
                  <Link href={`/game/${b.game.duongDan}`}
                    className="block truncate text-[14px] font-semibold hover:underline">
                    {b.game.ten}
                  </Link>
                  <p className="phu mt-0.5 flex flex-wrap items-center gap-x-1.5">
                    <span>{MO_TA_HE[b.heMay].ten}</span>
                    <span aria-hidden>·</span>
                    {/* Bản cũ gạch ngang, mũi tên, bản mới in đậm — đọc một
                        cái là biết mình đang ở đâu và sắp lên đâu. */}
                    <span className="line-through">{b.banCu}</span>
                    <ArrowUpCircle size={12} className="text-nhan" aria-label="lên bản" />
                    <span className="font-bold text-nhan">{b.banMoi}</span>
                    {/* Không có dấu chấm giữa trước ngày: dòng này hay xuống
                        hàng đúng ngay chỗ ấy, để lại một dấu chấm lửng lơ ở
                        cuối dòng trên trông như câu bị cụt. */}
                    {b.ngayRa && <span className="basis-full">{cachDay(b.ngayRa)}</span>}
                  </p>
                </div>
                <Link href={`/game/${b.game.duongDan}#tai`} className="nut-cai shrink-0">
                  Cập nhật
                </Link>
              </div>

              {b.doiMoi && (
                <p className="vach mt-3 pt-3 text-[13px] leading-relaxed text-mo">
                  <span className="font-semibold text-chu">Có gì mới: </span>{b.doiMoi}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
