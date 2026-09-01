'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { HeartHandshake } from 'lucide-react';
import { laiTao, type RongState } from '@/app/(site)/rong/actions';
import type { ChaMeXem } from '@/lib/rong';
import {
  GIA_LAI, LAI_CAP_TOI_THIEU, LAI_TOI_DA, TI_LE_DOT_BIEN,
  moTaConLai, tenRong,
} from '@/lib/rong-const';

/**
 * Ghép hai con rồng lấy một quả trứng.
 *
 * Vì sao trò này cần: mua trứng thường thì loài và màu bốc hoàn toàn ngẫu
 * nhiên trong 54 cửa, nên săn cho đủ sổ sưu tầm là chuyện may rủi thuần tuý —
 * nuôi con rồng lên cấp 30 chẳng giúp gì cho việc ấy. Lai tạo là đường DUY
 * NHẤT mà công chăm bẵm đổi được thành một quả trứng đoán trước được phần nào.
 *
 * Hai ô chọn chứ không phải "chọn con này rồi chọn con kia": ghép đôi thì phải
 * thấy cả hai bên cùng lúc mới biết mình đang ghép gì với gì.
 */
export function LaiTao({ chaMe, now }: { chaMe: ChaMeXem[]; now: number }) {
  const router = useRouter();
  const [cha, setCha] = useState('');
  const [me, setMe] = useState('');
  const [tin, setTin] = useState<RongState>({});
  const [dangLam, batDau] = useTransition();

  const duocLai = chaMe.filter((r) => r.sanSang);

  const lam = () => batDau(async () => {
    const fd = new FormData();
    fd.set('cha', cha);
    fd.set('me', me);
    setTin(await laiTao({}, fd));
    router.refresh();
  });

  const nhan = (r: ChaMeXem) =>
    `${r.ten || tenRong(r.loai, r.mau)} · cấp ${r.cap} · đời ${r.doi}`;

  return (
    <section className="rong-tam p-4">
      <h2 className="zib-title mb-1 flex items-center gap-2">
        <HeartHandshake size={17} /> Lai tạo
      </h2>
      <p className="retro-sub mb-3 text-ink-400">
        Hai con từ cấp {LAI_CAP_TOI_THIEU} trở lên, mỗi con lai được {LAI_TOI_DA} lần,
        lai xong nghỉ một ngày. Trứng lai giá {GIA_LAI} điểm, thừa hưởng loài của
        một bên và màu của một bên — {Math.round(TI_LE_DOT_BIEN * 100)}% ra đột biến
        hẳn một con khác. Con lai lên một đời, mỗi đời mạnh thêm một chút.
      </p>

      {tin.ke && <p className="mb-2 text-sm font-medium text-emerald-600">{tin.ke}</p>}
      {tin.error && <p className="mb-2 text-sm text-red-600">{tin.error}</p>}

      {duocLai.length < 2 ? (
        <p className="py-3 text-sm text-ink-500">
          Cần ít nhất hai con đủ điều kiện. Hiện có {duocLai.length}.
          {chaMe.some((r) => !r.sanSang) && (
            <>
              {' '}Mấy con chưa lai được:{' '}
              {chaMe.filter((r) => !r.sanSang).map((r) => {
                const vi = r.cap < LAI_CAP_TOI_THIEU
                  ? `mới cấp ${r.cap}`
                  : r.soLanLai >= LAI_TOI_DA
                    ? 'hết lượt lai'
                    : `còn nghỉ ${moTaConLai(r.laiDuocLuc - now)}`;
                return `${r.ten || tenRong(r.loai, r.mau)} (${vi})`;
              }).join(', ')}.
            </>
          )}
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="retro-sub mb-1 block text-ink-400">Con thứ nhất</span>
            <select value={cha} onChange={(e) => setCha(e.target.value)} className="input w-full">
              <option value="">— chọn —</option>
              {duocLai.filter((r) => r.id !== me).map((r) => (
                <option key={r.id} value={r.id}>{nhan(r)}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1">
            <span className="retro-sub mb-1 block text-ink-400">Con thứ hai</span>
            <select value={me} onChange={(e) => setMe(e.target.value)} className="input w-full">
              <option value="">— chọn —</option>
              {duocLai.filter((r) => r.id !== cha).map((r) => (
                <option key={r.id} value={r.id}>{nhan(r)}</option>
              ))}
            </select>
          </label>
          <button type="button" disabled={dangLam || !cha || !me}
            onClick={lam}
            className="rong-nut shrink-0 px-4 py-2 text-sm disabled:opacity-50">
            Lai · {GIA_LAI} điểm
          </button>
        </div>
      )}
    </section>
  );
}
