import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChevronLeft, CircleCheckBig, CornerDownRight, Lock, Pin, X } from 'lucide-react';
import { db } from '@/lib/db';
import { dungChuDam } from '@/lib/chu-dam';
import { OSoanThao } from '@/components/OSoanThao';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { BieuMauGui } from '@/components/BieuMauGui';
import { SuaChuDe, SuaTraLoi } from '@/components/game/OSuaBaiDienDan';
import { NutBaoXau } from '@/components/NutBaoXau';
import { NutLoiGiai } from '@/components/game/NutLoiGiai';
import { AnhDaiDien, TenNguoi } from '@/components/NguoiDung';
import { PhanTrang } from '@/components/PhanTrang';
import { traLoi } from '../viec';
import { MOI_TRANG_TRA_LOI } from '../moi-trang';
import { cachDay, catChu, gop, kep, soTrang } from '@/lib/tien-ich';
import { rutGon } from '@/lib/trich-dan-const';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ chuDeId: string }> }): Promise<Metadata> {
  const { chuDeId } = await params;
  const c = await db.chuDe.findUnique({ where: { id: chuDeId }, select: { tieuDe: true } });
  return { title: c ? catChu(c.tieuDe, 60) : 'Chủ đề' };
}

export default async function TrangChuDe({ params, searchParams }: {
  params: Promise<{ duongDan: string; chuDeId: string }>;
  searchParams: Promise<{ trang?: string; dap?: string }>;
}) {
  const { duongDan, chuDeId } = await params;
  const { trang: trangNhap, dap } = await searchParams;

  const chuDe = await db.chuDe.findFirst({
    where: { id: chuDeId, game: { duongDan, trangThai: 'DANG_HIEN' } },
    select: {
      id: true, tieuDe: true, noiDung: true, ghim: true, khoa: true, taoLuc: true,
      nguoiId: true, loiGiaiId: true,
      loiGiai: { select: { id: true, taoLuc: true, nguoi: { select: { tenHienThi: true } } } },
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
      // Chỉ lấy đúng mẩu cần để in dòng trích — không kéo cả bài gốc về.
      traLoiCho: {
        select: { id: true, noiDung: true, nguoi: { select: { tenHienThi: true } } },
      },
    },
  });

  const nguoi = await nguoiHienTai();
  const duongTrang = (t: number) =>
    `/game/${chuDe.game.duongDan}/dien-dan/${chuDe.id}${t > 1 ? `?trang=${t}` : ''}`;

  /*
   * ĐANG ĐỊNH ĐÁP BÀI NÀO — đọc từ ĐỊA CHỈ, không giữ trong trạng thái máy khách.
   *
   * Bấm "Trả lời" là đi tới `?dap=<id>#soan`, tức là một lượt tải trang thật.
   * Đổi lại được ba thứ: dán được địa chỉ ấy cho người khác, nút Lùi quay về
   * đúng chỗ cũ, và chọn xong mà tải lại trang thì lựa chọn vẫn còn. Giữ trong
   * `useState` thì cả ba đều mất.
   *
   * Điều kiện `chuDeId` nằm trong `where`: `dap` tới từ địa chỉ nên ai cũng
   * sửa được, trỏ sang bài ở chủ đề khác thì trang sẽ in một mẩu trích chẳng
   * liên quan gì.
   */
  /*
   * LỜI GIẢI NẰM Ở ĐÂU TRONG DÃY BÀI.
   *
   * Không kéo bài lời giải lên đầu danh sách như mấy trang hỏi đáp hay làm:
   * chủ đề ở đây CHIA TRANG, mà xáo thứ tự thì bài lời giải vừa đứng đầu trang
   * một vừa nằm đúng chỗ cũ ở trang ba — in hai lần, hoặc mất một chỗ trong
   * mạch trò chuyện. Giữ nguyên mạch, chỉ dựng một lối tắt chỉ thẳng tới nó.
   *
   * Đếm số bài ĐỨNG TRƯỚC nó để biết nó rơi vào trang mấy — người đọc bấm một
   * lần là tới, kể cả khi lời giải nằm tận trang cuối.
   */
  let loiGiaiO = null;
  if (chuDe.loiGiai) {
    const truoc = await db.traLoi.count({
      where: {
        chuDeId: chuDe.id,
        OR: [
          { taoLuc: { lt: chuDe.loiGiai.taoLuc } },
          { taoLuc: chuDe.loiGiai.taoLuc, id: { lt: chuDe.loiGiai.id } },
        ],
      },
    });
    loiGiaiO = Math.floor(truoc / MOI_TRANG_TRA_LOI) + 1;
  }

  const dangDap = dap
    ? await db.traLoi.findFirst({
      where: { id: dap, chuDeId: chuDe.id },
      select: { id: true, noiDung: true, nguoi: { select: { tenHienThi: true } } },
    })
    : null;

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

      {chuDe.loiGiai && loiGiaiO && (
        <a href={`${duongTrang(loiGiaiO)}#tl-${chuDe.loiGiai.id}`}
          className="the flex items-center gap-2.5 p-3 text-[13px] transition-colors hover:bg-nen3/40">
          <CircleCheckBig size={17} className="shrink-0 text-nhan" aria-hidden />
          <span>
            <b className="font-semibold">Chủ đề này đã có lời giải</b>
            <span className="phu"> — {chuDe.loiGiai.nguoi.tenHienThi} trả lời</span>
          </span>
        </a>
      )}

      <article className="the p-4">
        <Nguoi nguoi={chuDe.nguoi} luc={chuDe.taoLuc} />
        {/*
          `dangerouslySetInnerHTML` ở đây KHÔNG nguy hiểm, và chỗ nguy hiểm
          thật đã bị chặn từ trước: `dungChuDam` bật `html: false`, nên mọi thẻ
          người viết gõ tay đều bị escape thành chữ thường. Đầu ra chỉ chứa
          đúng những thẻ do chính bộ dựng sinh ra — xem `chu-dam.ts`.

          Bài cũ lưu dạng chữ trần vẫn hiện đúng: Markdown coi mỗi dòng trống
          là một đoạn mới, mà bộ dựng bật `breaks` nên một lần xuống dòng cũng
          thành một lần xuống dòng thật.
        */}
        <div className="chu-dam mt-2.5"
          dangerouslySetInnerHTML={{ __html: dungChuDam(chuDe.noiDung) }} />
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
            <li key={t.id} id={`tl-${t.id}`}
              className={gop('the p-4 scroll-mt-24',
                t.id === chuDe.loiGiaiId && 'ring-1 ring-nhan/50')}>
              {t.id === chuDe.loiGiaiId && (
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-nhan">
                  <CircleCheckBig size={14} aria-hidden /> Lời giải
                </p>
              )}
              <Nguoi nguoi={t.nguoi} luc={t.taoLuc} />

              {/* Dòng trích nằm TRÊN bài, không nằm dưới: đọc xuôi từ trên
                  xuống thì phải biết bài này đáp ai TRƯỚC khi đọc nó nói gì. */}
              {t.traLoiCho && (
                <a href={`#tl-${t.traLoiCho.id}`}
                  className="mt-2 flex items-start gap-1.5 rounded-nut bg-nen3/50 px-2.5 py-1.5 text-[12px] text-mo hover:text-chu">
                  <CornerDownRight size={13} className="mt-0.5 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <b className="font-semibold">{t.traLoiCho.nguoi.tenHienThi}</b>
                    {': '}{rutGon(t.traLoiCho.noiDung)}
                  </span>
                </a>
              )}

              <div className="chu-dam chu-dam-nho mt-2.5"
                dangerouslySetInnerHTML={{ __html: dungChuDam(t.noiDung) }} />

              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                {nguoi && !chuDe.khoa && (
                  <a href={`${duongTrang(trang)}${trang > 1 ? '&' : '?'}dap=${t.id}#soan`}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-mo hover:text-nhan">
                    <CornerDownRight size={13} aria-hidden /> Trả lời
                  </a>
                )}
                {/* Chỉ vẽ nút cho người mở chủ đề và ban quản trị; chặn thật
                    nằm trong `where` của Prisma ở `datLoiGiai`. */}
                {nguoi && (nguoi.id === chuDe.nguoiId || nguoi.vaiTro === 'QUAN_TRI') && (
                  <NutLoiGiai chuDeId={chuDe.id} duongDan={chuDe.game.duongDan}
                    traLoiId={t.id} dangLa={t.id === chuDe.loiGiaiId} />
                )}
                {nguoi && nguoi.id !== t.nguoiId && (
                  <NutBaoXau loai="traLoi" mucId={t.id} />
                )}
              </div>

              {nguoi?.id === t.nguoiId && !chuDe.khoa && (
                <SuaTraLoi traLoiId={t.id} noiDung={t.noiDung} />
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
        <div id="soan" className="the scroll-mt-24 p-4">
          {/* Không còn đầu đề "Trả lời" ở đây: chính trình soạn thảo đã mang
              một nhãn "Trả lời" gắn vào ô chữ, nên đầu đề này là chữ thứ hai
              nói đúng một việc, cách nhau một dòng. */}
          {dangDap && (
            <div className="vach mb-3 flex items-start gap-2 rounded-nut border bg-nen3/40 p-2.5">
              <CornerDownRight size={14} className="mt-0.5 shrink-0 text-mo" aria-hidden />
              <p className="min-w-0 flex-1 text-[12px] text-mo">
                Đang đáp <b className="font-semibold text-chu">{dangDap.nguoi.tenHienThi}</b>
                {': '}{rutGon(dangDap.noiDung)}
              </p>
              {/* Bỏ trích bằng một liên kết về chính trang này không kèm `dap`:
                  cùng lẽ với lúc chọn — đi bằng địa chỉ thì Lùi vẫn đúng. */}
              <a href={`${duongTrang(trang)}#soan`} aria-label="Bỏ trích dẫn"
                className="shrink-0 text-mo hover:text-chu">
                <X size={14} aria-hidden />
              </a>
            </div>
          )}
          <BieuMauGui viec={traLoi} nut="Gửi trả lời" xoaSauKhiGui>
            <input type="hidden" name="chuDeId" value={chuDe.id} />
            <input type="hidden" name="duongDan" value={chuDe.game.duongDan} />
            {dangDap && <input type="hidden" name="traLoiChoId" value={dangDap.id} />}
            {/* `key` đổi theo TỔNG số lời đáp: `xoaSauKhiGui` xoá ô chữ trần được,
                nhưng trình soạn thảo giữ chữ trong trạng thái của nó, nên phải
                dựng lại nó sau mỗi lượt gửi — không thì lời đáp vừa gửi vẫn
                nằm trong ô và người ta bấm gửi lần nữa. */}
            <OSoanThao key={tongTraLoi} ten="noiDung" nhan="Trả lời"
              giaTri="" dong={4} gon choAnh="dien-dan" />
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
