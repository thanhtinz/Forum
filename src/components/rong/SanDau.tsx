'use client';

import Link from 'next/link';
import { Swords } from 'lucide-react';
import type { SanDau as DuLieu } from '@/lib/rong';
import { PHI_DAU, THUONG_THANG, anhRong, tenRong } from '@/lib/rong-const';
import { ManDau } from './ManDau';
import { TheHe, TheKhacChe } from './TheHe';
import { TinRong, useViecRong } from './dung-viec';

/** Đấu trường: chọn một đối thủ rồi thách. */
export function SanDau({ d }: { d: DuLieu }) {
  const { tin, dangLam, lam } = useViecRong(d.now);
  const raTran = d.raTran;

  return (
    <div className="space-y-3">
      {/* Có màn kể lại trận thì GIẤU câu tường thuật đi: in sẵn "hạ được Hắc
          Long, +25 điểm" ngay trên đầu là lộ hết kết quả trước khi hiệp một
          kịp diễn. Lỗi thì vẫn phải hiện — lỗi không phải chuyện để hồi hộp. */}
      <TinRong tin={tin.tran ? { error: tin.error } : tin} />

      {/* Trận vừa đánh diễn lại ngay tại đây. `key` là mấu chốt: hai trận liên
          tiếp mà không đổi khoá thì React giữ nguyên thành phần cũ và màn kể
          đứng im ở kết quả trận trước. */}
      {tin.tran && <ManDau key={JSON.stringify(tin.tran.dienBien)} t={tin.tran} />}

      {d.chotMua && (
        <p className="rong-nen-nhan rounded-xl p-3 text-sm font-semibold">
          Mùa trước khép lại ở {d.chotMua.diemCu} điểm
          {d.chotMua.ten
            ? ` — hạng ${d.chotMua.ten}, thưởng ${d.chotMua.thuong} điểm.`
            : ' — chưa đủ mốc nào để có thưởng.'}
          {' '}Mùa mới bắt đầu lại từ đầu.
        </p>
      )}

      <section className="rong-tam p-4">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="zib-title flex items-center gap-2"><Swords size={17} /> Đấu trường</h2>
          <span className="retro-sub text-ink-400">
            Mùa này <b className="rong-nhan">{d.diemDau}</b> điểm
            {d.tenHang && <> · {d.tenHang}</>}
            {' · '}{d.thangDau} thắng / {d.thuaDau} thua
            {' · '}
            <Link href="/rong/xep-hang" className="rong-nhan font-semibold hover:underline">bảng xếp hạng</Link>
          </span>
        </div>
        <p className="retro-sub mb-3 text-ink-400">
          Ghi danh {PHI_DAU} điểm, thắng được {THUONG_THANG} điểm, hoà thì hoàn phí.
          Người bị thách không mất gì. Còn {d.conLaiHomNay} trận hôm nay.
          Ngũ hành khắc nhau theo vòng Kim → Mộc → Thổ → Thuỷ → Hoả → Kim;
          đánh trúng hệ mình khắc thì mạnh hơn hẳn.
        </p>

        {!raTran ? (
          <p className="py-6 text-center text-sm text-ink-500">
            Cử một con rồng ra trận trước đã — bấm “Cử ra trận” ở thẻ của nó trong{' '}
            <Link href="/rong" className="rong-nhan font-semibold hover:underline">chuồng</Link>.
          </p>
        ) : (
          <>
            <div className="rong-nen-nhan mb-3 flex items-center gap-3 rounded-xl p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={anhRong(raTran.loai, raTran.mau)} alt="" aria-hidden
                className="size-14 shrink-0 object-contain" style={{ imageRendering: 'pixelated' }} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
                  <span className="min-w-0 truncate">{raTran.ten || tenRong(raTran.loai, raTran.mau)}</span>
                  <TheHe he={raTran.suc.he} />
                  <span className="retro-sub font-normal text-ink-400">của bạn · cấp {raTran.cap}</span>
                </p>
                <p className="text-[11px] text-ink-500 dark:text-ink-300">
                  Công {raTran.suc.cong} · Thủ {raTran.suc.thu} · Nhanh {raTran.suc.nhanh}
                </p>
                {/* Ba trục chăm sóc nhân thẳng vào ba chỉ số trên, nên phải
                    bày ngay cạnh: bỏ đói mà ra trận thì thua không hiểu vì sao. */}
                <p className="text-[11px] text-ink-400">
                  No {raTran.doNo}% · Vui {raTran.vui}% · Lực {raTran.theLuc}%
                  {(raTran.doNo < 25 || raTran.vui < 35) && (
                    <b className="ml-1.5 text-rose-500">đang yếu, cho ăn rồi hẵng đấu</b>
                  )}
                </p>
              </div>
            </div>

            {d.doiThu.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-500">
                Chưa có ai cử rồng ra đấu trường. Quay lại sau nhé.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {d.doiThu.map((o) => (
                  <li key={o.rongId} className="rong-vien flex items-center gap-3 rounded-xl border p-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={anhRong(o.loai, o.mau)} alt="" aria-hidden
                      className="size-14 shrink-0 object-contain" style={{ imageRendering: 'pixelated' }} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
                        <span className="min-w-0 truncate">{o.ten || tenRong(o.loai, o.mau)}</span>
                        <TheHe he={o.suc.he} />
                        {/* Chỗ khắc chế thành ra có ích: khỏi phải tự thuộc
                            vòng ngũ hành mới biết nên chọn ai. */}
                        <TheKhacChe cuaToi={raTran.suc.he} cuaDoi={o.suc.he} />
                      </p>
                      <p className="retro-sub truncate text-ink-400">
                        Cấp {o.cap} · của{' '}
                        <Link href={`/u/${o.chuUsername}`} className="hover:text-brand-600">{o.chuTen}</Link>
                      </p>
                      <p className="text-[11px] text-ink-500 dark:text-ink-300">
                        Công {o.suc.cong} · Thủ {o.suc.thu} · Nhanh {o.suc.nhanh}
                      </p>
                    </div>
                    <button type="button"
                      disabled={dangLam || d.conLaiHomNay <= 0}
                      onClick={() => lam('dau', { cua_toi: raTran.id, doi_thu: o.rongId })}
                      title={d.conLaiHomNay > 0 ? `Thách đấu · ${PHI_DAU} điểm` : 'Hôm nay đã đấu đủ số trận'}
                      className="rong-nut shrink-0 px-3 py-2 text-sm disabled:opacity-50">
                      Đấu
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
