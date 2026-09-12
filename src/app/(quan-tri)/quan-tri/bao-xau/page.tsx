import Link from 'next/link';
import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { NutBaoXauQuanTri } from '@/components/quan-tri/NutBaoXauQuanTri';
import { PhanTrang } from '@/components/PhanTrang';
import { tenLyDo } from '@/lib/bao-xau-const';
import { cachDay, catChu, gonSo, gop } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Báo xấu' };

const MOI_TRANG = 25;

const LOC = [
  { ma: 'CHO_XEM', ten: 'Chờ xem' },
  { ma: '', ten: 'Tất cả' },
  { ma: 'BO_QUA', ten: 'Đã bỏ qua' },
];

/*
 * HÀNG CHỜ BÁO XẤU.
 *
 * Ban quản trị xoá được bài rác từ lâu, nhưng chưa có cách nào BIẾT bài nào
 * rác — phải tự đọc hết diễn đàn và mọi đánh giá. Trang này là đầu kia của
 * việc ấy: người đọc gặp bài rác trước tiên, và giờ họ chỉ được chỗ.
 *
 * Mặc định lọc "chờ xem": mở ra là thấy đúng chồng việc đang chờ, không phải
 * tự lọc. Trạng thái "đã xử lý" không có trong danh sách lọc vì nó không tồn
 * tại — xoá nội dung là mấy lượt báo về nó biến mất theo `Cascade`, nên chỉ
 * còn hai kết cục: xoá, hoặc bỏ qua.
 */
export default async function BaoXauQuanTri({ searchParams }: {
  searchParams: Promise<{ loc?: string; trang?: string }>;
}) {
  const sp = await searchParams;
  const loc = LOC.some((l) => l.ma === sp.loc) ? (sp.loc ?? 'CHO_XEM') : 'CHO_XEM';
  const trang = Math.max(1, Number(sp.trang) || 1);

  const dieuKien: Prisma.BaoXauWhereInput = loc ? { trangThai: loc as 'CHO_XEM' } : {};

  const [tong, bao] = await Promise.all([
    db.baoXau.count({ where: dieuKien }),
    db.baoXau.findMany({
      where: dieuKien,
      orderBy: [{ taoLuc: 'desc' }, { id: 'desc' }],
      skip: (trang - 1) * MOI_TRANG,
      take: MOI_TRANG,
      select: {
        id: true, lyDo: true, ghiChu: true, trangThai: true, taoLuc: true,
        nguoi: { select: { tenHienThi: true } },
        danhGia: {
          select: {
            id: true, sao: true, noiDung: true,
            nguoi: { select: { tenHienThi: true } },
            game: { select: { ten: true, duongDan: true } },
          },
        },
        chuDe: {
          select: {
            id: true, tieuDe: true, noiDung: true,
            nguoi: { select: { tenHienThi: true } },
            game: { select: { ten: true, duongDan: true } },
          },
        },
        traLoi: {
          select: {
            id: true, noiDung: true,
            nguoi: { select: { tenHienThi: true } },
            chuDe: { select: { id: true, tieuDe: true, game: { select: { duongDan: true } } } },
          },
        },
      },
    }),
  ]);

  const tongTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));
  const duong = (l: string, t: number) => {
    const q = new URLSearchParams();
    if (l !== 'CHO_XEM') q.set('loc', l);
    if (t > 1) q.set('trang', String(t));
    const chu = q.toString();
    return chu ? `/quan-tri/bao-xau?${chu}` : '/quan-tri/bao-xau';
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="tieu-de-trang">Báo xấu</h1>
        <p className="phu mt-1">{gonSo(tong)} lượt báo khớp bộ lọc</p>
      </div>

      <div className="ke gap-1.5">
        {LOC.map((l) => (
          <Link key={l.ma || 'tat-ca'} href={duong(l.ma, 1)}
            className={gop('chip', l.ma === loc && 'chip-chon')}>
            {l.ten}
          </Link>
        ))}
      </div>

      {bao.length === 0 ? (
        <p className="the p-10 text-center text-[13px] text-mo">
          {loc === 'CHO_XEM' ? 'Không có lượt báo nào đang chờ.' : 'Không có lượt báo nào khớp bộ lọc.'}
        </p>
      ) : (
        <>
          <ul className="the divide-y divide-vien">
            {bao.map((b) => {
              const m = doiThanhMuc(b);
              return (
                <li key={b.id} className="flex flex-wrap items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-[13px]">
                      <span className="rounded-full bg-xau/10 px-2 py-0.5 text-[11px] font-bold text-xau">
                        {tenLyDo(b.lyDo)}
                      </span>
                      <span className="text-mo">{b.nguoi.tenHienThi} báo · {cachDay(b.taoLuc)}</span>
                      {b.trangThai === 'BO_QUA' && (
                        <span className="phu">· đã bỏ qua</span>
                      )}
                    </p>

                    {b.ghiChu && (
                      <p className="phu mt-1 italic">“{b.ghiChu}”</p>
                    )}

                    {m ? (
                      <div className="mt-2 rounded-the bg-nen3/60 p-3">
                        <p className="flex flex-wrap items-center gap-x-2 text-[12px] font-semibold">
                          <span>{m.nhan}</span>
                          <span className="text-mo">· {m.tacGia}</span>
                          {/* Mở tab mới: đang duyệt hàng chờ mà bấm đi là mất
                              chỗ, phải lọc lại và lật lại đúng trang ấy. */}
                          <a href={m.dia} target="_blank" rel="noreferrer"
                            aria-label={`Mở ${m.nhan} ở tab mới`} className="text-mo hover:text-nhan">
                            <ExternalLink size={12} aria-hidden />
                          </a>
                        </p>
                        <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed">
                          {catChu(m.chu, 400)}
                        </p>
                      </div>
                    ) : (
                      /* Nội dung đã bị xoá trước đó thì hàng báo cũng đi theo
                         `Cascade` — nên gặp trường hợp này nghĩa là dữ liệu
                         lệch, và nói thẳng ra vẫn hơn là hiện một ô trống. */
                      <p className="phu mt-2">Nội dung bị báo không còn nữa.</p>
                    )}
                  </div>

                  {b.trangThai === 'CHO_XEM' && m && (
                    <NutBaoXauQuanTri baoXauId={b.id} loai={m.loai} mucId={m.id} moTa={m.nhan} />
                  )}
                </li>
              );
            })}
          </ul>

          <PhanTrang trang={trang} tongTrang={tongTrang} dungDuong={(t) => duong(loc, t)} />
        </>
      )}
    </div>
  );
}

