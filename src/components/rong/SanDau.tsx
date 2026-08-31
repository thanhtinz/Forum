'use client';

import Link from 'next/link';
import { Swords } from 'lucide-react';
import type { SanDau as DuLieu } from '@/lib/rong';
import { PHI_DAU, THUONG_THANG, anhRong, tenRong } from '@/lib/rong-const';
import { TinRong, useViecRong } from './dung-viec';

/** Đấu trường: chọn một đối thủ rồi thách. */
export function SanDau({ d }: { d: DuLieu }) {
  const { tin, dangLam, lam } = useViecRong(d.now);
  const raTran = d.raTran;

  return (
    <div className="space-y-3">
      <TinRong tin={tin} />

      <section className="rong-tam p-4">
        <h2 className="zib-title mb-1 flex items-center gap-2"><Swords size={17} /> Đấu trường</h2>
        <p className="retro-sub mb-3 text-ink-400">
          Ghi danh {PHI_DAU} điểm, thắng được {THUONG_THANG} điểm, hoà thì hoàn phí.
          Người bị thách không mất gì. Còn {d.conLaiHomNay} trận hôm nay.
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
                <p className="truncate text-sm font-bold">
                  {raTran.ten || tenRong(raTran.loai, raTran.mau)}
                  <span className="retro-sub ml-2 font-normal text-ink-400">của bạn · cấp {raTran.cap}</span>
                </p>
                <p className="text-[11px] text-ink-500 dark:text-ink-300">
                  Công {raTran.suc.cong} · Thủ {raTran.suc.thu} · Nhanh {raTran.suc.nhanh}
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
                      <p className="truncate text-sm font-bold">{o.ten || tenRong(o.loai, o.mau)}</p>
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
