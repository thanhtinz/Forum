'use client';

import { useActionState, useMemo, useState } from 'react';
import { Check, Gift, Lock } from 'lucide-react';
import { nhanThuongDoGiam, type PokeState } from '@/app/(site)/pokemon/actions';
import { MOC_DO_GIAM, anhThu, mocDoGiamDatDuoc, tenHe } from '@/lib/pokemon-const';
import { canhKhu } from '@/lib/pokemon-giao-dien';
import { cn } from '@/lib/utils';
import { HuyHieuHe } from './ThePoke';

interface Loai { nguon: number; ten: string; he: number; khu: string; gap: boolean; bat: boolean }
interface Khu { ma: string; ten: string; bac: number }

/**
 * Sổ các loài trên đảo.
 *
 * Đếm theo LOÀI chứ không theo số dòng trong bảng thú hoang: một loài có mặt
 * ở nhiều khu thì vẫn là một loài, nên con số ở đây nhỏ hơn tổng số thú hoang.
 *
 * Ba trạng thái, phân biệt bằng chính tấm ảnh chứ không bằng chữ: chưa gặp thì
 * chỉ thấy bóng đen, gặp rồi thì thấy ảnh xám, bắt được thì ảnh đủ màu và có
 * viền. Ghi chữ "chưa gặp / đã gặp / đã bắt" dưới từng ô thì bốn trăm sáu tám
 * ô thành bốn trăm sáu tám dòng chữ.
 */
