'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Search, X } from 'lucide-react';
import { HE_MAY, MO_TA_HE, type MaHeMay } from '@/lib/he-may';
import { HinhHeMay } from '@/components/game/HinhHeMay';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
import { MO_TA_TUOI, napDoTuoi } from '@/lib/do-tuoi-const';
import type { BanXem } from '@/lib/ban-tai-xem';
import { gonDungLuong, gop } from '@/lib/tien-ich';

/*
 * Từ bao nhiêu bản thì bày ô tìm và phân trang.
 *
 * Dưới mức này thì cả dãy nằm gọn trong một tầm mắt, mà thêm một ô tìm cho ba
 * dòng là thêm một thứ phải đọc để rồi không dùng tới.
 */
const NGUONG_TIM = 8;
const MOI_TRANG = 8;

/** Ngày kiểu 2005-11-03 → 11/2005. Ngày chính xác không nói thêm được gì. */
function ngayGon(ngay: string): string {
  const [nam, thang] = ngay.split('-');
  return thang ? `${thang}/${nam}` : nam;
}

/**
 * TẤM TẢI — bấm "Tải về" là mở ra, chọn hệ máy rồi chọn bản, tải ngay tại chỗ.
 *
 * TRƯỚC ĐÂY việc này là một KHỐI nằm giữa trang: chọn hệ ở dãy chip, chọn bản
 * ở một ô gấp, rồi mới tới nút tải. Khối ấy chiếm nguyên một tầm mắt của trang
 * game trong khi phần lớn người mở trang chỉ cần đúng một cú bấm — và ai thật
 * sự cần chọn bản cũ thì phải cuộn xuống tìm nó.
 *
 * Nay đảo lại: trang chỉ còn một nút, và mọi lựa chọn nằm trong tấm này. Ai
 * chỉ muốn tải thì bấm hai lần là xong; ai cần bản 1.1 cho máy Nokia đời 2006
 * thì mở đúng tab hệ máy ấy và thấy cả dãy bản, mỗi bản một nút tải ngay cạnh.
 *
 * MỖI HỆ MÁY MỘT DÃY SỐ HIỆU RIÊNG, và ở cửa hàng game cũ thì dãy ấy quan
 * trọng hơn hẳn một cửa hàng thường: máy cũ chạy được bản 1.1 nhưng treo ở bản
 * 1.5. Cửa hàng lớn chỉ đưa bản mới nhất vì máy người dùng lúc nào cũng mới
 * hơn phần mềm; ở đây thì ngược lại, nên lịch sử phiên bản là thứ phải bày ra
 * chứ không phải thứ giấu đi.
 *
 * Dùng `<dialog>` thật với `showModal()`: nó mang sẵn bẫy tiêu điểm, đóng bằng
 * Esc và chặn cuộn phía sau — ba thứ tự viết thì lần nào cũng thiếu một.
 */
