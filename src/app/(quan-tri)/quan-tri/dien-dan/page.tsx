import Link from 'next/link';
import type { Metadata } from 'next';
import { ExternalLink, Lock, MessageSquare, Pin } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { NutChuDe } from '@/components/quan-tri/HangChuDe';
import { PhanTrang } from '@/components/PhanTrang';
import { cachDay, gonSo, gop } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Diễn đàn' };

const MOI_TRANG = 25;

const LOC = [
  { ma: '', ten: 'Tất cả' },
  { ma: 'ghim', ten: 'Đang ghim' },
  { ma: 'khoa', ten: 'Đã khoá' },
  { ma: 'im', ten: 'Chưa ai đáp' },
];

/*
 * KIỂM DUYỆT DIỄN ĐÀN.
 *
 * Trang diễn đàn ngoài cửa hàng vốn đã BIẾT vẽ chủ đề được ghim (có biểu tượng
 * ghim, nằm trên đầu danh sách) và chủ đề bị khoá (ghi "đã khoá", giấu ô trả
 * lời đi). Nhưng hai cột ấy chưa từng có đường nào để đặt, nên cả hai vĩnh
 * viễn bằng `false` — mã hiển thị viết xong rồi mà không ai dùng tới được.
 *
 * Trang này là cái công tắc còn thiếu, kèm nút xoá cho chủ đề rác.
 */
export default async function DienDanQuanTri({ searchParams }: {
  searchParams: Promise<{ loc?: string; trang?: string }>;
}) {
  const sp = await searchParams;
  const loc = LOC.some((l) => l.ma === sp.loc) ? (sp.loc ?? '') : '';
  const trang = Math.max(1, Number(sp.trang) || 1);

  const dieuKien: Prisma.ChuDeWhereInput = {
    ...(loc === 'ghim' ? { ghim: true } : {}),
    ...(loc === 'khoa' ? { khoa: true } : {}),
    ...(loc === 'im' ? { soTraLoi: 0 } : {}),
  };

  const [tong, chuDe] = await Promise.all([
    db.chuDe.count({ where: dieuKien }),
    db.chuDe.findMany({
      where: dieuKien,
      // Ghim lên đầu, đúng thứ tự diễn đàn thật bày ra — người kiểm duyệt phải
      // thấy đúng cái danh sách mà người đọc đang thấy.
      orderBy: [{ ghim: 'desc' }, { traLoiCuoiLuc: 'desc' }, { id: 'desc' }],
      skip: (trang - 1) * MOI_TRANG,
      take: MOI_TRANG,
      select: {
        id: true, tieuDe: true, ghim: true, khoa: true, soTraLoi: true, taoLuc: true,
        nguoi: { select: { tenHienThi: true } },
        game: { select: { ten: true, duongDan: true } },
      },
    }),
  ]);

  const tongTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));
  const duong = (l: string, t: number) => {
    const q = new URLSearchParams();
    if (l) q.set('loc', l);
    if (t > 1) q.set('trang', String(t));
    const chu = q.toString();
    return chu ? `/quan-tri/dien-dan?${chu}` : '/quan-tri/dien-dan';
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="tieu-de-trang">Diễn đàn</h1>
        <p className="phu mt-1">{gonSo(tong)} chủ đề khớp bộ lọc</p>
      </div>

      <div className="ke gap-1.5">
        {LOC.map((l) => (
          <Link key={l.ma || 'tat-ca'} href={duong(l.ma, 1)}
            className={gop('chip', l.ma === loc && 'chip-chon')}>
            {l.ten}
          </Link>
        ))}
      </div>

      {chuDe.length === 0 ? (
        <p className="the p-10 text-center text-[13px] text-mo">Không có chủ đề nào khớp bộ lọc.</p>
      ) : (
        <>
          <ul className="the divide-y divide-vien">
            {chuDe.map((c) => (
              <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5">
                    {c.ghim && <Pin size={13} className="shrink-0 text-nhan" aria-label="đang ghim" />}
                    {c.khoa && <Lock size={13} className="shrink-0 text-canh" aria-label="đã khoá" />}
                    <span className="truncate text-[14px] font-semibold">{c.tieuDe}</span>
                    {/* Mở tab mới: đang duyệt một danh sách dài mà bấm đi là
                        mất chỗ, phải lọc lại và lật lại đúng trang ấy. */}
                    <a href={`/game/${c.game.duongDan}/dien-dan/${c.id}`} target="_blank" rel="noreferrer"
                      aria-label={`Mở chủ đề ${c.tieuDe} ở tab mới`}
                      className="shrink-0 text-mo hover:text-nhan">
                      <ExternalLink size={12} aria-hidden />
                    </a>
                  </p>
                  <p className="phu mt-0.5 flex flex-wrap items-center gap-x-2">
                    <span className="truncate">{c.game.ten}</span>
                    <span>·</span>
                    <span className="truncate">{c.nguoi.tenHienThi}</span>
                    <span>·</span>
                    <span>{cachDay(c.taoLuc)}</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={11} aria-hidden /> {c.soTraLoi}
                    </span>
                  </p>
                </div>

                <NutChuDe c={{
                  id: c.id, tieuDe: c.tieuDe, ghim: c.ghim, khoa: c.khoa,
                  soTraLoi: c.soTraLoi, taoLuc: c.taoLuc.toISOString(),
                  tenNguoi: c.nguoi.tenHienThi, tenGame: c.game.ten,
                  duongDanGame: c.game.duongDan,
                }} />
              </li>
            ))}
          </ul>

          <PhanTrang trang={trang} tongTrang={tongTrang} dungDuong={(t) => duong(loc, t)} />
        </>
      )}
    </div>
  );
}
