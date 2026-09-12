'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CircleCheck, Download, TriangleAlert, X } from 'lucide-react';
import { gonDungLuong, gop } from '@/lib/tien-ich';

/**
 * Trần của lối tải có thanh tiến trình.
 *
 * Vẽ được tiến trình nghĩa là mã trên trang tự đọc từng khúc rồi giữ lại, mà
 * giữ lại thì tệp nằm trong BỘ NHỚ của trình duyệt cho tới lúc tải xong. Một
 * bản ba trăm megabyte trên cái điện thoại đời cũ — đúng loại máy hay vào cửa
 * hàng này — là đủ để tab tự tắt. Quá trần thì giao lại cho bộ tải sẵn có của
 * trình duyệt: mất thanh tiến trình đẹp, nhưng tải được.
 */
export const NGUONG_DONG = 150 * 1024 * 1024;

type Trang = 'dang' | 'xong' | 'huy' | 'loi';

/**
 * THANH TIẾN TRÌNH CỦA TRANG TẢI.
 *
 * Tự chạy ngay khi mở trang, không đợi bấm thêm một nút nữa: người vào đây đã
 * bấm "Tải" ở trang game rồi, bắt bấm lần hai là hỏi lại một câu họ vừa trả
 * lời.
 *
 * Tải xong thì tự bật hộp lưu tệp. Trình duyệt có thể chặn cú bấm giả ấy nếu
 * nó không tin là do người dùng gây ra, nên vẫn bày sẵn nút "Lưu lại" — thứ
 * không bao giờ được phép xảy ra là tải xong mà không có cách nào lấy tệp.
 */
