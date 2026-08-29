'use client';

import { Droplets } from 'lucide-react';
import type { ODat as ODatDL } from '@/lib/farm';
import {
  ANH_MUA_DAT, anhODat, changCua, moTaConLai, tienDoVu,
} from '@/lib/farm-const';
import { cn } from '@/lib/utils';
import { AnhPixel } from './AnhPixel';

/**
 * Một ô đất trên luống.
 *
 * Ô nào cũng cao đúng 32 pixel ảnh và đứng trên một dải luống CSS chạy hết bề
 * ngang ô: luống của các ô cạnh nhau chạm nhau nên cả hàng thành một thửa
 * ruộng liền, chứ không còn là mấy khối đất rời đứng trên cỏ như bản trước.
 *
 * Bốn trạng thái phải nhìn phát biết ngay, nên mỗi trạng thái được cấp một
 * dấu hiệu riêng chứ không chỉ đổi tấm ảnh cây:
 *
 *   trống    — luống phẳng, chữ mờ, rê chuột vào mới sáng lên mời gieo
 *   mầm/lớn  — thanh tiến độ dưới chân ô, kèm dòng "còn bao lâu"
 *   chín     — quầng sáng vàng thở nhè nhẹ, cây nhún, thẻ "Chín rồi"
 *   đã tưới  — bình tưới nhỏ ở góc, để biết ô nào còn tưới được
 */

interface Props {
  o: ODatDL;
  /** Đồng hồ do trang giữ, nhích mỗi giây. */
  now: number;
  dangChon: boolean;
  onChon: () => void;
}

