import Link from 'next/link';
import { gop } from '@/lib/tien-ich';

export interface MucLoc {
  ten: string;
  duongDan: string;
  /** Số game khớp, in mờ bên phải. Bỏ trống thì không in gì. */
  so?: number;
  chon: boolean;
}

export interface NhomLoc {
  ten: string;
  muc: MucLoc[];
}

/**
 * CỘT LỌC — chỉ có trên máy bàn.
 *
 * Điện thoại dùng hàng chip cuộn ngang vì màn hình không đủ rộng cho hai cột,
 * và vì ngón cái quẹt ngang rất tự nhiên. Máy bàn thì ngược lại: có sẵn một
 * dải trống bên trái, mà quẹt ngang bằng chuột lại là cực hình. Nên cùng một
 * bộ lọc, hai cách bày hoàn toàn khác nhau — đây là chỗ máy bàn đáng có bố cục
 * riêng chứ không phải bản kéo giãn của điện thoại.
 *
 * Mỗi mục là <Link> thật mang đủ tham số, không phải nút gọi JavaScript: bấm
 * chuột giữa mở được tab mới, và địa chỉ dán cho người khác vẫn ra đúng bộ lọc.
 */
export function CotLoc({ nhom }: { nhom: NhomLoc[] }) {
  return (
    <aside className="hidden w-[212px] shrink-0 lg:block">
      <nav aria-label="Lọc kho game" className="sticky top-[68px] space-y-6">
        {nhom.map((n) => (
          <div key={n.ten}>
            <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-mo">{n.ten}</h2>
            <ul className="space-y-0.5">
              {n.muc.map((m) => (
                <li key={m.duongDan}>
                  <Link href={m.duongDan} aria-current={m.chon ? 'page' : undefined}
                    className={gop(
                      'flex items-center justify-between gap-2 rounded-nut px-2.5 py-1.5 text-[13px] transition-colors',
                      m.chon ? 'bg-nhan/12 font-bold text-nhan' : 'text-chu hover:bg-nen3',
                    )}>
                    <span className="truncate">{m.ten}</span>
                    {m.so != null && <span className="shrink-0 text-[11px] text-mo">{m.so}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