export function TienTrinhTai({ tepId, ten, dungLuong, duongDanGame }: {
  tepId: string;
  ten: string;
  dungLuong: number | null;
  duongDanGame: string;
}) {
  const [trang, datTrang] = useState<Trang>('dang');
  const [daNhan, datDaNhan] = useState(0);
  const [tong, datTong] = useState<number | null>(dungLuong);
  const [giay, datGiay] = useState(0);
  const [loi, datLoi] = useState('');

  const boQua = useRef<AbortController | null>(null);
  const neo = useRef<string | null>(null);

  const luuTep = useCallback((dc: string) => {
    const a = document.createElement('a');
    a.href = dc;
    a.download = ten;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [ten]);

  useEffect(() => {
    const bo = new AbortController();
    boQua.current = bo;
    const batDau = Date.now();

    (async () => {
      try {
        const tra = await fetch(`/api/tai/${tepId}/dong`, { signal: bo.signal });
        if (!tra.ok || !tra.body) throw new Error(String(tra.status));

        const dai = Number(tra.headers.get('content-length'));
        if (Number.isFinite(dai) && dai > 0) datTong(dai);

        const doc = tra.body.getReader();
        const khuc: Uint8Array[] = [];
        let duoc = 0;

        for (;;) {
          const mau = await doc.read();
          if (mau.done) break;
          khuc.push(mau.value);
          duoc += mau.value.length;
          datDaNhan(duoc);
          datGiay(Math.max(0.001, (Date.now() - batDau) / 1000));
        }

        const cuc = new Blob(khuc as BlobPart[], { type: 'application/octet-stream' });
        const dc = URL.createObjectURL(cuc);
        neo.current = dc;
        datTrang('xong');
        luuTep(dc);
      } catch (e) {
        if (bo.signal.aborted) return;
        datLoi(e instanceof Error ? e.message : '');
        datTrang('loi');
      }
    })();

    return () => {
      bo.abort();
      // Trả lại bộ nhớ của cục tệp khi rời trang. Không trả thì nó nằm đó tới
      // lúc đóng tab — mà "tới lúc đóng tab" với một tệp trăm megabyte là lâu.
      if (neo.current) URL.revokeObjectURL(neo.current);
    };
  }, [tepId, luuTep]);

  const phanTram = tong ? Math.min(100, Math.round((daNhan / tong) * 100)) : null;
  const tocDo = giay > 0.2 ? daNhan / giay : 0;
  const conLai = tong && tocDo > 0 ? Math.max(0, Math.round((tong - daNhan) / tocDo)) : null;

  return (
    <div className="the space-y-3 p-4">
      {trang === 'dang' && (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] font-bold">
              {phanTram !== null ? `Đang tải… ${phanTram}%` : 'Đang tải…'}
            </span>
            <span className="phu">
              {gonDungLuong(daNhan)}{tong ? ` / ${gonDungLuong(tong)}` : ''}
            </span>
          </div>

          {/*
            Không có `Content-Length` thì KHÔNG vẽ phần trăm giả.
            Thanh chạy qua chạy lại nói đúng thứ nó biết ("đang chạy"), còn một
            con số phần trăm bịa ra thì người ta sẽ tin và canh giờ theo nó.
          */}
          <div className="h-2 overflow-hidden rounded-full bg-nen3"
            role="progressbar" aria-label="Tiến trình tải"
            aria-valuenow={phanTram ?? undefined} aria-valuemin={0} aria-valuemax={100}>
            <div className={gop('h-full rounded-full bg-nhan',
              phanTram !== null ? 'transition-[width] duration-200' : 'w-1/3 thanh-chay')}
              style={phanTram !== null ? { width: `${phanTram}%` } : undefined} />
          </div>

          <p className="phu">
            {tocDo > 0 ? `${gonDungLuong(tocDo)}/giây` : 'Đang nối tới kho…'}
            {conLai !== null && tocDo > 0 && ` · còn khoảng ${gonGiay(conLai)}`}
          </p>

          <button type="button" onClick={() => { boQua.current?.abort(); datTrang('huy'); }}
            className="nut-vien !w-full">
            <X size={15} aria-hidden /> Dừng lại
          </button>
        </>
      )}

      {trang === 'xong' && (
        <>
          <p className="flex items-center gap-2 text-[15px] font-bold text-nhan">
            <CircleCheck size={18} aria-hidden /> Đã tải xong {gonDungLuong(daNhan)}
          </p>
          <p className="phu">
            Tệp đã về máy bạn. Hộp lưu không hiện ra thì bấm nút dưới đây.
          </p>
          <button type="button" onClick={() => neo.current && luuTep(neo.current)}
            className="nut-cai-dam w-full">
            <Download size={17} aria-hidden /> Lưu lại {ten}
          </button>
          <Link href={`/game/${duongDanGame}`} className="nut-vien !w-full">
            Về trang game
          </Link>
        </>
      )}

      {trang === 'huy' && (
        <>
          <p className="text-[15px] font-bold">Đã dừng</p>
          <p className="phu">Bạn dừng lượt tải này giữa chừng.</p>
          <button type="button" onClick={() => window.location.reload()} className="nut-cai-dam w-full">
            <Download size={17} aria-hidden /> Tải lại từ đầu
          </button>
        </>
      )}

      {trang === 'loi' && (
        <>
          <p className="flex items-center gap-2 text-[15px] font-bold text-xau">
            <TriangleAlert size={18} aria-hidden /> Tải không xong
          </p>
          <p className="phu">
            Đường truyền đứt giữa chừng, hoặc tệp đang có vấn đề{loi ? ` (${loi})` : ''}.
          </p>
          {/*
            Lối thoát là tải THẲNG, không phải thử lại đúng cách vừa hỏng.
            Cổng `/api/tai/…` giao tệp cho bộ tải sẵn có của trình duyệt — thứ
            biết nối lại chỗ đứt, thứ mã trên trang này không làm được.
          */}
          <a href={`/api/tai/${tepId}`} className="nut-cai-dam w-full">
            <Download size={17} aria-hidden /> Tải thẳng bằng trình duyệt
          </a>
        </>
      )}
    </div>
  );
}

/** "2 phút 30 giây" — số giây trần đọc lên nghe như mã lỗi. */
function gonGiay(s: number): string {
  if (s < 60) return `${s} giây`;
  const phut = Math.floor(s / 60);
  const du = s % 60;
  return du > 0 ? `${phut} phút ${du} giây` : `${phut} phút`;
}
