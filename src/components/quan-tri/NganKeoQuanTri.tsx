'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Menu, X } from 'lucide-react';
import { LoiDiQuanTri } from '@/components/quan-tri/LoiDiQuanTri';
import type { MaDem } from '@/lib/quan-tri-loi-di';

/**
 * NGĂN KÉO ĐIỀU HƯỚNG của khu quản trị — một bản dùng cho MỌI khổ màn hình.
 *
 * Trước đây khu này có hai bộ điều hướng khác nhau: một cột đứng cố định từ
 * `lg` trở lên, và một dải chip cuộn ngang ở khổ nhỏ. Hai bộ thì phải nuôi hai
 * lối trình bày cho cùng một danh sách, và chúng đã trôi khỏi nhau thật — dải
 * ngang bỏ mất tiêu đề nhóm, nên mười ba mục nằm thành một dãy phẳng mà phần
 * lớn khuất ngoài mép phải, phải quệt ngang mới biết là còn.
 *
 * Nay là MỘT cái nút ba gạch, một ngăn kéo, một danh sách — chính
 * danh sách cũ, giữ nguyên nhóm, biểu tượng và huy hiệu.
 *
 * VÌ SAO CẢ MÁY BÀN CŨNG GIẤU ĐI. Cột đứng ăn 228 điểm ảnh vĩnh viễn, mà khu
 * quản trị toàn bảng nhiều cột — đúng thứ cần bề ngang nhất. Người trực cũng
 * không nhảy mục liên tục: họ mở "Chờ duyệt" rồi ngồi đó, chứ không đi lại
 * giữa mười ba mục trong một phút. Đổi một cú bấm lấy 228 điểm ảnh cho mọi
 * bảng là đổi có lời.
 *
 * Dựng bằng `<dialog>` mở kiểu modal, đúng lối `HopXacNhan`: phím Esc, bẫy
 * tiêu điểm và phần nền hoá trơ đều là sẵn có của thẻ ấy. Tự dựng bằng một cái
 * `div` thì phải viết lại cả ba, và thường là viết thiếu.
 */
export function NganKeoQuanTri({ dem, ten }: { dem: Record<MaDem, number>; ten: string }) {
  const [mo, datMo] = useState(false);
  const hopRef = useRef<HTMLDialogElement>(null);
  const nutRef = useRef<HTMLButtonElement>(null);
  const duongDan = usePathname();

  useEffect(() => {
    const hop = hopRef.current;
    if (!hop) return;
    if (mo && !hop.open) hop.showModal();
    if (!mo && hop.open) hop.close();
  }, [mo]);

  /*
   * Đổi trang là ĐÓNG.
   *
   * Bấm một mục trong ngăn kéo thì Next chuyển trang ngay tại chỗ, không tải
   * lại tài liệu — nên không có gì tự dọn cái ngăn kéo đi, và nó nằm che mất
   * đúng trang vừa mở. Nghe theo đường dẫn thì bắt được cả mấy lối đổi trang
   * khác: nút lùi của trình duyệt, hay một cú `redirect` từ máy chủ.
   */
  useEffect(() => { datMo(false); }, [duongDan]);

  return (
    <>
      <button ref={nutRef} type="button" onClick={() => datMo(true)}
        aria-expanded={mo} aria-controls="ngan-keo-quan-tri"
        className="-ml-1.5 grid size-9 shrink-0 place-items-center rounded-nut text-vo-qt-chu/75 transition-colors hover:bg-vo-qt-chu/10 hover:text-vo-qt-chu">
        <Menu size={20} aria-hidden />
        <span className="sr-only">Mở menu quản trị</span>
      </button>

      {/*
        Bấm ra ngoài là đóng — bắt trên chính `dialog`, vì lớp phủ `::backdrop`
        không nhận sự kiện riêng: cú bấm vào nó rơi vào phần tử `dialog`, còn
        cú bấm vào ruột ngăn kéo thì rơi vào mấy thẻ con. Cùng mẹo `HopXacNhan`.
      */}
      <dialog ref={hopRef} id="ngan-keo-quan-tri" aria-label="Khu quản trị"
        onClose={() => datMo(false)}
        onClick={(e) => { if (e.target === hopRef.current) datMo(false); }}
        className="ngan-keo backdrop:bg-black/50">
        <div className="flex h-full flex-col bg-vo-qt px-3 py-4">
          <div className="flex items-center gap-2 px-1 pb-4">
            <Link href="/quan-tri" className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-vo-qt-chu">
              SunnyStore <span className="font-normal text-vo-qt-chu/55">Quản trị</span>
            </Link>
            {/*
              Có nút đóng THẬT, không chỉ trông cậy vào Esc và cú bấm ra ngoài.
              Trên điện thoại không có phím Esc, mà "bấm ra ngoài" là một luật
              ngầm — người chưa biết luật ấy thì mắc kẹt trong ngăn kéo.
            */}
            <button type="button" onClick={() => datMo(false)}
              className="grid size-8 shrink-0 place-items-center rounded-nut text-vo-qt-chu/60 transition-colors hover:bg-vo-qt-chu/10 hover:text-vo-qt-chu">
              <X size={18} aria-hidden />
              <span className="sr-only">Đóng menu</span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <LoiDiQuanTri dem={dem} />
          </div>

          <div className="mt-3 space-y-1 border-t border-vo-qt-chu/10 px-3 pt-3 text-[12px]">
            <p className="truncate font-semibold text-vo-qt-chu/80">{ten}</p>
            {/* Mở tab mới: đang sửa dở một game mà bấm nhầm rồi mất hết chữ
                đang gõ là chuyện không nên xảy ra. */}
            <a href="/" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-vo-qt-chu/55 hover:text-vo-qt-chu">
              Xem cửa hàng <ExternalLink size={12} aria-hidden />
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
