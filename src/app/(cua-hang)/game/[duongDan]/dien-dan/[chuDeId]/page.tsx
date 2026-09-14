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
import { NutTheoDoi } from '@/components/game/NutTheoDoi';
import { NutHuuIchTraLoi } from '@/components/game/NutHuuIch';
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
      nguoi: { select: { tenHienThi: true, tenDangNhap: true, anh: true, vaiTro: true } },
      game: { select: { ten: true, duongDan: true, tacGiaId: true } },
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
      id: true, noiDung: true, taoLuc: true, nguoiId: true, soHuuIch: true,
      nguoi: { select: { tenHienThi: true, tenDangNhap: true, anh: true, vaiTro: true } },
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

  /*
   * MÌNH ĐÃ BẤM HỮU ÍCH CHO BÀI NÀO — hỏi MỘT LẦN cho cả trang.
   *
   * Hỏi theo từng bài thì hai mươi bài là hai mươi câu truy vấn, mà câu trả
   * lời chỉ là một chữ có hay không. Cùng lối phần đánh giá đang dùng.
   */
  const daBam = nguoi
    ? new Set((await db.traLoiHuuIch.findMany({
      where: { nguoiId: nguoi.id, traLoiId: { in: danhSach.map((t) => t.id) } },
      select: { traLoiId: true },
    })).map((x) => x.traLoiId))
    : new Set<string>();

  const dangTheo = nguoi
    ? !!(await db.theoDoiChuDe.findUnique({
      where: { chuDeId_nguoiId: { chuDeId: chuDe.id, nguoiId: nguoi.id } },
      select: { chuDeId: true },
    }))
    : false;

  // Gói sẵn hai mốc để nhận vai, khỏi truyền lẻ hai biến xuống từng chỗ.
  const vai = { chuChuDeId: chuDe.nguoiId, tacGiaGameId: chuDe.game.tacGiaId };

  const dangDap = dap
    ? await db.traLoi.findFirst({
      where: { id: dap, chuDeId: chuDe.id },
      select: { id: true, noiDung: true, nguoi: { select: { tenHienThi: true } } },
    })
    : null;

  return (
    <div className="cot-doc space-y-5">
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
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="phu">
            <TenNguoi ten={chuDe.nguoi.tenHienThi} tenDangNhap={chuDe.nguoi.tenDangNhap} />
            {' · '}{cachDay(chuDe.taoLuc)} · {tongTraLoi} trả lời
          </p>
          {/* Công tắc đặt ngay cạnh đầu đề: quyết định "có muốn nghe tiếp
              không" là quyết định người ta lấy lúc vừa đọc xong câu hỏi, chứ
              không phải sau khi cuộn hết hai chục bài. */}
          {nguoi && (
            <NutTheoDoi chuDeId={chuDe.id} duongDan={chuDe.game.duongDan}
              dangTheo={dangTheo} />
          )}
        </div>
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
        <Nguoi nguoi={chuDe.nguoi} nguoiId={chuDe.nguoiId} luc={chuDe.taoLuc} vai={vai} />
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
        {/*
          MỘT hàng nút duy nhất, và đúng một thứ tự cho mọi bài trong chủ đề.

          Nút sửa chỉ VẼ ra cho chủ bài và khi chủ đề chưa khoá; chặn thật nằm
          trong `where` của Prisma ở `suaChuDe`.
        */}
        {nguoi && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {nguoi.id === chuDe.nguoiId && !chuDe.khoa && (
              <SuaChuDe chuDeId={chuDe.id} tieuDe={chuDe.tieuDe} noiDung={chuDe.noiDung}
                xoaDuoc={tongTraLoi === 0} />
            )}
            {nguoi.id !== chuDe.nguoiId && <NutBaoXau loai="chuDe" mucId={chuDe.id} />}
          </div>
        )}
      </article>

      {danhSach.length > 0 && (
        <ul aria-label="Các trả lời" className="space-y-3">
          {danhSach.map((t, i) => (
            /* Mỗi bài mang một mỏ neo: trả lời xong máy chủ đưa thẳng người
               viết tới đúng bài vừa gửi, kể cả khi nó rơi sang trang mới. */
            <li key={t.id} id={`tl-${t.id}`}
              className={gop('the scroll-mt-24 overflow-hidden',
                t.id === chuDe.loiGiaiId && 'ring-1 ring-nhan/40')}>
              {/* Dải đầu tô màu chạy hết bề ngang: một dòng chữ nhỏ trong lòng
                  thẻ thì lướt qua là trôi mất, mà đây đúng là bài đáng dừng
                  lại nhất trong cả chủ đề. */}
              {t.id === chuDe.loiGiaiId && (
                <p className="flex items-center gap-1.5 bg-nhan/10 px-4 py-2 text-[12px] font-bold text-nhan">
                  <CircleCheckBig size={14} aria-hidden /> Lời giải của chủ đề
                </p>
              )}
              <div className="p-4">
              <Nguoi nguoi={t.nguoi} nguoiId={t.nguoiId} luc={t.taoLuc} vai={vai}
                thu={(trang - 1) * MOI_TRANG_TRA_LOI + i + 1} />

              {/* Dòng trích nằm TRÊN bài, không nằm dưới: đọc xuôi từ trên
                  xuống thì phải biết bài này đáp ai TRƯỚC khi đọc nó nói gì. */}
              {/* Vạch dọc bên trái thay cho viên xám: đó là dáng ai cũng đọc
                  ra ngay là "lời người khác", không cần biểu tượng giải thích. */}
              {t.traLoiCho && (
                <a href={`#tl-${t.traLoiCho.id}`}
                  className="vach mt-2.5 block border-l-2 py-0.5 pl-3 text-[12px] leading-relaxed text-mo transition-colors hover:border-nhan hover:text-chu">
                  <b className="font-semibold">{t.traLoiCho.nguoi.tenHienThi}</b>
                  {': '}{rutGon(t.traLoiCho.noiDung)}
                </a>
              )}

              <div className="chu-dam chu-dam-nho mt-2.5"
                dangerouslySetInnerHTML={{ __html: dungChuDam(t.noiDung) }} />

              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <NutHuuIchTraLoi traLoiId={t.id} dem={t.soHuuIch}
                  banDauBam={daBam.has(t.id)}
                  bamDuoc={!!nguoi && nguoi.id !== t.nguoiId} />
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
                {nguoi?.id === t.nguoiId && !chuDe.khoa && (
                  <SuaTraLoi traLoiId={t.id} noiDung={t.noiDung} />
                )}
                {nguoi && nguoi.id !== t.nguoiId && (
                  <NutBaoXau loai="traLoi" mucId={t.id} />
                )}
              </div>
              </div>
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

/**
 * NHÃN VAI, và chỉ ba vai đáng gắn.
 *
 * Trong một chủ đề hỏi đáp, ba câu hỏi luôn nổi lên: ai là người hỏi, câu này
 * có phải người làm ra game nói không, và có phải ban quản trị không. Ba nhãn
 * ấy đổi hẳn trọng lượng của một câu trả lời, nên đáng chiếm chỗ.
 *
 * KHÔNG gắn nhãn cho vai trò chung chung như "thành viên": nhãn mà ai cũng có
 * thì không nói thêm gì, chỉ làm mờ hai nhãn thật sự có nghĩa.
 */
function nhanVai(
  { nguoiId, vaiTro }: { nguoiId: string; vaiTro: string },
  { chuChuDeId, tacGiaGameId }: { chuChuDeId: string; tacGiaGameId: string | null },
): { chu: string; dam: boolean } | null {
  if (vaiTro === 'QUAN_TRI') return { chu: 'Quản trị', dam: true };
  if (tacGiaGameId && nguoiId === tacGiaGameId) return { chu: 'Tác giả game', dam: true };
  if (nguoiId === chuChuDeId) return { chu: 'Người mở', dam: false };
  return null;
}

function Nguoi({ nguoi, nguoiId, luc, vai, thu }: {
  nguoi: { tenHienThi: string; tenDangNhap: string; anh: string | null; vaiTro: string };
  nguoiId: string;
  luc: Date;
  vai: { chuChuDeId: string; tacGiaGameId: string | null };
  /** Số thứ tự bài trong chủ đề — để người ta nhắc tới nhau cho gọn. */
  thu?: number;
}) {
  const nhan = nhanVai({ nguoiId, vaiTro: nguoi.vaiTro }, vai);

  return (
    <div className="flex items-center gap-2.5">
      <AnhDaiDien ten={nguoi.tenHienThi} anh={nguoi.anh} co={36} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold">
          <TenNguoi ten={nguoi.tenHienThi} tenDangNhap={nguoi.tenDangNhap} />
          {nhan && (
            <span className={gop(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              nhan.dam ? 'bg-nhan/12 text-nhan' : 'bg-nen3 text-mo',
            )}>
              {nhan.chu}
            </span>
          )}
        </p>
        <p className="phu">{cachDay(luc)}</p>
      </div>
      {thu != null && <span className="phu shrink-0 text-[12px]">#{thu}</span>}
    </div>
  );
}
