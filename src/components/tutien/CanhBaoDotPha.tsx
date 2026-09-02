import Link from 'next/link';
import type { NhanVatXem } from '@/lib/tu-tien';
import { BAC_TOI_DA, tenCanhGioi } from '@/lib/tu-tien-const';

/**
 * Cảnh báo "đủ điều kiện đột phá".
 *
 * Blueprint mục 4.2 mở luồng đột phá bằng đúng chỗ này, và mục 9 chốt rằng
 * người chơi phải trả lời được trong vài giây "việc có giá trị nhất tiếp theo
 * là gì" — lúc tu vi đã đầy tầng Viên mãn thì câu trả lời chỉ có một, nên nó
 * phải nằm ngay trên trang chính chứ không nấp trong một trang con.
 *
 * Chưa đủ điều kiện thì KHÔNG dựng gì: một tấm nhắc thường trực nhắc mãi một
 * việc chưa làm được thì thành nhiễu, và người chơi học cách nhìn xuyên qua nó.
 */
export function CanhBaoDotPha({ nv }: { nv: NhanVatXem }) {
  if (!nv.duocDotPha || nv.bac >= BAC_TOI_DA) return null;

  return (
    <section className="tien-trieu p-5">
      <h2 className="tien-canh-gioi tien-vang mb-1 text-lg font-black">Đủ điều kiện đột phá</h2>
      <p className="mb-3 text-sm">
        Tu vi đã đầy tầng Viên mãn. Qua được thiên kiếp thì{' '}
        <b className="tien-vang">{tenCanhGioi(nv.bac + 1, 1, nv.dao)}</b> mở ra; bế
        quan thêm cũng không đi tiếp được nữa.
      </p>
      <Link href="/tu-tien/do-kiep" className="tien-nut block px-4 py-3 text-center text-base">
        Xem điều kiện và chuẩn bị
      </Link>
    </section>
  );
}
