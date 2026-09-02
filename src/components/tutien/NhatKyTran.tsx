'use client';

import { useEffect, useState } from 'react';
import type { KeLaiTran } from '@/lib/tu-tien';
import { cn } from '@/lib/utils';

/**
 * Nhật ký trận — chữ chạy ra từng dòng.
 *
 * Đây là thứ THAY CHO hoạt cảnh, và là hình thức chung của cả hai dòng game
 * mà bản thiết kế dựa vào: game chữ Trung Quốc và wap MMORPG Nga đều xử trận ở
 * máy chủ rồi trả về một bản ghi để đọc lại.
 *
 * Chạy từng dòng chứ không đổ ra một lượt: đổ hết ngay thì không ai đọc, mà
 * cái hồi hộp của thể loại này nằm đúng ở chỗ từng dòng hiện ra.
 */
const NHIP_MS = 420;

export function NhatKyTran({ t }: { t: KeLaiTran }) {
  const [so, setSo] = useState(0);

  useEffect(() => {
    if (so >= t.dienBien.length) return;
    const h = setTimeout(() => setSo((n) => n + 1), NHIP_MS);
    return () => clearTimeout(h);
  }, [so, t.dienBien.length]);

  const xong = so >= t.dienBien.length;
  const cuoi = so > 0 ? t.dienBien[so - 1]! : null;
  const hpTa = cuoi?.hpTa ?? t.hpToiDa;
  const hpDich = cuoi?.hpDich ?? t.hpDichDau;

  const phan = (n: number, max: number) => Math.max(0, Math.min(100, Math.round((n / max) * 100)));

  return (
    <section className="tien-trieu p-4">
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <p className="truncate text-sm font-bold">{t.tenTa}</p>
          <div className="tien-thanh my-1"><i style={{ width: `${phan(hpTa, t.hpToiDa)}%` }} /></div>
          <p className="text-xs tabular-nums opacity-70">{hpTa}/{t.hpToiDa}</p>
        </div>
        <div className="text-right">
          <p className="truncate text-sm font-bold">{t.tenDich}</p>
          <div className="tien-thanh my-1"><i style={{ width: `${phan(hpDich, t.hpDichDau)}%` }} /></div>
          <p className="text-xs tabular-nums opacity-70">{hpDich}/{t.hpDichDau}</p>
        </div>
      </div>

      <ol className="tien-so space-y-0.5 text-sm">
        {t.dienBien.slice(0, so).map((d, i) => (
          <li key={i} className={cn(d.ben === 'dich' && 'opacity-70')}>
            <span className="opacity-55">Hiệp {d.hiep}</span>{' — '}
            {d.ben === 'ta' ? <b>{t.tenTa}</b> : t.tenDich} {d.cau}
            {d.satThuong > 0 && (
              <>, gây <b className={d.ben === 'ta' ? 'tien-son' : ''}>{d.satThuong}</b> sát thương</>
            )}.
          </li>
        ))}
      </ol>

      {xong && (
        <p className={cn('mt-3 text-sm font-black', t.thang ? 'tien-ngoc' : 'tien-son')}>
          {t.thang ? `${t.tenDich} gục xuống.` : `${t.tenTa} không trụ nổi.`}
          {t.tuVi !== 0 && (
            <span className="ml-2 font-semibold">
              {t.tuVi > 0 ? `+${t.tuVi}` : t.tuVi} tu vi
              {t.linhThach > 0 && `, +${t.linhThach} linh thạch`}
            </span>
          )}
        </p>
      )}
    </section>
  );
}
