'use client';

import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';

/**
 * Ruột trang báo lỗi, dùng chung cho cả hai bố cục gốc.
 *
 * Câu chữ nói THỨ ĐÃ XẢY RA rồi chỉ lối đi tiếp, không xin lỗi dài dòng và
 * không đổ tại người đọc. Cũng KHÔNG in nội dung lỗi ra: ở bản dựng thật Next
 * đã giấu nó đi để khỏi lộ chuyện bên trong máy chủ, nên chỗ này in ra cũng
 * chỉ được một chuỗi vô nghĩa.
 *
 * `digest` thì CÓ in — đó là mã Next gắn cho mỗi lỗi, và nó là thứ duy nhất
 * nối được lời kể của người dùng với một dòng trong nhật ký máy chủ.
 */
export function CoLoi({ thu, digest }: { thu: () => void; digest?: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-xau/10 text-xau">
        <TriangleAlert size={26} aria-hidden />
      </span>
      <h1 className="tieu-de-trang mt-4">Trang này đang lỗi</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-mo">
        Lỗi nằm ở phía SunnyStore, không phải ở máy bạn. Thử tải lại một lần
        xem sao — phần lớn là qua ngay.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={thu} className="nut-cai-dam">Thử lại</button>
        <Link href="/" className="nut-vien">Về trang đầu</Link>
      </div>

      {digest && (
        <p className="phu mt-6">
          Mã lỗi: <code className="font-mono">{digest}</code>
          <br />
          Báo cho ban quản kho kèm mã này thì tìm ra nhanh hơn nhiều.
        </p>
      )}
    </div>
  );
}
