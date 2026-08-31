'use client';

import { anhHe, anhThu, tenHe, tenHeGoc, ANH_POKE } from '@/lib/pokemon-const';
import { cn } from '@/lib/utils';

/**
 * Thanh máu — cùng một cái dùng cho cả thú mình lẫn thú hoang.
 *
 * Trước là một khối bo tròn phẳng; nay lõm xuống, ruột có bóng và đổi màu ba
 * mức, để liếc một cái là biết đang nguy hay chưa.
 */
export function ThanhMau({ mau, toiDa, nho }: { mau: number; toiDa: number; nho?: boolean }) {
  const ti = toiDa > 0 ? Math.max(0, Math.min(1, mau / toiDa)) : 0;
  return (
    <div className={cn('dao-mau w-full', nho ? 'h-1.5' : 'h-2.5')}>
      <i
        className={cn(ti > 0.5 ? 'bg-emerald-500' : ti > 0.2 ? 'bg-amber-500' : 'bg-rose-500')}
        style={{ width: `${ti * 100}%` }} />
    </div>
  );
}

/** Huy hiệu hệ — chính tấm ảnh của bản cũ, không vẽ lại. */
export function HuyHieuHe({ he, className }: { he: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={anhHe(he)} alt={tenHe(he)} title={`${tenHe(he)} (${tenHeGoc(he)})`}
      className={cn('h-4 w-auto', className)} style={{ imageRendering: 'pixelated' }} />
  );
}

/** Ảnh một con thú, phóng to theo bội số nguyên cho khỏi nhoè nét. */
export function AnhThu({ nguon, nac = 1, className, lat }: {
  nguon: number; nac?: number; className?: string; lat?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={anhThu(nguon, nac)} alt="" aria-hidden
      className={cn('object-contain', lat && '-scale-x-100', className)}
      style={{ imageRendering: 'pixelated' }} />
  );
}

/**
 * Con thú đứng trên bệ. Cái bệ (`.dao-be`) là hình bầu dục mờ ăn theo màu khu,
 * thay cho khung chữ nhật trước đây — sprite nền trong suốt đặt giữa ô trắng
 * trông như bị dán vào chứ không như đang đứng ở đâu cả.
 */
export function TrenBe({ nguon, nac, lat, hieuUng, className }: {
  nguon: number; nac: number; lat?: boolean; hieuUng?: string; className?: string;
}) {
  // KHÔNG đặt `relative` ở đây: nơi gọi hay truyền `absolute` để xếp con thú
  // vào sân đấu, mà thứ tự lớp trong chuỗi className không quyết định lớp nào
  // thắng — trong biểu định kiểu `relative` đứng sau nên nó ăn, và cả hai con
  // thú rơi về cùng một chỗ. Vị trí do lớp truyền vào lo, ở đây chỉ lo bố cục
  // bên trong.
  return (
    <span className={cn('dao-be flex items-end justify-center', className)}>
      <AnhThu nguon={nguon} nac={nac} lat={lat}
        className={cn('h-full w-auto', hieuUng ?? 'dao-tho')} />
    </span>
  );
}

/** Một ô tài nguyên: ảnh gốc của bản wap + con số, thay cho nhãn chữ. */
export function OTaiNguyen({ anh, nhan, giaTri, mau }: {
  anh: string; nhan: string; giaTri: number; mau?: string;
}) {
  return (
    <span className="flex items-center gap-1" title={nhan}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ANH_POKE}/icon/${anh}`} alt={nhan} className="h-4 w-4 object-contain"
        style={{ imageRendering: 'pixelated' }} />
      <b className={cn('text-sm tabular-nums', mau)}>{giaTri.toLocaleString('vi')}</b>
    </span>
  );
}
