'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useTransition } from 'react';
import { Check, Loader2, Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeviceOption {
  id: string;
  slug: string;
  name: string;
  vendor: string | null;
  screenWidth: number;
  screenHeight: number;
  cldc: string;
  midp: string;
  /** Mức hỗ trợ lấy từ ma trận tương thích; `null` = chưa ai thử với game này. */
  support: 'FULL' | 'BETA' | 'NONE' | null;
}

export interface DevicePickerProps {
  devices: DeviceOption[];
  currentId?: string;
  /** Đổi máy phải mở phiên mới, nên điều hướng lại trang play với `?profile=`. */
  playHref: (profileId: string) => string;
  onClose: () => void;
}

const SUPPORT_BADGE: Record<string, { label: string; className: string }> = {
  FULL: { label: 'Chạy tốt', className: 'bg-emerald-500/20 text-emerald-300' },
  BETA: { label: 'Beta', className: 'bg-amber-500/20 text-amber-300' },
  NONE: { label: 'Không chạy', className: 'bg-red-500/20 text-red-300' },
};

/** Thứ tự nhà sản xuất trong danh sách — máy không rõ hãng xuống cuối. */
const VENDOR_ORDER = ['Nokia', 'Sony Ericsson', 'Samsung', 'Motorola', 'LG', 'Siemens'];

/**
 * Bảng chọn máy ảo: gom theo nhà sản xuất, kèm độ phân giải và mức tương thích
 * với game đang chơi. Chọn máy khác sẽ mở phiên mới trên máy đó.
 */
export function DevicePicker({ devices, currentId, playHref, onClose }: DevicePickerProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const groups = useMemo(() => {
    const byVendor = new Map<string, DeviceOption[]>();
    for (const d of devices) {
      const key = d.vendor ?? 'Máy ảo chung';
      const list = byVendor.get(key) ?? [];
      list.push(d);
      byVendor.set(key, list);
    }
    return [...byVendor.entries()].sort((a, b) => {
      const ia = VENDOR_ORDER.indexOf(a[0]);
      const ib = VENDOR_ORDER.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [devices]);

  const choose = (d: DeviceOption) => {
    if (d.id === currentId || d.support === 'NONE') return;
    start(() => router.push(playHref(d.id)));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <Smartphone size={15} /> Chọn máy ảo
          {pending && <Loader2 size={13} className="animate-spin text-brand-400" />}
        </p>
        <button type="button" onClick={onClose} aria-label="Đóng" className="text-ink-400 hover:text-ink-100">
          <X size={18} />
        </button>
      </div>

      <p className="mb-2 shrink-0 text-[11px] text-ink-400">
        Đổi máy sẽ mở phiên chơi mới. Máy đúng độ phân giải gốc của game cho hình sắc nét nhất.
      </p>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {groups.map(([vendor, list]) => (
          <div key={vendor}>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-500">{vendor}</p>
            <ul className="space-y-1">
              {list.map((d) => {
                const active = d.id === currentId;
                const badge = d.support ? SUPPORT_BADGE[d.support] : null;
                const disabled = d.support === 'NONE';
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => choose(d)}
                      disabled={disabled || pending}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        active ? 'bg-brand-600 text-white' : 'bg-ink-800/70 hover:bg-ink-800',
                        disabled && 'cursor-not-allowed opacity-40 hover:bg-ink-800/70',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{d.name}</span>
                        <span className={cn('block text-[11px]', active ? 'text-white/70' : 'text-ink-400')}>
                          {d.screenWidth}×{d.screenHeight} · CLDC {d.cldc} / MIDP {d.midp}
                        </span>
                      </span>
                      {badge && (
                        <span className={cn('chip shrink-0 !px-2 !py-0 text-[10px]', badge.className)}>{badge.label}</span>
                      )}
                      {active && <Check size={15} className="shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
