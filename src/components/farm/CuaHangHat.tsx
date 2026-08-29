'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingBasket } from 'lucide-react';
import type { CayGiong } from '@/lib/farm';
import { ANH_PHAN, HAT_MUA_TOI_DA, PHAN_GIA, PHAN_THEM, anhNongSan, moTaVu } from '@/lib/farm-const';
import { cn } from '@/lib/utils';
import { AnhPixel } from './AnhPixel';

/**
 * Cửa hàng hạt giống — chỉ MUA hạt về túi, không gieo.
 *
 * Trước đây bấm một giống là vừa trả tiền vừa xuống giống luôn, nên cửa hàng
 * buộc phải mở ra đúng lúc đang đứng trước ô đất. Nhưng hộp thoại thì che kín
 * mảnh ruộng, mà che ruộng rồi thì chẳng còn chỗ nào chọn ô để gieo.
 *
 * Nên tách hẳn: ở đây mua, đóng hộp thoại, rồi ra ruộng gieo. Mua xong hộp
 * thoại VẪN MỞ để mua tiếp giống khác — người đi chợ hiếm khi mua đúng một
 * món rồi về.
 *
 * Dựng làm ruột của hộp thoại nên không có khung thẻ cũng không có tiêu đề:
 * hộp thoại đã có sẵn cả hai.
 */

interface Props {
  cay: CayGiong[];
  /** Điểm đang có — chỉ dùng để mờ/sáng thẻ, KHÔNG in ra màn hình. */
  diem: number;
  /** Số hạt từng loại đang có trong túi, tra theo `cropId`. */
  daCo: Record<string, number>;
  /** Số bao phân đang có trong kho. */
  phanDangCo: number;
  dangLam: boolean;
  onMua: (cayId: string, soLuong: number) => void;
  onMuaPhan: (soLuong: number) => void;
}

export function CuaHangHat({ cay, diem, daCo, phanDangCo, dangLam, onMua, onMuaPhan }: Props) {
  return (
    <div>
      <p className="border-b border-[var(--nova-border)] bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        Mua hạt và phân về kho, rồi đóng cửa hàng và ra ruộng làm.
      </p>

      {/* Phân bón đứng riêng một khối trên đầu, không xếp lẫn vào lưới hạt
          giống: nó không phải một giống cây, mà lẫn vào thì người chơi phải
          quét hết mười một thẻ mới thấy nó. */}
      <div className="border-b border-[var(--nova-border)] p-3">
        <ThePhanBon diem={diem} daCo={phanDangCo} dangLam={dangLam} onMua={onMuaPhan} />
      </div>

      <h3 className="px-4 pt-3 text-sm font-black">Hạt giống</h3>

      {/* Hai cột ở điện thoại: mỗi thẻ nay còn phải chứa cả bộ chọn số lượng,
          ba cột thì nút cộng trừ bé tới mức bấm nhầm. Từ 640px hộp thoại rộng
          672px nên ba cột vẫn còn ~210px một thẻ, nhãn "Mua · 120đ" nằm gọn
          một dòng. */}
      <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 sm:gap-3">
        {cay.map((c) => (
          <TheGiong key={c.id} c={c} diem={diem} daCo={daCo[c.id] ?? 0}
            dangLam={dangLam} onMua={onMua} />
        ))}
      </ul>
    </div>
  );
}

/** Bao phân — mua như hạt giống, dùng lúc bón cho ô đang có cây. */
function ThePhanBon({ diem, daCo, dangLam, onMua }: {
  diem: number; daCo: number; dangLam: boolean; onMua: (soLuong: number) => void;
}) {
  const [so, setSo] = useState(1);
  const muaNoi = Math.min(HAT_MUA_TOI_DA, Math.floor(diem / PHAN_GIA));
  const duMua = muaNoi >= so && !dangLam;
  const doi = (b: number) => setSo((n) => Math.min(HAT_MUA_TOI_DA, Math.max(1, n + b)));

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] p-2.5">
      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg"
        style={{ background: 'radial-gradient(circle at 50% 118%, #dfe8cf 0%, #f6faf0 72%)' }}>
        <AnhPixel src={ANH_PHAN} phong={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black">Phân bón</p>
        <p className="retro-sub text-ink-400">
          Bón một bao cho một ô, thu thêm {PHAN_THEM} quả{daCo > 0 && ` · kho có ${daCo}`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => doi(-1)} disabled={so <= 1}
          aria-label="Bớt một bao phân"
          className="grid size-7 shrink-0 place-items-center rounded-lg border border-[var(--nova-border)] disabled:opacity-40">
          <Minus size={13} />
        </button>
        <span className="w-6 text-center text-sm font-bold tabular-nums">{so}</span>
        <button type="button" onClick={() => doi(1)} disabled={so >= HAT_MUA_TOI_DA}
          aria-label="Thêm một bao phân"
          className="grid size-7 shrink-0 place-items-center rounded-lg border border-[var(--nova-border)] disabled:opacity-40">
          <Plus size={13} />
        </button>
      </div>
      <button type="button" disabled={!duMua} onClick={() => onMua(so)}
        aria-label={`Mua ${so} bao phân bón, hết ${PHAN_GIA * so} điểm`}
        className="btn-primary shrink-0 gap-1 !py-1.5 text-xs disabled:opacity-50">
        <ShoppingBasket size={13} /> Mua · {PHAN_GIA * so}đ
      </button>
    </div>
  );
}

