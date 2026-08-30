'use client';

import { useActionState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { diemDanh, type PokeState } from '@/app/(site)/pokemon/actions';
import { QUA_DIEM_DANH, quaDiemDanh } from '@/lib/pokemon-const';
import { cn } from '@/lib/utils';

/**
 * Điểm danh hằng ngày.
 *
 * Bảy ô là bảy ngày trong chuỗi, ô hôm nay sắp nhận thì sáng lên. Bày cả bảy
 * ra chứ không chỉ nói "nhận quà": phần thưởng tăng dần mới là lý do quay lại,
 * mà giấu nó đi thì chẳng ai biết ngày mai được gì.
 */
export function DiemDanh({ chuoi, xong }: { chuoi: number; xong: boolean }) {
  const [kq, action, dangChay] = useActionState<PokeState, FormData>(diemDanh, {});
  const sapNhan = xong ? chuoi : chuoi + 1;

  return (
    <section className="dao-tam p-4">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarCheck size={16} className="dao-nhan" />
        <b className="text-sm">Điểm danh hằng ngày</b>
        <span className="text-xs opacity-60">
          {xong ? `Đã nhận, chuỗi ${chuoi} ngày` : `Chuỗi tới: ngày thứ ${sapNhan}`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {QUA_DIEM_DANH.map((q) => {
          const daQua = q.ngay <= chuoi && xong;
          const homNay = !xong && q.ngay === sapNhan;
          return (
            <div key={q.ngay} className={cn(
              'rounded-lg border-2 p-1.5 text-center text-[10px] leading-tight',
              homNay ? 'dao-vien dao-nen-nhan font-bold'
                : daQua ? 'border-emerald-400 opacity-70'
                  : 'border-ink-200 opacity-60 dark:border-ink-700',
            )}>
              <span className="block opacity-70">N{q.ngay}</span>
              <b className="block tabular-nums">{q.vang.toLocaleString('vi')}</b>
              <span className="block opacity-70">+{q.cau} cầu</span>
            </div>
          );
        })}
      </div>

      {/* Chuỗi quá bảy ngày thì lặp lại mức cao nhất — nói ra để khỏi tưởng
          là còn tăng mãi. */}
      {sapNhan > QUA_DIEM_DANH.length && (
        <p className="mt-2 text-[11px] opacity-60">
          Chuỗi đã qua {QUA_DIEM_DANH.length} ngày — từ đây mỗi ngày đều nhận mức cao nhất
          ({quaDiemDanh(sapNhan).vang.toLocaleString('vi')} vàng).
        </p>
      )}

      <form action={action} className="mt-3">
        <button disabled={dangChay || xong}
          className="dao-nut px-4 py-2 text-sm disabled:cursor-not-allowed">
          {xong ? 'Hôm nay đã điểm danh' : 'Điểm danh nhận quà'}
        </button>
      </form>
      {kq.error && <p className="mt-2 text-sm text-red-600">{kq.error}</p>}
      {kq.ke && !kq.error && (
        <p className="man-hien mt-2 text-sm font-medium text-emerald-600">{kq.ke}</p>
      )}
    </section>
  );
}
