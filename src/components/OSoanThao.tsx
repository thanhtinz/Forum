'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, ChevronDown, Code, Eye, Heading1, Heading2, Heading3, ImagePlus, Italic,
  Link2, List, ListOrdered, Loader2, Maximize2, Minimize2, Minus, Quote,
  Strikethrough, Table, Type,
} from 'lucide-react';
import { napAnh } from '@/components/quan-tri/ONapAnh';
import { gop } from '@/lib/tien-ich';

/*
 * TRÌNH SOẠN THẢO cho mấy ô mô tả.
 *
 * Dựng trên một <textarea> thật, không phải khối `contenteditable`:
 *
 *   • Thứ lưu xuống CSDL là Markdown, không phải HTML. HTML do người dùng gửi
 *     lên thì bắt buộc phải lọc trước khi in ra trang, mà bộ lọc ấy là loại mã
 *     sai thì không ai thấy cho tới lúc bị lợi dụng. Xem `chu-dam.ts`.
 *   • <textarea> mang sẵn hoàn tác, dán, gõ tiếng Việt bằng bộ gõ, chọn bằng
 *     bàn phím và cuộn. `contenteditable` thì phải tự dựng lại từng thứ, và bộ
 *     gõ tiếng Việt là chỗ mấy trình soạn thảo tự viết hay vỡ nhất.
 *
 * MỌI LƯỢT CHÈN ĐI QUA `execCommand('insertText')`, không qua `setState`.
 * Đây là chi tiết quan trọng nhất tệp này: gán thẳng giá trị mới vào ô là XOÁ
 * SẠCH chồng hoàn tác của trình duyệt — bấm nhầm một nút rồi Ctrl+Z thì không
 * về được, mà người soạn một đoạn dài luôn coi Ctrl+Z là lưới an toàn.
 * `execCommand` tuy đã bị đánh dấu cũ nhưng vẫn là cách duy nhất còn chạy được
 * ở mọi trình duyệt để chèn chữ MÀ GIỮ chồng hoàn tác.
 */

type ChoAnh = 'anh-chup' | 'dien-dan';

interface Lenh {
  ma: string;
  ten: string;
  hinh: React.ReactNode;
  boc?: string;
  dau?: string;
  phim?: string;
}

const DINH_DANG: Lenh[] = [
  { ma: 'dam', ten: 'Đậm', hinh: <Bold size={15} />, boc: '**', phim: 'b' },
  { ma: 'nghieng', ten: 'Nghiêng', hinh: <Italic size={15} />, boc: '*', phim: 'i' },
  { ma: 'gach', ten: 'Gạch ngang chữ', hinh: <Strikethrough size={15} />, boc: '~~' },
  { ma: 'ma', ten: 'Mã', hinh: <Code size={15} />, boc: '`', phim: 'e' },
];

const KHOI: Lenh[] = [
  { ma: 'gach-dau', ten: 'Danh sách', hinh: <List size={15} />, dau: '- ' },
  { ma: 'danh-so', ten: 'Danh sách đánh số', hinh: <ListOrdered size={15} />, dau: '1. ' },
  { ma: 'trich', ten: 'Trích dẫn', hinh: <Quote size={15} />, dau: '> ' },
];

const DAU_DE = [
  { ma: 'doan', ten: 'Đoạn văn', dau: '', hinh: <Type size={14} /> },
  { ma: 'd1', ten: 'Đầu đề lớn', dau: '# ', hinh: <Heading1 size={14} /> },
  { ma: 'd2', ten: 'Đầu đề vừa', dau: '## ', hinh: <Heading2 size={14} /> },
  { ma: 'd3', ten: 'Đầu đề nhỏ', dau: '### ', hinh: <Heading3 size={14} /> },
];

