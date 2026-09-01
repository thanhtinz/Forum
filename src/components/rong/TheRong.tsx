'use client';

import { useState } from 'react';
import { Drumstick, Swords, Tag, Trash2 } from 'lucide-react';
import type { RongXem } from '@/lib/rong';
import {
  ANH_BONG, CAP_TOI_DA, GIA_AN, anhRong, expCanDe, moTaConLai, tenRong,
} from '@/lib/rong-const';
import { cn } from '@/lib/utils';
import { TheHe } from './TheHe';

/**
 * Một ô trong chuồng: một con rồng ĐÃ NỞ.
 *
 * Trứng vẽ riêng ở `TheTrung` và nằm hẳn ở trang ấp trứng — xem lý do ở đầu
 * tệp ấy.
 */
export function TheRong({
  r, now, dangLam, onViec,
}: {
  r: RongXem;
  now: number;
  dangLam: boolean;
  onViec: (viec: string, truong?: Record<string, string>) => void;
}) {
  const [doiTen, setDoiTen] = useState(false);
  const ten = r.ten || tenRong(r.loai, r.mau);

  const canExp = expCanDe(r.cap);
  const phanExp = r.cap >= CAP_TOI_DA ? 100 : Math.min(100, Math.round((r.exp / canExp) * 100));
  const anDuoc = now >= r.anDuocLuc;
  const choiDuoc = now >= r.choiDuocLuc;

  return (
    <li className={cn('rong-tam flex flex-col gap-2 p-4', r.raTran && 'ring-2 ring-amber-400')}>
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={anhRong(r.loai, r.mau)} alt={ten} className="size-20 shrink-0 object-contain"
          style={{ imageRendering: 'pixelated' }} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5">
            <b className="min-w-0 truncate">{ten}</b>
            <span className="chip bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">Cấp {r.cap}</span>
            <TheHe he={r.suc.he} />
            {r.raTran && <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Đang ra trận</span>}
          </p>
          <p className="retro-sub text-ink-400">{tenRong(r.loai, r.mau)}</p>

          {/* Ba chỉ số — thứ quyết định thắng thua ở đấu trường */}
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-500 dark:text-ink-300">
            <li>Công <b className="text-rose-600">{r.suc.cong}</b></li>
            <li>Thủ <b className="text-sky-600">{r.suc.thu}</b></li>
            <li>Nhanh <b className="text-emerald-600">{r.suc.nhanh}</b></li>
          </ul>
        </div>
      </div>

      {/* Vui và kinh nghiệm: hai thanh, vì hai thứ này đổi theo cách khác nhau */}
      <div className="space-y-1">
        <Thanh nhan="Vui" phan={r.vui} mau="bg-amber-400"
          ghi={r.vui < 35 ? `${r.vui}% — đang buồn, đánh yếu hẳn` : `${r.vui}%`} />
        <Thanh nhan="Kinh nghiệm" phan={phanExp} mau="bg-brand-500"
          ghi={r.cap >= CAP_TOI_DA ? 'đã kịch cấp' : `${r.exp}/${canExp}`} />
      </div>

      {doiTen ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onViec('ten', { rong: r.id, ten: String(fd.get('ten') ?? '') });
            setDoiTen(false);
          }}
          className="flex gap-2"
        >
          <input name="ten" defaultValue={r.ten ?? ''} autoFocus maxLength={24}
            aria-label={`Tên cho ${ten}`} className="input flex-1" placeholder="Đặt tên…" />
          <button type="submit" className="btn-primary shrink-0">Lưu</button>
        </form>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" disabled={dangLam || !anDuoc}
            onClick={() => onViec('an', { rong: r.id })}
            title={anDuoc ? `Cho ăn · ${GIA_AN} điểm` : `Còn no, chờ ${moTaConLai(r.anDuocLuc - now)}`}
            className="btn-outline justify-center gap-1.5 text-sm disabled:opacity-45">
            <Drumstick size={15} /> {anDuoc ? `Ăn · ${GIA_AN}đ` : moTaConLai(r.anDuocLuc - now)}
          </button>

          <button type="button" disabled={dangLam || !choiDuoc}
            onClick={() => onViec('choi', { rong: r.id })}
            title={choiDuoc ? 'Chơi bóng, miễn phí' : `Đang mệt, chờ ${moTaConLai(r.choiDuocLuc - now)}`}
            className="btn-outline justify-center gap-1.5 text-sm disabled:opacity-45">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ANH_BONG} alt="" aria-hidden className="size-4" />
            {choiDuoc ? 'Chơi bóng' : moTaConLai(r.choiDuocLuc - now)}
          </button>

          <button type="button" disabled={dangLam || r.raTran}
            onClick={() => onViec('ra-tran', { rong: r.id })}
            className="btn-outline justify-center gap-1.5 text-sm disabled:opacity-45">
            <Swords size={15} /> {r.raTran ? 'Đã cử' : 'Cử ra trận'}
          </button>

          <div className="flex gap-1.5">
            <button type="button" onClick={() => setDoiTen(true)} title="Đặt tên"
              className="btn-ghost flex-1 justify-center" aria-label={`Đặt tên cho ${ten}`}>
              <Tag size={15} />
            </button>
            <button type="button" disabled={dangLam}
              onClick={() => { if (confirm(`Thả ${ten} về trời? Không lấy lại được.`)) onViec('tha', { rong: r.id }); }}
              title="Thả về trời" aria-label={`Thả ${ten} về trời`}
              className="btn-ghost flex-1 justify-center text-rose-500 disabled:opacity-45">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Thanh({ nhan, phan, mau, ghi }: { nhan: string; phan: number; mau: string; ghi?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-ink-400">
        <span>{nhan}</span>
        {ghi && <span>{ghi}</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <div className={cn('h-full rounded-full transition-[width] duration-500', mau)}
          style={{ width: `${Math.max(2, phan)}%` }} />
      </div>
    </div>
  );
}
