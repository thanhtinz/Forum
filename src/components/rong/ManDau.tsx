'use client';

import { useEffect, useState } from 'react';
import type { KeLaiTran } from '@/lib/rong';
import { ANH_HP, anhRong, tenRong } from '@/lib/rong-const';
import { cn } from '@/lib/utils';

/**
 * Màn kể lại một trận đấu, hiệp một rồi hiệp hai.
 *
 * `RongTran.dienBien` ghi đủ máu còn lại và sát thương từng hiệp NGAY TỪ NGÀY
 * ĐẦU, mà chẳng nơi nào đọc: đánh xong chỉ hiện đúng một dòng "thắng rồi,
 * được 25 điểm". Cả cái thú của việc chăm rồng nằm ở chỗ thấy con mình đánh
 * ra sao, nên chỗ này bày lại từng hiệp.
 *
 * Ba mốc thời gian cho một hiệp — bên A ra đòn, bên B trả đòn, rồi lặng một
 * nhịp — vì hai bên đánh cùng lúc thì không đọc kịp số nào của ai.
 */
const NHIP_MS = 900;

export function ManDau({ t, goN = false }: { t: KeLaiTran; goN?: boolean }) {
  // `goN` = xem lại trong lịch sử: bày thẳng kết quả cuối, không diễn lại.
  const [hiep, setHiep] = useState(goN ? t.dienBien.length : 0);

  useEffect(() => {
    if (goN || hiep >= t.dienBien.length) return;
    const h = setTimeout(() => setHiep((n) => n + 1), NHIP_MS);
    return () => clearTimeout(h);
  }, [hiep, goN, t.dienBien.length]);

  const xong = hiep >= t.dienBien.length;
  // Trước hiệp đầu thì cả hai còn đủ máu; sau đó lấy đúng số của hiệp vừa diễn.
  const truoc = hiep > 0 ? t.dienBien[hiep - 1]! : null;
  const aMau = truoc?.aMau ?? 100;
  const bMau = truoc?.bMau ?? 100;
  const vua = truoc;

  return (
    <section className="rong-canh relative overflow-hidden rounded-2xl p-4">
      <div className="relative flex items-stretch gap-3">
        {/* Số sát thương bay lên ở bên ĂN ĐÒN, nên bên A nhận `bDanh`. */}
        <Ben ben={t.a} mau={aMau} sat={vua?.bDanh} ben2={false} dang={!xong} />
        <div className="flex shrink-0 flex-col items-center justify-center px-1">
          <span className="text-xs font-black opacity-80">
            {xong ? 'hết' : `hiệp ${hiep + 1}`}
          </span>
          <span className="text-lg font-black opacity-60">VS</span>
        </div>
        <Ben ben={t.b} mau={bMau} sat={vua?.aDanh} ben2 dang={!xong} />
      </div>

      {xong && (
        <p className="relative mt-3 text-center text-sm font-black">
          {t.ai === 'a'
            ? `${t.a.ten || tenRong(t.a.loai, t.a.mau)} thắng!`
            : t.ai === 'hoa'
              ? 'Bất phân thắng bại.'
              : `${t.b.ten || tenRong(t.b.loai, t.b.mau)} thắng.`}
          {t.duoc !== 0 && (
            <span className={cn('ml-2', t.duoc > 0 ? 'text-emerald-600' : 'text-rose-600')}>
              {t.duoc > 0 ? `+${t.duoc}` : t.duoc} điểm
            </span>
          )}
        </p>
      )}
    </section>
  );
}

function Ben({
  ben, mau, sat, ben2, dang,
}: {
  ben: KeLaiTran['a'];
  mau: number;
  /** Sát thương bên này vừa ĂN — 0 nghĩa là né được. */
  sat?: number;
  ben2: boolean;
  dang: boolean;
}) {
  return (
    <div className={cn('min-w-0 flex-1', ben2 && 'text-right')}>
      <p className="truncate text-sm font-bold">{ben.ten || tenRong(ben.loai, ben.mau)}</p>
      <p className="text-[11px] opacity-80">cấp {ben.cap}</p>

      <div className={cn('relative mt-1 flex items-center gap-1.5', ben2 && 'flex-row-reverse')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ANH_HP} alt="" aria-hidden className="size-4 shrink-0"
          style={{ imageRendering: 'pixelated' }} />
        {/* Bên phải thì thanh máu vơi từ phía trong ra: hai thanh cùng vơi
            về một hướng thì nhìn không ra hai bên đối nhau. */}
        <div className={cn('rong-mau h-2 min-w-0 flex-1', ben2 && 'flex justify-end')}>
          <i style={{
            width: `${Math.max(0, Math.min(100, mau))}%`,
            backgroundColor: mau > 50 ? '#3fbf5f' : mau > 20 ? '#e0a51f' : '#d64545',
          }} />
        </div>
        <span className="shrink-0 text-[11px] tabular-nums opacity-80">{mau}</span>
      </div>

      <div className={cn('relative mt-1 flex h-16 items-end', ben2 ? 'justify-end' : 'justify-start')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={anhRong(ben.loai, ben.mau)} alt=""
          aria-hidden
          className={cn('size-16 object-contain',
            mau === 0 ? 'opacity-40 grayscale' : dang && (ben2 ? 'rong-lao-nguoc' : 'rong-lao'))}
          style={{ imageRendering: 'pixelated' }} />
        {sat != null && (
          <span key={`${sat}-${mau}`}
            className={cn('rong-so-bay absolute bottom-8 text-sm font-black',
              ben2 ? 'left-0' : 'right-0',
              sat === 0 ? 'opacity-70' : 'text-rose-500')}>
            {sat === 0 ? 'né!' : `−${sat}`}
          </span>
        )}
      </div>
    </div>
  );
}
