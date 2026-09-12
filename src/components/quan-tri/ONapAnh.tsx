'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Upload, X } from 'lucide-react';
import { gop } from '@/lib/tien-ich';

export interface KetQuaNap { duongDan?: string; loi?: string }

/** Đẩy một tệp lên cổng nhận ảnh. Dùng chung cho mọi chỗ có nút chọn ảnh. */
export async function napAnh(
  tep: File, cho: 'icon' | 'bia' | 'su-kien' | 'anh-chup' | 'dien-dan',
): Promise<KetQuaNap> {
  const fd = new FormData();
  fd.set('cho', cho);
  fd.set('tep', tep);
  try {
    const r = await fetch('/api/tai-anh', { method: 'POST', body: fd });
    const kq = await r.json().catch(() => ({}));
    if (!r.ok) return { loi: kq.loi ?? 'Không tải được ảnh lên.' };
    return { duongDan: kq.duongDan };
  } catch {
    // Mạng chập chờn là chuyện thường ở đúng nhóm máy dùng cửa hàng này.
    return { loi: 'Mất mạng giữa chừng. Thử lại giúp mình nhé.' };
  }
}

/*
 * Ô CHỌN ẢNH — kéo thả, dán, hoặc bấm chọn.
 *
 * Trước đây đây là một ô nhập ĐỊA CHỈ. Người nhập game phải tự đi tìm chỗ đặt
 * ảnh trước đã, rồi dán địa chỉ vào — mà ảnh nằm ở máy chủ người khác thì hôm
 * nào họ xoá là trang của mình thủng lỗ.
 *
 * Giữ một ô ẩn mang đúng tên trường cũ, chứa ĐỊA CHỈ sau khi tải lên xong. Nhờ
 * vậy biểu mẫu phía máy chủ không phải đổi gì: nó vẫn nhận một chuỗi địa chỉ,
 * chỉ khác là chuỗi ấy nay trỏ vào kho của chính cửa hàng.
 */
export function ONapAnh({ ten, nhan, banDau, cho, goYy }: {
  ten: string;
  nhan: string;
  banDau: string;
  cho: 'icon' | 'bia' | 'su-kien' | 'anh-chup';
  goYy?: string;
}) {
  const [dia, datDia] = useState(banDau);
  const [dangNap, datDangNap] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);
  const [keo, datKeo] = useState(false);
  const oRef = useRef<HTMLInputElement>(null);

  const nhan1 = async (tep: File | undefined | null) => {
    if (!tep) return;
    datLoi(null);
    datDangNap(true);
    const kq = await napAnh(tep, cho);
    datDangNap(false);
    if (kq.loi) { datLoi(kq.loi); return; }
    datDia(kq.duongDan ?? '');
  };

  return (
    <div className="block">
      <span className="phu mb-1 block">{nhan}</span>

      <div
        onDragOver={(e) => { e.preventDefault(); datKeo(true); }}
        onDragLeave={() => datKeo(false)}
        onDrop={(e) => { e.preventDefault(); datKeo(false); void nhan1(e.dataTransfer.files?.[0]); }}
        className={gop(
          'flex items-center gap-3 rounded-nut border border-dashed p-3 transition-colors',
          keo ? 'border-nhan bg-nhan/5' : 'border-vien',
        )}>
        {dia ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dia} alt="" className="bieu-tuong size-14 shrink-0 object-cover" />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-nut bg-nen3 text-mo">
            <ImagePlus size={20} aria-hidden />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => oRef.current?.click()} disabled={dangNap}
              className="nut-xam !min-h-[32px] !px-3 !text-[12px]">
              {dangNap
                ? <><Loader2 size={13} className="animate-spin" aria-hidden /> Đang tải…</>
                : <><Upload size={13} aria-hidden /> {dia ? 'Đổi ảnh' : 'Chọn ảnh'}</>}
            </button>
            {dia && (
              <button type="button" onClick={() => { datDia(''); datLoi(null); }}
                className="nut-vien !min-h-[32px] !px-3 !text-[12px]">
                <X size={13} aria-hidden /> Gỡ
              </button>
            )}
          </div>
          <span className="phu mt-1 block">
            {goYy ?? 'Kéo ảnh thả vào đây cũng được. PNG, JPG, GIF hoặc WebP.'}
          </span>
        </div>
      </div>

      {loi && <p role="alert" className="mt-1 text-[12px] font-medium text-xau">{loi}</p>}

      <input ref={oRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp"
        className="sr-only" onChange={(e) => void nhan1(e.target.files?.[0])} />
      {/* Ô thật mà biểu mẫu gửi đi: vẫn là một chuỗi địa chỉ, y như trước. */}
      <input type="hidden" name={ten} value={dia} />
    </div>
  );
}
