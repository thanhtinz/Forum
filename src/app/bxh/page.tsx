import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/kho-game';
import { CHON_THE, thanhThe } from '@/components/game/the-game';
import { HangGame } from '@/components/game/HangGame';
import { HE_MAY, MO_TA_HE, laHeMay, type MaHeMay } from '@/lib/he-may';
import { gop } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bảng xếp hạng' };

/*
 * BẢNG XẾP HẠNG.
 *
 * Ba bảng, mỗi bảng trả lời một câu khác nhau — không phải ba cách sắp của
 * cùng một câu:
 *   • Tải nhiều nhất — cái gì phổ biến (cộng dồn từ trước tới nay).
 *   • Điểm cao nhất  — cái gì hay, theo lời người đã chơi.
 *   • Mới lên kho    — cái gì vừa có.
 *
 * Lọc thêm theo hệ máy, vì "top game" mà máy mình không chạy được thì cũng
 * chỉ để ngắm — nhất là ở một kho toàn game cũ.
 */

const BANG = [
  { ma: 'tai', ten: 'Tải nhiều nhất', phu: 'Cộng dồn từ trước tới nay' },
  { ma: 'diem', ten: 'Điểm cao nhất', phu: 'Theo đánh giá của người đã chơi' },
  { ma: 'moi', ten: 'Mới lên kho', phu: 'Vừa được thêm vào' },
] as const;

type MaBang = (typeof BANG)[number]['ma'];

/*
 * Khoá phụ `id` ở mọi cách sắp. Hai game cùng số lượt tải (rất hay gặp khi kho
 * mới lập) mà không có khoá phụ thì Postgres trả về thứ tự tuỳ hứng, và bảng
 * xếp hạng đổi chỗ mỗi lần tải lại trang — người xem tưởng số liệu đang nhảy.
 */
const SAP = {
  tai: [{ soLuotTai: 'desc' as const }, { id: 'desc' as const }],
  diem: [{ soLuotDanhGia: 'desc' as const }, { tongSao: 'desc' as const }, { id: 'desc' as const }],
  moi: [{ dangLuc: 'desc' as const }, { id: 'desc' as const }],
};

const SO_HANG = 50;

export default async function TrangBXH({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const lay = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) as string | undefined;

  const bang = (BANG.find((b) => b.ma === lay('bang'))?.ma ?? 'tai') as MaBang;
  const he = laHeMay(lay('he')) ? (lay('he') as MaHeMay) : undefined;

  const hang = await db.game.findMany({
    where: { ...DANG_HIEN, ...(he ? { banTai: { some: { heMay: he } } } : {}) },
    orderBy: SAP[bang],
    take: SO_HANG,
    select: CHON_THE,
  });

  const duong = (doi: { bang?: MaBang; he?: MaHeMay | null }) => {
    const p = new URLSearchParams();
    const b = doi.bang ?? bang;
    const h = doi.he === null ? undefined : (doi.he ?? he);
    if (b !== 'tai') p.set('bang', b);
    if (h) p.set('he', h);
    const s = p.toString();
    return `/bxh${s ? `?${s}` : ''}`;
  };

  const dangXem = BANG.find((b) => b.ma === bang)!;

  return (
    <div className="mx-auto max-w-[680px] space-y-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Bảng xếp hạng</h1>
        <p className="phu mt-0.5">{dangXem.phu}</p>
      </div>

      <div className="ke ke-goi gap-2">
        {BANG.map((b) => (
          <Link key={b.ma} href={duong({ bang: b.ma })}
            className={gop('chip', b.ma === bang && 'chip-chon')}>
            {b.ten}
          </Link>
        ))}
      </div>

      <div className="ke ke-goi gap-2">
        <Link href={duong({ he: null })} className={gop('chip', !he && 'chip-chon')}>Mọi hệ máy</Link>
        {HE_MAY.map((h) => (
          <Link key={h} href={duong({ he: h })} className={gop('chip', h === he && 'chip-chon')}>
            {MO_TA_HE[h].ten}
          </Link>
        ))}
      </div>

      {hang.length === 0 ? (
        <p className="the p-8 text-center text-[13px] text-mo">
          Chưa có game nào cho hệ máy này.
        </p>
      ) : (
        <ol className="space-y-3.5">
          {hang.map((g, i) => (
            <li key={g.id}><HangGame game={thanhThe(g)} soThuTu={i + 1} /></li>
          ))}
        </ol>
      )}
    </div>
  );
}
