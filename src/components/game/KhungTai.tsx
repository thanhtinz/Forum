'use client';

import { useMemo, useState } from 'react';
import { Apple, Coffee, Download, ExternalLink, Info, Laptop, Monitor, ShieldCheck, Smartphone } from 'lucide-react';
import { HE_MAY, MO_TA_HE, NHAC_KHI_CAI, caiThangDuoc, type MaHeMay } from '@/lib/he-may';
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
  dungLuong: number | null;
  ngayRa: string | null;
  doiMoi: string | null;
  ghiChu: string | null;
  duongDanCuaHang: string | null;
  tep: TepXem[];
}

/**
 * KHUNG TẢI — chọn hệ máy, rồi chọn bản, rồi bấm tải.
 *
 * Mỗi hệ máy có DÃY SỐ RIÊNG, nên đổi hệ là đổi luôn danh sách bản bên dưới.
 * Gộp mọi bản của mọi hệ vào một danh sách thì người dùng phải tự lọc xem số
 * nào dành cho máy mình — mà đó đúng là việc trang này phải làm hộ họ.
 *
 * Chưa chọn tay thì bám bản mới nhất của hệ đang xem. Đổi hệ mà vẫn giữ mã bản
 * cũ thì mã ấy không còn trong danh sách nữa, nên tự rơi về mặc định.
 */
export function KhungTai({ ban }: { ban: BanXem[] }) {
  /*
   * Lọc theo HE_MAY chứ không chép cứng một dãy ở đây: thêm một hệ máy mới vào
   * `he-may.ts` mà quên sửa chỗ này thì bản của hệ ấy có trong CSDL nhưng
   * không bao giờ hiện ra nút, và không có gì báo cho ai biết.
   */
  const heCo = useMemo(() => {
    const thay = new Set(ban.map((b) => b.heMay));
    return HE_MAY.filter((h) => thay.has(h));
  }, [ban]);

  const [he, datHe] = useState<MaHeMay | null>(heCo[0] ?? null);
  const [banId, datBanId] = useState<string | null>(null);

  const theoHe = useMemo(() => ban.filter((b) => b.heMay === he), [ban, he]);
  const hienTai = theoHe.find((b) => b.id === banId) ?? theoHe[0];

  if (!he || !hienTai) {
    return (
      <div className="the p-5 text-center">
        <p className="phu">Game này chưa có bản tải nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Chọn hệ máy ─────────────────────────────────────────────────── */}
      {heCo.length > 1 && (
        <div className="ke gap-2">
          {heCo.map((h) => {
            const Icon = ICON[MO_TA_HE[h].icon];
            return (
              <button key={h} type="button"
                onClick={() => { datHe(h); datBanId(null); }}
                className={gop('chip', h === he && 'chip-chon')}>
                <Icon size={14} /> {MO_TA_HE[h].ten}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Chọn bản ────────────────────────────────────────────────────── */}
      {theoHe.length > 1 && (
        <label className="block">
          <span className="phu mb-1 block">Phiên bản</span>
          <select value={hienTai.id} onChange={(e) => datBanId(e.target.value)} className="o-nhap">
            {theoHe.map((b) => (
              <option key={b.id} value={b.id}>
                {b.soHieu}{b.ngayRa ? ` — ${b.ngayRa}` : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {/*
        iOS ĐI LỐI KHÁC, và phải nói thẳng vì sao.
        iPhone chưa bẻ khoá không cài được tệp IPA tải từ web — Apple chỉ mở
        App Store, TestFlight, hệ quản lý thiết bị của doanh nghiệp và chợ ứng
        dụng thay thế ở châu Âu. Dựng một nút "Tải IPA" ở đây là hứa với người
        dùng một thứ họ chắc chắn không dùng được.
      */}
      {!caiThangDuoc(he) ? (
        <div className="the p-4">
          {hienTai.duongDanCuaHang ? (
            <a href={hienTai.duongDanCuaHang} target="_blank" rel="noopener noreferrer"
              className="nut-cai-dam w-full">
              <ExternalLink size={17} /> Mở trong App Store
            </a>
          ) : (
            <p className="phu">Bản iOS chưa có đường dẫn App Store.</p>
          )}
          <p className="phu mt-3">
            iPhone chưa bẻ khoá không cài được tệp IPA tải từ web: Apple chỉ cho cài qua
            App Store, TestFlight, hệ quản lý thiết bị của doanh nghiệp, hoặc chợ ứng dụng
            thay thế ở châu Âu.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {hienTai.tep.length === 0 && (
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
        </div>
      )}

      {/*
        Câu nhắc riêng của hệ đang chọn.
        Mỗi hệ có đúng một chỗ hay làm người ta khựng lại lúc cài — Android hỏi
        nguồn ngoài, Windows chặn tệp chưa ký, macOS thì Gatekeeper. Nói trước ở
        đây rẻ hơn nhiều so với một chủ đề "tải về không chạy" ở khu cộng đồng.
      */}
      {caiThangDuoc(he) && NHAC_KHI_CAI[he] && (
        <p className="flex gap-2 rounded-nut bg-nen3 px-3 py-2.5 text-[12px] leading-relaxed text-mo">
          <Info size={14} className="mt-px shrink-0" />
          {NHAC_KHI_CAI[he]}
        </p>
      )}

      {/* ── Mã kiểm tra ─────────────────────────────────────────────────── */}
      {hienTai.tep[0]?.maKiemTra && (
        <div className="the p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold">
            <ShieldCheck size={14} className="text-nhan" /> Mã kiểm tra tệp
          </p>
          <p className="phu mt-1 break-all font-mono leading-relaxed">
            {hienTai.tep[0].thuatToan}: {hienTai.tep[0].maKiemTra}
          </p>
          <p className="phu mt-1.5">
            Tải xong đối chiếu mã này; khác nhau nghĩa là tệp đã bị đổi trên đường truyền.
          </p>
        </div>
      )}

      {hienTai.doiMoi && (
        <div>
          <h3 className="text-[14px] font-bold">Có gì mới ở bản {hienTai.soHieu}</h3>
          <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-mo">{hienTai.doiMoi}</p>
        </div>
      )}
    </div>
  );
}
