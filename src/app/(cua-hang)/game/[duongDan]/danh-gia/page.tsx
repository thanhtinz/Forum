import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { DANG_HIEN } from '@/lib/danh-muc';
import { PhoDiem } from '@/components/game/PhoDiem';
import { ODanhGia } from '@/components/game/ODanhGia';
import { BaiDanhGia, CHON_DANH_GIA } from '@/components/game/BaiDanhGia';
import { PhanTrang } from '@/components/PhanTrang';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { gonSo, gop, kep, soTrang } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ duongDan: string }> }): Promise<Metadata> {
  const { duongDan } = await params;
  const g = await db.game.findFirst({ where: { duongDan }, select: { ten: true } });
  return { title: g ? `Đánh giá ${g.ten}` : 'Đánh giá' };
}

/*
 * Cách sắp. Ba lối, và mỗi lối trả lời một câu hỏi khác nhau:
 *   • mới nhất — "bản vừa ra có ai kêu gì không";
 *   • điểm cao — "người thích game này thích ở chỗ nào";
 *   • điểm thấp — "nó hỏng ở đâu", câu người ta hay hỏi nhất trước khi tải.
 *
 * Khoá phụ `id` ở mọi lối: hai bài cùng mốc giờ (hoặc cùng số sao, rất thường)
 * mà không có khoá phụ thì Postgres xếp tuỳ ý, và sang trang 2 gặp lại bài
 * trang 1 trong khi một bài khác không trang nào có.
 */
const CACH_SAP = [
  { ma: 'moi', ten: 'Mới nhất', theo: [{ taoLuc: 'desc' }, { id: 'desc' }] },
  { ma: 'cao', ten: 'Điểm cao', theo: [{ sao: 'desc' }, { taoLuc: 'desc' }, { id: 'desc' }] },
  { ma: 'thap', ten: 'Điểm thấp', theo: [{ sao: 'asc' }, { taoLuc: 'desc' }, { id: 'desc' }] },
] as const;

const MOI_TRANG = 20;

/*
 * TAB "ĐÁNH GIÁ" — toàn bộ, lọc được theo sao và sắp được.
 *
 * Tab Thông tin chỉ khoe sáu bài mới nhất, nghĩa là ở một game đông người chơi
 * thì gần như mọi lời nhận xét đều nằm ngoài tầm với. Đây là chỗ đọc hết.
 */
export default async function TabDanhGia({ params, searchParams }: {
  params: Promise<{ duongDan: string }>;
  searchParams: Promise<{ sao?: string; sap?: string; trang?: string }>;
}) {
  const { duongDan } = await params;
  const sp = await searchParams;

  const game = await db.game.findFirst({
    where: { duongDan, ...DANG_HIEN },
    select: { id: true, duongDan: true },
  });
  if (!game) notFound();

  // Tham số trên địa chỉ là thứ ai cũng sửa tay được, nên số rác chỉ có nghĩa
  // là "không lọc" / "sắp kiểu mặc định", chứ không phải lỗi.
  const soLoc = Number(sp.sao);
  const locSao = Number.isInteger(soLoc) && soLoc >= 1 && soLoc <= 5 ? soLoc : null;
  const sap = CACH_SAP.find((c) => c.ma === sp.sap) ?? CACH_SAP[0];

  const nguoi = await nguoiHienTai();
  const loc = { gameId: game.id, ...(locSao ? { sao: locSao } : {}) };

  const [phanBo, tong, cuaToi] = await Promise.all([
    db.danhGia.groupBy({ by: ['sao'], where: { gameId: game.id }, _count: { _all: true } }),
    db.danhGia.count({ where: loc }),
    nguoi
      ? db.danhGia.findUnique({
          where: { gameId_nguoiId: { gameId: game.id, nguoiId: nguoi.id } },
          select: { sao: true, noiDung: true },
        })
      : null,
  ]);

  const tongTrang = soTrang(tong, MOI_TRANG);
  const trang = kep(sp.trang, 1, tongTrang, 1);

  const danhGia = await db.danhGia.findMany({
    where: loc,
    orderBy: [...sap.theo],
    skip: (trang - 1) * MOI_TRANG,
    take: MOI_TRANG,
    select: CHON_DANH_GIA,
  });

  const goc = `/game/${game.duongDan}/danh-gia`;
  /** Dựng địa chỉ giữ nguyên những lựa chọn KHÔNG đổi ở lần bấm này. */
  const duong = (doi: { sao?: number | null; sap?: string; trang?: number }) => {
    const s = doi.sao === undefined ? locSao : doi.sao;
    const c = doi.sap ?? sap.ma;
    // Đổi bộ lọc hay cách sắp thì về trang 1: trang 7 của danh sách cũ gần như
    // chắc chắn không còn tồn tại trong danh sách mới.
    const t = doi.trang ?? 1;
    const q = new URLSearchParams();
    if (s) q.set('sao', String(s));
    if (c !== CACH_SAP[0].ma) q.set('sap', c);
    if (t > 1) q.set('trang', String(t));
    const chuoi = q.toString();
    return chuoi ? `${goc}?${chuoi}` : goc;
  };

  const gom = phanBo.reduce((t, p) => t + p._count._all, 0);
  const tongSao = phanBo.reduce((t, p) => t + p.sao * p._count._all, 0);
  const diem = gom > 0 ? Math.round((tongSao / gom) * 10) / 10 : 0;

  return (
    <div className="max-w-3xl space-y-5">
      <PhoDiem sao={diem} tong={gom} locSao={locSao}
        phanBo={Object.fromEntries(phanBo.map((p) => [p.sao, p._count._all]))}
        dungDuong={(s) => duong({ sao: s })} />

      <ODanhGia gameId={game.id} banDau={cuaToi} daDangNhap={!!nguoi} />

      {gom > 0 && (
        <div className="vach flex flex-wrap items-center gap-2 border-t pt-4">
          {CACH_SAP.map((c) => (
            <Link key={c.ma} href={duong({ sap: c.ma })} scroll={false}
              className={gop('chip', c.ma === sap.ma && 'chip-chon')}>
              {c.ten}
            </Link>
          ))}
          {locSao && (
            <Link href={duong({ sao: null })} scroll={false}
              className="text-[12px] font-semibold text-mo hover:text-chu hover:underline">
              Bỏ lọc {locSao} sao
            </Link>
          )}
        </div>
      )}

      {tong === 0 ? (
        <p className="phu">
          {locSao ? `Chưa có bài nào ${locSao} sao.` : 'Chưa ai đánh giá game này.'}
        </p>
      ) : (
        <>
          {/* Phổ điểm phía trên đã in tổng số rồi, nên chỉ nhắc lại khi đang
              LỌC — lúc ấy hai con số khác nhau và người đọc cần con số của
              phần đang xem. */}
          {locSao && <p className="phu">{gonSo(tong)} đánh giá {locSao} sao</p>}
          <ul aria-label="Danh sách đánh giá" className="space-y-4">
            {danhGia.map((d) => (
              <li key={d.id} className="vach pt-4 first:border-0 first:pt-0">
                <BaiDanhGia d={d} nguoiXemId={nguoi?.id ?? null}
                  laQuanTri={nguoi?.vaiTro === 'QUAN_TRI'} />
              </li>
            ))}
          </ul>
          <PhanTrang trang={trang} tongTrang={tongTrang}
            dungDuong={(t) => duong({ trang: t })} />
        </>
      )}
    </div>
  );
}
