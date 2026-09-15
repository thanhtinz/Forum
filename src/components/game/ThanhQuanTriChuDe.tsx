'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Lock, LockOpen, Pin, PinOff, Shield, Trash2 } from 'lucide-react';
import { ghimChuDe, khoaChuDe, xoaChuDe, xoaTraLoi } from '@/app/(quan-tri)/quan-tri/viec';
import { useXacNhan } from '@/components/HopXacNhan';
import { gop } from '@/lib/tien-ich';

/*
 * MẤY NÚT KIỂM DUYỆT NGAY TRONG CHỦ ĐỀ.
 *
 * VÌ SAO CẦN, dù khu quản trị đã có bảng kiểm duyệt riêng: người trực đọc được
 * một chủ đề hỏng là lúc họ đang ĐỌC NÓ, không phải lúc mở bảng quản trị. Bắt
 * họ nhớ tên chủ đề, sang khu quản trị, lọc ra rồi mới xử lý là ba bước thừa —
 * mà bảng ấy lại không gỡ nổi MỘT lời đáp, nên gặp một bài xấu giữa chủ đề thì
 * chỉ còn đường ngồi đợi ai đó bấm báo xấu.
 *
 * Mấy hàm gọi ở đây đều tự kiểm quyền quản trị (`batBuocQuanTri`), nên bày nút
 * ra đây không mở thêm cửa nào: giao diện chỉ là lối đi cho người đã có quyền.
 */
export function ThanhQuanTriChuDe({ chuDeId, duongDanGame, tieuDe, ghim, khoa, soTraLoi }: {
  chuDeId: string;
  duongDanGame: string;
  tieuDe: string;
  ghim: boolean;
  khoa: boolean;
  soTraLoi: number;
}) {
  const router = useRouter();
  const [dangChay, batDau] = useTransition();
  const [loi, datLoi] = useState<string | null>(null);
  const { hoi, hop } = useXacNhan();

  const chay = (viec: () => Promise<{ loi?: string }>, sauKhiXong?: () => void) => {
    datLoi(null);
    batDau(async () => {
      const kq = await viec();
      if (kq?.loi) { datLoi(kq.loi); return; }
      sauKhiXong?.();
    });
  };

  return (
    <div className="the flex flex-wrap items-center gap-1 px-3 py-2">
      <span className="phu mr-1 inline-flex items-center gap-1.5 text-[12px] font-bold">
        <Shield size={13} aria-hidden /> Quản trị
      </span>

      <Nut dangChay={dangChay} chon={ghim}
        bam={() => chay(() => ghimChuDe(chuDeId, !ghim))}
        hinh={ghim ? <PinOff size={14} /> : <Pin size={14} />}
        chu={ghim ? 'Bỏ ghim' : 'Ghim'} />

      <Nut dangChay={dangChay} chon={khoa}
        bam={() => chay(() => khoaChuDe(chuDeId, !khoa))}
        hinh={khoa ? <LockOpen size={14} /> : <Lock size={14} />}
        chu={khoa ? 'Mở khoá' : 'Khoá'} />

      <Nut dangChay={dangChay} nguyHiem
        bam={async () => {
          if (!(await hoi(
            `Xoá hẳn chủ đề “${tieuDe}” cùng ${soTraLoi} lời đáp trong đó? Không lùi lại được.`,
            true,
          ))) return;
          /*
           * Xoá xong thì ĐI KHỎI ĐÂY.
           *
           * Đang đứng trên chính trang vừa bị xoá, nên ở lại là lần tải sau
           * gặp 404 — người trực tưởng thao tác hỏng rồi bấm lại.
           */
          chay(() => xoaChuDe(chuDeId), () => router.push(`/game/${duongDanGame}/dien-dan`));
        }}
        hinh={<Trash2 size={14} />} chu="Xoá chủ đề" />

      {loi && <span role="alert" className="text-[12px] font-medium text-xau">{loi}</span>}
      {hop}
    </div>
  );
}

/** Nút gỡ một lời đáp, bày trong hàng nút của chính bài ấy. */
export function NutGoTraLoi({ traLoiId }: { traLoiId: string }) {
  const [dangChay, batDau] = useTransition();
  const [loi, datLoi] = useState<string | null>(null);
  const { hoi, hop } = useXacNhan();

  return (
    <>
      <button type="button" disabled={dangChay}
        onClick={async () => {
          if (!(await hoi('Gỡ hẳn lời đáp này?', true))) return;
          datLoi(null);
          batDau(async () => {
            const kq = await xoaTraLoi(traLoiId);
            if (kq?.loi) datLoi(kq.loi);
          });
        }}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-mo transition-colors hover:text-xau disabled:opacity-50">
        <Trash2 size={13} aria-hidden /> Gỡ bài
      </button>
      {loi && <span role="alert" className="text-[12px] font-medium text-xau">{loi}</span>}
      {hop}
    </>
  );
}

function Nut({ bam, hinh, chu, chon, nguyHiem, dangChay }: {
  bam: () => void;
  hinh: React.ReactNode;
  chu: string;
  chon?: boolean;
  nguyHiem?: boolean;
  dangChay: boolean;
}) {
  return (
    <button type="button" onClick={bam} disabled={dangChay}
      className={gop(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors disabled:opacity-50',
        nguyHiem ? 'text-mo hover:bg-xau/10 hover:text-xau'
          : chon ? 'bg-nhan/12 text-nhan' : 'text-mo hover:bg-nen3 hover:text-chu',
      )}>
      {hinh} {chu}
    </button>
  );
}
