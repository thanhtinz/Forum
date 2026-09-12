'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Film, ImagePlus, Trash2, Upload } from 'lucide-react';
import { datAnhBiaPhim, xoaPhimGame } from '@/app/(quan-tri)/quan-tri/viec';
import { napAnh } from '@/components/quan-tri/ONapAnh';
import { useXacNhan } from '@/components/HopXacNhan';
import { PHIM_NANG_TOI_DA, PHIM_TOI_DA } from '@/lib/phim-const';
import { gonDungLuong } from '@/lib/tien-ich';

export interface PhimQuanTri {
  id: string;
  duongDan: string;
  anhBia: string | null;
  dungLuong: number | null;
}

/**
 * Quản lý ĐOẠN PHIM XEM TRƯỚC của một game.
 *
 * Dùng `XMLHttpRequest` chứ không `fetch`, cùng một lẽ với ô tải tệp game:
 * `fetch` không báo được đã gửi lên tới đâu. Với phim thì điều ấy còn gắt hơn
 * — bốn chục megabyte qua mạng nhà ở Việt Nam là hàng phút, mà một cái nút
 * đứng im hàng phút thì người bày hàng sẽ bấm lại.
 */
export function KhungPhim({ gameId, phim }: { gameId: string; phim: PhimQuanTri[] }) {
  const router = useRouter();
  const oTep = useRef<HTMLInputElement>(null);
  const [phanTram, datPhanTram] = useState<number | null>(null);
  const [loi, datLoi] = useState('');
  const [dangXoa, batDauXoa] = useTransition();
  const { hoi, hop } = useXacNhan();
  /* Một ô chọn tệp DÙNG CHUNG cho mọi đoạn, và một ô nhớ xem đang đặt bìa cho
     đoạn nào: dựng một ô chọn tệp cho mỗi đoạn thì ba đoạn là ba ô ẩn nằm
     chờ, mà chỉ một cái được dùng mỗi lượt. */
  const oBia = useRef<HTMLInputElement>(null);
  const biaChoPhim = useRef<string | null>(null);
  const [dangBia, datDangBia] = useState<string | null>(null);

  async function napBia(tep: File) {
    const id = biaChoPhim.current;
    if (!id) return;
    datLoi('');
    datDangBia(id);
    const kq = await napAnh(tep, 'phim-bia');
    if (kq.loi || !kq.duongDan) { datDangBia(null); datLoi(kq.loi ?? 'Không tải được ảnh.'); return; }
    const dat = await datAnhBiaPhim(id, kq.duongDan);
    datDangBia(null);
    if (dat.loi) { datLoi(dat.loi); return; }
    router.refresh();
  }

  const dangNap = phanTram !== null;
  const day = phim.length >= PHIM_TOI_DA;

  function nap(tep: File) {
    datLoi('');
    datPhanTram(0);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/tai-len-phim?gameId=${encodeURIComponent(gameId)}`);
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) datPhanTram(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      datPhanTram(null);
      if (oTep.current) oTep.current.value = '';
      if (xhr.status >= 200 && xhr.status < 300) { router.refresh(); return; }
      let noi = 'Tải phim lên không xong.';
      try { noi = JSON.parse(xhr.responseText).loi ?? noi; } catch { /* không phải JSON */ }
      datLoi(noi);
    });
    xhr.addEventListener('error', () => {
      datPhanTram(null);
      datLoi('Mất kết nối giữa chừng. Thử lại xem sao.');
    });
    xhr.send(tep);
  }

  return (
    <div className="space-y-4">
      {phim.length > 0 ? (
        <ul className="ke -mx-4 gap-3 px-4 sm:mx-0 sm:px-0">
          {phim.map((f, i) => (
            <li key={f.id} className="w-44 shrink-0">
              {/* Bày bằng chính thẻ `video` có thanh điều khiển: người bày hàng
                  phải xem lại được đoạn mình vừa gửi, chứ một ô đen kèm tên tệp
                  thì không nói được đoạn ấy có đúng hay không. */}
              <video src={f.duongDan} poster={f.anhBia ?? undefined}
                controls preload="metadata" playsInline
                className="aspect-[9/16] w-full rounded-the bg-black object-cover" />
              <p className="phu mt-1">
                Đoạn {i + 1}
                {f.dungLuong != null && ` · ${gonDungLuong(f.dungLuong)}`}
              </p>

              {/*
                ẢNH BÌA của từng đoạn. Không có thì trình duyệt lấy khung đầu
                của phim, mà khung đầu của phim game gần như luôn là màn hình
                đen lúc trò đang nạp — tức là dải xem trước mở màn bằng một ô
                đen, đúng chỗ đáng khoe nhất của trang.
              */}
              <button type="button" disabled={dangBia === f.id}
                onClick={() => { biaChoPhim.current = f.id; oBia.current?.click(); }}
                className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold text-mo transition-colors hover:text-chu">
                <ImagePlus size={13} aria-hidden />
                {dangBia === f.id ? 'Đang tải…' : f.anhBia ? 'Đổi ảnh bìa' : 'Đặt ảnh bìa'}
              </button>
              <button type="button" disabled={dangXoa}
                onClick={async () => {
                  if (!(await hoi(`Gỡ đoạn phim thứ ${i + 1}?`, true))) return;
                  batDauXoa(async () => { await xoaPhimGame(f.id); });
                }}
                className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-mo transition-colors hover:text-xau">
                <Trash2 size={13} aria-hidden /> Gỡ
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="phu">
          Chưa có đoạn phim nào. Một đoạn ba mươi giây quay cảnh chơi thật nói
          được nhiều hơn cả mười tấm ảnh tĩnh — App Store để phim đứng trước ảnh
          cũng vì lẽ ấy.
        </p>
      )}

      {day ? (
        <p className="the p-4 text-[13px] text-mo">
          Đã đủ {PHIM_TOI_DA} đoạn — trần của một trang game. Muốn thay đoạn
          khác thì gỡ bớt một đoạn ở trên.
        </p>
      ) : (
        <div className="space-y-2 rounded-nut border border-dashed border-vien bg-nen2 p-3">
          <input ref={oTep} type="file" accept="video/mp4" className="sr-only" tabIndex={-1} aria-hidden
            onChange={(e) => { const t = e.target.files?.[0]; if (t) nap(t); }} />
          <button type="button" disabled={dangNap} onClick={() => oTep.current?.click()}
            className="nut-xam !w-full">
            <Upload size={15} aria-hidden /> Chọn đoạn phim MP4
          </button>

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
              <Film size={13} aria-hidden />
              Chỉ nhận MP4, tối đa {gonDungLuong(PHIM_NANG_TOI_DA)} và {PHIM_TOI_DA} đoạn một game.
              Phim chạy KHÔNG TIẾNG lúc người ta cuộn tới, nên đừng dựa vào lời thuyết minh.
            </p>
          )}

          {loi && <p role="alert" className="text-[12px] font-medium text-xau">{loi}</p>}
        </div>
      )}
      {/* Ô chọn ảnh bìa: giấu đi, mấy nút "Đặt ảnh bìa" ở trên tự bấm hộ. */}
      <input ref={oBia} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden
        onChange={(e) => {
          const t = e.target.files?.[0];
          e.target.value = '';
          if (t) void napBia(t);
        }} />

      {hop}
    </div>
  );
}
