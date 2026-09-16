import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowUpCircle, ChevronRight, Library } from 'lucide-react';
import { db } from '@/lib/db';
import { CHON_THE, thanhThe } from '@/components/game/the-game';
import { HangGame } from '@/components/game/HangGame';
import { demBanMoi } from '@/lib/cap-nhat';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { MO_TA_HE, type MaHeMay } from '@/lib/he-may';
import { PhanTrang } from '@/components/PhanTrang';
import { cachDay, gonSo, kep, soTrang } from '@/lib/tien-ich';

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
const MOI_TRANG = 30;

export default async function TrangThuVien({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap');

  const soBanMoi = await demBanMoi(nguoi.id);

  /*
   * ĐẾM RIÊNG, và CÓ PHÂN TRANG.
   *
   * Bản trước lấy `take: 100` rồi in `hang.length` như thể đó là tổng số game
   * đã tải: người tải 150 game thấy dòng "100 game bạn đã tải" — một con số
   * sai — và game thứ 101 trở đi không có lối nào tới. Thư viện là chỗ người
   * ta quay lại TÌM một game cũ, nên đúng mấy game cũ nhất mới là thứ bị mất.
   */
  const dieuKien = { nguoiId: nguoi.id, game: { trangThai: 'DANG_HIEN' as const } };
  const tong = await db.luotTai.count({ where: dieuKien });
  const trang = kep((await searchParams).trang, 1, soTrang(tong, MOI_TRANG), 1);

  const hang = await db.luotTai.findMany({
    where: dieuKien,
    // Khoá phụ `id`: hai lượt tải cùng một mốc `lanCuoi` mà không có khoá phụ
    // thì sang trang 2 gặp lại đúng hàng đã thấy ở trang 1.
    orderBy: [{ lanCuoi: 'desc' }, { id: 'desc' }],
    skip: (trang - 1) * MOI_TRANG,
    take: MOI_TRANG,
    select: {
      id: true, heMay: true, soHieu: true, lanCuoi: true, soLan: true,
      game: { select: CHON_THE },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="tieu-de-trang">Thư viện của tôi</h1>
        <p className="phu mt-0.5">
          {tong > 0 ? `${gonSo(tong)} game bạn đã tải` : 'Những game bạn tải sẽ nằm ở đây'}
        </p>
      </div>

      {/* Có bản mới thì nói ngay ở đây — người mở thư viện là người đang tìm
          lại game đã tải, đúng lúc để bảo họ "cái này có bản mới rồi". */}
      {soBanMoi > 0 && (
        <Link href="/cap-nhat" className="the-bam flex items-center gap-3 px-4 py-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-nhan/12 text-nhan">
            <ArrowUpCircle size={19} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold">
              {soBanMoi} game có bản mới
            </span>
            <span className="phu block">Xem có gì thay đổi trước khi tải lại</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-mo" aria-hidden />
        </Link>
      )}

      {tong === 0 ? (
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

      <PhanTrang trang={trang} tongTrang={soTrang(tong, MOI_TRANG)}
        dungDuong={(t) => (t > 1 ? `/thu-vien?trang=${t}` : '/thu-vien')} />
    </div>
  );
}