export function TamTai({ ban, game, taiKhoan, daTai, dang = 'nut', nhan = 'Tải về' }: {
  ban: BanXem[];
  game: { ten: string; icon: string | null; nhaPhatTrien: string | null; doTuoi: number };
  /** Tên người đang đăng nhập, hoặc `null` nếu là khách. */
  taiKhoan: string | null;
  /** Người này từng tải game rồi — nút đổi thành biểu tượng đám mây. */
  daTai?: boolean;
  /** `nut` là viên thuốc xanh ở đầu trang; `lien` là một dòng chữ bấm được. */
  dang?: 'nut' | 'lien';
  nhan?: string;
}) {
  const [mo, datMo] = useState(false);
  const hopRef = useRef<HTMLDialogElement>(null);

  const heCo = useMemo(() => {
    const thay = new Set(ban.map((b) => b.heMay));
    // Lọc theo `HE_MAY` chứ không chép cứng một dãy: thêm hệ máy mới vào
    // `he-may.ts` mà quên sửa chỗ này thì bản của hệ ấy im lặng biến mất.
    return HE_MAY.filter((h) => thay.has(h));
  }, [ban]);

  const [he, datHe] = useState<MaHeMay | null>(heCo[0] ?? null);
  const [tim, datTim] = useState('');
  const [trang, datTrang] = useState(1);

  /** Đổi hệ máy thì bắt đầu lại từ đầu — dãy bản là dãy khác hẳn. */
  const doiHe = (h: MaHeMay) => { datHe(h); datTim(''); datTrang(1); };

  useEffect(() => {
    const hop = hopRef.current;
    if (!hop) return;
    if (mo && !hop.open) hop.showModal();
    if (!mo && hop.open) hop.close();
  }, [mo]);

  /** Bản của hệ đang chọn: mới nhất trước, rồi tới bản ra sau. */
  const theoHe = useMemo(
    () => ban
      .filter((b) => b.heMay === he)
      .sort((a, b) => {
        if (a.moiNhat !== b.moiNhat) return a.moiNhat ? -1 : 1;
        return (b.ngayRa ?? '').localeCompare(a.ngayRa ?? '');
      }),
    [ban, he],
  );

  /*
   * LỌC RỒI MỚI CẮT TRANG.
   *
   * Game đời đầu có game mang vài chục bản — dãy ấy dài hơn cả màn hình, mà
   * người đi tìm đúng bản 1.1 cho máy Nokia thì phải cuộn mò. Ô tìm khớp cả
   * số hiệu lẫn ghi chú của bản, vì lắm khi người ta nhớ "bản sửa lỗi âm
   * thanh" chứ không nhớ con số.
   */
  const goLoc = tim.trim().toLowerCase();
  const daLoc = goLoc
    ? theoHe.filter((b) =>
      b.soHieu.toLowerCase().includes(goLoc)
      || (b.ghiChu ?? '').toLowerCase().includes(goLoc)
      || (b.doiMoi ?? '').toLowerCase().includes(goLoc))
    : theoHe;

  const tongTrang = Math.max(1, Math.ceil(daLoc.length / MOI_TRANG));
  // Kẹp lại thay vì tin vào `trang`: lọc xong còn hai bản mà đang đứng ở trang
  // năm thì danh sách trống trơn, trong khi bản cần tìm nằm ngay trang một.
  const trangDung = Math.min(trang, tongTrang);
  const hienRa = daLoc.slice((trangDung - 1) * MOI_TRANG, trangDung * MOI_TRANG);
  const bayTim = theoHe.length > NGUONG_TIM;

  if (ban.length === 0) return null;

  return (
    <>
      <button type="button" onClick={() => datMo(true)} data-viec="tai-dau"
        data-da-tai={daTai ? '1' : undefined}
        aria-label={daTai ? `Tải lại ${game.ten}` : undefined}
        className={gop(
          dang === 'lien' && 'text-[13px] font-semibold text-nhan hover:underline',
          dang === 'nut' && (daTai
            ? 'grid size-9 place-items-center rounded-full text-nhan transition-colors hover:bg-nen3'
            : 'nut-cai-dam !min-h-[36px] !px-6 !text-[14px]'),
        )}>
        {dang === 'nut' && daTai
          ? <Download size={22} strokeWidth={1.8} aria-hidden />
          : nhan}
      </button>

      <dialog ref={hopRef} onClose={() => datMo(false)}
        className="tam-truot w-full max-w-[520px] text-chu backdrop:bg-black/40">
        <div className="flex max-h-[85vh] flex-col">
          {/* ── Đầu tấm: nhắc lại mình đang tải game nào ─────────────────
              Bày lại tên game và biểu tượng chứ không chỉ viết "Chọn bản":
              tấm này che mất trang phía sau, và người mở ba trang game cùng
              lúc phải nhìn ra ngay mình đang đứng ở tấm của game nào. */}
          <div className="vach-duoi flex items-center gap-3 border-b px-4 py-3">
            <BieuTuongGame ten={game.ten} icon={game.icon} co={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold">{game.ten}</p>
              <p className="phu truncate">
                {game.nhaPhatTrien ? `${game.nhaPhatTrien} · ` : ''}
                {MO_TA_TUOI[napDoTuoi(game.doTuoi)].nhan}
              </p>
            </div>
            <button type="button" onClick={() => datMo(false)} aria-label="Đóng"
              className="nut-tron size-9 shrink-0">
              <X size={18} aria-hidden />
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-3">
            {/* ── Tab hệ máy ─────────────────────────────────────────────
                Là <button> thật trong một nhóm có nhãn, không phải mấy cái
                <div> nghe sự kiện chuột: bàn phím phải Tab tới được, và bộ đọc
                màn hình phải đọc ra "Java ME, đã chọn". */}
            {heCo.length > 1 && (
              <div role="group" aria-label="Chọn hệ máy" className="ke gap-2 pb-3">
                {heCo.map((h) => {
                  const chon = h === he;
                  return (
                    <button key={h} type="button" onClick={() => doiHe(h)} aria-pressed={chon}
                      className={gop('chip shrink-0', chon && 'chip-chon')}>
                      <HinhHeMay he={h} co={14} /> {MO_TA_HE[h].ten}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Dãy bản của hệ đang chọn ───────────────────────────────
                MỖI BẢN MỘT HÀNG, nút tải nằm ngay cạnh. Bản trước bắt chọn
                bản ở một ô gấp rồi mới hiện nút tải, nên muốn so hai bản phải
                mở ra đóng vào hai lượt. */}
            {bayTim && (
              <label className="relative block pb-1">
                <Search size={15} aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mo" />
                <input type="search" value={tim}
                  onChange={(e) => { datTim(e.target.value); datTrang(1); }}
                  placeholder={`Tìm trong ${theoHe.length} bản — số hiệu hay ghi chú`}
                  aria-label="Tìm phiên bản"
                  className="o-nhap !pl-9" />
              </label>
            )}

            {hienRa.length === 0 && (
              <p className="phu py-6 text-center">Không có bản nào khớp “{tim.trim()}”.</p>
            )}

            <ul className="divide-y divide-vien">
              {hienRa.map((b) => {
                const thuTuLoai = he ? MO_TA_HE[he].loaiTep : [];
                const tep = [...b.tep].sort((x, y) =>
                  thuTuLoai.indexOf(x.loai as never) - thuTuLoai.indexOf(y.loai as never));
                const chinh = tep[0];
                const phu = tep.slice(1);

                return (
                  <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[14px] font-bold">Bản {b.soHieu}</span>
                        {b.moiNhat && (
                          <span className="rounded-full bg-nhan/12 px-1.5 py-0.5 text-[10px] font-bold text-nhan">
                            Mới nhất
                          </span>
                        )}
                        {b.ngayRa && <span className="phu">{ngayGon(b.ngayRa)}</span>}
                      </p>
                      {b.ghiChu && <p className="phu mt-0.5 line-clamp-2">{b.ghiChu}</p>}
                      {/* Tệp phụ (JAD bên cạnh JAR) là lối PHỤ: một dòng chữ
                          nhỏ, không phải cái nút to bằng nút chính — JAD một
                          mình thì không cài được. */}
                      {phu.length > 0 && (
                        <p className="mt-1 flex flex-wrap gap-x-3">
                          {phu.map((t) => (
                            <a key={t.id} href={`/tai/${t.id}`}
                              className="text-[12px] font-semibold text-mo underline-offset-2 hover:text-nhan hover:underline">
                              Tải {t.loai}
                              {t.dungLuong != null && ` · ${gonDungLuong(t.dungLuong)}`}
                            </a>
                          ))}
                        </p>
                      )}
                    </div>

                    {chinh ? (
                      /* Nút dẫn sang TRANG TẢI, không bắn thẳng vào tệp: bắn
                         thẳng thì lượt tải nằm gọn trong thanh của trình duyệt,
                         trên điện thoại nó loé lên một giây rồi biến và người
                         bấm không chắc mình vừa bấm trúng. */
                      <a href={`/tai/${chinh.id}`} className="nut-cai-dam shrink-0 !min-h-[34px] !px-4 !text-[13px]">
                        <Download size={15} aria-hidden />
                        {chinh.loai}
                        {chinh.dungLuong != null && ` · ${gonDungLuong(chinh.dungLuong)}`}
                      </a>
                    ) : b.duongDanCuaHang ? (
                      <a href={b.duongDanCuaHang} target="_blank" rel="noopener noreferrer"
                        className="nut-vien shrink-0 !min-h-[34px] !px-4 !text-[13px]">
                        <ExternalLink size={14} aria-hidden /> Cửa hàng chính chủ
                      </a>
                    ) : (
                      <span className="phu shrink-0">Chưa gắn tệp</span>
                    )}
                  </li>
                );
              })}
            </ul>

            {/*
              PHÂN TRANG — hai nút lật và một dòng đếm, không phải dãy số trang.

              Dãy số chỉ đáng bày khi người ta nhảy thẳng tới trang bảy; ở đây
              thứ người ta làm là lật dần cho tới khi thấy bản mình cần, hoặc
              gõ vào ô tìm ngay trên kia.
            */}
            {tongTrang > 1 && (
              <div className="vach mt-3 flex items-center justify-between gap-3 border-t pt-3">
                <button type="button" disabled={trangDung <= 1}
                  onClick={() => datTrang(trangDung - 1)}
                  className="nut-vien !min-h-[32px] !px-3 !text-[12px] disabled:opacity-40">
                  <ChevronLeft size={14} aria-hidden /> Trước
                </button>
                <span className="phu tabular-nums">
                  Trang {trangDung}/{tongTrang} · {daLoc.length} bản
                </span>
                <button type="button" disabled={trangDung >= tongTrang}
                  onClick={() => datTrang(trangDung + 1)}
                  className="nut-vien !min-h-[32px] !px-3 !text-[12px] disabled:opacity-40">
                  Sau <ChevronRight size={14} aria-hidden />
                </button>
              </div>
            )}

            {/*
              KHÁCH VÃNG LAI ĐƯỢC NÓI THẲNG CÁI HỌ SẮP MẤT.

              Vẫn tải được — bắt đăng nhập mới cho tải là thói của mấy trang
              chia sẻ tệp, không phải của một cửa hàng. Nhưng phải nói rõ game
              sẽ không vào thư viện, vì đó đúng là thứ người ta chỉ phát hiện
              ra sau, lúc đi tìm lại game đã tải mà không thấy đâu.
            */}
            <p className="phu vach mt-3 border-t pt-3">
              {taiKhoan
                ? `Tải về tài khoản ${taiKhoan} — game sẽ nằm trong thư viện của bạn.`
                : 'Bạn chưa đăng nhập, nên game này sẽ không vào thư viện.'}
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
