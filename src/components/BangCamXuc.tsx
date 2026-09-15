'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, Smile } from 'lucide-react';
import {
  docSticker, timGif, type AnhDongXem, type GoiStickerXem,
} from '@/app/(cua-hang)/cam-xuc';
import {
  NHOM_CAM_XUC, TAB_CAM_XUC, type MaTabCamXuc,
} from '@/lib/cam-xuc-const';
import { gop } from '@/lib/tien-ich';

/**
 * BẢNG CẢM XÚC — ba tab: emoji, sticker, ảnh động.
 *
 * Dùng chung cho ô chat và ô soạn bài diễn đàn, nên nó KHÔNG tự biết gửi đi
 * đâu: hai việc `chonEmoji` và `chonAnh` do bên gọi đưa vào. Ô chat thì đính
 * ảnh vào câu sắp gửi, ô soạn bài thì chèn một dòng Markdown — cùng một bảng,
 * hai kết cục khác nhau.
 *
 * Emoji nằm sẵn trong mã (xem `cam-xuc-const.ts`), còn sticker và ảnh động thì
 * chỉ hỏi máy chủ LÚC NGƯỜI TA BẤM sang tab ấy — và hỏi đúng một lần cho mỗi
 * lượt mở trang. Nhét sẵn cả hai vào mọi trang có ô soạn bài là bắt mọi người
 * tải một bảng mà chín phần mười không mở ra.
 */
export function BangCamXuc({ chonEmoji, chonAnh, dong, xuong = false }: {
  chonEmoji: (hinh: string) => void;
  /** Người ta chọn một sticker hoặc một ảnh động. */
  chonAnh: (dia: string) => void;
  dong: () => void;
  /**
   * Bảng mở XUỐNG DƯỚI nút thay vì lên trên.
   *
   * Ô chat có nút nằm sát đáy trang nên bảng phải mở lên; hàng nút của trình
   * soạn thảo thì nằm trên đầu ô chữ, mở lên là bảng trôi ra khỏi màn hình.
   */
  xuong?: boolean;
}) {
  const [tab, datTab] = useState<MaTabCamXuc>('emoji');

  return (
    <div role="dialog" aria-label="Bảng cảm xúc"
      className={gop(
        'the bang-dac absolute left-0 z-30 w-[min(320px,calc(100vw-2rem))] overflow-hidden shadow-lg',
        xuong ? 'top-full mt-2' : 'bottom-full mb-2',
      )}>
      <div className="vach flex border-b">
        {TAB_CAM_XUC.map((t) => (
          <button key={t.ma} type="button" onClick={() => datTab(t.ma)}
            aria-current={tab === t.ma ? 'true' : undefined}
            className={gop(
              'flex-1 border-b-2 px-2 py-2 text-[12px] font-semibold transition-colors',
              tab === t.ma ? 'border-nhan text-nhan' : 'border-transparent text-mo hover:text-chu',
            )}>
            {t.ten}
          </button>
        ))}
      </div>

      {tab === 'emoji' && <TabEmoji chon={(h) => { chonEmoji(h); }} />}
      {tab === 'sticker' && <TabSticker chon={(d) => { chonAnh(d); dong(); }} />}
      {tab === 'gif' && <TabGif chon={(d) => { chonAnh(d); dong(); }} />}
    </div>
  );
}

/*
 * Bấm một emoji thì bảng KHÔNG đóng — người ta hay gõ liền ba bốn cái. Còn
 * sticker với ảnh động thì gửi xong là xong một câu, nên đóng luôn.
 */
