import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { MO_TA_SU_KIEN, type MaLoaiSuKien } from '@/lib/su-kien-const';
import { dungChuDam } from '@/lib/chu-dam';
import { catChu } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

async function laySuKien(duongDan: string, id: string) {
  return db.suKien.findFirst({
    // Điều kiện "game đang hiện" và "sự kiện đang bật" nằm TRONG câu truy vấn:
    // lọc sau khi lấy về thì vẫn có một khoảnh khắc mã đang cầm sự kiện của một
    // game đã bị gỡ.
    where: { id, hien: true, game: { duongDan, ...DANG_HIEN } },
    select: {
      id: true, loai: true, tieuDe: true, moTaNgan: true, noiDung: true, anh: true,
      batDau: true, ketThuc: true,
      game: { select: { ten: true, duongDan: true } },
    },
  });
}

export async function generateMetadata(
  { params }: { params: Promise<{ duongDan: string; id: string }> },
): Promise<Metadata> {
  const { duongDan, id } = await params;
  const s = await laySuKien(duongDan, id);
  if (!s) return { title: 'Không tìm thấy sự kiện' };
  return { title: `${s.tieuDe} · ${s.game.ten}`, description: catChu(s.moTaNgan, 160) };
}

/*
 * TRANG MỘT SỰ KIỆN — dáng "event details page" của App Store.
 *
 * Thẻ sự kiện ở trang game chỉ chở được một dòng; trang này là chỗ kể hết: thể
 * lệ giải đấu, bản cập nhật có gì, buổi phát lúc mấy giờ. Nó nằm TRONG khung
 * game (cùng `layout.tsx`), nên cột tải vẫn ở nguyên bên trái — đọc xong thấy
 * hay là tải được ngay, không phải lùi lại một trang.
 */
export default async function TrangSuKien(
  { params }: { params: Promise<{ duongDan: string; id: string }> },
) {
  const { duongDan, id } = await params;
  const s = await laySuKien(duongDan, id);
  if (!s) notFound();

  const mo = MO_TA_SU_KIEN[s.loai as MaLoaiSuKien] ?? { ten: 'Sự kiện', mau: '#475569' };
  const hetHan = s.ketThuc.getTime() < Date.now();

  return (
    <article className="space-y-4">
      {s.anh ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.anh} alt="" className="aspect-[16/9] w-full rounded-the object-cover" />
      ) : (
        <span aria-hidden className="block aspect-[16/9] w-full rounded-the"
          style={{ backgroundImage: `linear-gradient(135deg, ${mo.mau}, ${mo.mau}bb)` }} />
      )}

      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: mo.mau }}>
          {mo.ten}
        </p>
        <h1 className="mt-1 text-[21px] font-bold leading-tight tracking-tight">{s.tieuDe}</h1>
        <p className="phu mt-1">{s.moTaNgan}</p>
      </div>

      {/* Mốc thời gian in ĐỦ CẢ HAI ĐẦU ở đây, khác với thẻ ngoài trang game.
          Thẻ thì phải gọn nên chỉ nói "tới ngày nào"; ai đã mở hẳn trang này
          là đang tính xem có kịp tham gia không, và câu ấy cần cả hai mốc. */}
      <p className="the flex items-center gap-2 px-4 py-3 text-[13px]">
        <CalendarDays size={15} className="shrink-0 text-mo" aria-hidden />
        <span className={hetHan ? 'text-mo' : ''}>
          {hetHan ? 'Đã kết thúc · ' : ''}{ngayGio(s.batDau)} → {ngayGio(s.ketThuc)}
        </span>
      </p>

      {s.noiDung && (
        /* `dangerouslySetInnerHTML` ở đây KHÔNG nguy hiểm: `dungChuDam` bật
           `html: false` nên mọi thẻ gõ tay đều bị escape — xem `chu-dam.ts`. */
        <div className="chu-dam" dangerouslySetInnerHTML={{ __html: dungChuDam(s.noiDung) }} />
      )}

      <Link href={`/game/${s.game.duongDan}`} className="nut-vien !w-full">
        Về trang {s.game.ten}
      </Link>
    </article>
  );
}

function ngayGio(d: Date): string {
  const hai = (n: number) => String(n).padStart(2, '0');
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()} ${hai(d.getHours())}:${hai(d.getMinutes())}`;
}