/**
 * Ba loại nội dung gom về một hình dạng chung để vẽ.
 *
 * Không viết ba nhánh JSX gần giống nhau: ba nhánh ấy rồi sẽ trôi khỏi nhau,
 * và người sửa một nhánh quên hai nhánh kia là chuyện của vài tuần nữa.
 */
function doiThanhMuc(b: {
  danhGia: { id: string; sao: number; noiDung: string | null; nguoi: { tenHienThi: string }; game: { ten: string; duongDan: string } } | null;
  chuDe: { id: string; tieuDe: string; noiDung: string; nguoi: { tenHienThi: string }; game: { ten: string; duongDan: string } } | null;
  traLoi: { id: string; noiDung: string; nguoi: { tenHienThi: string }; chuDe: { id: string; tieuDe: string; game: { duongDan: string } } } | null;
}): { loai: 'danhGia' | 'chuDe' | 'traLoi'; id: string; nhan: string; tacGia: string; chu: string; dia: string } | null {
  if (b.danhGia) {
    return {
      loai: 'danhGia', id: b.danhGia.id,
      nhan: `Đánh giá ${b.danhGia.sao}★ · ${b.danhGia.game.ten}`,
      tacGia: b.danhGia.nguoi.tenHienThi,
      chu: b.danhGia.noiDung ?? '',
      dia: `/game/${b.danhGia.game.duongDan}`,
    };
  }
  if (b.chuDe) {
    return {
      loai: 'chuDe', id: b.chuDe.id,
      nhan: `Chủ đề “${b.chuDe.tieuDe}”`,
      tacGia: b.chuDe.nguoi.tenHienThi,
      chu: b.chuDe.noiDung,
      dia: `/game/${b.chuDe.game.duongDan}/dien-dan/${b.chuDe.id}`,
    };
  }
  if (b.traLoi) {
    return {
      loai: 'traLoi', id: b.traLoi.id,
      nhan: `Lời đáp trong “${b.traLoi.chuDe.tieuDe}”`,
      tacGia: b.traLoi.nguoi.tenHienThi,
      chu: b.traLoi.noiDung,
      dia: `/game/${b.traLoi.chuDe.game.duongDan}/dien-dan/${b.traLoi.chuDe.id}`,
    };
  }
  return null;
}
