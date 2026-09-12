'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CloudUpload } from 'lucide-react';
import { gonDungLuong } from '@/lib/tien-ich';

/**
 * TẢI MỘT TỆP GAME LÊN KHO, có thanh tiến trình.
 *
 * Dùng `XMLHttpRequest` chứ không `fetch`, và đấy là lý do duy nhất khiến một
 * thứ cũ kỹ như XHR còn nằm trong mã năm nay: `fetch` không báo được đã gửi
 * lên tới đâu. Với một tấm ảnh thì không ai cần biết, nhưng một bản APK hai
 * trăm megabyte mà cái nút chỉ đứng im ghi "Đang tải…" thì người bày hàng
 * không phân biệt nổi máy đang chạy với máy đã treo — và họ sẽ bấm lại.
 */
export function ONapTep({ banId, loaiHopLe }: { banId: string; loaiHopLe: readonly string[] }) {
  const router = useRouter();
  const oTep = useRef<HTMLInputElement>(null);
  const [loai, datLoai] = useState(loaiHopLe[0] ?? '');
  const [phanTram, datPhanTram] = useState<number | null>(null);
  const [loi, datLoi] = useState('');

  const dangNap = phanTram !== null;

  function nap(tep: File) {
    datLoi('');
    datPhanTram(0);

    const xhr = new XMLHttpRequest();
    const dc = `/api/tai-len-tep?banId=${encodeURIComponent(banId)}`
      + `&loai=${encodeURIComponent(loai)}&ten=${encodeURIComponent(tep.name)}`;
    xhr.open('POST', dc);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) datPhanTram(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener('load', () => {
      datPhanTram(null);
      if (oTep.current) oTep.current.value = '';
      if (xhr.status >= 200 && xhr.status < 300) {
        // Danh sách tệp do máy chủ dựng, nên vẽ lại từ máy chủ — chứ không tự
        // nhét một dòng vào danh sách ở đây rồi hy vọng hai bên khớp nhau.
        router.refresh();
        return;
      }
      let noi = 'Tải tệp lên không xong.';
      try { noi = JSON.parse(xhr.responseText).loi ?? noi; } catch { /* máy chủ trả thứ không phải JSON */ }
      datLoi(noi);
    });

    xhr.addEventListener('error', () => {
      datPhanTram(null);
      datLoi('Mất kết nối giữa chừng. Thử lại xem sao.');
    });

    // Thân yêu cầu CHÍNH LÀ tệp, không bọc trong `FormData`: bọc lại thì máy
    // chủ phải gom cả tệp vào bộ nhớ mới đọc ra được.
    xhr.send(tep);
  }

  return (
    <div className="space-y-2 rounded-nut border border-dashed border-vien bg-nen2 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="w-[110px]">
          <span className="phu mb-1 block">Loại</span>
          <select value={loai} onChange={(e) => datLoai(e.target.value)}
            disabled={dangNap} className="o-nhap">
            {loaiHopLe.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>

        {/*
          Ô chọn tệp GỐC bị giấu đi, và nút là nút của ta.

          Trình duyệt vẽ ô `type="file"` bằng chữ của nó — "Choose File", "No
          file chosen" — theo ngôn ngữ của hệ điều hành, không theo ngôn ngữ
          trang. Ở một cửa hàng toàn tiếng Việt thì đó là hai chữ tiếng Anh
          nằm chình ình giữa biểu mẫu, mà không cách nào dịch được. Giấu ô đi
          rồi tự bấm hộ nó là lối duy nhất còn lại.
        */}
        <div className="min-w-[200px] flex-1">
          <span className="phu mb-1 block">Tệp cài đặt</span>
          <input ref={oTep} type="file" className="sr-only" tabIndex={-1} aria-hidden
            onChange={(e) => { const t = e.target.files?.[0]; if (t) nap(t); }} />
          <button type="button" disabled={dangNap} onClick={() => oTep.current?.click()}
            className="nut-xam !w-full">
            <CloudUpload size={15} aria-hidden /> Chọn tệp trong máy
          </button>
        </div>
      </div>

      {dangNap ? (
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-nen3">
            <div className="h-full rounded-full bg-nhan transition-[width] duration-150"
              style={{ width: `${phanTram}%` }} />
          </div>
          <p className="phu mt-1">Đang đưa lên kho… {phanTram}%</p>
        </div>
      ) : (
        <p className="phu flex items-center gap-1.5">
          <CloudUpload size={13} aria-hidden />
          Tệp lên thẳng kho của cửa hàng. Dung lượng và mã sha256 máy chủ tự đo,
          tối đa {gonDungLuong(500 * 1024 * 1024)}.
        </p>
      )}

      {loi && <p role="alert" className="text-[12px] font-medium text-xau">{loi}</p>}
    </div>
  );
}
