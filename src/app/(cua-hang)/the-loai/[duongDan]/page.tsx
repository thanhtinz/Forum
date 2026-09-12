import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  CarFront, Coffee, Compass, Crown, Gamepad2, Joystick,
  Puzzle, Shield, Sprout, Swords, Volleyball, type LucideIcon,
} from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN, layKe } from '@/lib/danh-muc';
import { hinhCuaTheLoai } from '@/lib/the-loai-hinh';
import { CHON_THE, thanhThe } from '@/components/game/the-game';
import { KeThe } from '@/components/game/KeThe';
import { HangGame } from '@/components/game/HangGame';
import { HangChip } from '@/components/game/HangChip';
import { PhanTrang } from '@/components/PhanTrang';
import { HE_MAY, MO_TA_HE, type MaHeMay } from '@/lib/he-may';
import { gonSo, kep, soTrang } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

const MOI_TRANG = 20;

/*
 * Mỗi kệ bày bao nhiêu, và từ bao nhiêu game trở lên thì MỚI dựng kệ.
 *
 * Ngưỡng này không phải để cho đẹp. Thể loại có ba game thì cả ba kệ — tải
 * nhiều nhất, điểm cao nhất, mới ra mắt — đều bày đúng ba game ấy, khác mỗi
 * thứ tự; nhìn vào tưởng trang bị lặp chứ không tưởng là ba cách xem. Ba kệ
 * giống nhau tệ hơn là không có kệ nào.
 *
 * Nên chỉ dựng kệ khi số game VƯỢT sức chứa một kệ: lúc ấy mỗi kệ mới thật sự
 * phải chọn, và ba kệ mới ra ba câu trả lời khác nhau. Dưới ngưỡng thì danh
 * sách đầy đủ phía dưới vốn đã bày ra hết rồi.
 */
const MOI_KE = 12;

/*
 * Bảng tra từ tên sang thành phần biểu tượng — viết tay từng dòng, y như ở
 * `OTheLoai`. `import * as` một phát là kéo cả nghìn biểu tượng lucide vào bản
 * dựng cho trình duyệt tải.
 */
const BANG_HINH: Record<string, LucideIcon> = {
  CarFront, Coffee, Compass, Crown, Gamepad2, Joystick, Puzzle, Shield, Sprout, Swords, Volleyball,
};

export async function generateMetadata({ params }: {
  params: Promise<{ duongDan: string }>;
}): Promise<Metadata> {
  const { duongDan } = await params;
  const t = await db.theLoai.findUnique({ where: { duongDan }, select: { ten: true } });
  return t
    ? { title: `Game ${t.ten}`, description: `Tải game ${t.ten} cho Java, Android và iOS trên SunnyStore.` }
    : { title: 'Thể loại' };
}

/*
 * TRANG THỂ LOẠI.
 *
 * Trước đây bấm vào một thể loại là ra `/duyet?the-loai=…` — tức là cùng một
 * danh sách dọc với bộ lọc bên cạnh, chỉ khác cái tham số trên URL. Người bấm
 * vào "Đua xe" không đi lọc: họ muốn ĐƯỢC BÀY CHO XEM, đúng như vào một gian
 * hàng. App Store và CH Play đều cho thể loại một trang riêng vì thế.
 *
 * Nên ở đây ba kệ trước, danh sách đầy đủ sau:
 *   • Tải nhiều nhất — cái gì phổ biến trong gian này;
 *   • Điểm cao nhất  — cái gì hay, theo lời người đã chơi;
 *   • Mới ra mắt     — cái gì vừa về.
 *
 * Ba kệ ấy là ba CÂU HỎI khác nhau, không phải ba cách sắp của cùng một câu —
 * nên bày cả ba cùng lúc, chứ không bắt người ta bấm đổi qua đổi lại.
 */