export function DoGiam({ loai, khu, daNhanMoc }: {
  loai: Loai[]; khu: Khu[]; daNhanMoc: number;
}) {
  const [xemKhu, setXemKhu] = useState<string>('tatca');
  const [chiThieu, setChiThieu] = useState(false);
  const [thuong, thuongAction, dangNhan] = useActionState<PokeState, FormData>(
    nhanThuongDoGiam, {});

  const daGap = loai.filter((l) => l.gap).length;
  const daBat = loai.filter((l) => l.bat).length;
  const datDuoc = mocDoGiamDatDuoc(daGap, daBat);
  const mocKe = MOC_DO_GIAM[daNhanMoc] ?? null;

  const hien = useMemo(() => loai
    .filter((l) => xemKhu === 'tatca' || l.khu === xemKhu)
    .filter((l) => !chiThieu || !l.bat), [loai, xemKhu, chiThieu]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-xl font-black">Đồ Giám</h1>
        <span className="retro-sub text-ink-400">
          gặp {daGap}/{loai.length} · bắt {daBat}/{loai.length} loài
        </span>
      </div>

      {/* Hai thanh tiến độ: gặp và bắt là hai việc khác nhau, gộp một thanh thì
          mất hẳn khoảng cách giữa "đã thấy" và "đã có". */}
      <div className="space-y-1.5">
        <Vach nhan="Đã gặp" so={daGap} tong={loai.length} lop="bg-sky-500" />
        <Vach nhan="Đã bắt" so={daBat} tong={loai.length} lop="bg-emerald-500" />
      </div>

      {/* Mốc thưởng — trước đây lấp đủ sổ 468 loài mà không có phần thưởng
          nào, sổ chỉ là hai thanh tiến độ. */}
      <div className="rounded-xl border-2 border-ink-200 p-3 dark:border-ink-700">
        <p className="label mb-2 flex items-center gap-1.5"><Gift size={13} /> Mốc thưởng của sổ</p>
        {thuong.error && <p className="mb-2 text-sm text-red-600">{thuong.error}</p>}
        {thuong.ke && !thuong.error && (
          <p className="man-hien mb-2 text-sm font-medium text-emerald-600">{thuong.ke}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {MOC_DO_GIAM.map((m, i) => (
            <span key={m.ma} className={cn(
              'chip !py-0.5 text-[11px]',
              i < daNhanMoc ? 'border-emerald-400 text-emerald-600'
                : i < datDuoc ? 'border-brand-400 font-bold text-brand-600'
                  : 'opacity-50',
            )}>
              {i < daNhanMoc && <Check size={11} />}
              {i >= datDuoc && <Lock size={11} />}
              {m.ten}
            </span>
          ))}
        </div>
        {mocKe ? (
          <form action={thuongAction} className="mt-2">
            <p className="mb-1.5 text-xs text-ink-500">
              Mốc kế: <b>{mocKe.ten}</b> — {mocKe.vang.toLocaleString('vi')} vàng
              {mocKe.ngoc ? `, ${mocKe.ngoc} ngọc` : ''}
              {mocKe.cau ? `, ${mocKe.cau} quả cầu` : ''}
              {mocKe.da ? `, ${mocKe.da} đá tiến cấp` : ''}.
            </p>
            <button disabled={dangNhan || datDuoc <= daNhanMoc}
              className="btn-primary gap-1.5 !py-1.5 text-sm disabled:opacity-50">
              {datDuoc > daNhanMoc ? <><Check size={14} /> Nhận thưởng</> : 'Chưa tới mốc'}
            </button>
          </form>
        ) : (
          <p className="mt-2 text-xs text-emerald-600">Bạn đã nhận hết mốc thưởng của sổ.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip dang={xemKhu === 'tatca'} onClick={() => setXemKhu('tatca')}>Tất cả</Chip>
        {khu.map((k) => (
          <Chip key={k.ma} dang={xemKhu === k.ma} onClick={() => setXemKhu(k.ma)}>{k.ten}</Chip>
        ))}
        <Chip dang={chiThieu} onClick={() => setChiThieu((v) => !v)}>Chỉ con chưa bắt</Chip>
      </div>

      {hien.length === 0 ? (
        <p className="text-sm text-ink-500">Không còn con nào ở đây — bạn bắt hết rồi.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {hien.map((l) => (
            <O key={l.nguon} l={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function Vach({ nhan, so, tong, lop }: { nhan: string; so: number; tong: number; lop: string }) {
  return (
    <div>
      <div className="mb-0.5 flex items-baseline justify-between text-[11px]">
        <span className="opacity-60">{nhan}</span>
        <span className="tabular-nums opacity-80">{Math.round((so / Math.max(1, tong)) * 100)}%</span>
      </div>
      <div className="dao-mau h-1.5 w-full">
        <i className={lop} style={{ width: `${(so / Math.max(1, tong)) * 100}%` }} />
      </div>
    </div>
  );
}

function Chip({ dang, onClick, children }: {
  dang: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn('chip !py-1 text-xs',
        dang ? 'dao-nen-nhan dao-nhan font-bold ring-1 ring-[var(--dao-nhan)]/40'
          : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300')}>
      {children}
    </button>
  );
}

function O({ l }: { l: Loai }) {
  const c = canhKhu(l.khu);
  return (
    <div
      title={l.gap ? `${l.ten} — ${tenHe(l.he)}` : 'Chưa gặp'}
      className={cn('relative overflow-hidden rounded-xl border-2 p-2 text-center',
        l.bat ? 'border-emerald-400' : l.gap ? 'border-ink-200 dark:border-ink-700' : 'border-dashed border-ink-200 dark:border-ink-800')}>
      <span aria-hidden className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, ${c.xa}, ${c.gan})`, opacity: l.bat ? 0.22 : 0.08 }} />
      <span className="relative block h-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={anhThu(l.nguon, 1)} alt="" aria-hidden
          className={cn('mx-auto h-full w-auto object-contain',
            !l.gap && 'brightness-0 opacity-25',
            l.gap && !l.bat && 'grayscale opacity-70')}
          style={{ imageRendering: 'pixelated' }} />
      </span>
      <b className="relative mt-1 block truncate text-[11px] leading-tight">
        {l.gap ? l.ten : '???'}
      </b>
      {l.gap && (
        <span className="relative mt-0.5 flex justify-center"><HuyHieuHe he={l.he} className="h-3" /></span>
      )}
    </div>
  );
}
