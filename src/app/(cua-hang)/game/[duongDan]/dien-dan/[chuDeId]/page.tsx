import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChevronLeft, Lock, Pin } from 'lucide-react';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { BieuMauGui } from '@/components/BieuMauGui';
import { SuaChuDe, SuaTraLoi } from '@/components/game/OSuaBaiDienDan';
import { traLoi } from '../viec';
import { cachDay, catChu } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ chuDeId: string }> }): Promise<Metadata> {
  const { chuDeId } = await params;
  const c = await db.chuDe.findUnique({ where: { id: chuDeId }, select: { tieuDe: true } });
  return { title: c ? catChu(c.tieuDe, 60) : 'Chủ đề' };
}

export default async function TrangChuDe({ params }: {
  params: Promise<{ duongDan: string; chuDeId: string }>;
}) {
  const { duongDan, chuDeId } = await params;

  const chuDe = await db.chuDe.findFirst({
    where: { id: chuDeId, game: { duongDan, trangThai: 'DANG_HIEN' } },
    select: {
      id: true, tieuDe: true, noiDung: true, ghim: true, khoa: true, taoLuc: true,
      nguoiId: true,
      nguoi: { select: { tenHienThi: true, tenDangNhap: true } },
      game: { select: { ten: true, duongDan: true } },
      traLoi: {
        orderBy: { taoLuc: 'asc' },
        take: 200,
        select: {
          id: true, noiDung: true, taoLuc: true, nguoiId: true,
          nguoi: { select: { tenHienThi: true, tenDangNhap: true } },
        },
      },
    },
  });
  if (!chuDe) notFound();

  const nguoi = await nguoiHienTai();

  return (
    <div className="max-w-3xl space-y-5">
      {/* Giữ lối lùi ở đây: hàng tab chỉ nói "đang ở phần Diễn đàn", không
          phân biệt được danh sách chủ đề với một bài cụ thể. */}
      <Link href={`/game/${chuDe.game.duongDan}/dien-dan`}
        className="inline-flex items-center gap-1 text-[13px] font-semibold text-mo hover:text-chu">
        <ChevronLeft size={15} aria-hidden /> Tất cả chủ đề
      </Link>

      <header>
        <h1 className="flex items-start gap-2 text-[22px] font-bold leading-tight tracking-tight">
          {chuDe.ghim && <Pin size={16} className="mt-1.5 shrink-0 text-nhan" />}
          {chuDe.tieuDe}
        </h1>
        <p className="phu mt-1">
          {chuDe.nguoi.tenHienThi} · {cachDay(chuDe.taoLuc)} · {chuDe.traLoi.length} trả lời
        </p>
      </header>

      <article className="the p-4">
        <Nguoi ten={chuDe.nguoi.tenHienThi} luc={chuDe.taoLuc} />
        <p className="mt-2.5 whitespace-pre-line text-[14px] leading-relaxed">{chuDe.noiDung}</p>
        {/* Nút sửa chỉ VẼ ra cho chủ bài và khi chủ đề chưa khoá; chặn thật
            nằm trong `where` của Prisma ở `suaChuDe`. */}
        {nguoi?.id === chuDe.nguoiId && !chuDe.khoa && (
          <SuaChuDe chuDeId={chuDe.id} tieuDe={chuDe.tieuDe} noiDung={chuDe.noiDung}
            xoaDuoc={chuDe.traLoi.length === 0} />
        )}
      </article>

      {chuDe.traLoi.length > 0 && (
        <ul className="space-y-3">
          {chuDe.traLoi.map((t) => (
            <li key={t.id} className="the p-4">
              <Nguoi ten={t.nguoi.tenHienThi} luc={t.taoLuc} />
              <p className="mt-2.5 whitespace-pre-line text-[14px] leading-relaxed">{t.noiDung}</p>
              {nguoi?.id === t.nguoiId && !chuDe.khoa && (
                <SuaTraLoi traLoiId={t.id} noiDung={t.noiDung} />
              )}
            </li>
          ))}
        </ul>
      )}

      {chuDe.khoa ? (
        <p className="the flex items-center justify-center gap-2 p-4 text-[13px] text-mo">
          <Lock size={14} /> Chủ đề đã khoá, không nhận thêm trả lời.
        </p>
      ) : nguoi ? (
        <div className="the p-4">
          <h2 className="mb-2 text-[14px] font-bold">Trả lời</h2>
          <BieuMauGui viec={traLoi} nut="Gửi trả lời" xoaSauKhiGui>
            <input type="hidden" name="chuDeId" value={chuDe.id} />
            <input type="hidden" name="duongDan" value={chuDe.game.duongDan} />
            <textarea name="noiDung" required minLength={2} maxLength={8000} rows={4}
              className="o-nhap" placeholder="Viết trả lời của bạn…" />
          </BieuMauGui>
        </div>
      ) : (
        <div className="the p-4 text-center">
          <p className="phu">Đăng nhập để trả lời chủ đề này.</p>
          <Link href="/dang-nhap" className="nut-xam mt-2.5">Đăng nhập</Link>
        </div>
      )}
    </div>
  );
}

function Nguoi({ ten, luc }: { ten: string; luc: Date }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-nen3 text-[12px] font-bold">
        {ten.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold">{ten}</p>
        <p className="phu">{cachDay(luc)}</p>
      </div>
    </div>
  );
}