export default async function TrangTheLoai({ params, searchParams }: {
  params: Promise<{ duongDan: string }>;
  searchParams: Promise<{ he?: string; trang?: string }>;
}) {
  const { duongDan } = await params;
  const sp = await searchParams;

  const theLoai = await db.theLoai.findUnique({
    where: { duongDan },
    select: { id: true, ten: true, duongDan: true },
  });
  if (!theLoai) notFound();

  // Hệ máy lạ trên URL thì coi như không lọc — địa chỉ là thứ ai cũng sửa tay.
  const he = (HE_MAY as readonly string[]).includes(sp.he ?? '')
    ? (sp.he as MaHeMay)
    : null;

  const trongTheLoai = {
    ...DANG_HIEN,
    theLoai: { some: { theLoai: { duongDan } } },
    ...(he ? { banTai: { some: { heMay: he } } } : {}),
  };

  const [tong, taiNhieu, diemCao, moiRa] = await Promise.all([
    db.game.count({ where: trongTheLoai }),
    layKe(trongTheLoai, [{ soLuotTai: 'desc' }, { id: 'desc' }], MOI_KE),
    // Đòi có ít nhất một lượt đánh giá: game chưa ai chấm mà đứng đầu bảng
    // "điểm cao nhất" thì bảng ấy nói dối.
    layKe(
      { ...trongTheLoai, soLuotDanhGia: { gt: 0 } },
      [{ soLuotDanhGia: 'desc' }, { tongSao: 'desc' }, { id: 'desc' }],
      MOI_KE,
    ),
    layKe(trongTheLoai, [{ dangLuc: 'desc' }, { id: 'desc' }], MOI_KE),
  ]);

  const tongTrang = soTrang(tong, MOI_TRANG);
  const trang = kep(sp.trang, 1, tongTrang, 1);

  const tatCa = await db.game.findMany({
    where: trongTheLoai,
    orderBy: [{ ten: 'asc' }, { id: 'asc' }],
    skip: (trang - 1) * MOI_TRANG,
    take: MOI_TRANG,
    select: CHON_THE,
  });

  const { icon, sac } = hinhCuaTheLoai(duongDan);
  const Hinh = BANG_HINH[icon] ?? Gamepad2;

  const goc = `/the-loai/${duongDan}`;
  const duong = (doi: { he?: MaHeMay | null; trang?: number }) => {
    const h = doi.he === undefined ? he : doi.he;
    // Đổi hệ máy thì về trang 1: trang 5 của danh sách cũ gần như chắc chắn
    // không còn tồn tại trong danh sách mới.
    const t = doi.trang ?? 1;
    const q = new URLSearchParams();
    if (h) q.set('he', h);
    if (t > 1) q.set('trang', String(t));
    const s = q.toString();
    return s ? `${goc}?${s}` : goc;
  };

  return (
    <div className="space-y-7">
      {/* Đầu trang mang đúng hình và sắc của ô thể loại vừa bấm: người vừa bấm
          một ô tròn màu cam phải thấy ngay mình đã tới đúng chỗ ấy. */}
      <header className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: `rgb(${sac} / .12)`, color: `rgb(${sac})` }}>
          <Hinh size={30} strokeWidth={2.1} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="phu">Thể loại</p>
          <h1 className="tieu-de-trang truncate">{theLoai.ten}</h1>
          <p className="phu mt-0.5">
            {gonSo(tong)} game{he ? ` chạy được trên ${MO_TA_HE[he].ten}` : ''}
          </p>
        </div>
      </header>

      <HangChip
        muc={[
          { ten: 'Mọi hệ máy', duongDan: duong({ he: null }) },
          ...HE_MAY.map((h) => ({ ten: MO_TA_HE[h].ten, duongDan: duong({ he: h }) })),
        ]}
        dangChon={duong({ he })}
      />

      {tong === 0 ? (
        <div className="the p-8 text-center">
          <p className="text-[14px] font-semibold">Gian này chưa có game nào</p>
          <p className="phu mt-1">
            {he
              ? 'Thử bỏ lọc hệ máy, hoặc gửi yêu cầu cho SunnyStore.'
              : 'Gửi yêu cầu thì lần tới vào đây có thể đã thấy.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {he && <Link href={duong({ he: null })} className="nut-xam">Bỏ lọc hệ máy</Link>}
            <Link href="/yeu-cau" className="nut-vien">Yêu cầu game</Link>
          </div>
        </div>
      ) : (
        <>
          {tong > MOI_KE && (
            <>
              <KeThe ten="Tải nhiều nhất" phu={`Game ${theLoai.ten} nhiều người tải nhất`} game={taiNhieu} />
              <KeThe ten="Điểm cao nhất" phu="Theo đánh giá của người đã chơi" game={diemCao} />
              <KeThe ten="Mới ra mắt" phu="Vừa lên kệ" game={moiRa} />
            </>
          )}

          <section>
            {/* Dưới ngưỡng dựng kệ thì đây là phần duy nhất của trang, nên
                đầu đề phải nói thẳng có bao nhiêu chứ không chỉ "Tất cả". */}
            <h2 className="tieu-de mb-3">
              {tong > MOI_KE ? `Tất cả game ${theLoai.ten}` : `${gonSo(tong)} game ${theLoai.ten}`}
            </h2>
            <ul className="grid gap-x-8 gap-y-3.5 xl:grid-cols-2">
              {tatCa.map((g) => (
                // `min-w-0` vì ô lưới CSS mặc định không chịu hẹp hơn nội dung,
                // và một hàng game ở khổ 320px thì đẩy tràn cả trang.
                <li key={g.id} className="min-w-0"><HangGame game={thanhThe(g)} /></li>
              ))}
            </ul>
            <PhanTrang trang={trang} tongTrang={tongTrang}
              dungDuong={(t) => duong({ trang: t })} />
          </section>
        </>
      )}
    </div>
  );
}
