'use client';

import { useMemo, useState } from 'react';
import {
  Apple, Check, ChevronDown, Coffee, Download, ExternalLink, Info,
  Laptop, Monitor, ShieldCheck, Smartphone,
} from 'lucide-react';
import { HE_MAY, MO_TA_HE, NHAC_KHI_CAI, type MaHeMay } from '@/lib/he-may';
import { gonDungLuong, gop } from '@/lib/tien-ich';

const ICON = { coffee: Coffee, smartphone: Smartphone, apple: Apple, monitor: Monitor, laptop: Laptop };

export interface TepXem {
  id: string;
  loai: string;
  dungLuong: number | null;
  maKiemTra: string | null;
  thuatToan: string;
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
 * một cửa hàng thường: đây là kho game cũ, máy Nokia đời 2006 chạy được bản
 * 1.1 nhưng treo ở bản 1.5. Cửa hàng lớn chỉ đưa bản mới nhất vì máy của
 * người dùng lúc nào cũng mới hơn phần mềm; ở đây thì ngược lại, nên lịch sử
 * phiên bản là thứ phải bày ra chứ không phải thứ giấu đi.
 */
export function KhungTai({ ban }: { ban: BanXem[] }) {
  const heCo = useMemo(() => {
    const thay = new Set(ban.map((b) => b.heMay));
    // Lọc theo HE_MAY chứ không chép cứng một dãy: thêm hệ máy mới vào
    // `he-may.ts` mà quên sửa chỗ này thì bản của hệ ấy im lặng biến mất.
    return HE_MAY.filter((h) => thay.has(h));
  }, [ban]);

  const [he, datHe] = useState<MaHeMay | null>(heCo[0] ?? null);
  const [banId, datBanId] = useState<string | null>(null);
  const [moLichSu, datMoLichSu] = useState(false);

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

  if (!he || !hienTai) {
    return <p className="the p-5 text-center text-[13px] text-mo">Game này chưa có bản tải nào.</p>;
  }

  const doiHe = (h: MaHeMay) => { datHe(h); datBanId(null); datMoLichSu(false); };

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

      {/* ── Nút tải ─────────────────────────────────────────────────────
          Tệp đầu tiên là nút đặc, phần còn lại là nút viền: một bản Java có cả
          JAR lẫn JAD, mà JAD một mình thì không cài được — tô đặc cả hai là
          mời người ta bấm nhầm vào cái không dùng được. */}
      <div className="space-y-2">
        {hienTai.tep.length === 0 && !hienTai.duongDanCuaHang && (
          <p className="the p-4 text-center text-[13px] text-mo">Bản này chưa gắn tệp tải.</p>
        )}
        {hienTai.tep.map((t, i) => (
          <a key={t.id} href={`/api/tai/${t.id}`}
            className={gop('w-full', i === 0 ? 'nut-cai-dam' : 'nut-vien !w-full')}>
            <Download size={i === 0 ? 17 : 15} />
            Tải {t.loai}
            {t.dungLuong != null && ` · ${gonDungLuong(t.dungLuong)}`}
          </a>
        ))}

        {/* Cửa hàng chính chủ là lối PHỤ, đứng sau nút tải. */}
        {hienTai.duongDanCuaHang && (
          <a href={hienTai.duongDanCuaHang} target="_blank" rel="noopener noreferrer"
            className={gop('w-full', hienTai.tep.length === 0 ? 'nut-cai-dam' : 'nut-vien !w-full')}>
            <ExternalLink size={15} /> Mở trong cửa hàng chính chủ
          </a>
        )}
      </div>

      {NHAC_KHI_CAI[he] && (
        <p className="flex gap-2 rounded-nut bg-nen3 px-3 py-2.5 text-[12px] leading-relaxed text-mo">
          <Info size={14} className="mt-px shrink-0" aria-hidden />
          {NHAC_KHI_CAI[he]}
        </p>
      )}

      {hienTai.doiMoi && (
        <div>
          <h3 className="text-[13px] font-bold">Có gì mới ở bản {hienTai.soHieu}</h3>
          <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-mo">{hienTai.doiMoi}</p>
        </div>
      )}

      {/* ── LỊCH SỬ PHIÊN BẢN ───────────────────────────────────────────── */}
      {theoHe.length > 1 && (
        <LichSu ban={theoHe} dangChon={hienTai.id} mo={moLichSu}
          datMo={datMoLichSu} chon={(id) => { datBanId(id); }} />
      )}

      {/* ── Mã kiểm tra ─────────────────────────────────────────────────── */}
      {hienTai.tep[0]?.maKiemTra && (
        <div className="the p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold">
            <ShieldCheck size={14} className="text-nhan" aria-hidden /> Mã kiểm tra tệp
          </p>
          <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-mo">
            {hienTai.tep[0].thuatToan}: {hienTai.tep[0].maKiemTra}
          </p>
          <p className="phu mt-1.5">
            Tải xong đối chiếu mã này; khác nhau nghĩa là tệp đã bị đổi trên đường truyền.
          </p>
        </div>
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
 * Mặc định gấp lại, chỉ chừa bản mới nhất: phần lớn người vào đây lấy bản mới
 * nhất rồi đi, không cần phải bước qua cả lịch sử mới tải được.
 */
function LichSu({ ban, dangChon, mo, datMo, chon }: {
  ban: BanXem[];
  dangChon: string;
  mo: boolean;
  datMo: (v: boolean) => void;
  chon: (id: string) => void;
}) {
  const hien = mo ? ban : ban.slice(0, 1);

  return (
    <section className="the overflow-hidden">
      <h3 className="border-b border-vien px-4 py-2.5 text-[13px] font-bold">
        Lịch sử phiên bản
        <span className="ml-1.5 font-normal text-mo">({ban.length} bản)</span>
      </h3>

      <ol className="px-4 py-3">
        {hien.map((b, i) => {
          const chonRoi = b.id === dangChon;
          const cuoi = i === hien.length - 1;
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

      <button type="button" onClick={() => datMo(!mo)} aria-expanded={mo}
        className="flex w-full items-center justify-center gap-1 border-t border-vien py-2.5 text-[13px] font-semibold text-nhan transition-colors hover:bg-nen3">
        {mo ? 'Thu gọn' : `Xem ${ban.length - 1} bản cũ hơn`}
        <ChevronDown size={15} className={gop('transition-transform', mo && 'rotate-180')} aria-hidden />
      </button>
    </section>
  );
}

/** "2006-11-06" → "11/2006". Ngày cụ thể không giúp gì ở đây, tháng thì có. */
function ngayGon(iso: string): string {
  const [nam, thang] = iso.split('-');
  return `${thang}/${nam}`;
}
