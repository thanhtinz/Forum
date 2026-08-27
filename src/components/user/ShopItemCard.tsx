'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Coins, ShoppingBag } from 'lucide-react';
import { buyShopItem, equipShopItem, unequipShopItem } from '@/app/(site)/cua-hang/actions';
import { isGradient, KIND_LABELS, type ShopItemView } from '@/lib/shop-const';
import { fmtCount } from '@/lib/utils';

/**
 * Một ô hàng trong quầy hoặc trong kho đồ.
 *
 * Xem trước ngay trên ô: màu tên tô lên một cái tên mẫu, khung phủ lên một
 * avatar mẫu, huy hiệu hiện cạnh tên. Bán đồ trang trí mà bắt người ta mua
 * xong mới biết nó ra sao thì không ai mua lần hai.
 */
export function ShopItemCard({ item, myPoints, loggedIn, showKind = true }: {
  item: ShopItemView;
  myPoints?: number;
  loggedIn: boolean;
  /** Hiện nhãn loại đồ. Quầy đã tách theo loại rồi thì nhãn chỉ là chữ thừa. */
  showKind?: boolean;
}) {
  const [owned, setOwned] = useState(item.owned);
  const [equipped, setEquipped] = useState(item.equipped);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string }>, after: () => void) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.error) { setError(r.error); return; }
      after();
      router.refresh();
    });
  };

  const tooPoor = myPoints != null && myPoints < item.pricePoints;

  return (
    <li className="card flex flex-col gap-3 p-4">
      <Preview item={item} />

      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <b className="min-w-0 truncate">{item.name}</b>
          {showKind && (
            <span className="chip bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
              {KIND_LABELS[item.kind].label}
            </span>
          )}
        </p>
        {item.description && <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{item.description}</p>}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 font-bold tabular-nums text-amber-600">
          <Coins size={15} /> {fmtCount(item.pricePoints)}
        </span>

        {!loggedIn ? (
          <span className="retro-sub ml-auto text-ink-400">Đăng nhập để mua</span>
        ) : !owned ? (
          <button type="button" disabled={pending || tooPoor}
            title={tooPoor ? 'Bạn không đủ điểm' : undefined}
            onClick={() => run(() => buyShopItem(item.id), () => setOwned(true))}
            className="btn-primary ml-auto !py-1.5 text-sm disabled:opacity-60">
            <ShoppingBag size={15} /> {pending ? 'Đang mua…' : 'Mua'}
          </button>
        ) : equipped ? (
          <button type="button" disabled={pending}
            onClick={() => run(() => unequipShopItem(item.id), () => setEquipped(false))}
            className="btn-outline ml-auto !py-1.5 text-sm text-emerald-600 disabled:opacity-60 dark:text-emerald-400">
            <Check size={15} /> Đang đeo
          </button>
        ) : (
          <button type="button" disabled={pending}
            onClick={() => run(() => equipShopItem(item.id), () => setEquipped(true))}
            className="btn-outline ml-auto !py-1.5 text-sm disabled:opacity-60">
            Đeo lên
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}

/** Xem trước món đồ đúng như lúc đeo lên. */
function Preview({ item }: { item: ShopItemView }) {
  if (item.kind === 'NAME_COLOR') {
    const style = isGradient(item.value)
      ? { backgroundImage: item.value, WebkitBackgroundClip: 'text' as const, backgroundClip: 'text' as const, color: 'transparent' }
      : { color: item.value };
    return (
      <span className="grid h-16 place-items-center rounded-xl bg-ink-50 dark:bg-ink-800/50">
        <b className="text-lg" style={style}>Tên của bạn</b>
      </span>
    );
  }

  if (item.kind === 'AVATAR_FRAME') {
    return (
      <span className="grid h-16 place-items-center rounded-xl bg-ink-50 dark:bg-ink-800/50">
        <span className="relative inline-block size-12">
          <span className="grid size-full place-items-center rounded-full bg-brand-500 text-lg font-black text-white">N</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.value} alt="" aria-hidden
            className="pointer-events-none absolute -inset-[12%] size-[124%] max-w-none object-contain" />
        </span>
      </span>
    );
  }

  return (
    <span className="grid h-16 place-items-center rounded-xl bg-ink-50 dark:bg-ink-800/50">
      <span className="inline-flex items-center gap-1.5">
        <b>Tên của bạn</b>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.value} alt="" className="size-5 object-contain" />
      </span>
    </span>
  );
}
