'use client';

import { createContext, useContext, useMemo, useState, useTransition } from 'react';
import { doiTrangThaiNhieu } from '@/app/(quan-tri)/quan-tri/viec';

/**
 * CHỌN NHIỀU GAME rồi đổi trạng thái một lượt.
 *
 * Đăng mười game vừa nhập xong, hoặc rút hết một loạt game hỏng về nháp, là
 * việc có thật. Làm từng cái thì mười lần mở trang, mười lần bấm, mười lần
 * chờ tải lại.
 *
 * Trạng thái chọn giữ ở một `context` bọc quanh bảng, chứ không nhấc lên tận
 * trang: trang là thành phần máy chủ, mà cái danh sách đang chọn thì chỉ sống
 * trong trình duyệt và chết ngay khi đổi trang. Nhét nó vào địa chỉ chỉ tổ làm
 * URL dài ngoằng mà chẳng ai muốn dán cho người khác.
 */
interface KhoChon {
  chon: Set<string>;
  bat: (id: string, co: boolean) => void;
  batHet: (id: string[], co: boolean) => void;
}

const Kho = createContext<KhoChon | null>(null);

export function VungChon({ children }: { children: React.ReactNode }) {
  const [chon, datChon] = useState<Set<string>>(new Set());

  const gia = useMemo<KhoChon>(() => ({
    chon,
    bat: (id, co) => datChon((cu) => {
      const moi = new Set(cu);
      if (co) moi.add(id); else moi.delete(id);
      return moi;
    }),
    batHet: (id, co) => datChon((cu) => {
      const moi = new Set(cu);
      for (const x of id) { if (co) moi.add(x); else moi.delete(x); }
      return moi;
    }),
  }), [chon]);

  return <Kho.Provider value={gia}>{children}</Kho.Provider>;
}

function dungKho(): KhoChon {
  const k = useContext(Kho);
  if (!k) throw new Error('Ô chọn phải nằm trong <VungChon>.');
  return k;
}

/** Ô tích của một hàng. */
export function ODanhDau({ id, ten }: { id: string; ten: string }) {
  const { chon, bat } = dungKho();
  return (
    <input type="checkbox" checked={chon.has(id)} onChange={(e) => bat(id, e.target.checked)}
      aria-label={`Chọn ${ten}`}
      className="size-4 shrink-0 cursor-pointer accent-nhan" />
  );
}

/** Ô tích ở đầu bảng: chọn hoặc bỏ chọn hết những hàng ĐANG HIỆN trên trang. */
export function ODanhDauHet({ id }: { id: string[] }) {
  const { chon, batHet } = dungKho();
  const het = id.length > 0 && id.every((x) => chon.has(x));
  // "Một phần" là trạng thái thứ ba của ô tích, và nó nói đúng thứ đang diễn
  // ra: chọn vài hàng chứ không phải chưa chọn gì.
  const motPhan = !het && id.some((x) => chon.has(x));

  return (
    <input type="checkbox" checked={het}
      ref={(o) => { if (o) o.indeterminate = motPhan; }}
      onChange={(e) => batHet(id, e.target.checked)}
      aria-label="Chọn hết game trên trang này"
      className="size-4 cursor-pointer accent-nhan" />
  );
}

/**
 * Thanh việc, nổi lên ở đáy màn hình khi đã chọn ít nhất một game.
 *
 * Nổi ở đáy chứ không đặt trên đầu bảng: chọn tới hàng thứ ba mươi thì đầu
 * bảng đã trôi khỏi màn hình từ lâu, mà thao tác tiếp theo phải luôn trong
 * tầm tay ngay lúc vừa chọn xong.
 */
export function ThanhViecChon() {
  const { chon, batHet } = dungKho();
  const [dangChay, batDau] = useTransition();
  const [loi, datLoi] = useState<string | null>(null);
  const id = [...chon];

  if (id.length === 0) return null;

  const lam = (trangThai: 'DANG_HIEN' | 'NHAP' | 'DA_GO', hoi: string) => {
    if (!window.confirm(`${hoi} ${id.length} game đang chọn?`)) return;
    datLoi(null);
    batDau(async () => {
      const kq = await doiTrangThaiNhieu(id, trangThai);
      if (kq.loi) datLoi(kq.loi);
      else batHet(id, false);
    });
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="flex max-w-full flex-wrap items-center gap-2 rounded-full border border-vien bg-nen2 px-4 py-2.5 shadow-noi">
        <span className="text-[13px] font-bold">{id.length} game</span>
        <button type="button" disabled={dangChay} onClick={() => lam('DANG_HIEN', 'Đăng')}
          className="nut-xam !min-h-[32px] !px-3 !text-[12px]">Đăng</button>
        <button type="button" disabled={dangChay} onClick={() => lam('NHAP', 'Rút về nháp')}
          className="nut-xam !min-h-[32px] !px-3 !text-[12px]">Rút về nháp</button>
        <button type="button" disabled={dangChay} onClick={() => lam('DA_GO', 'Gỡ')}
          className="nut-xam !min-h-[32px] !px-3 !text-[12px]">Gỡ khỏi cửa hàng</button>
        <button type="button" onClick={() => batHet(id, false)}
          className="text-[12px] font-semibold text-mo hover:underline">Bỏ chọn</button>
        {loi && <span role="alert" className="basis-full text-[12px] font-medium text-xau">{loi}</span>}
      </div>
    </div>
  );
}