function TheGiong({ c, diem, daCo, dangLam, onMua }: {
  c: CayGiong; diem: number; daCo: number; dangLam: boolean;
  onMua: (cayId: string, soLuong: number) => void;
}) {
  const [so, setSo] = useState(1);

  // Mua nhiều nhất bấy nhiêu gói với số điểm đang có — và không quá trần một
  // lượt. Bằng 0 nghĩa là không mua nổi dù một gói.
  const muaNoi = Math.min(HAT_MUA_TOI_DA, Math.floor(diem / c.seedCost));
  const duMua = muaNoi >= so && !dangLam;
  const doi = (b: number) => setSo((n) => Math.min(HAT_MUA_TOI_DA, Math.max(1, n + b)));

  return (
    <li className={cn(
      'flex flex-col items-center rounded-xl border border-[var(--nova-border)] bg-[var(--nova-surface)] px-2 pb-2 pt-2.5 text-center',
      muaNoi === 0 && 'opacity-60',
    )}>
      <span className="relative grid size-12 place-items-center overflow-hidden rounded-lg sm:size-16"
        style={{ background: 'radial-gradient(circle at 50% 118%, #f2ddb2 0%, #fbf6ec 72%)' }}>
        <AnhPixel src={anhNongSan(c.key)} phong={2} />
      </span>

      <span className="mt-1.5 block text-[13px] font-bold leading-tight sm:text-sm">{c.name}</span>
      <span className="retro-sub mt-0.5 block flex-1 text-ink-400">
        {moTaVu(c.growMinutes)} · thu {c.yieldMin}–{c.yieldMax}
      </span>
      <span className="chip mt-1.5 bg-amber-100 text-[11px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
        hạt {c.seedCost}đ{daCo > 0 && ` · túi có ${daCo}`}
      </span>

      {/* Bộ chọn số lượng rồi mới tới nút mua: mua một nắm hạt một lượt là
          việc thường, bắt bấm mười lần cho mười gói thì thà để y như cũ. */}
      <div className="mt-2 flex w-full items-center gap-1">
        <button type="button" onClick={() => doi(-1)} disabled={so <= 1}
          aria-label={`Bớt một gói hạt ${c.name}`}
          className="grid size-7 shrink-0 place-items-center rounded-lg border border-[var(--nova-border)] disabled:opacity-40">
          <Minus size={13} />
        </button>
        <span className="min-w-0 flex-1 text-sm font-bold tabular-nums">{so}</span>
        <button type="button" onClick={() => doi(1)} disabled={so >= HAT_MUA_TOI_DA}
          aria-label={`Thêm một gói hạt ${c.name}`}
          className="grid size-7 shrink-0 place-items-center rounded-lg border border-[var(--nova-border)] disabled:opacity-40">
          <Plus size={13} />
        </button>
      </div>

      <button type="button" disabled={!duMua} onClick={() => onMua(c.id, so)}
        title={muaNoi === 0 ? `${c.name} cần ${c.seedCost} điểm một gói` : `Mua ${so} hạt ${c.name}`}
        aria-label={`Mua ${so} hạt ${c.name}, hết ${c.seedCost * so} điểm`}
        className="btn-primary mt-1.5 w-full justify-center gap-1 !py-1.5 text-xs disabled:opacity-50">
        <ShoppingBasket size={13} /> Mua · {c.seedCost * so}đ
      </button>
    </li>
  );
}
