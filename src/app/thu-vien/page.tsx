import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Library } from 'lucide-react';
import { db } from '@/lib/db';
import { CHON_THE, thanhThe } from '@/components/game/the-game';
import { HangGame } from '@/components/game/HangGame';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { MO_TA_HE, type MaHeMay } from '@/lib/he-may';
import { cachDay } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Thư viện của tôi' };

/*
 * THƯ VIỆN — những game mình đã tải.
 *
 * Cửa hàng nào cũng có mục này, và ở đây không cần thêm bảng nào: mỗi lượt tải
 * đã ghi sẵn một hàng `LuotTai` (mỗi người mỗi game một hàng, giữ lần gần
 * nhất). Xếp mới trước, vì thứ người ta quay lại tìm gần như luôn là thứ vừa
 * tải hôm qua mà quên mất tên.
 */
export default async function TrangThuVien() {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap');

  const hang = await db.luotTai.findMany({
    where: { nguoiId: nguoi.id, game: { trangThai: 'DANG_HIEN' } },
    orderBy: { lanCuoi: 'desc' },
    take: 100,
    select: {
      id: true, heMay: true, soHieu: true, lanCuoi: true, soLan: true,
      game: { select: CHON_THE },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Thư viện của tôi</h1>
        <p className="phu mt-0.5">
          {hang.length > 0 ? `${hang.length} game bạn đã tải` : 'Những game bạn tải sẽ nằm ở đây'}
        </p>
      </div>

      {hang.length === 0 ? (
        <div className="the p-8 text-center">
          <Library size={24} className="mx-auto text-mo" />
          <p className="mt-2 text-[14px] font-semibold">Thư viện còn trống</p>
          <p className="phu mt-1">Tải một game bất kỳ là nó tự hiện ở đây, khỏi phải lưu tay.</p>
          <Link href="/" className="nut-cai-dam mt-4 !min-h-[38px] !px-5 !text-[13px]">Khám phá trò chơi</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {hang.map((l) => (
            <li key={l.id}>
              <HangGame game={thanhThe(l.game)} />
              <p className="phu ml-[68px] mt-1">
                Đã tải bản {MO_TA_HE[l.heMay as MaHeMay].ten}
                {l.soHieu ? ` ${l.soHieu}` : ''} · {cachDay(l.lanCuoi)}
                {l.soLan > 1 && ` · ${l.soLan} lần`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
