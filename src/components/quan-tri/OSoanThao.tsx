'use client';

import { useRef, useState } from 'react';
import {
  Bold, Code, Eye, Heading2, Italic, Link2, List, ListOrdered, Pencil, Quote,
} from 'lucide-react';
import { gop } from '@/lib/tien-ich';

/** Một nút của thanh công cụ: bọc đoạn đang chọn, hoặc thêm dấu đầu dòng. */
interface Nut {
  ma: string;
  ten: string;
  hinh: React.ReactNode;
  /** Bọc hai bên đoạn đang chọn — đậm, nghiêng, mã. */
  boc?: string;
  /** Thêm vào ĐẦU DÒNG — đầu đề, danh sách, trích dẫn. */
  dau?: string;
  /** Phím tắt, ghép với Ctrl/Cmd. */
  phim?: string;
}

const NUT: Nut[] = [
  { ma: 'dam', ten: 'Đậm', hinh: <Bold size={15} />, boc: '**', phim: 'b' },
  { ma: 'nghieng', ten: 'Nghiêng', hinh: <Italic size={15} />, boc: '*', phim: 'i' },
  { ma: 'dau-de', ten: 'Đầu đề', hinh: <Heading2 size={15} />, dau: '## ' },
  { ma: 'gach-dau', ten: 'Danh sách', hinh: <List size={15} />, dau: '- ' },
  { ma: 'danh-so', ten: 'Danh sách đánh số', hinh: <ListOrdered size={15} />, dau: '1. ' },
  { ma: 'trich', ten: 'Trích dẫn', hinh: <Quote size={15} />, dau: '> ' },
  { ma: 'ma', ten: 'Mã', hinh: <Code size={15} />, boc: '`' },
  { ma: 'lien-ket', ten: 'Liên kết', hinh: <Link2 size={15} />, phim: 'k' },
];

/*
 * TRÌNH SOẠN THẢO cho mấy ô mô tả game.
 *
 * Dựng trên một <textarea> thật, không phải một khối `contenteditable`:
 *
 *   • Thứ lưu xuống CSDL là Markdown, không phải HTML. HTML do người dùng gửi
 *     lên thì bắt buộc phải lọc trước khi in ra trang, mà bộ lọc ấy là loại mã
 *     sai thì không ai thấy cho tới lúc bị lợi dụng. Xem `chu-dam.ts`.
 *   • <textarea> mang sẵn hoàn tác, dán, gõ tiếng Việt bằng bộ gõ, chọn bằng
 *     bàn phím, và cuộn. `contenteditable` thì phải tự dựng lại từng thứ, và
 *     bộ gõ tiếng Việt là chỗ mấy trình soạn thảo tự viết hay vỡ nhất.
 *
 * Đổi lại, người soạn không thấy chữ đậm ngay lúc gõ. Bù bằng hai thứ: thanh
 * công cụ chèn sẵn ký hiệu (có phím tắt quen tay), và một ô XEM TRƯỚC dựng
 * đúng bằng bộ dựng mà trang game dùng — nên thấy sao là ra vậy.
 */
