import Link from 'next/link';
import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { SaoNam } from '@/components/game/SaoNam';
import { ODapDanhGia } from '@/components/game/ODapDanhGia';
import { NutXoaDanhGia } from '@/components/quan-tri/NutXoaDanhGia';
import { PhanTrang } from '@/components/PhanTrang';
import { cachDay, gonSo, gop } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Đánh giá' };

const MOI_TRANG = 20;

const LOC = [
  { ma: 'chua-dap', ten: 'Chưa trả lời' },
  { ma: '', ten: 'Tất cả' },
  { ma: '1', ten: '1★' },
  { ma: '2', ten: '2★' },
  { ma: '3', ten: '3★' },
  { ma: '4', ten: '4★' },
  { ma: '5', ten: '5★' },
];

/*
 * ĐÁNH GIÁ — một chỗ trả lời cho cả kho.
 *
 * Trước đây muốn đáp một bài đánh giá thì phải mò ra trang công khai của đúng
 * game ấy rồi cuộn xuống tìm. Nghĩa là muốn biết còn bài nào chưa đáp, phải
 * mở lần lượt từng game. Trang này gom hết về một chỗ, và MẶC ĐỊNH lọc "chưa
 * trả lời" — mở ra là thấy ngay đúng chồng việc đang chờ, không phải tự lọc.
 *
 * Chỉ hiện bài CÓ LỜI VIẾT. Bài chấm sao suông thì không có gì để trả lời;
 * bày nó ra chỉ làm loãng đúng thứ cần xử lý.
 */
export default async function DanhGiaQuanTri({ searchParams }: {
  searchParams: Promise<{ loc?: string; trang?: string }>;
}) {
  const sp = await searchParams;
  const loc = LOC.some((l) => l.ma === sp.loc) ? (sp.loc ?? 'chua-dap') : 'chua-dap';
  const trang = Math.max(1, Number(sp.trang) || 1);

  const dieuKien: Prisma.DanhGiaWhereInput = {
    noiDung: { not: null },
    ...(loc === 'chua-dap' ? { traLoi: null } : {}),
    ...(/^[1-5]$/.test(loc) ? { sao: Number(loc) } : {}),
  };

  const [tong, bai] = await Promise.all([
    db.danhGia.count({ where: dieuKien }),
    db.danhGia.findMany({
      where: dieuKien,
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      skip: (trang - 1) * MOI_TRANG,
      take: MOI_TRANG,
      select: {
        id: true, sao: true, noiDung: true, taoLuc: true, traLoi: true, traLoiLuc: true,
        nguoi: { select: { tenHienThi: true } },
        game: { select: { ten: true, icon: true, duongDan: true } },
      },
    }),
  ]);

  const tongTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));
  const duong = (l: string, t: number) => {
    const q = new URLSearchParams();
    if (l !== 'chua-dap') q.set('loc', l);
    if (t > 1) q.set('trang', String(t));
    const chu = q.toString();
    return chu ? `/quan-tri/danh-gia?${chu}` : '/quan-tri/danh-gia';
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="tieu-de-trang">Đánh giá</h1>
        <p className="phu mt-1">{gonSo(tong)} bài khớp bộ lọc</p>
      </div>

      <div className="ke gap-1.5">
        {LOC.map((l) => (
          <Link key={l.ma || 'tat-ca'} href={duong(l.ma, 1)}
            className={gop('chip', l.ma === loc && 'chip-chon')}>
            {l.ten}
          </Link>
        ))}
      </div>

      {bai.length === 0 ? (
        <p className="the p-10 text-center text-[13px] text-mo">
          {loc === 'chua-dap' ? 'Đã trả lời hết. Không còn bài nào chờ.' : 'Không có bài nào khớp bộ lọc.'}
        </p>
      ) : (
        <>
          <ul className="the divide-y divide-vien">
            {bai.map((d) => (
              <li key={d.id} className="p-4">
                <div className="flex items-start gap-3">
                  <BieuTuongGame ten={d.game.ten} icon={d.game.icon} co={40} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-[13px]">
                      <span className="font-bold">{d.game.ten}</span>
                      {/* Mở tab mới: đang gõ dở một lời đáp mà bấm sang trang
                          khác là mất sạch chữ vừa gõ. */}
                      <a href={`/game/${d.game.duongDan}`} target="_blank" rel="noreferrer"
                        aria-label={`Mở trang ${d.game.ten} ở tab mới`}
                        className="text-mo hover:text-nhan">
                        <ExternalLink size={12} aria-hidden />
                      </a>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5">
                      <SaoNam diem={d.sao} co={11} />
                      <span className="phu">{d.nguoi.tenHienThi} · {cachDay(d.taoLuc)}</span>
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed">{d.noiDung}</p>

                    {d.traLoi && (
                      <div className="mt-2.5 rounded-the bg-nen3 px-3 py-2.5">
                        <p className="text-[12px] font-bold text-nhan">
                          Đã trả lời
                          {d.traLoiLuc && <span className="phu ml-1.5 font-normal">{cachDay(d.traLoiLuc)}</span>}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-mo">{d.traLoi}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <ODapDanhGia danhGiaId={d.id} banDau={d.traLoi} />
                      {/* Xoá nằm cạnh Trả lời chứ không giấu đi: bài rác thì
                          việc cần làm là xoá, không phải đáp lại nó. */}
                      <NutXoaDanhGia danhGiaId={d.id} tenGame={d.game.ten}
                        nguoi={d.nguoi.tenHienThi} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <PhanTrang trang={trang} tongTrang={tongTrang} dungDuong={(t) => duong(loc, t)} />
        </>
      )}
    </div>
  );
}
