'use client';

import { useActionState, useState, useTransition } from 'react';
import { BarChart3, Check, Plus, Trash2 } from 'lucide-react';
import {
  boPhieu, taoBinhChon, xoaBinhChon, type KetQua,
} from '@/app/(cua-hang)/game/[duongDan]/dien-dan/viec';
import { useXacNhan } from '@/components/HopXacNhan';
import { ONhapGiu } from '@/components/ONhapGiu';
import { CAU_HOI_TOI_DA, IT_NHAT, LUA_CHON_TOI_DA, NHIEU_NHAT, phanTram } from '@/lib/binh-chon-const';
import { gonSo, gop } from '@/lib/tien-ich';

export interface LuaChonXem { id: string; noiDung: string; soPhieu: number }

/**
 * Cuộc bình chọn của một chủ đề.
 *
 * KẾT QUẢ BÀY RA NGAY, không giấu tới khi bỏ phiếu xong. Giấu thì ép người đọc
 * bấm bừa một ô để xem người khác chọn gì — và một phiếu bấm bừa làm hỏng đúng
 * con số mà cuộc bình chọn sinh ra để đo.
 */
export function KhungBinhChon({ cauHoi, nhieuLuaChon, luaChon, daBam, boPhieuDuoc, goDuoc, chuDeId, duongDan }: {
  cauHoi: string;
  nhieuLuaChon: boolean;
  luaChon: LuaChonXem[];
  /** Mấy lựa chọn người đang xem đã bấm. */
  daBam: string[];
  boPhieuDuoc: boolean;
  goDuoc: boolean;
  chuDeId: string;
  duongDan: string;
}) {
  const [dangGui, batDau] = useTransition();
  const [loi, datLoi] = useState<string | null>(null);
  const { hoi, hop } = useXacNhan();

  const tong = luaChon.reduce((t, l) => t + l.soPhieu, 0);

  return (
    <section className="the space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-start gap-2 text-[15px] font-bold">
          <BarChart3 size={16} className="mt-0.5 shrink-0 text-nhan" aria-hidden />
          {cauHoi}
        </h2>
        {goDuoc && (
          <button type="button" disabled={dangGui}
            onClick={async () => {
              if (!(await hoi('Gỡ hẳn cuộc bình chọn này cùng mọi phiếu đã bỏ?', true))) return;
              datLoi(null);
              batDau(async () => {
                const kq = await xoaBinhChon(chuDeId, duongDan);
                if (kq?.loi) datLoi(kq.loi);
              });
            }}
            className="shrink-0 text-mo transition-colors hover:text-xau" aria-label="Gỡ bình chọn">
            <Trash2 size={14} aria-hidden />
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {luaChon.map((l) => {
          const chon = daBam.includes(l.id);
          const pt = phanTram(l.soPhieu, tong);
          return (
            <li key={l.id}>
              <button type="button" disabled={!boPhieuDuoc || dangGui}
                aria-pressed={chon}
                onClick={() => {
                  datLoi(null);
                  batDau(async () => {
                    const kq = await boPhieu(l.id);
                    if (kq?.loi) datLoi(kq.loi);
                  });
                }}
                className={gop(
                  'vach relative block w-full overflow-hidden rounded-nut border px-3 py-2 text-left transition-colors',
                  chon && 'border-nhan',
                  boPhieuDuoc ? 'hover:border-nhan' : 'cursor-default',
                )}>
                {/* Thanh nền vẽ bằng bề ngang, không bằng một thẻ riêng chồng
                    lên: chữ vẫn nằm trên nền trang nên đọc được ở mọi tỉ lệ. */}
                <span aria-hidden
                  className={gop('absolute inset-y-0 left-0 transition-[width]',
                    chon ? 'bg-nhan/20' : 'bg-nen3/70')}
                  style={{ width: `${pt}%` }} />
                <span className="relative flex items-center gap-2 text-[13px]">
                  <span className={gop('min-w-0 flex-1 truncate', chon && 'font-semibold')}>
                    {chon && <Check size={13} className="mr-1 inline text-nhan" aria-hidden />}
                    {l.noiDung}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold">{pt}%</span>
                  <span className="phu shrink-0 tabular-nums text-[12px]">{gonSo(l.soPhieu)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="phu">
        {gonSo(tong)} phiếu
        {nhieuLuaChon && ' · chọn được nhiều đáp án'}
        {!boPhieuDuoc && ' · đăng nhập để bình chọn'}
      </p>

      {loi && <p role="alert" className="text-[12px] font-medium text-xau">{loi}</p>}
      {hop}
    </section>
  );
}

/**
 * Biểu mẫu gắn một cuộc bình chọn, chỉ bày cho người mở chủ đề.
 *
 * GẤP LẠI SẴN: phần lớn chủ đề không cần bình chọn, nên bày sẵn sáu ô nhập
 * trong mọi chủ đề là sáu ô trống chắn đường mọi người khác.
 */
export function ThemBinhChon({ chuDeId, duongDan }: { chuDeId: string; duongDan: string }) {
  const [kq, gui, dangChay] = useActionState<KetQua, FormData>(taoBinhChon, {});
  // Ô đánh dấu cũng phải tự giữ lấy: React 19 xoá trắng cả nó sau khi `action`
  // chạy, nên gửi hỏng một lần là người mở mất luôn cái vừa bật.
  const [nhieu, datNhieu] = useState(false);

  return (
    <details className="the p-4">
      <summary className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-mo hover:text-chu">
        <Plus size={14} aria-hidden /> Thêm một cuộc bình chọn
      </summary>

      <form action={gui} className="mt-3 space-y-3">
        <input type="hidden" name="chuDeId" value={chuDeId} />
        <input type="hidden" name="duongDan" value={duongDan} />

        <label className="block">
          <span className="phu mb-1 block">Câu hỏi</span>
          <ONhapGiu name="cauHoi" required minLength={5} maxLength={CAU_HOI_TOI_DA}
            placeholder="Bản nào chạy mượt hơn trên máy cũ?" className="o-nhap" />
        </label>

        <fieldset>
          <legend className="phu mb-1">
            Các lựa chọn — ít nhất {IT_NHAT}, để trống mấy ô không dùng
          </legend>
          <div className="space-y-1.5">
            {Array.from({ length: NHIEU_NHAT }, (_, i) => (
              <ONhapGiu key={i} name={`luaChon-${i}`} maxLength={LUA_CHON_TOI_DA}
                aria-label={`Lựa chọn ${i + 1}`} placeholder={`Lựa chọn ${i + 1}`}
                className="o-nhap !min-h-[36px] !py-1 !text-[13px]" />
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2.5">
          <input type="checkbox" name="nhieuLuaChon" checked={nhieu}
            onChange={(e) => datNhieu(e.target.checked)} className="cong-tac shrink-0" />
          <span className="text-[13px]">Cho chọn nhiều đáp án một lúc</span>
        </label>

        {kq.loi && (
          <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
            {kq.loi}
          </p>
        )}

        <button type="submit" disabled={dangChay} className="nut-xam">
          {dangChay ? 'Đang gắn…' : 'Gắn bình chọn'}
        </button>
      </form>
    </details>
  );
}
