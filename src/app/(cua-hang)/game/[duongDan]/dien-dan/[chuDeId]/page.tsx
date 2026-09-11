import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChevronLeft, Lock, Pin } from 'lucide-react';
import { db } from '@/lib/db';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { BieuMauGui } from '@/components/BieuMauGui';
import { SuaChuDe, SuaTraLoi } from '@/components/game/OSuaBaiDienDan';
import { NutBaoXau } from '@/components/NutBaoXau';
import { AnhDaiDien, TenNguoi } from '@/components/NguoiDung';
import { PhanTrang } from '@/components/PhanTrang';
import { traLoi } from '../viec';
import { MOI_TRANG_TRA_LOI } from '../moi-trang';
import { cachDay, catChu, kep, soTrang } from '@/lib/tien-ich';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ chuDeId: string }> }): Promise<Metadata> {
  const { chuDeId } = await params;
  const c = await db.chuDe.findUnique({ where: { id: chuDeId }, select: { tieuDe: true } });
  return { title: c ? catChu(c.tieuDe, 60) : 'Chủ đề' };
}

export default async function TrangChuDe({ params, searchParams }: {
  params: Promise<{ duongDan: string; chuDeId: string }>;
  searchParams: Promise<{ trang?: string }>;
}) {
  const { duongDan, chuDeId } = await params;
  const { trang: trangNhap } = await searchParams;

  const chuDe = await db.chuDe.findFirst({
    where: { id: chuDeId, game: { duongDan, trangThai: 'DANG_HIEN' } },
    select: {
      id: true, tieuDe: true, noiDung: true, ghim: true, khoa: true, taoLuc: true,
      nguoiId: true,
      nguoi: { select: { tenHienThi: true, tenDangNhap: true, anh: true } },
      game: { select: { ten: true, duongDan: true } },
    },
  });
  if (!chuDe) notFound();

  /*
   * ĐẾM THẬT, không đọc `ChuDe.soTraLoi`.
   *
   * `soTraLoi` là bộ đếm dựng sẵn để danh sách chủ đề khỏi phải đếm từng dòng,
   * và nó có thể lệch (một lần ghi hỏng là lệch mãi). Ở đây con số quyết định
   * CÓ BAO NHIÊU TRANG — lệch một là sinh ra một trang trống, hoặc giấu mất
   * bài cuối cùng.
   */
  const tongTraLoi = await db.traLoi.count({ where: { chuDeId: chuDe.id } });
  const tongTrang = soTrang(tongTraLoi, MOI_TRANG_TRA_LOI);
  const trang = kep(trangNhap, 1, tongTrang, 1);

  const danhSach = await db.traLoi.findMany({
    where: { chuDeId: chuDe.id },
    // Xếp theo thời gian, khoá phụ `id`: hai bài gửi trong cùng một phần nghìn
    // giây mà không có khoá phụ thì thứ tự đổi mỗi lần hỏi, và phân trang lặp bài.
    orderBy: [{ taoLuc: 'asc' }, { id: 'asc' }],
    skip: (trang - 1) * MOI_TRANG_TRA_LOI,
    take: MOI_TRANG_TRA_LOI,
    select: {
      id: true, noiDung: true, taoLuc: true, nguoiId: true,
      nguoi: { select: { tenHienThi: true, tenDangNhap: true, anh: true } },
    },
  });

  const nguoi = await nguoiHienTai();
  const duongTrang = (t: number) =>
    `/game/${chuDe.game.duongDan}/dien-dan/${chuDe.id}${t > 1 ? `?trang=${t}` : ''}`;

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
          <TenNguoi ten={chuDe.nguoi.tenHienThi} tenDangNhap={chuDe.nguoi.tenDangNhap} />
          {' · '}{cachDay(chuDe.taoLuc)} · {tongTraLoi} trả lời
        </p>
      </header>

      <article className="the p-4">
        <Nguoi nguoi={chuDe.nguoi} luc={chuDe.taoLuc} />
        <p className="mt-2.5 whitespace-pre-line text-[14px] leading-relaxed">{chuDe.noiDung}</p>
        {/* Nút sửa chỉ VẼ ra cho chủ bài và khi chủ đề chưa khoá; chặn thật
            nằm trong `where` của Prisma ở `suaChuDe`. */}
        {nguoi?.id === chuDe.nguoiId && !chuDe.khoa && (
          <SuaChuDe chuDeId={chuDe.id} tieuDe={chuDe.tieuDe} noiDung={chuDe.noiDung}
            xoaDuoc={tongTraLoi === 0} />
        )}
        {nguoi && nguoi.id !== chuDe.nguoiId && (
          <div className="mt-3"><NutBaoXau loai="chuDe" mucId={chuDe.id} /></div>
        )}
      </article>

      {danhSach.length > 0 && (
        <ul aria-label="Các trả lời" className="space-y-3">
          {danhSach.map((t) => (
            /* Mỗi bài mang một mỏ neo: trả lời xong máy chủ đưa thẳng người
               viết tới đúng bài vừa gửi, kể cả khi nó rơi sang trang mới. */
            <li key={t.id} id={`tl-${t.id}`} className="the p-4 scroll-mt-24">
              <Nguoi nguoi={t.nguoi} luc={t.taoLuc} />
              <p className="mt-2.5 whitespace-pre-line text-[14px] leading-relaxed">{t.noiDung}</p>
              {nguoi?.id === t.nguoiId && !chuDe.khoa && (
                <SuaTraLoi traLoiId={t.id} noiDung={t.noiDung} />
              )}
              {nguoi && nguoi.id !== t.nguoiId && (
                <div className="mt-2.5"><NutBaoXau loai="traLoi" mucId={t.id} /></div>
              )}
            </li>
          ))}
        </ul>
      )}

      <PhanTrang trang={trang} tongTrang={tongTrang} dungDuong={duongTrang} />

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

function Nguoi({ nguoi, luc }: {
  nguoi: { tenHienThi: string; tenDangNhap: string; anh: string | null };
  luc: Date;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <AnhDaiDien ten={nguoi.tenHienThi} anh={nguoi.anh} co={32} />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold">
          <TenNguoi ten={nguoi.tenHienThi} tenDangNhap={nguoi.tenDangNhap} />
        </p>
        <p className="phu">{cachDay(luc)}</p>
      </div>
    </div>
  );
}
