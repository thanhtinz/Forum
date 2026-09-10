'use client';

import { useActionState } from 'react';
import { luuGame, type KetQua } from '@/app/quan-tri/viec';

export interface GameSua {
  id: string;
  ten: string;
  duongDan: string;
  tenViet: string | null;
  nhaPhatTrien: string | null;
  namPhatHanh: number | null;
  gioiThieu: string | null;
  cachChoi: string | null;
  luuY: string | null;
  icon: string | null;
  ngonNgu: string;
  vietHoa: boolean;
  noiBat: boolean;
  theLoaiId: string[];
}

/**
 * Biểu mẫu thêm/sửa game.
 *
 * Một biểu mẫu cho cả hai việc, phân biệt bằng ô ẩn `id`. Tách làm hai thì mỗi
 * lần thêm một trường là phải nhớ sửa hai chỗ, và kiểu gì cũng có ngày trang
 * "sửa" thiếu mất đúng cái ô mà trang "thêm" vừa có.
 */
export function BieuMauGame({ game, theLoai }: {
  game: GameSua | null;
  theLoai: { id: string; ten: string }[];
}) {
  const [ketQua, gui, dangChay] = useActionState<KetQua, FormData>(luuGame, {});
  const daChon = new Set(game?.theLoaiId ?? []);

  return (
    <form action={gui} className="space-y-4">
      {game && <input type="hidden" name="id" value={game.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <O ten="ten" nhan="Tên game" batBuoc giaTri={game?.ten} />
        <O ten="duongDan" nhan="Đường dẫn" giaTri={game?.duongDan}
          goYy="Bỏ trống thì tự suy ra từ tên." />
        <O ten="tenViet" nhan="Tên tiếng Việt" giaTri={game?.tenViet ?? ''} />
        <O ten="nhaPhatTrien" nhan="Nhà phát triển" giaTri={game?.nhaPhatTrien ?? ''} />
        <O ten="namPhatHanh" nhan="Năm phát hành" kieu="number" giaTri={game?.namPhatHanh ?? ''} />
        <O ten="icon" nhan="Địa chỉ ảnh biểu tượng" giaTri={game?.icon ?? ''}
          goYy="Bỏ trống thì dùng ô màu kèm chữ tắt." />
      </div>

      <label className="block">
        <span className="phu mb-1 block">Ngôn ngữ</span>
        <select name="ngonNgu" defaultValue={game?.ngonNgu ?? 'en'} className="o-nhap">
          <option value="en">Tiếng Anh</option>
          <option value="vi">Tiếng Việt</option>
          <option value="da-ngon-ngu">Nhiều thứ tiếng</option>
        </select>
      </label>

      <fieldset>
        <legend className="phu mb-1.5">Thể loại</legend>
        <div className="flex flex-wrap gap-2">
          {theLoai.map((t) => (
            <label key={t.id}
              className="chip cursor-pointer has-[:checked]:border-transparent has-[:checked]:bg-nhan/12 has-[:checked]:font-semibold has-[:checked]:text-nhan">
              <input type="checkbox" name="theLoai" value={t.id} defaultChecked={daChon.has(t.id)} className="sr-only" />
              {t.ten}
            </label>
          ))}
        </div>
      </fieldset>

      <Vung ten="gioiThieu" nhan="Giới thiệu" giaTri={game?.gioiThieu ?? ''} dong={5} />
      <Vung ten="cachChoi" nhan="Cách chơi" giaTri={game?.cachChoi ?? ''} dong={3} />
      <Vung ten="luuY" nhan="Cần biết trước khi tải" giaTri={game?.luuY ?? ''} dong={3}
        goYy="Máy nào chạy được, lỗi đã biết — hiện trong khung vàng ở trang game." />

      <div className="flex flex-wrap gap-4">
        <Danh ten="vietHoa" nhan="Có bản Việt hoá" bat={game?.vietHoa} />
        <Danh ten="noiBat" nhan="Đưa lên băng nổi bật" bat={game?.noiBat} />
      </div>

      {ketQua.loi && (
        <p role="alert" className="rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
          {ketQua.loi}
        </p>
      )}

      <button type="submit" disabled={dangChay} className="nut-cai-dam !min-h-[40px] !px-6 !text-[14px]">
        {dangChay ? 'Đang lưu…' : game ? 'Lưu thay đổi' : 'Tạo game'}
      </button>
    </form>
  );
}

function O({ ten, nhan, giaTri, kieu = 'text', batBuoc, goYy }: {
  ten: string; nhan: string; giaTri?: string | number | null; kieu?: string; batBuoc?: boolean; goYy?: string;
}) {
  return (
    <label className="block">
      <span className="phu mb-1 block">{nhan}{batBuoc && ' *'}</span>
      <input name={ten} type={kieu} required={batBuoc} defaultValue={giaTri ?? ''} className="o-nhap" />
      {goYy && <span className="phu mt-1 block">{goYy}</span>}
    </label>
  );
}

function Vung({ ten, nhan, giaTri, dong, goYy }: {
  ten: string; nhan: string; giaTri: string; dong: number; goYy?: string;
}) {
  return (
    <label className="block">
      <span className="phu mb-1 block">{nhan}</span>
      <textarea name={ten} rows={dong} defaultValue={giaTri} className="o-nhap" />
      {goYy && <span className="phu mt-1 block">{goYy}</span>}
    </label>
  );
}

function Danh({ ten, nhan, bat }: { ten: string; nhan: string; bat?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[14px]">
      <input type="checkbox" name={ten} defaultChecked={bat} className="size-4 accent-[rgb(var(--nhan))]" />
      {nhan}
    </label>
  );
}
