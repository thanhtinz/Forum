'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleCheck, Download, Pause, Play, TriangleAlert, X } from 'lucide-react';
import { BieuTuongGame } from '@/components/game/BieuTuongGame';
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

type Trang = 'dang' | 'xong' | 'loi';

/**
 * MỘT LƯỢT TẢI ĐANG CHẠY: biểu tượng, tên game, thanh tiến trình, hai nút.
 *
 * Tự chạy ngay khi mở trang, không đợi bấm thêm một nút nữa: người vào đây đã
 * bấm "Tải" ở trang game rồi, bắt bấm lần hai là hỏi lại một câu họ vừa trả
 * lời.
 *
 * TẠM DỪNG và HUỶ là hai việc khác nhau, nên là hai nút. Tạm dừng chỉ thôi đọc
 * tiếp — phần đã nhận vẫn nằm nguyên đó, bấm tiếp là chạy tiếp từ đúng chỗ ấy.
 * Huỷ thì bỏ hẳn và quay về trang game. Gộp làm một nút "Dừng" thì người muốn
 * nghe điện thoại một phút phải tải lại từ đầu.
 *
 * Tải xong thì tự bật hộp lưu tệp. Trình duyệt có thể chặn cú bấm giả ấy nếu
 * nó không tin là do người dùng gây ra, nên vẫn bày sẵn nút "Lưu lại" — thứ
 * không bao giờ được phép xảy ra là tải xong mà không có cách nào lấy tệp.
 */
export function TienTrinhTai({ tepId, ten, dungLuong, game, dongPhu }: {
  tepId: string;
  /** Tên tệp khi lưu xuống máy. */
  ten: string;
  dungLuong: number | null;
  game: { ten: string; icon: string | null; duongDan: string };
  /** Dòng nhỏ dưới tên game: hệ máy, số hiệu bản, cỡ tệp. */
  dongPhu: string;
}) {
  const router = useRouter();
  const [trang, datTrang] = useState<Trang>('dang');
  const [nghi, datNghi] = useState(false);
  const [daNhan, datDaNhan] = useState(0);
  const [tong, datTong] = useState<number | null>(dungLuong);
  const [giayChay, datGiayChay] = useState(0);
  const [loi, datLoi] = useState('');

  const boQua = useRef<AbortController | null>(null);
  const neo = useRef<string | null>(null);
  /* Cờ nghỉ và lời hẹn đánh thức — vòng đọc nằm ngoài React nên nó không thấy
     được `useState`, phải đọc qua `ref`. */
  const coNghi = useRef(false);
  const danhThuc = useRef<(() => void) | null>(null);

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
    /* Đếm THỜI GIAN CHẠY, không đếm thời gian trôi: nghỉ năm phút rồi tải tiếp
       mà vẫn chia cho cả năm phút ấy thì tốc độ báo ra là một con số bịa. */
    let daChay = 0;
    let moc = Date.now();

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
          if (coNghi.current) {
            daChay += Date.now() - moc;
            await new Promise<void>((xong) => { danhThuc.current = xong; });
            moc = Date.now();
          }
          const mau = await doc.read();
          if (mau.done) break;
          khuc.push(mau.value);
          duoc += mau.value.length;
          datDaNhan(duoc);
          datGiayChay(Math.max(0.001, (daChay + Date.now() - moc) / 1000));
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
      // Đánh thức vòng đọc trước khi rời đi, kẻo nó nằm chờ mãi một lời hẹn
      // không bao giờ tới và giữ luôn cả đống khúc tệp trong bộ nhớ.
      danhThuc.current?.();
      // Trả lại bộ nhớ của cục tệp khi rời trang. Không trả thì nó nằm đó tới
      // lúc đóng tab — mà "tới lúc đóng tab" với một tệp trăm megabyte là lâu.
      if (neo.current) URL.revokeObjectURL(neo.current);
    };
  }, [tepId, luuTep]);

  const doiNghi = () => {
    const moi = !nghi;
    coNghi.current = moi;
    datNghi(moi);
    if (!moi) { danhThuc.current?.(); danhThuc.current = null; }
  };

  const huy = () => {
    coNghi.current = false;
    danhThuc.current?.();
    boQua.current?.abort();
    router.push(`/game/${game.duongDan}`);
  };

  const phanTram = tong ? Math.min(100, Math.round((daNhan / tong) * 100)) : null;
  const tocDo = giayChay > 0.2 ? daNhan / giayChay : 0;
  const conLai = tong && tocDo > 0 ? Math.max(0, Math.round((tong - daNhan) / tocDo)) : null;

  return (
    <div className="the p-4">
      <div className="flex items-center gap-3">
        <BieuTuongGame ten={game.ten} icon={game.icon} co={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold leading-tight">{game.ten}</p>
          <p className="phu mt-0.5 truncate">{dongPhu}</p>
        </div>
      </div>

      {trang === 'dang' && (
        <div className="mt-3.5 space-y-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-semibold">
              {nghi ? 'Đã tạm dừng' : phanTram !== null ? `Đang tải… ${phanTram}%` : 'Đang tải…'}
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
              phanTram !== null ? 'transition-[width] duration-200' : 'w-1/3 thanh-chay',
              nghi && 'opacity-50')}
              style={phanTram !== null ? { width: `${phanTram}%` } : undefined} />
          </div>

          <p className="phu">
            {nghi ? 'Phần đã tải vẫn còn, bấm tiếp là chạy tiếp.'
              : tocDo > 0 ? `${gonDungLuong(tocDo)}/giây` : 'Đang nối tới kho…'}
            {!nghi && conLai !== null && tocDo > 0 && ` · còn khoảng ${gonGiay(conLai)}`}
          </p>

          <div className="flex gap-2">
            <button type="button" onClick={doiNghi} className="nut-vien flex-1">
              {nghi ? <><Play size={15} aria-hidden /> Tiếp tục</> : <><Pause size={15} aria-hidden /> Tạm dừng</>}
            </button>
            <button type="button" onClick={huy} className="nut-vien flex-1 !text-xau">
              <X size={15} aria-hidden /> Huỷ
            </button>
          </div>
        </div>
      )}

      {trang === 'xong' && (
        <div className="mt-3.5 space-y-2.5">
          <p className="flex items-center gap-2 text-[14px] font-bold text-nhan">
            <CircleCheck size={17} aria-hidden /> Đã tải xong {gonDungLuong(daNhan)}
          </p>
          <p className="phu">Hộp lưu không hiện ra thì bấm nút dưới đây.</p>
          <button type="button" onClick={() => neo.current && luuTep(neo.current)}
            className="nut-cai-dam w-full">
            <Download size={17} aria-hidden /> Lưu lại {ten}
          </button>
          <Link href={`/game/${game.duongDan}`} className="nut-vien !w-full">Về trang game</Link>
        </div>
      )}

      {trang === 'loi' && (
        <div className="mt-3.5 space-y-2.5">
          <p className="flex items-center gap-2 text-[14px] font-bold text-xau">
            <TriangleAlert size={17} aria-hidden /> Tải không xong
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
        </div>
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
