'use client';

import { Check, Lock } from 'lucide-react';
import { VIEC_VU, VIEC_TEN, anhViec, type TinhTrangViec, type ViecVu } from '@/lib/farm-const';
import { cn } from '@/lib/utils';
import { AnhPixel } from './AnhPixel';

/**
 * Năm việc của một vụ, nổi lên NGAY TRÊN ĐẦU ô đất vừa bấm.
 *
 * Trước đây dải việc nằm dính dưới chân cả thửa ruộng: bấm ô ở hàng trên rồi
 * mắt phải chạy xuống cuối khung mới thấy nút, bấm xong lại chạy ngược lên
 * xem ô đổi ra sao — ở khổ điện thoại hai chỗ ấy cách nhau gần hết màn hình.
 * Bày ngay trên ô thì tay bấm ở đâu, việc hiện ra ở đó.
 *
 * Mỗi việc là MỘT TẤM ẢNH của bộ pixel chứ không phải chữ: bảng phải nằm vừa
 * bề ngang một ô đất (88px ở điện thoại) nên năm cái nhãn chữ là không đủ
 * chỗ, mà ảnh thì nhìn phát biết — luống đất, mầm cây, bình tưới, bao phân,
 * quả chín. Chữ vẫn còn nguyên trong `title`/`aria-label` cho bàn phím và
 * trình đọc màn hình, và tên của đúng việc đang tới lượt in trên đầu bảng.
 *
 * Ba trạng thái giữ đúng luật của thanh việc cũ: xong thì đánh dấu tích và
 * xỉn đi, tới lượt thì to hẳn lên xanh, chưa tới thì khoá lại. Vẫn bày cả năm
 * — giấu đi thì người chơi mất luôn cái nhìn về dây việc phía trước.
 */
export function ViecTrenO({ tinhTrang, cropKey, dangLam, onViec }: {
  tinhTrang: Record<ViecVu, TinhTrangViec>;
  /** Cây đang đứng ở ô — để nút "Thu hoạch" mang đúng quả ấy. */
  cropKey: number | null;
  dangLam: boolean;
  onViec: (v: ViecVu) => void;
}) {
  const viecNay = VIEC_VU.find((v) => tinhTrang[v] === 'toi-luot') ?? null;

  return (
    /*
      Bảng mọc LÊN TRÊN từ mép trên của ô (`bottom: 100%`) nên không bao giờ
      đè lên chính cái cây vừa bấm. Rộng hơn ô và tràn sang hai bên là có ý:
      ép năm nút vào đúng 88px thì mỗi nút còn 16px, bé hơn đầu ngón tay.

      `pointer-events-none` ở lớp ngoài để mảng trống hai bên không nuốt mất
      cú bấm vào ô bên cạnh; riêng khung nút bật lại `pointer-events-auto`.
    */
    <div
      className="pointer-events-none absolute bottom-full left-1/2 z-20 w-max -translate-x-1/2 pb-1.5"
    >
      <div className="pointer-events-auto rounded-xl border border-black/30 bg-black/70 px-1.5 pb-1 pt-1 shadow-lg backdrop-blur-sm">
        {/* Tên việc đang tới lượt, một dòng trên đầu bảng. Chỉ in đúng việc
            ấy chứ không in cả năm: năm nhãn xếp ngang thì bảng dài gấp ba bề
            ngang thửa ruộng, mà bốn việc kia đằng nào cũng chưa bấm được. */}
        {viecNay && (
          <p className="mb-1 truncate text-center text-[11px] font-black leading-4 text-emerald-300">
            {VIEC_TEN[viecNay]}
          </p>
        )}
        <div className="flex items-center gap-1">
          {VIEC_VU.map((v) => (
            <NutViec
              key={v}
              v={v}
              t={tinhTrang[v]}
              cropKey={cropKey}
              dangLam={dangLam}
              onViec={onViec}
            />
          ))}
        </div>
      </div>
      {/* Mũi nhọn chỉ xuống ô — không có nó thì bảng trôi lơ lửng, người chơi
          bấm hai ô liền nhau sẽ không biết bảng đang nói về ô nào. */}
      <span
        aria-hidden
        className="absolute bottom-1.5 left-1/2 size-2 -translate-x-1/2 translate-y-1/2 rotate-45 border-b border-r border-black/30 bg-black/70"
      />
    </div>
  );
}

function NutViec({ v, t, cropKey, dangLam, onViec }: {
  v: ViecVu;
  t: TinhTrangViec;
  cropKey: number | null;
  dangLam: boolean;
  onViec: (v: ViecVu) => void;
}) {
  const bamDuoc = t === 'toi-luot' && !dangLam;

  return (
    <button
      type="button"
      disabled={!bamDuoc}
      onClick={(e) => {
        // Chặn nổi bọt: bảng nằm trong cùng khối với ô đất, không chặn thì cú
        // bấm chạy tiếp xuống ô và ĐÓNG luôn bảng vừa mở.
        e.stopPropagation();
        onViec(v);
      }}
      aria-current={t === 'toi-luot' ? 'step' : undefined}
      title={
        t === 'xong' ? `${VIEC_TEN[v]} — xong rồi`
          : t === 'toi-luot' ? VIEC_TEN[v]
          : `${VIEC_TEN[v]} — chưa tới lượt`
      }
      aria-label={
        t === 'xong' ? `${VIEC_TEN[v]}, đã xong`
          : t === 'toi-luot' ? `${VIEC_TEN[v]}, đang tới lượt`
          : `${VIEC_TEN[v]}, chưa tới lượt`
      }
      className={cn(
        'relative grid shrink-0 place-items-center rounded-lg border transition-transform',
        // Việc tới lượt to hơn hẳn: trong năm tấm ảnh cùng cỡ thì cái duy nhất
        // bấm được phải tự nói ra điều đó.
        t === 'toi-luot'
          ? 'size-11 border-emerald-300 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,.65)]'
          : 'size-8 border-white/25 bg-white/10',
        t === 'chua-toi' && 'opacity-45',
        bamDuoc ? 'hover:-translate-y-0.5' : 'cursor-not-allowed',
      )}
    >
      {/* Ảnh việc, đặt trên một khung sáng: `tuoinuoc.gif` nền trắng đặc, dán
          thẳng lên nền tối thì thành một ô vuông trắng chình ình. */}
      <span
        className={cn(
          'grid place-items-center overflow-hidden rounded-md bg-white/85',
          t === 'toi-luot' ? 'size-9' : 'size-6',
        )}
      >
        <AnhPixel
          src={anhViec(v, cropKey)}
          className={cn('block', t === 'chua-toi' && 'grayscale')}
          style={{
            width: t === 'toi-luot' ? 32 : 22,
            height: t === 'toi-luot' ? 32 : 22,
            objectFit: 'contain',
            objectPosition: 'bottom',
          }}
        />
      </span>

      {/* Việc xong đánh dấu tích, việc chưa tới cắm ổ khoá: bốn nút không tới
          lượt trông giống hệt nhau nếu chỉ khác mỗi độ mờ. */}
      {t === 'xong' && (
        <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-emerald-500 ring-1 ring-white/60">
          <Check size={10} className="text-white" aria-hidden />
        </span>
      )}
      {t === 'chua-toi' && (
        <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-black/70 ring-1 ring-white/30">
          <Lock size={9} className="text-white/85" aria-hidden />
        </span>
      )}
    </button>
  );
}