export function OSoanThao({
  ten, nhan, giaTri, dong = 8, goYy, chiDan, choAnh = 'anh-chup', gon = false,
}: {
  ten: string;
  nhan: string;
  giaTri: string;
  dong?: number;
  goYy?: string;
  chiDan?: boolean;
  /** Ảnh chèn trong bài đặt vào ngăn nào của kho. */
  choAnh?: ChoAnh;
  /**
   * Hàng nút GỌN — dùng ở diễn đàn.
   *
   * Bỏ menu kiểu chữ, bảng, đường kẻ ngang và nút toàn màn hình. Không phải để
   * giấu tính năng: một ô trả lời trong diễn đàn cao bốn dòng, mà hàng nút đầy
   * đủ có mười bốn nút — nó cao gần bằng chính ô chữ, và người vào trả lời một
   * câu thì chín phần mười chỉ cần đậm, nghiêng, dán ảnh. Mô tả game thì khác:
   * ở đó người ta soạn cả trang có đầu đề và bảng, nên hàng nút đầy đủ là đúng.
   */
  gon?: boolean;
}) {
  const [chu, datChu] = useState(giaTri);
  const [xemTruoc, datXemTruoc] = useState(false);
  const [htmlXem, datHtmlXem] = useState('');
  const [toanMan, datToanMan] = useState(false);
  const [dangNapAnh, datDangNapAnh] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);
  const oRef = useRef<HTMLTextAreaElement>(null);
  const anhRef = useRef<HTMLInputElement>(null);

  /*
   * Chèn chữ mà GIỮ chồng hoàn tác.
   *
   * `execCommand` chạy trên ô đang có tiêu điểm và tự coi lượt chèn là một
   * bước hoàn tác được. Trình duyệt nào không còn nhận nữa thì rơi về gán
   * thẳng — mất Ctrl+Z, nhưng vẫn chèn được chữ, và đó là đánh đổi đúng chiều.
   */
  const datVao = useCallback((moi: string, dau: number, cuoi: number, chonLai?: [number, number]) => {
    const o = oRef.current;
    if (!o) return;
    o.focus();
    o.setSelectionRange(dau, cuoi);
    const xong = document.execCommand?.('insertText', false, moi);
    if (!xong) {
      const truoc = o.value.slice(0, dau) + moi + o.value.slice(cuoi);
      datChu(truoc);
      o.value = truoc;
    } else {
      datChu(o.value);
    }
    if (chonLai) {
      requestAnimationFrame(() => {
        o.focus();
        o.setSelectionRange(chonLai[0], chonLai[1]);
      });
    }
  }, []);

  /** Bọc hai bên đoạn đang chọn. Bọc sẵn rồi thì gỡ ra. */
  const boc = useCallback((ky: string) => {
    const o = oRef.current;
    if (!o) return;
    const { selectionStart: d, selectionEnd: c, value: v } = o;
    const trong = v.slice(d, c);
    const daBoc = v.slice(d - ky.length, d) === ky && v.slice(c, c + ky.length) === ky;
    if (daBoc) {
      datVao(trong, d - ky.length, c + ky.length, [d - ky.length, c - ky.length]);
      return;
    }
    datVao(ky + trong + ky, d, c, [d + ky.length, c + ky.length]);
  }, [datVao]);

  /** Thêm (hoặc gỡ) dấu ở ĐẦU MỖI DÒNG của đoạn đang chọn. */
  const dauDong = useCallback((ky: string, thayDauDeCu = false) => {
    const o = oRef.current;
    if (!o) return;
    const { selectionStart: d, selectionEnd: c, value: v } = o;
    const batDau = v.lastIndexOf('\n', d - 1) + 1;
    const ketThuc = v.indexOf('\n', c) === -1 ? v.length : v.indexOf('\n', c);
    const khoi = v.slice(batDau, ketThuc);

    // Đổi cấp đầu đề thì phải gỡ cấp cũ trước, không thì ra "## # Tên".
    const donDau = (d1: string) => (thayDauDeCu ? d1.replace(/^#{1,6}\s+/, '') : d1);
    const daCo = ky !== '' && khoi.split('\n').every((d1) => d1.startsWith(ky));
    const moi = khoi
      .split('\n')
      .map((d1) => (daCo ? d1.slice(ky.length) : ky + donDau(d1)))
      .join('\n');
    datVao(moi, batDau, ketThuc, [batDau, batDau + moi.length]);
  }, [datVao]);

  const chenLienKet = useCallback(() => {
    const o = oRef.current;
    if (!o) return;
    const { selectionStart: d, selectionEnd: c, value: v } = o;
    const nhanChu = v.slice(d, c) || 'chữ hiện ra';
    const doan = `[${nhanChu}](https://)`;
    // Con trỏ dừng ngay sau `https://` — đó là việc tiếp theo người ta chắc
    // chắn làm, và đặt đúng chỗ thì đỡ một lần rê chuột.
    datVao(doan, d, c, [d + doan.length - 1, d + doan.length - 1]);
  }, [datVao]);

  const chenBang = useCallback((hang: number, cot: number) => {
    const o = oRef.current;
    if (!o) return;
    const tieuDe = `| ${Array.from({ length: cot }, (_, i) => `Cột ${i + 1}`).join(' | ')} |`;
    const vach = `| ${Array.from({ length: cot }, () => '---').join(' | ')} |`;
    const than = Array.from({ length: hang }, () =>
      `| ${Array.from({ length: cot }, () => ' ').join(' | ')} |`).join('\n');
    const truocDo = o.selectionStart > 0 && o.value[o.selectionStart - 1] !== '\n' ? '\n\n' : '';
    const doan = `${truocDo}${tieuDe}\n${vach}\n${than}\n`;
    datVao(doan, o.selectionStart, o.selectionEnd);
  }, [datVao]);

  const chenAnh = useCallback(async (tep: File | null | undefined) => {
    if (!tep) return;
    datLoi(null);
    datDangNapAnh(true);
    const kq = await napAnh(tep, choAnh);
    datDangNapAnh(false);
    if (kq.loi) { datLoi(kq.loi); return; }
    const o = oRef.current;
    if (!o) return;
    // Chú thích lấy theo tên tệp, bỏ đuôi: nó là thứ duy nhất ta biết về tấm
    // ảnh, và một chú thích tạm vẫn hơn dấu ngoặc rỗng để đấy rồi quên.
    const chuThich = tep.name.replace(/\.[^.]+$/, '').slice(0, 80);
    const doan = `\n![${chuThich}](${kq.duongDan})\n`;
    datVao(doan, o.selectionStart, o.selectionEnd);
  }, [choAnh, datVao]);

  const batPhim = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && toanMan) { datToanMan(false); return; }
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'k') { e.preventDefault(); chenLienKet(); return; }
    const n = DINH_DANG.find((x) => x.phim === k);
    if (n?.boc) { e.preventDefault(); boc(n.boc); }
  };

  /*
   * Xem trước dựng Ở MÁY CHỦ bằng đúng bộ dựng của trang game — xem trước mà
   * dùng bộ dựng khác thì nó là một lời hứa sai. Hoãn 400ms để gõ nhanh không
   * biến thành một tràng lượt gọi.
   */
  useEffect(() => {
    if (!xemTruoc) return;
    let con = true;
    const hen = setTimeout(async () => {
      const { xemThuChuDam } = await import('@/lib/viec-chu-dam');
      const h = await xemThuChuDam(chu);
      if (con) datHtmlXem(h);
    }, 400);
    return () => { con = false; clearTimeout(hen); };
  }, [chu, xemTruoc]);

  // Toàn màn hình thì khoá cuộn nền, không thì cuộn trang chạy dưới tấm phủ.
  useEffect(() => {
    if (!toanMan) return;
    const cu = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = cu; };
  }, [toanMan]);

  const nut = (l: Lenh) => (
    <button key={l.ma} type="button" aria-label={l.ten}
      title={l.phim ? `${l.ten} (Ctrl+${l.phim.toUpperCase()})` : l.ten}
      onClick={() => (l.boc ? boc(l.boc) : l.dau && dauDong(l.dau))}
      className="grid size-8 shrink-0 place-items-center rounded-nut text-mo transition-colors hover:bg-nen2 hover:text-chu">
      {l.hinh}
    </button>
  );

  const than = (
    <div className={gop('flex min-h-0 flex-col', toanMan && 'h-full')}>
      {/*
        XUỐNG DÒNG, KHÔNG CUỘN NGANG.

        Lớp `ke` (cuộn ngang) từng dùng ở đây, và nó CẮT MẤT hai menu thả
        xuống: `overflow-x: auto` cắt cả phần con nằm tuyệt đối bên ngoài, nên
        bấm "Kiểu chữ" hay "Chèn bảng" là menu mở ra rồi bị xén sạch. Chỉ soi
        ảnh chụp mới thấy, vì nút vẫn sáng lên như đã mở.
      */}
      <div className="vach-duoi flex flex-wrap items-center gap-0.5 rounded-t-nut border border-vien bg-nen3/60 p-1">
        {!gon && (
          <>
            <MenuDauDe datDau={(d) => dauDong(d, true)} />
            <span className="mx-0.5 h-5 w-px shrink-0 bg-vien" aria-hidden />
          </>
        )}
        {(gon ? DINH_DANG.filter((l) => l.ma !== 'gach') : DINH_DANG).map(nut)}
        <span className="mx-0.5 h-5 w-px shrink-0 bg-vien" aria-hidden />
        {(gon ? KHOI.filter((l) => l.ma !== 'danh-so') : KHOI).map(nut)}
        {!gon && (
          <button type="button" aria-label="Đường kẻ ngang" title="Đường kẻ ngang"
            onClick={() => { const o = oRef.current; if (o) datVao('\n---\n', o.selectionStart, o.selectionEnd); }}
            className="grid size-8 shrink-0 place-items-center rounded-nut text-mo hover:bg-nen2 hover:text-chu">
            <Minus size={15} />
          </button>
        )}
        <span className="mx-0.5 h-5 w-px shrink-0 bg-vien" aria-hidden />
        <button type="button" aria-label="Liên kết" title="Liên kết (Ctrl+K)" onClick={chenLienKet}
          className="grid size-8 shrink-0 place-items-center rounded-nut text-mo hover:bg-nen2 hover:text-chu">
          <Link2 size={15} />
        </button>
        <button type="button" aria-label="Chèn ảnh" title="Chèn ảnh" disabled={dangNapAnh}
          onClick={() => anhRef.current?.click()}
          className="grid size-8 shrink-0 place-items-center rounded-nut text-mo hover:bg-nen2 hover:text-chu disabled:opacity-50">
          {dangNapAnh ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
        </button>
        {!gon && <MenuBang chen={chenBang} />}

        <span className="ml-auto shrink-0" />
        <button type="button" onClick={() => datXemTruoc((v) => !v)}
          aria-pressed={xemTruoc} title="Xem trước"
          className={gop('grid size-8 shrink-0 place-items-center rounded-nut transition-colors',
            xemTruoc ? 'bg-nhan/12 text-nhan' : 'text-mo hover:bg-nen2 hover:text-chu')}>
          <Eye size={15} />
        </button>
        {!gon && (
          <button type="button" onClick={() => datToanMan((v) => !v)}
            aria-label={toanMan ? 'Thu nhỏ' : 'Toàn màn hình'} title={toanMan ? 'Thu nhỏ' : 'Toàn màn hình'}
            className="grid size-8 shrink-0 place-items-center rounded-nut text-mo hover:bg-nen2 hover:text-chu">
            {toanMan ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        )}
      </div>

      <div className={gop('grid min-h-0 flex-1', xemTruoc && 'lg:grid-cols-2')}>
        <textarea ref={oRef} name={ten} rows={toanMan ? undefined : dong} value={chu}
          onChange={(e) => datChu(e.target.value)} onKeyDown={batPhim}
          onPaste={(e) => {
            // Dán thẳng một tấm ảnh từ bộ nhớ tạm — nhanh hơn hẳn lưu ra tệp
            // rồi đi tìm nó, mà chụp màn hình game thì ai cũng làm kiểu ấy.
            const t = Array.from(e.clipboardData.items).find((x) => x.type.startsWith('image/'));
            if (!t) return;
            e.preventDefault();
            void chenAnh(t.getAsFile());
          }}
          onDrop={(e) => {
            const t = e.dataTransfer.files?.[0];
            if (!t?.type.startsWith('image/')) return;
            e.preventDefault();
            void chenAnh(t);
          }}
          className={gop('o-nhap !rounded-t-none font-mono !text-[13px]',
            toanMan && 'h-full !rounded-none resize-none',
            xemTruoc && 'lg:!rounded-br-none')} />

        {xemTruoc && (
          <div className={gop(
            'overflow-y-auto rounded-b-nut border border-t-0 border-vien bg-nen2 p-3.5',
            'lg:rounded-bl-none lg:border-l-0 lg:border-t',
            toanMan && 'h-full !rounded-none',
          )}>
            {htmlXem
              ? <div className="chu-dam" dangerouslySetInnerHTML={{ __html: htmlXem }} />
              : <p className="phu">Chưa có gì để xem.</p>}
          </div>
        )}
      </div>

      <div className="mt-1 flex items-start justify-between gap-3">
        <span className="phu">
          {goYy}
          {goYy && chiDan ? ' ' : ''}
          {chiDan && 'Dán thẳng ảnh vào ô cũng được.'}
        </span>
        <span className="phu shrink-0 tabular-nums">{chu.length.toLocaleString('vi')} ký tự</span>
      </div>

      {loi && <p role="alert" className="mt-1 text-[12px] font-medium text-xau">{loi}</p>}
    </div>
  );

  return (
    <div className="block">
      {!toanMan && <span className="phu mb-1 block">{nhan}</span>}

      <input ref={anhRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp"
        className="sr-only" onChange={(e) => void chenAnh(e.target.files?.[0])} />

      {toanMan ? (
        <div className="fixed inset-0 z-50 flex flex-col gap-2 bg-nen p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[14px] font-bold">{nhan}</span>
            <span className="phu">Nhấn Esc để thu nhỏ</span>
          </div>
          {than}
        </div>
      ) : than}
    </div>
  );
}

/** Menu chọn cấp đầu đề. `<details>` chứ không tự dựng: nó tự đóng mở, và Esc
 *  cùng phím Tab chạy đúng mà không phải viết thêm dòng nào. */
function MenuDauDe({ datDau }: { datDau: (dau: string) => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={ref} className="relative shrink-0">
      <summary className="flex h-8 cursor-pointer list-none items-center gap-1 rounded-nut px-2 text-[12px] font-semibold text-mo hover:bg-nen2 hover:text-chu">
        <Type size={14} aria-hidden /> Kiểu chữ <ChevronDown size={13} aria-hidden />
      </summary>
      <div className="the-noi absolute left-0 top-9 z-20 w-44 overflow-hidden p-1">
        {DAU_DE.map((d) => (
          <button key={d.ma} type="button"
            onClick={() => { datDau(d.dau); if (ref.current) ref.current.open = false; }}
            className="flex w-full items-center gap-2 rounded-nut px-2.5 py-2 text-left text-[13px] hover:bg-nen3">
            {d.hinh} {d.ten}
          </button>
        ))}
      </div>
    </details>
  );
}

/** Menu chèn bảng: rê chuột chọn cỡ, đúng lối mấy bộ soạn thảo văn bản. */
function MenuBang({ chen }: { chen: (hang: number, cot: number) => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [tren, datTren] = useState<[number, number]>([0, 0]);
  const O = 6;

  return (
    <details ref={ref} className="relative shrink-0">
      <summary className="grid size-8 cursor-pointer list-none place-items-center rounded-nut text-mo hover:bg-nen2 hover:text-chu"
        title="Chèn bảng" aria-label="Chèn bảng">
        <Table size={15} aria-hidden />
      </summary>
      {/* `w-max` không thừa: một hộp đặt tuyệt đối co theo bề ngang của thẻ
          chứa nó, mà thẻ chứa đây là cái nút 32px — thiếu dòng này thì lưới
          sáu cột bị nén thành một cột dài ngoằng. Chỉ soi ảnh chụp mới thấy. */}
      <div className="the-noi absolute left-0 top-9 z-20 w-max p-2">
        <div className="grid grid-cols-6 gap-0.5" onMouseLeave={() => datTren([0, 0])}>
          {Array.from({ length: O * O }, (_, i) => {
            const h = Math.floor(i / O) + 1;
            const c = (i % O) + 1;
            const sang = h <= tren[0] && c <= tren[1];
            return (
              <button key={i} type="button" aria-label={`Bảng ${h} hàng ${c} cột`}
                onMouseEnter={() => datTren([h, c])}
                onClick={() => { chen(h, c); if (ref.current) ref.current.open = false; }}
                className={gop('size-4 rounded-[3px] border', sang ? 'border-nhan bg-nhan/25' : 'border-vien')} />
            );
          })}
        </div>
        <p className="phu mt-1.5 text-center tabular-nums">
          {tren[0] > 0 ? `${tren[0]} hàng × ${tren[1]} cột` : 'Chọn cỡ bảng'}
        </p>
      </div>
    </details>
  );
}
