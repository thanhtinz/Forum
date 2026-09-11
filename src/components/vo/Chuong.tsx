import Link from 'next/link';
import { Bell } from 'lucide-react';

/**
 * Chuông thông báo trên thanh đầu trang.
 *
 * Con số chỉ hiện khi CÓ chưa đọc. Một vòng tròn ghi "0" vẫn kéo mắt về phía
 * nó để rồi báo rằng không có gì — cùng lẽ với huy hiệu ở thanh bên quản trị.
 *
 * Trên 9 thì in "9+" chứ không in số thật: chấm tròn phình ra theo chữ số sẽ
 * xô lệch cả hàng nút bên cạnh, mà "37" với "9+" thì việc phải làm vẫn y hệt.
 */
export function Chuong({ chuaDoc }: { chuaDoc: number }) {
  return (
    <Link href="/thong-bao" className="relative grid size-9 shrink-0 place-items-center rounded-full text-chu transition-colors hover:bg-nen3"
      aria-label={chuaDoc > 0 ? `Thông báo, ${chuaDoc} chưa đọc` : 'Thông báo'}>
      <Bell size={19} aria-hidden />
      {chuaDoc > 0 && (
        <span aria-hidden
          className="absolute right-1 top-1 grid min-w-[15px] place-items-center rounded-full bg-xau px-1 text-[9px] font-bold leading-[15px] text-white">
          {chuaDoc > 9 ? '9+' : chuaDoc}
        </span>
      )}
    </Link>
  );
}
