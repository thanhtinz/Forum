'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Lock, Mountain } from 'lucide-react';
import { vaoHang, type RongState } from '@/app/(site)/rong/actions';
import type { HangXem } from '@/lib/rong';
import { SO_TANG_HANG, THE_LUC_HANG, anhRong, tenRong, timDo } from '@/lib/rong-const';
import { cn } from '@/lib/utils';
import { ManDau } from './ManDau';
import { TheHe, TheKhacChe } from './TheHe';

/**
 * Hang Rồng — leo tầng, đánh với con canh cửa.
 *
 * Cả cái thang bày ra hết chứ không giấu tầng chưa tới: người chơi phải thấy
 * đường còn dài bao nhiêu, gặp hệ gì ở tầng nào, thì mới có lý do nuôi nhiều
 * con trong chuồng thay vì dồn hết vào một con.
 */
export function HangRong({ d }: { d: HangXem }) {
  const router = useRouter();
  const [tin, setTin] = useState<RongState>({});
  const [dangLam, batDau] = useTransition();

  const lam = (tang: number) => batDau(async () => {
    const fd = new FormData();
    fd.set('tang', String(tang));
    setTin(await vaoHang({}, fd));
    router.refresh();
  });

  const con = d.raTran;
  const duLuc = (con?.theLuc ?? 0) >= THE_LUC_HANG;

  return (
    <div className="space-y-3">
      {/* Giấu câu tường thuật khi có màn kể lại: in sẵn kết quả lên đầu là lộ
          hết trước khi hiệp một kịp diễn. Lỗi thì vẫn phải hiện. */}
      {tin.tran ? (
        tin.error && <p className="text-sm text-red-600">{tin.error}</p>
      ) : (
        <>
          {tin.ke && <p className="text-sm font-medium text-emerald-600">{tin.ke}</p>}
          {tin.error && <p className="text-sm text-red-600">{tin.error}</p>}
        </>
      )}

      {tin.tran && <ManDau key={JSON.stringify(tin.tran.dienBien)} t={tin.tran} />}
      {tin.tran && tin.ke && (
        // Tô theo KẾT QUẢ chứ không tô xanh tất: câu "thua rồi, cho ăn rồi vào
        // lại" mà hiện màu xanh lá thì đọc lướt qua tưởng vừa thắng.
        <p className={cn('text-sm font-medium',
          tin.tran.ai === 'a' ? 'text-emerald-600' : 'text-ink-500 dark:text-ink-300')}>
          {tin.ke}
        </p>
      )}

      <section className="rong-tam p-4">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="zib-title flex items-center gap-2"><Mountain size={17} /> Hang Rồng</h2>
          <span className="retro-sub text-ink-400">
            Đã qua <b className="rong-nhan">{d.tangCaoNhat}</b>/{SO_TANG_HANG} tầng
          </span>
        </div>
        <p className="retro-sub mb-3 text-ink-400">
          Mỗi lượt tốn {THE_LUC_HANG} thể lực. Vượt tầng lần đầu thì có điểm thưởng
          và đôi khi nhặt được đồ; đánh lại tầng cũ chỉ còn kinh nghiệm.
        </p>

        {!con ? (
          <p className="py-6 text-center text-sm text-ink-500">
            Cử một con rồng ra trận trước đã — bấm “Cử ra trận” ở thẻ của nó trong{' '}
            <Link href="/rong" className="rong-nhan font-semibold hover:underline">chuồng</Link>.
          </p>
        ) : (
          <div className="rong-nen-nhan mb-3 flex items-center gap-3 rounded-xl p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={anhRong(con.loai, con.mau)} alt="" aria-hidden
              className="size-14 shrink-0 object-contain" style={{ imageRendering: 'pixelated' }} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
                <span className="min-w-0 truncate">{con.ten || tenRong(con.loai, con.mau)}</span>
                <TheHe he={con.suc.he} />
                <span className="retro-sub font-normal text-ink-400">cấp {con.cap}</span>
              </p>
              <p className="text-[11px] text-ink-500 dark:text-ink-300">
                Công {con.suc.cong} · Thủ {con.suc.thu} · Nhanh {con.suc.nhanh}
              </p>
              <p className="text-[11px] text-ink-400">
                No {con.doNo}% · Vui {con.vui}% · Lực {con.theLuc}%
                {!duLuc && <b className="ml-1.5 text-rose-500">chưa đủ lực vào hang</b>}
              </p>
            </div>
          </div>
        )}

        <ol className="space-y-1.5">
          {d.tang.map((t) => {
            const khoa = !t.daQua && !t.keTiep;
            return (
              <li key={t.so} className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2',
                t.keTiep ? 'rong-vien border bg-ink-50 dark:bg-ink-800/50' : 'bg-ink-50 dark:bg-ink-800/50',
                khoa && 'opacity-55',
              )}>
                <span className="w-6 shrink-0 text-xs font-black tabular-nums text-ink-400">
                  {t.so}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={anhRong(t.loai, t.mau)} alt="" aria-hidden
                  className={cn('size-11 shrink-0 object-contain', khoa && 'grayscale')}
                  style={{ imageRendering: 'pixelated' }} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
                    <span className="min-w-0 truncate">{t.ten}</span>
                    <TheHe he={t.suc.he} />
                    {con && <TheKhacChe cuaToi={con.suc.he} cuaDoi={t.suc.he} />}
                  </p>
                  <p className="retro-sub truncate text-ink-400">
                    {tenRong(t.loai, t.mau)} · cấp {t.cap} · Công {t.suc.cong} · Thủ {t.suc.thu}
                  </p>
                  <p className="text-[11px] text-ink-400">
                    {t.daQua
                      ? `luyện lại: +${Math.max(1, Math.round(t.expThuong / 3))} kinh nghiệm`
                      : `thưởng ${t.thuong} điểm · +${t.expThuong} kinh nghiệm${
                        t.roi ? ` · rơi ${timDo(t.roi)?.ten ?? ''}` : ''}`}
                  </p>
                </div>

                {t.daQua ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <Check size={16} className="text-emerald-600" />
                    <button type="button" disabled={dangLam || !con || !duLuc}
                      onClick={() => lam(t.so)}
                      className="btn-outline px-3 py-1.5 text-xs disabled:opacity-45">
                      Luyện
                    </button>
                  </div>
                ) : t.keTiep ? (
                  <button type="button" disabled={dangLam || !con || !duLuc}
                    onClick={() => lam(t.so)}
                    title={duLuc ? `Vào tầng ${t.so}` : `Cần ${THE_LUC_HANG} thể lực`}
                    className="rong-nut shrink-0 px-3 py-2 text-sm disabled:opacity-50">
                    Vào đánh
                  </button>
                ) : (
                  <Lock size={15} className="shrink-0 text-ink-400" />
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