export function ODat({ o, now, dangChon, onChon }: Props) {
  const chang = changCua(o.plantedAt, o.readyAt, now);
  const chin = chang === 'chin';
  const dangTrong = o.cropKey == null;
  const phan = Math.round(tienDoVu(o.plantedAt, o.readyAt, now) * 100);

  return (
    <button
      type="button"
      onClick={onChon}
      aria-pressed={dangChon}
      title={
        dangTrong
          ? `Ô ${o.index + 1} — đang trống, bấm để gieo hạt`
          : `Ô ${o.index + 1} — ${o.cropName}${chin ? ', đã chín' : ''}`
      }
      className={cn(
        'group relative flex flex-col items-stretch rounded-md pb-1 outline-none transition-[filter]',
        'focus-visible:ring-2 focus-visible:ring-white',
        dangChon && 'ring-2 ring-amber-300 ring-offset-0',
      )}
    >
      {/*
        Khoảng đứng của cây. Luống không vẽ ở đây mà vẽ ở cấp HÀNG (xem
        `ManhDat`): mỗi ô một dải luống riêng thì cả hàng thành mấy tấm ván
        rời, còn một dải chạy suốt bề ngang mới ra luống cày.

        Khoảng này thấp hơn tấm ảnh (24 so với 32 đơn vị) và cây được thả tràn
        lên trên: gần như tấm nào cũng chừa sẵn khoảng trống ở đỉnh, chừa đủ
        chỗ cho tấm cao nhất thì hàng nào cũng thừa ra một mảng đất trống.
      */}
      <span
        className="relative block w-full"
        style={{ height: 'calc(var(--px) * 24)' }}
      >
        {/* Quầng sáng báo chín — vẽ sau lưng cây nên không che mất quả. */}
        {chin && (
          <span
            aria-hidden
            className="farm-sang absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
            style={{ width: 'calc(var(--px) * 34)', height: 'calc(var(--px) * 34)' }}
          />
        )}

        <AnhPixel
          src={anhODat(o.cropKey, chang)}
          alt={o.cropName ?? `Ô đất số ${o.index + 1}`}
          className={cn(
            'absolute inset-x-0 bottom-0 mx-auto block',
            chin && 'farm-nhun',
            dangTrong && 'opacity-90 transition-opacity group-hover:opacity-100',
          )}
          style={{
            height: 'calc(var(--px) * 32)',
            width: 'calc(var(--px) * 32)',
            objectFit: 'contain',
            objectPosition: 'bottom',
          }}
        />

        {/* Đã tưới vụ này — giọt nước bé ở góc.
            Dùng icon chứ không dùng `tuoinuoc.gif`: tấm gif ấy nền trắng đặc,
            dán lên ruộng thành một ô vuông trắng chình ình giữa luống. */}
        {o.watered && !dangTrong && (
          <span
            className="absolute bottom-0 right-0 grid size-5 place-items-center rounded-full bg-sky-500 shadow ring-2 ring-sky-200/70"
            title="Vụ này đã tưới"
          >
            <Droplets className="size-3 text-white" aria-hidden />
          </span>
        )}
      </span>

      {/* Chân ô: tiến độ, đồng hồ đếm ngược, hoặc lời mời gieo hạt.
          Chiều cao cố định (CHAN_O trong `ManhDat`) để dải luống của hàng
          gióng đúng vào chân cây, ô nào đang ở trạng thái nào cũng vậy. */}
      <span className="mt-1 block h-[18px] px-0.5">
        {dangTrong ? (
          <span className="block truncate text-[10px] font-bold leading-4 text-amber-100/70 group-hover:text-amber-50">
            <span className="group-hover:hidden">Ô {o.index + 1}</span>
            <span className="hidden group-hover:inline">Gieo hạt</span>
          </span>
        ) : chin ? (
          <span className="mx-auto block w-fit max-w-full truncate rounded-full bg-emerald-500 px-2 text-[10px] font-black leading-4 text-white shadow-[0_0_10px_rgba(16,185,129,.6)]">
            Chín rồi
          </span>
        ) : (
          <>
            {/* Vạch tiến độ. Luôn chừa một mẩu màu dù vụ vừa gieo, không thì
                ô mới gieo trông y hệt ô hỏng không có thanh nào. */}
            <span className="block h-[6px] w-full overflow-hidden rounded-full bg-black/55 ring-1 ring-inset ring-white/25">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-lime-300 to-emerald-400 transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.max(6, phan)}%` }}
              />
            </span>
            <span className="block truncate pt-0.5 text-[10px] font-bold leading-3 text-amber-50/85">
              {moTaConLai((o.readyAt ?? 0) - now)}
            </span>
          </>
        )}
      </span>
    </button>
  );
}

/**
 * Chỗ đất chưa mở: đất hoang chưa cày, cắm sẵn tấm biển "MUA".
 *
 * Bấm thẳng vào đây là mua luôn — chỗ đất trống nằm ngay trước mắt vẫn là chỗ
 * dễ hiểu nhất để mời mở rộng, đỡ phải đi tìm một cái nút rời ở cuối trang.
 */
export function ODatKhoa({
  soTT, gia, duTien, dangLam, onMua,
}: {
  soTT: number;
  /** `null` khi ô này chưa tới lượt mua (còn ô rẻ hơn ở trước). */
  gia: number | null;
  duTien: boolean;
  dangLam: boolean;
  onMua: () => void;
}) {
  const muaDuoc = gia != null && duTien && !dangLam;

  return (
    <button
      type="button"
      disabled={gia == null || !muaDuoc}
      onClick={onMua}
      title={
        gia == null
          ? `Ô ${soTT} — mở lần lượt từng ô một`
          : duTien
            ? `Mở ô ${soTT} với ${gia} điểm`
            : `Ô ${soTT} cần ${gia} điểm để mở`
      }
      className={cn(
        'group relative flex flex-col items-stretch rounded-md pb-1 outline-none',
        muaDuoc && 'cursor-pointer',
        !muaDuoc && 'cursor-not-allowed',
      )}
    >
      <span className="relative block w-full" style={{ height: 'calc(var(--px) * 24)' }}>
        {/* Đè phẳng dải luống của hàng: chỗ này chưa cày. */}
        <span aria-hidden className="farm-hoang absolute inset-x-0 bottom-0" />
        {gia != null && (
          <AnhPixel
            src={ANH_MUA_DAT}
            className={cn(
              'absolute inset-x-0 bottom-0 mx-auto block transition-transform',
              muaDuoc && 'group-hover:-translate-y-0.5',
              !duTien && 'grayscale',
            )}
            style={{
              height: 'calc(var(--px) * 27)',
              width: 'calc(var(--px) * 32)',
              objectFit: 'contain',
              objectPosition: 'bottom',
            }}
          />
        )}
      </span>
      <span className="mt-1 block h-[18px] truncate px-0.5 text-[10px] font-bold leading-4 text-amber-100/55">
        {gia == null ? 'chưa mở' : `${gia} điểm`}
      </span>
    </button>
  );
}