function TabEmoji({ chon }: { chon: (hinh: string) => void }) {
  return (
    <div className="max-h-[260px] overflow-y-auto p-2">
      {NHOM_CAM_XUC.map((n) => (
        <div key={n.ma} className="mb-2">
          <p className="phu px-1 pb-1 text-[11px] font-bold uppercase tracking-wide">{n.ten}</p>
          <div className="grid grid-cols-8 gap-0.5">
            {n.hinh.map((h) => (
              <button key={h} type="button" onClick={() => chon(h)} aria-label={h}
                className="rounded-nut py-1 text-[19px] leading-none transition-colors hover:bg-nen3">
                {h}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabSticker({ chon }: { chon: (dia: string) => void }) {
  const [goi, datGoi] = useState<GoiStickerXem[] | null>(null);

  useEffect(() => { void docSticker().then(datGoi); }, []);

  if (!goi) return <KhoiCho />;
  if (goi.length === 0) {
    return (
      <p className="phu p-6 text-center text-[12px]">
        Cửa hàng chưa có gói sticker nào. Ban quản trị tải lên là nó hiện ở đây.
      </p>
    );
  }

  return (
    <div className="max-h-[260px] overflow-y-auto p-2">
      {goi.map((g) => (
        <div key={g.id} className="mb-2">
          <p className="phu px-1 pb-1 text-[11px] font-bold uppercase tracking-wide">{g.ten}</p>
          <div className="grid grid-cols-4 gap-1">
            {g.hinh.map((h) => (
              <button key={h.id} type="button" onClick={() => chon(h.anh)}
                aria-label={`Gửi sticker ${g.ten}`}
                className="rounded-nut p-1 transition-colors hover:bg-nen3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.anh} alt="" loading="lazy" className="h-16 w-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TabGif({ chon }: { chon: (dia: string) => void }) {
  const [tu, datTu] = useState('');
  const [anh, datAnh] = useState<AnhDongXem[] | null>(null);
  const [loi, datLoi] = useState<string | null>(null);
  const [dangTim, datDangTim] = useState(false);
  const soLuot = useRef(0);

  const tim = async (tuKhoa: string) => {
    datDangTim(true);
    datLoi(null);
    /*
     * Đánh số từng lượt hỏi và chỉ nhận lượt MỚI NHẤT.
     *
     * Gõ nhanh thì mấy lượt hỏi chạy chồng lên nhau, mà chúng về không theo
     * thứ tự gửi đi — không đánh số thì kết quả của chữ gõ dở đè lên kết quả
     * của chữ gõ xong, và lưới hiện ra một đằng ô tìm một nẻo.
     */
    const luot = ++soLuot.current;
    const kq = await timGif(tuKhoa);
    if (luot !== soLuot.current) return;
    datDangTim(false);
    if (kq.loi) { datLoi(kq.loi); datAnh([]); return; }
    datAnh(kq.anh ?? []);
  };

  useEffect(() => { void tim(''); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="p-2">
      <form onSubmit={(e) => { e.preventDefault(); void tim(tu); }}
        className="mb-2 flex items-center gap-1.5">
        <span className="relative min-w-0 flex-1">
          <Search size={13} aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mo" />
          <input value={tu} onChange={(e) => datTu(e.target.value)}
            aria-label="Tìm ảnh động" placeholder="Tìm ảnh động…"
            className="o-nhap !min-h-[32px] !py-1 !pl-7 !text-[12px]" />
        </span>
        <button type="submit" className="nut-xam shrink-0 !min-h-[32px] !px-2.5 !text-[12px]">
          Tìm
        </button>
      </form>

      {dangTim && <KhoiCho />}

      {!dangTim && loi && (
        <p role="alert" className="phu p-4 text-center text-[12px]">{loi}</p>
      )}

      {!dangTim && !loi && anh?.length === 0 && (
        <p className="phu p-4 text-center text-[12px]">Không tìm thấy ảnh động nào.</p>
      )}

      {!dangTim && anh && anh.length > 0 && (
        <div className="grid max-h-[220px] grid-cols-2 gap-1 overflow-y-auto">
          {anh.map((a) => (
            <button key={a.id} type="button" onClick={() => chon(a.anh)}
              aria-label={`Gửi ảnh động: ${a.moTa}`}
              className="overflow-hidden rounded-nut transition-opacity hover:opacity-80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.anh} alt="" loading="lazy" className="h-24 w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KhoiCho() {
  return (
    <p className="phu flex items-center justify-center gap-2 p-6 text-[12px]">
      <Loader2 size={14} className="animate-spin" aria-hidden /> Đang tải…
    </p>
  );
}

/**
 * Nút mặt cười kèm bảng, tự lo phần đóng mở.
 *
 * Gom vào đây vì cả ô chat lẫn ô soạn bài đều cần đúng một hành vi: bấm ra
 * ngoài thì đóng, bấm Esc thì đóng. Mỗi chỗ tự viết lấy thì sớm muộn có chỗ
 * quên, và một bảng không đóng được là một bảng che mất ô gõ.
 */
export function NutCamXuc({ chonEmoji, chonAnh, xuong = false, nho = false }: {
  chonEmoji: (hinh: string) => void;
  chonAnh: (dia: string) => void;
  xuong?: boolean;
  /** Cỡ nút của hàng nút trình soạn thảo, nhỏ hơn nút của ô chat một chút. */
  nho?: boolean;
}) {
  const [mo, datMo] = useState(false);
  const boc = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => {
      if (boc.current && !boc.current.contains(e.target as Node)) datMo(false);
    };
    const phim = (e: KeyboardEvent) => { if (e.key === 'Escape') datMo(false); };
    document.addEventListener('mousedown', ngoai);
    document.addEventListener('keydown', phim);
    return () => {
      document.removeEventListener('mousedown', ngoai);
      document.removeEventListener('keydown', phim);
    };
  }, [mo]);

  return (
    <div ref={boc} className="relative">
      <button type="button" onClick={() => datMo((m) => !m)}
        aria-expanded={mo} aria-label="Mở bảng cảm xúc"
        className={gop(
          'grid shrink-0 place-items-center rounded-nut transition-colors',
          nho ? 'size-8' : 'size-[34px]',
          mo ? 'bg-nen3 text-chu' : 'text-mo hover:bg-nen3 hover:text-chu',
        )}>
        <Smile size={nho ? 15 : 17} aria-hidden />
      </button>
      {mo && (
        <BangCamXuc chonEmoji={chonEmoji} chonAnh={chonAnh} xuong={xuong}
          dong={() => datMo(false)} />
      )}
    </div>
  );
}
