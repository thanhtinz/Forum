'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Egg, Swords } from 'lucide-react';
import {
  choAn, choiBong, cuRaTran, datTen, muaTrung, noTrung, thaRong, thachDau,
  type RongState,
} from '@/app/(site)/rong/actions';
import type { DaoRong as DuLieu, DoiThu } from '@/lib/rong';
import {
  ANH_TRUNG, CHUONG_TOI_DA, DU_BO, GIA_TRUNG, LOAI, MAU_TEN, PHI_DAU,
  THUONG_THANG, anhRong, tenRong,
} from '@/lib/rong-const';
import { cn } from '@/lib/utils';
import { TheRong } from './TheRong';

/**
 * Đảo rồng — chuồng, đấu trường và bộ sưu tập trên một màn hình.
 *
 * Đồng hồ lấy mốc từ máy chủ (`d.now`) rồi mới tự chạy tiếp: dùng `Date.now()`
 * của máy người xem ngay lần dựng đầu thì máy nào lệch giờ là React kêu sai
 * lệch dựng hình ngay giây đầu tiên.
 */

const VIEC = {
  trung: muaTrung, no: noTrung, an: choAn, choi: choiBong,
  ten: datTen, 'ra-tran': cuRaTran, dau: thachDau, tha: thaRong,
} as const;

export function DaoRong({ d, doiThu }: { d: DuLieu; doiThu: DoiThu[] }) {
  const router = useRouter();
  const [now, setNow] = useState(d.now);
  const [tin, setTin] = useState<RongState>({});
  const [dangLam, batDau] = useTransition();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const lam = (viec: keyof typeof VIEC, truong: Record<string, string> = {}) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(truong)) fd.set(k, v);
    batDau(async () => {
      setTin(await VIEC[viec]({}, fd));
      router.refresh();
    });
  };

  const raTran = d.dan.find((r) => r.raTran && !r.laTrung) ?? null;
  const conCho = CHUONG_TOI_DA - d.dan.length;

  return (
    <div className="space-y-4">
      {/* Không in số điểm ở đây: nó đã nằm sẵn trên thanh đầu trang. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{d.dan.length}/{CHUONG_TOI_DA} chỗ trong chuồng</span>
        <span className="chip">Sưu tầm {d.daCo}/{DU_BO}</span>
        <span className="chip">Còn {d.conLaiHomNay} trận hôm nay</span>
      </div>

      {tin.ke && <p className="text-sm font-medium text-emerald-600">{tin.ke}</p>}
      {tin.error && <p className="text-sm text-red-600">{tin.error}</p>}

      {/* ── Chuồng ── */}
      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="zib-title">Chuồng rồng</h2>
          <button type="button" disabled={dangLam || conCho <= 0}
            onClick={() => lam('trung')}
            title={conCho > 0 ? `Mua trứng · ${GIA_TRUNG} điểm` : 'Chuồng đã đầy'}
            className="btn-primary gap-1.5 text-sm disabled:opacity-50">
            <Egg size={15} /> Mua trứng · {GIA_TRUNG} điểm
          </button>
        </div>

        {d.dan.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-ink-400">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ANH_TRUNG} alt="" aria-hidden className="h-16 w-auto opacity-60"
              style={{ imageRendering: 'pixelated' }} />
            <p className="text-sm">Chuồng còn trống. Mua một quả trứng để bắt đầu.</p>
          </div>
        ) : (
          // Hai cột là hết. Ba cột trên trang rộng 4xl thì mỗi thẻ còn ~230px,
          // tên rồng cụt ngay và ba chỉ số phải xuống dòng.
          <ul className="grid gap-3 sm:grid-cols-2">
            {d.dan.map((r) => (
              <TheRong key={r.id} r={r} now={now} dangLam={dangLam}
                onViec={(v, t) => lam(v as keyof typeof VIEC, t)} />
            ))}
          </ul>
        )}
      </section>

      {/* ── Đấu trường ── */}
      <section className="card p-4">
        <h2 className="zib-title mb-1 flex items-center gap-2"><Swords size={17} /> Đấu trường</h2>
        <p className="retro-sub mb-3 text-ink-400">
          Ghi danh {PHI_DAU} điểm, thắng được {THUONG_THANG} điểm, hoà thì hoàn phí.
          Người bị thách không mất gì.
        </p>

        {!raTran ? (
          <p className="text-sm text-ink-500">
            Cử một con rồng ra trận trước đã — bấm “Cử ra trận” ở thẻ của nó.
          </p>
        ) : doiThu.length === 0 ? (
          <p className="text-sm text-ink-500">
            Chưa có ai cử rồng ra đấu trường. Quay lại sau nhé.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {doiThu.map((o) => (
              <li key={o.rongId} className="flex items-center gap-3 rounded-xl border border-ink-100 p-2.5 dark:border-ink-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={anhRong(o.loai, o.mau)} alt="" aria-hidden className="size-14 shrink-0 object-contain"
                  style={{ imageRendering: 'pixelated' }} />
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
                  className="btn-primary shrink-0 text-sm disabled:opacity-50">
                  Đấu
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Bộ sưu tập ── */}
      <section className="card p-4">
        <h2 className="zib-title mb-1">Bộ sưu tập</h2>
        <p className="retro-sub mb-3 text-ink-400">
          Chín loài, mỗi loài sáu màu. Con nào từng nở là sáng lên, kể cả khi đã thả.
        </p>
        <div className="space-y-3">
          {LOAI.map((l) => (
            <div key={l.id}>
              <p className="mb-1 text-sm font-bold">
                {l.ten} <span className="retro-sub font-normal text-ink-400">· {l.moTa}</span>
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {MAU_TEN.map((tenMau, i) => {
                  const mau = i + 1;
                  const co = d.boSuuTap.includes(`${l.id}-${mau}`);
                  return (
                    <li key={mau}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={anhRong(l.id, mau)}
                        alt={co ? `${l.ten} ${tenMau} — đã có` : `${l.ten} ${tenMau} — chưa có`}
                        title={co ? `${l.ten} ${tenMau}` : 'Chưa sưu tầm được'}
                        // Chưa có thì làm xám và mờ VỪA PHẢI. Mờ quá thì cả
                        // hàng thành một vệt xám, không còn thấy con nào khác
                        // con nào — mà nhìn trước con mình sắp săn chính là
                        // cái thú của bộ sưu tập.
                        className={cn('size-14 object-contain transition-all',
                          co ? '' : 'opacity-45 grayscale contrast-75')}
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
