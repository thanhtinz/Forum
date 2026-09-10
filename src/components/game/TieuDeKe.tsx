import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Đầu một kệ: tên kệ, dòng phụ, và mũi tên sang trang đầy đủ.
 *
 * Cả tiêu đề là MỘT liên kết chứ không phải chỉ mũi tên — mũi tên rộng chừng
 * mười lăm điểm ảnh, bấm trúng nó bằng ngón cái là chuyện hên xui.
 *
 * Dòng phụ nói thẳng vì sao mấy game này đứng cạnh nhau. Thiếu nó thì người
 * xem phải tự đoán, mà đoán sai thì cả kệ thành vô nghĩa.
 */
export function TieuDeKe({ ten, phu, xemThem }: { ten: string; phu?: string; xemThem?: string }) {
  const ruot = (
    <>
      <span className="min-w-0">
        <span className="tieu-de block truncate">{ten}</span>
        {phu && <span className="phu mt-0.5 block truncate">{phu}</span>}
      </span>
      {xemThem && <ChevronRight size={20} className="shrink-0 text-mo" />}
    </>
  );

  if (!xemThem) return <div className="mb-3">{ruot}</div>;

  return (
    <Link href={xemThem} className="group mb-3 flex items-center justify-between gap-3">
      {ruot}
    </Link>
  );
}
