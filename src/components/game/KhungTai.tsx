'use client';

import { useMemo, useState } from 'react';
import {
  Apple, Check, ChevronDown, Coffee, Download, ExternalLink, FileDigit, Info,
  Laptop, Monitor, Smartphone,
} from 'lucide-react';
import { HE_MAY, MO_TA_HE, NHAC_KHI_CAI, type MaHeMay } from '@/lib/he-may';
import { KhoiGap } from '@/components/KhoiGap';
import { TamXacNhanTai, type TepChon } from '@/components/game/TamXacNhanTai';
import { gonDungLuong, gop } from '@/lib/tien-ich';

const ICON = { coffee: Coffee, smartphone: Smartphone, apple: Apple, monitor: Monitor, laptop: Laptop };

export interface TepXem {
  id: string;
  loai: string;
  dungLuong: number | null;
  /** Tên tệp gốc — để người tải biết mình sắp nhận về cái gì. */
  tenTep: string | null;
  maKiemTra: string | null;
}

export interface BanXem {
  id: string;
  heMay: MaHeMay;
  soHieu: string;
  moiNhat: boolean;
  dungLuong: number | null;
  ngayRa: string | null;
  doiMoi: string | null;
  ghiChu: string | null;
  duongDanCuaHang: string | null;
  tep: TepXem[];
}

/**
 * KHUNG TẢI — chọn hệ máy, chọn phiên bản, rồi tải.
 *
 * Mỗi hệ máy có DÃY SỐ HIỆU RIÊNG, và dãy ấy quan trọng hơn nhiều so với ở
 * một cửa hàng thường: đây là cửa hàng game cũ, máy Nokia đời 2006 chạy được bản
 * 1.1 nhưng treo ở bản 1.5. Cửa hàng lớn chỉ đưa bản mới nhất vì máy của
 * người dùng lúc nào cũng mới hơn phần mềm; ở đây thì ngược lại, nên lịch sử
 * phiên bản là thứ phải bày ra chứ không phải thứ giấu đi.
 */
