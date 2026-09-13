'use client';

import { useActionState } from 'react';
import { Check, Database, FileCode2, MinusCircle } from 'lucide-react';
import type { KetQuaCaiDat } from '@/app/(quan-tri)/quan-tri/cai-dat/viec';
import { ONhapGiu, OChuGiu } from '@/components/ONhapGiu';
import { gop } from '@/lib/tien-ich';

/** Nguồn của một nhóm cấu hình — chữ cho người đọc, kèm hình cho dễ liếc. */
const NGUON = {
  'kho-du-lieu': { hinh: Database, chu: 'Đang dùng thiết lập lưu ở đây, trong khu quản trị.' },
  'bien-moi-truong': {
    hinh: FileCode2,
    chu: 'Chưa lưu gì ở đây nên đang chạy bằng biến môi trường của máy chủ. Bấm Lưu một lần là phần này do khu quản trị nắm.',
  },
  trong: { hinh: MinusCircle, chu: 'Chưa khai ở đâu cả, kể cả trong biến môi trường của máy chủ.' },
  'mac-dinh': { hinh: MinusCircle, chu: 'Chưa đặt gì ở đây nên cửa hàng đang dùng chữ mặc định.' },
} as const;

export type NguonCaiDat = keyof typeof NGUON;

export interface OCaiDat {
  ten: string;
  nhan: string;
  /** Câu nói thêm dưới ô — vì sao cần, hoặc gõ vào đây cái gì. */
  yNghia?: string;
  goiY?: string;
  /** `doan` là ô nhiều dòng; `biMat` thì không bao giờ in giá trị ra. */
  kieu?: 'chu' | 'doan' | 'biMat' | 'email';
  banDau?: string;
  /** Riêng ô bí mật: máy chủ chỉ nói CÓ hay KHÔNG, không gửi giá trị về. */
  daCo?: boolean;
  batBuoc?: boolean;
  /** Ô ngắn thì xếp hai cái một hàng cho đỡ dài. */
  hep?: boolean;
}

/**
 * Biểu mẫu dùng chung cho cả ba tab cài đặt.
 *
 * Ba nhóm cấu hình khác nhau về nội dung nhưng giống hệt nhau về cách cư xử:
 * ô bí mật không bao giờ hiện giá trị, để trống là giữ nguyên, muốn xoá thì
 * tích ô riêng, và phải nói rõ thiết lập đang lấy từ đâu. Viết ba lần thì chỉ
 * cần sửa sót một chỗ là một tab lặng lẽ rò mật khẩu ra trình duyệt.
 */
export function BieuMauCaiDat({ hanh, o, nguon, chu = 'Lưu cài đặt', them }: {
  hanh: (truoc: KetQuaCaiDat, form: FormData) => Promise<KetQuaCaiDat>;
  o: OCaiDat[];
  nguon: NguonCaiDat;
  chu?: string;
  them?: React.ReactNode;
}) {
  const [kq, gui, dangChay] = useActionState<KetQuaCaiDat, FormData>(hanh, {});
  const N = NGUON[nguon];

  return (
    <form action={gui} className="the space-y-4 p-4">
      <p className="phu flex items-start gap-2 leading-relaxed">
        <N.hinh size={15} className="mt-0.5 shrink-0" aria-hidden />
        <span>{N.chu}</span>
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {o.map((m) => (
          <label key={m.ten} className={gop('block', !m.hep && 'sm:col-span-2')}>
            {/* Không dán "(không bắt buộc)" vào từng ô: ở đây gần như ô nào
                cũng bỏ trống được, nên chữ ấy lặp khắp trang mà chẳng nói thêm
                gì — thứ cần nói là bỏ trống thì ĐIỀU GÌ XẢY RA, và câu ấy nằm
                ngay dưới ô. */}
            <span className="phu mb-1 block">{m.nhan}</span>

            {m.kieu === 'doan' ? (
              <OChuGiu name={m.ten} banDau={m.banDau ?? ''} rows={3} maxLength={300}
                placeholder={m.goiY} className="o-nhap" />
            ) : m.kieu === 'biMat' ? (
              /*
                Ô bí mật KHÔNG mang `banDau`. Máy chủ không gửi giá trị cũ về
                trình duyệt, nên ô này luôn trống — và để trống lúc gửi nghĩa là
                "giữ nguyên cái đang có", xem chú thích trong `cai-dat.ts`.
              */
              <input name={m.ten} type="password" autoComplete="new-password"
                placeholder={m.daCo ? '••••••••  (để trống là giữ nguyên)' : m.goiY}
                className="o-nhap" />
            ) : (
              <ONhapGiu name={m.ten} banDau={m.banDau ?? ''} type={m.kieu === 'email' ? 'email' : 'text'}
                required={m.batBuoc} maxLength={200} placeholder={m.goiY} className="o-nhap" />
            )}

            {m.kieu === 'biMat' && (
              <span className="mt-1.5 block">
                <span className={gop('text-[13px] font-semibold', m.daCo ? 'text-nhan' : 'text-mo')}>
                  {/* Nhắc lại tên ô chứ không nói trống trơn "Đã có": tab thư
                      gọi nó là mật khẩu, tab kho tệp gọi là khoá bí mật. */}
                  {m.daCo ? 'Đã có' : 'Chưa có'} {m.nhan.toLowerCase()}
                </span>
                {/* Công tắc xoá xuống hàng riêng: để nó nằm ngay cạnh dòng
                    "Đã có" thì trông như đang bật/tắt chính dòng ấy. */}
                {m.daCo && (
                  <span className="mt-1.5 flex items-center gap-2">
                    <input type="checkbox" name={`xoa-${m.ten}`} className="cong-tac shrink-0" />
                    <span className="phu">Xoá hẳn cái đang lưu</span>
                  </span>
                )}
              </span>
            )}

            {m.yNghia && <span className="phu mt-1 block leading-relaxed">{m.yNghia}</span>}
          </label>
        ))}
      </div>

      {them}

      {kq.loi && (
        <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
          {kq.loi}
        </p>
      )}
      {kq.ok && (
        <p role="status" className="flex items-center gap-1.5 text-[13px] font-semibold text-nhan">
          <Check size={15} aria-hidden /> {kq.ok}
        </p>
      )}

      <button type="submit" disabled={dangChay} className="nut-xam">
        {dangChay ? 'Đang lưu…' : chu}
      </button>
    </form>
  );
}
