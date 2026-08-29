'use client';

import {
  ANH_CAY_KHE, ANH_CAY_KHE_CHIN, ANH_MUA_DAT, KHE_MAX, KHE_MIN, O_DAT_TOI_DA,
  moTaConLai,
} from '@/lib/farm-const';
import { cn } from '@/lib/utils';
import { AnhPixel } from './AnhPixel';

/**
 * Góc trại — cây khế và việc mở thêm đất, gộp chung một thẻ.
 *
 * Hai việc này đều là "thỉnh thoảng mới ngó tới một lần", tách thành hai thẻ
 * rời như bản trước thì chiếm hai khối to ngang với cửa hàng và nhà kho, trong
 * khi mỗi khối chỉ có đúng một cái nút.
 */
export function GocTrai({
  kheSanSangLuc, now, giaMoO, soODaMo, duTienMoO, dangLam, onHaiKhe, onMuaDat,
}: {
  kheSanSangLuc: number;
  now: number;
  giaMoO: number | null;
  soODaMo: number;
  duTienMoO: boolean;
  dangLam: boolean;
  onHaiKhe: () => void;
  onMuaDat: () => void;
}) {
  const kheSanSang = now >= kheSanSangLuc;

  return (
    <section className="card divide-y divide-[var(--nova-border)] overflow-hidden">
      {/* ── Cây khế ── */}
      <div
        className="flex items-center gap-3 p-3"
        style={{ background: 'linear-gradient(180deg, rgba(134,239,172,.16), transparent 70%)' }}
      >
        <AnhPixel
          src={kheSanSang ? ANH_CAY_KHE_CHIN : ANH_CAY_KHE}
          alt="Cây khế"
          className={cn('h-16 w-auto shrink-0', kheSanSang && 'drop-shadow-[0_0_10px_rgba(250,204,21,.75)]')}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Cây khế</p>
          <p className="retro-sub mb-1.5 text-ink-400">
            {kheSanSang
              ? `Có quả rồi, hái được ${KHE_MIN}–${KHE_MAX} điểm.`
              : `Ra quả sau ${moTaConLai(kheSanSangLuc - now)}.`}
          </p>
          <button
            type="button"
            disabled={dangLam || !kheSanSang}
            onClick={onHaiKhe}
            className="btn-primary !px-3 !py-1.5 !text-xs disabled:opacity-50"
          >
            Hái khế
          </button>
        </div>
      </div>

      {/* ── Mở thêm ô đất ── */}
      <div className="flex items-center gap-3 p-3">
        <AnhPixel src={ANH_MUA_DAT} alt="Biển mua đất" className="h-16 w-auto shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Mở thêm ô đất</p>
          <p className="retro-sub mb-1.5 text-ink-400">
            {giaMoO == null
              ? `Đã mở hết ${O_DAT_TOI_DA} ô, không nới thêm được nữa.`
              : `Đang có ${soODaMo} ô. Ô thứ ${soODaMo + 1} giá ${giaMoO} điểm.`}
          </p>
          <button
            type="button"
            disabled={dangLam || giaMoO == null || !duTienMoO}
            onClick={onMuaDat}
            className="btn-primary !px-3 !py-1.5 !text-xs disabled:opacity-50"
          >
            {giaMoO == null ? 'Hết đất để mở' : 'Mua ô đất'}
          </button>
        </div>
      </div>
    </section>
  );
}