export function KhungTai({ ban, game, taiKhoan }: {
  ban: BanXem[];
  game: { ten: string; icon: string | null; nhaPhatTrien: string | null };
  /** Tên người đang đăng nhập, hoặc `null` nếu là khách. */
  taiKhoan: string | null;
}) {
  const heCo = useMemo(() => {
    const thay = new Set(ban.map((b) => b.heMay));
    // Lọc theo HE_MAY chứ không chép cứng một dãy: thêm hệ máy mới vào
    // `he-may.ts` mà quên sửa chỗ này thì bản của hệ ấy im lặng biến mất.
    return HE_MAY.filter((h) => thay.has(h));
  }, [ban]);

  const [he, datHe] = useState<MaHeMay | null>(heCo[0] ?? null);
  const [banId, datBanId] = useState<string | null>(null);
  const [moLichSu, datMoLichSu] = useState(false);
  /* Tệp đang chờ xác nhận. `null` là tấm đang đóng. */
  const [choXacNhan, datChoXacNhan] = useState<TepChon | null>(null);

  /** Bản của hệ đang chọn, mới nhất trước. */
  const theoHe = useMemo(
    () => ban
      .filter((b) => b.heMay === he)
      .sort((a, b) => {
        if (a.moiNhat !== b.moiNhat) return a.moiNhat ? -1 : 1;
        return (b.ngayRa ?? '').localeCompare(a.ngayRa ?? '');
      }),
    [ban, he],
  );

  const hienTai = theoHe.find((b) => b.id === banId) ?? theoHe[0];

  /*
   * Tệp CHÍNH là tệp đứng đầu danh sách loại tệp của hệ ấy (`MO_TA_HE.loaiTep`),
   * chứ không phải tệp nào tình cờ được nhập trước. Với Java là JAR chứ không
   * phải JAD; với Windows là EXE chứ không phải ZIP.
   */
  const thuTuLoai = he ? MO_TA_HE[he].loaiTep : [];
  const tepXep = hienTai
    ? [...hienTai.tep].sort((a, b) =>
        thuTuLoai.indexOf(a.loai as never) - thuTuLoai.indexOf(b.loai as never))
    : [];
  const tepChinh = tepXep[0];
  const tepPhu = tepXep.slice(1);

  if (!he || !hienTai) {
    return <p className="the p-5 text-center text-[13px] text-mo">Game này chưa có bản tải nào.</p>;
  }

  const doiHe = (h: MaHeMay) => { datHe(h); datBanId(null); datMoLichSu(false); };

  /*
   * Nút tải vẫn là một <a> trỏ thẳng tới trang tải, và chỉ bị chặn lại khi
   * JavaScript chạy được.
   *
   * Máy cũ tắt JS — đúng loại máy hay mở một cửa hàng game Java — vẫn tải
   * được, chỉ là không có nhịp xác nhận. Còn chuột giữa hay Ctrl+bấm thì để
   * trình duyệt mở tab mới như thường, đừng cướp lấy cử chỉ của người dùng.
   */
  const xinXacNhan = (e: React.MouseEvent, t: TepXem) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    datChoXacNhan({
      id: t.id, loai: t.loai, dungLuong: t.dungLuong,
      soHieu: hienTai.soHieu, heMay: MO_TA_HE[he].ten,
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Chọn hệ máy ─────────────────────────────────────────────────
          Là <button> thật trong một nhóm có nhãn, không phải mấy cái <div>
          nghe sự kiện chuột: bàn phím phải Tab tới được, và bộ đọc màn hình
          phải đọc ra "Java ME, đã chọn". */}
      {heCo.length > 1 && (
        <div role="group" aria-label="Chọn hệ máy" className="ke ke-goi gap-2">
          {heCo.map((h) => {
            const Icon = ICON[MO_TA_HE[h].icon];
            const chon = h === he;
            return (
              <button key={h} type="button" onClick={() => doiHe(h)} aria-pressed={chon}
                className={gop('chip', chon && 'chip-chon')}>
                <Icon size={14} /> {MO_TA_HE[h].ten}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Bản đang chọn ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[15px] font-bold">Bản {hienTai.soHieu}</span>
        {hienTai.moiNhat && (
          <span className="rounded-full bg-nhan/12 px-2 py-0.5 text-[11px] font-bold text-nhan">
            Mới nhất
          </span>
        )}
        {hienTai.ngayRa && <span className="phu">{ngayGon(hienTai.ngayRa)}</span>}
      </div>

      {/*
        MỘT NÚT TẢI, KHÔNG PHẢI HAI.

        Cả hai cửa hàng lớn chỉ có đúng một nút cài. Bản trước dựng mỗi tệp một
        nút to bằng nhau, nên một bản Java có hai nút xanh chằn chặn — trong khi
        JAD một mình thì KHÔNG cài được, đúng như câu nhắc ngay bên dưới nói.
        Hai nút bằng nhau cho hai thứ khác hẳn nhau về giá trị là mời bấm nhầm.

        Nay tệp chính là nút; mấy tệp còn lại tụt xuống thành liên kết chữ nhỏ,
        vẫn tải được cho ai cần, mà không tranh chỗ với thứ 99% người vào đây
        muốn bấm.
      */}
      <div className="space-y-2">
        {hienTai.tep.length === 0 && !hienTai.duongDanCuaHang && (
          <p className="the p-4 text-center text-[13px] text-mo">Bản này chưa gắn tệp tải.</p>
        )}

        {/*
          Nút tải dẫn sang TRANG TẢI, không bắn thẳng vào tệp.

          Bắn thẳng thì lượt tải nằm gọn trong thanh của trình duyệt: trên điện
          thoại nó loé lên một giây rồi biến, và người bấm không chắc mình vừa
          bấm trúng — nên bấm lại lần nữa. Trang tải nói rõ đang tải game nào,
          bản nào, còn bao lâu, và bày sẵn mã kiểm tra đúng lúc cần tới.
        */}
        {tepChinh && (
          <a href={`/tai/${tepChinh.id}`} className="nut-cai-dam w-full"
            onClick={(e) => xinXacNhan(e, tepChinh)}>
            <Download size={17} aria-hidden />
            Tải {tepChinh.loai}
            {tepChinh.dungLuong != null && ` · ${gonDungLuong(tepChinh.dungLuong)}`}
          </a>
        )}

        {/* Cửa hàng chính chủ là lối PHỤ, đứng sau nút tải. */}
        {hienTai.duongDanCuaHang && (
          <a href={hienTai.duongDanCuaHang} target="_blank" rel="noopener noreferrer"
            className={gop('w-full', tepChinh ? 'nut-vien !w-full' : 'nut-cai-dam')}>
            <ExternalLink size={15} aria-hidden /> Mở trong cửa hàng chính chủ
          </a>
        )}

        {tepPhu.length > 0 && (
          <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-0.5">
            {tepPhu.map((t) => (
              <a key={t.id} href={`/tai/${t.id}`} onClick={(e) => xinXacNhan(e, t)}
                className="text-[12px] font-semibold text-mo underline-offset-2 hover:text-nhan hover:underline">
                Tải {t.loai}
                {t.dungLuong != null && ` · ${gonDungLuong(t.dungLuong)}`}
              </a>
            ))}
          </p>
        )}
      </div>

      {/*
        CHI TIẾT TỆP — gấp lại, dưới nút tải.

        Máy Java đời cũ tải qua mạng chập chờn rất hay nhận về một tệp cụt, mà
        tệp cụt thì máy báo "không cài được" chứ không báo "tải hỏng" — người
        dùng ngồi đổ lỗi cho game. Có mã kiểm tra thì tự phân biệt được hai
        chuyện ấy. Gấp lại vì phần lớn người tải không cần tới nó.
      */}
      {tepXep.some((t) => t.tenTep || t.maKiemTra) && (
        <KhoiGap tieuDe="Chi tiết tệp" icon={<FileDigit size={16} />}>
          <ul className="space-y-2.5">
            {tepXep.map((t) => (
              <li key={t.id}>
                <p className="text-[13px] font-semibold">
                  {t.tenTep ?? `Tệp ${t.loai}`}
                  {t.dungLuong != null && (
                    <span className="phu ml-2 font-normal">{gonDungLuong(t.dungLuong)}</span>
                  )}
                </p>
                {t.maKiemTra && (
                  <p className="phu mt-0.5">
                    sha256
                    {/* `break-all` chứ không cắt ngắn: mã này sinh ra để ĐỐI
                        CHIẾU, mà đối chiếu thì phải thấy đủ 64 ký tự. */}
                    <span className="ml-1 break-all font-mono">{t.maKiemTra}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </KhoiGap>
      )}

      {/*
        Cách cài GẤP LẠI, không phải một khối chữ xám nằm chắn dưới nút tải.
        Người tải lần thứ hai không cần đọc lại, mà lần đầu thì vẫn thấy đầu đề
        và bấm được. Cả hai cửa hàng lớn không có mục này vì họ tự cài hộ; kho
        này thì người dùng phải tự cài, nên bỏ hẳn đi cũng không được.
      */}
      {NHAC_KHI_CAI[he] && (
        <KhoiGap tieuDe={`Cách cài trên ${MO_TA_HE[he].ten}`} icon={<Info size={16} />}>
          <p className="text-[13px] leading-relaxed text-mo">{NHAC_KHI_CAI[he]}</p>
        </KhoiGap>
      )}

      {/*
        "Có gì mới" KHÔNG có khối riêng.
        Câu ấy đã nằm ngay ở dòng đầu của trục thời gian bên dưới, nguyên văn.
        In hai lần trên cùng một màn hình thì người đọc dừng lại đối chiếu xem
        hai chỗ có khác nhau chỗ nào không — mất công vì chúng giống hệt.
        Game chỉ có đúng một bản thì không có trục nào cả, nên in ở đây.
      */}
      {hienTai.doiMoi && theoHe.length === 1 && (
        <div>
          <h3 className="text-[13px] font-bold">Có gì mới ở bản {hienTai.soHieu}</h3>
          <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-mo">{hienTai.doiMoi}</p>
        </div>
      )}

      <TamXacNhanTai tep={choXacNhan} game={game} taiKhoan={taiKhoan}
        mo={choXacNhan !== null} dong={() => datChoXacNhan(null)} />

      {/* ── LỊCH SỬ PHIÊN BẢN ───────────────────────────────────────────── */}
      {theoHe.length > 1 && (
        <LichSu ban={theoHe} dangChon={hienTai.id} mo={moLichSu}
          datMo={datMoLichSu} chon={(id) => { datBanId(id); }} />
      )}

    </div>
  );
}

/**
 * TRỤC THỜI GIAN CÁC BẢN.
 *
 * Dựng thành một đường dọc có chấm chứ không phải một cái <select>: ở đây thứ
 * người ta cần thấy là QUAN HỆ giữa các bản — bản nào ra trước, giữa hai bản
 * đổi những gì, bản nào nhẹ hơn cho máy yếu. Danh sách xổ xuống giấu hết mấy
 * thứ ấy, chỉ còn lại một dãy con số vô nghĩa.
 *
 * Mặc định gấp HẲN, không chừa dòng nào: phần lớn người vào đây lấy bản mới
 * nhất rồi đi, mà bản mới nhất thì phần đầu khung tải đã nói rồi.
 */
function LichSu({ ban, dangChon, mo, datMo, chon }: {
  ban: BanXem[];
  dangChon: string;
  mo: boolean;
  datMo: (v: boolean) => void;
  chon: (id: string) => void;
}) {
  /*
   * Lúc gấp lại thì KHÔNG in dòng nào cả.
   *
   * Trước đây gấp lại vẫn chừa dòng của bản đang chọn — mà dòng ấy lặp đúng
   * những gì phần đầu khung tải vừa nói: số hiệu, nhãn "mới nhất", ngày, và cả
   * câu "có gì mới". Bốn thứ in hai lần cách nhau một gang tay.
   */
  if (!mo) {
    return (
      <button type="button" onClick={() => datMo(true)} aria-expanded={false}
        className="the flex w-full items-center justify-center gap-1 px-4 py-2.5 text-[13px] font-semibold text-nhan transition-colors hover:bg-nen3">
        Xem {ban.length} phiên bản
        <ChevronDown size={15} aria-hidden />
      </button>
    );
  }

  return (
    <section className="the overflow-hidden">
      <h3 className="border-b border-vien px-4 py-2.5 text-[13px] font-bold">
        Lịch sử phiên bản
        <span className="ml-1.5 font-normal text-mo">({ban.length} bản)</span>
      </h3>

      <ol className="px-4 py-3">
        {ban.map((b, i) => {
          const chonRoi = b.id === dangChon;
          const cuoi = i === ban.length - 1;
          return (
            <li key={b.id} className="relative flex gap-3 pb-3 last:pb-0">
              {/* Đường dọc nối các chấm. Vẽ bằng một khối tuyệt đối chứ không
                  bằng viền trái của <li>, để nó dừng đúng ở chấm cuối cùng. */}
              {!cuoi && <span aria-hidden className="absolute left-[5px] top-4 h-full w-px bg-vien" />}
              <span aria-hidden
                className={gop(
                  'relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-nen2',
                  chonRoi ? 'bg-nhan' : 'bg-vien',
                )} />

              <button type="button" onClick={() => chon(b.id)} aria-current={chonRoi ? 'true' : undefined}
                className="min-w-0 flex-1 rounded-nut px-2 py-1 text-left transition-colors hover:bg-nen3">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className={gop('text-[13px]', chonRoi ? 'font-bold text-nhan' : 'font-semibold')}>
                    {b.soHieu}
                  </span>
                  {b.moiNhat && <span className="text-[11px] font-bold text-nhan">Mới nhất</span>}
                  {b.ngayRa && <span className="phu">{ngayGon(b.ngayRa)}</span>}
                  {b.dungLuong != null && <span className="phu">{gonDungLuong(b.dungLuong)}</span>}
                  {chonRoi && <Check size={13} className="text-nhan" aria-label="đang chọn" />}
                </span>
                {b.doiMoi && <span className="phu mt-0.5 block">{b.doiMoi}</span>}
              </button>
            </li>
          );
        })}
      </ol>

      <button type="button" onClick={() => datMo(false)} aria-expanded
        className="flex w-full items-center justify-center gap-1 border-t border-vien py-2.5 text-[13px] font-semibold text-nhan transition-colors hover:bg-nen3">
        Thu gọn
        <ChevronDown size={15} className="rotate-180" aria-hidden />
      </button>
    </section>
  );
}

/** "2006-11-06" → "11/2006". Ngày cụ thể không giúp gì ở đây, tháng thì có. */
function ngayGon(iso: string): string {
  const [nam, thang] = iso.split('-');
  return `${thang}/${nam}`;
}
