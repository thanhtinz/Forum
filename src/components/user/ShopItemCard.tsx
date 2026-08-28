'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Coins, Eye, ShoppingBag } from 'lucide-react';
import { buyShopItem, equipShopItem, unequipShopItem } from '@/app/(site)/cua-hang/actions';
import { Modal } from '@/components/Modal';
import { Avatar, UserName } from '@/components/user/Cosmetic';
import {
  isGradient, KIND_LABELS, NO_COSMETICS, type Cosmetics, type ShopItemView,
} from '@/lib/shop-const';
import { fmtCount } from '@/lib/utils';

/** Người đang xem — để xem trước món đồ trên chính hồ sơ của họ. */
export interface ShopViewer {
  name: string | null;
  username: string | null;
  image: string | null;
  role?: string | null;
  level?: number;
  /** Đồ đang đeo, để thấy món mới đứng cạnh những món cũ ra sao. */
  cosmetics: Cosmetics;
}

/**
 * Một ô hàng trong quầy hoặc trong kho đồ.
 *
 * Bấm vào ô là mở xem trước cỡ lớn TRÊN CHÍNH hồ sơ của mình — tên mình,
 * avatar mình, cạnh những món mình đang đeo. Bán đồ trang trí mà bắt người ta
 * mua xong mới biết nó ra sao thì không ai mua lần hai.
 */
export function ShopItemCard({ item, myPoints, loggedIn, viewer, showKind = true }: {
  item: ShopItemView;
  myPoints?: number;
  loggedIn: boolean;
  viewer?: ShopViewer;
  /** Hiện nhãn loại đồ. Quầy đã tách theo loại rồi thì nhãn chỉ là chữ thừa. */
  showKind?: boolean;
}) {
  const [owned, setOwned] = useState(item.owned);
  const [equipped, setEquipped] = useState(item.equipped);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
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

  const actions = (
    <>
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
    </>
  );

  return (
    <li className="card flex flex-col gap-3 p-4">
      {/* Cả khung xem trước là một nút: đó là chỗ mắt nhìn vào đầu tiên nên
          cũng là chỗ tay bấm đầu tiên. */}
      <button type="button" onClick={() => setOpen(true)}
        title={`Xem trước ${item.name}`}
        className="group relative rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        <Preview item={item} />
        <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="chip gap-1 bg-white/90 text-ink-700">
            <Eye size={13} /> Xem trước
          </span>
        </span>
      </button>

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
        {actions}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Modal open={open} onClose={() => setOpen(false)} title={item.name}>
        <div className="space-y-4 p-4">
          <BigPreview item={item} viewer={viewer} />

          <div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="chip bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
                {KIND_LABELS[item.kind].label}
              </span>
              <span className="flex items-center gap-1 font-bold tabular-nums text-amber-600">
                <Coins size={15} /> {fmtCount(item.pricePoints)} điểm
              </span>
            </p>
            <p className="mt-1 text-sm text-ink-500">
              {item.description ?? KIND_LABELS[item.kind].hint}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost !py-1.5 text-sm">Đóng</button>
            {actions}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </Modal>
    </li>
  );
}

/** Xem trước nhỏ trên ô hàng. */
function Preview({ item }: { item: ShopItemView }) {
  if (item.kind === 'NAME_COLOR') {
    return (
      <span className="grid h-16 place-items-center rounded-xl bg-ink-50 dark:bg-ink-800/50">
        <b className="text-lg" style={colorStyle(item.value)}>Tên của bạn</b>
      </span>
    );
  }

  if (item.kind === 'PROFILE_COVER') {
    return (
      <span className="block h-16 overflow-hidden rounded-xl bg-ink-50 dark:bg-ink-800/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.value} alt="" className="size-full object-cover" />
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

/**
 * Xem trước cỡ lớn: món đồ đeo lên chính hồ sơ của người đang xem.
 *
 * Chỉ THAY món cùng loại, giữ nguyên hai loại kia — đó mới là thứ họ sẽ thấy
 * sau khi mua, chứ không phải món này đứng một mình trên nền trắng.
 */
function BigPreview({ item, viewer }: { item: ShopItemView; viewer?: ShopViewer }) {
  const base = viewer?.cosmetics ?? NO_COSMETICS;
  const preview: Cosmetics = {
    ...base,
    ...(item.kind === 'NAME_COLOR' ? { nameColor: item.value } : {}),
    ...(item.kind === 'AVATAR_FRAME' ? { avatarFrame: item.value } : {}),
    ...(item.kind === 'BADGE' ? { badge: item.value, badgeName: item.name } : {}),
  };

  const name = viewer?.name ?? 'Tên của bạn';

  return (
    <div className="overflow-hidden rounded-xl border border-ink-100 bg-ink-50 dark:border-ink-800 dark:bg-ink-800/40">
      {/* Ảnh bìa trải ngang phía trên, đúng chỗ nó sẽ nằm ở trang cá nhân. */}
      {item.kind === 'PROFILE_COVER' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.value} alt="" className="h-24 w-full object-cover" />
      )}
      <div className="p-4">
      <div className="flex items-center gap-3">
        <Avatar image={viewer?.image ?? null} name={name} cosmetics={preview} size={64} />
        <div className="min-w-0">
          <span className="text-lg">
            <UserName username={viewer?.username ?? null} name={name} role={viewer?.role}
              level={viewer?.level} cosmetics={preview} asLink={false} />
          </span>
          <p className="retro-sub mt-0.5 text-ink-400">Hồ sơ của bạn sau khi đeo món này</p>
        </div>
      </div>

      {/* Một dòng chat mẫu: tên còn hiện ở đây nhiều hơn cả ở hồ sơ. */}
      <p className="retro-rule mt-3 flex flex-wrap items-baseline gap-1 pt-3 text-sm">
        <span className="retro-sub tabular-nums text-ink-400">[12:34]</span>
        <UserName username={viewer?.username ?? null} name={name} role={viewer?.role}
          cosmetics={preview} asLink={false} />
        <span className="text-ink-400">:</span>
        <span className="text-ink-600 dark:text-ink-300">Chào cả nhà 👋</span>
      </p>
      </div>
    </div>
  );
}

/** Màu chuyển sắc phải tô nền rồi cắt theo hình chữ, không đặt vào `color` được. */
function colorStyle(value: string) {
  return isGradient(value)
    ? {
        backgroundImage: value,
        WebkitBackgroundClip: 'text' as const,
        backgroundClip: 'text' as const,
        color: 'transparent',
      }
    : { color: value };
}