export function OSoanThao({ ten, nhan, giaTri, dong = 6, goYy, chiDan }: {
  ten: string;
  nhan: string;
  giaTri: string;
  dong?: number;
  goYy?: string;
  /** In dòng nhắc cú pháp. Chỉ bật ở ô ĐẦU TIÊN — nhắc lại ở cả ba ô thì nó
   *  thành tiếng ồn, mà thanh công cụ ngay trên đã nói gần hết rồi. */
  chiDan?: boolean;
}) {
  const [chu, datChu] = useState(giaTri);
  const [xemTruoc, datXemTruoc] = useState(false);
  const [htmlXem, datHtmlXem] = useState('');
  const oRef = useRef<HTMLTextAreaElement>(null);

  /** Chèn ký hiệu quanh đoạn đang chọn, rồi trả con trỏ về đúng chỗ. */
  const chen = (n: Nut) => {
    const o = oRef.current;
    if (!o) return;

    const dau = o.selectionStart;
    const cuoi = o.selectionEnd;
    const dangChon = chu.slice(dau, cuoi);
    let moi = chu;
    let trooc = dau;
    let sau = cuoi;

    if (n.ma === 'lien-ket') {
      const nhan = dangChon || 'chữ hiện ra';
      const doan = `[${nhan}](https://)`;
      moi = chu.slice(0, dau) + doan + chu.slice(cuoi);
      // Đặt con trỏ vào ngay sau `https://` để gõ tiếp địa chỉ — đó là việc
      // tiếp theo người ta chắc chắn làm.
      trooc = sau = dau + doan.length - 1;
    } else if (n.boc) {
      moi = chu.slice(0, dau) + n.boc + dangChon + n.boc + chu.slice(cuoi);
      trooc = dau + n.boc.length;
      sau = trooc + dangChon.length;
    } else if (n.dau) {
      // Thêm dấu vào ĐẦU MỖI DÒNG của đoạn đang chọn, không chỉ dòng đầu:
      // bôi đen năm dòng rồi bấm "danh sách" thì phải ra năm gạch đầu dòng.
      const dauDong = chu.lastIndexOf('\n', dau - 1) + 1;
      const khoi = chu.slice(dauDong, cuoi);
      const daCo = khoi.split('\n').every((d) => d.startsWith(n.dau!));
      const doi = khoi
        .split('\n')
        .map((d) => (daCo ? d.slice(n.dau!.length) : n.dau + d))
        .join('\n');
      moi = chu.slice(0, dauDong) + doi + chu.slice(cuoi);
      trooc = dauDong;
      sau = dauDong + doi.length;
    }

    datChu(moi);
    // Đợi React vẽ xong rồi mới đặt con trỏ — đặt trước thì bị ghi đè.
    requestAnimationFrame(() => {
      o.focus();
      o.setSelectionRange(trooc, sau);
    });
  };

  const batPhim = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const n = NUT.find((x) => x.phim === e.key.toLowerCase());
    if (!n) return;
    e.preventDefault();
    chen(n);
  };

  const doiXem = async () => {
    if (xemTruoc) { datXemTruoc(false); return; }
    // Dựng ở máy chủ bằng ĐÚNG bộ dựng của trang game: xem trước mà dùng bộ
    // dựng khác thì nó là một lời hứa sai.
    const { xemThuChuDam } = await import('@/app/(quan-tri)/quan-tri/viec');
    datHtmlXem(await xemThuChuDam(chu));
    datXemTruoc(true);
  };

  return (
    <div className="block">
      <div className="mb-1 flex items-end justify-between gap-3">
        <span className="phu">{nhan}</span>
        <button type="button" onClick={doiXem}
          className="inline-flex items-center gap-1.5 rounded-nut px-2 py-1 text-[12px] font-semibold text-mo hover:bg-nen3 hover:text-chu">
          {xemTruoc ? <><Pencil size={13} aria-hidden /> Soạn tiếp</> : <><Eye size={13} aria-hidden /> Xem trước</>}
        </button>
      </div>

      {/* Ô nhập thật luôn nằm trong cây, chỉ bị giấu đi khi xem trước — gỡ nó
          ra thì lúc bấm Lưu biểu mẫu không còn trường này để gửi. */}
      <div className={gop(xemTruoc && 'hidden')}>
        <div className="ke vach-duoi gap-0.5 rounded-t-nut border border-vien bg-nen3/60 p-1">
          {NUT.map((n) => (
            <button key={n.ma} type="button" onClick={() => chen(n)}
              title={n.phim ? `${n.ten} (Ctrl+${n.phim.toUpperCase()})` : n.ten}
              aria-label={n.ten}
              className="grid size-8 shrink-0 place-items-center rounded-nut text-mo transition-colors hover:bg-nen2 hover:text-chu">
              {n.hinh}
            </button>
          ))}
        </div>
        <textarea ref={oRef} name={ten} rows={dong} value={chu}
          onChange={(e) => datChu(e.target.value)} onKeyDown={batPhim}
          className="o-nhap !rounded-t-none" />
      </div>

      {xemTruoc && (
        <div className="rounded-nut border border-vien bg-nen2 p-3.5">
          {htmlXem
            ? <div className="chu-dam" dangerouslySetInnerHTML={{ __html: htmlXem }} />
            : <p className="phu">Chưa có gì để xem.</p>}
        </div>
      )}

      {(goYy || chiDan) && (
        <span className="phu mt-1 block">
          {goYy}
          {goYy && chiDan ? ' ' : ''}
          {chiDan && 'Gõ được **đậm**, *nghiêng*, ## đầu đề, - danh sách.'}
        </span>
      )}
    </div>
  );
}
