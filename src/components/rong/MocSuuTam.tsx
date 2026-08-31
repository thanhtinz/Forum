'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, Lock } from 'lucide-react';
import { nhanMocSuuTam, type RongState } from '@/app/(site)/rong/actions';
import { MOC_SUU_TAM } from '@/lib/rong-const';
import { cn } from '@/lib/utils';

/**
 * Hàng mốc thưởng của sổ sưu tầm.
 *
 * Không dùng `useViecRong`: hàng này không cần đồng hồ, mà cái hook kia kéo
 * theo cả tám server action của đảo — nạp thừa cho một cái nút.
 *
 * Lĩnh từng mốc một chứ không lĩnh gộp: người bỏ đảo nửa năm quay lại có thể
 * đủ ba mốc cùng lúc, và ba lần bấm với ba câu "được bao nhiêu điểm" nói rõ
 * hơn hẳn một cục tiền không biết từ đâu ra.
 */
export function MocSuuTam({ daCo, mocDaNhan }: { daCo: number; mocDaNhan: number }) {
  const router = useRouter();
  const [tin, setTin] = useState<RongState>({});
  const [dangLam, batDau] = useTransition();

  const lam = () => batDau(async () => {
    setTin(await nhanMocSuuTam({}, new FormData()));
    router.refresh();
  });

  return (
    <section className="rong-tam p-4">
      <h2 className="zib-title mb-1 flex items-center gap-2"><Gift size={17} /> Mốc thưởng</h2>
      <p className="retro-sub mb-3 text-ink-400">
        Sổ đầy dần thì có thưởng. Con đã thả về trời vẫn tính.
      </p>

      {tin.ke && <p className="mb-2 text-sm font-medium text-emerald-600">{tin.ke}</p>}
      {tin.error && <p className="mb-2 text-sm text-red-600">{tin.error}</p>}

      <ul className="space-y-1.5">
        {MOC_SUU_TAM.map((m, i) => {
          const daNhan = i < mocDaNhan;
          const lanhDuoc = !daNhan && daCo >= m.so && i === mocDaNhan;
          return (
            <li key={m.so} className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
              lanhDuoc ? 'rong-nen-nhan font-bold' : 'bg-ink-50 dark:bg-ink-800/50',
              daNhan && 'opacity-55',
            )}>
              <span className="w-14 shrink-0 tabular-nums">{m.so} con</span>
              <span className="min-w-0 flex-1 truncate text-ink-500 dark:text-ink-300">
                thưởng {m.thuong.toLocaleString('vi')} điểm
              </span>
              {daNhan ? (
                <span className="retro-sub shrink-0 text-emerald-600">đã lĩnh</span>
              ) : lanhDuoc ? (
                <button type="button" disabled={dangLam} onClick={lam}
                  className="rong-nut shrink-0 px-3 py-1.5 text-xs disabled:opacity-50">
                  Lĩnh thưởng
                </button>
              ) : (
                <span className="retro-sub flex shrink-0 items-center gap-1 text-ink-400">
                  <Lock size={12} /> còn {Math.max(0, m.so - daCo)} con
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
