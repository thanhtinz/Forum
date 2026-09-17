'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardCheck, Flag, FolderTree, Gamepad2, Inbox, LayoutDashboard, MessageSquare, Settings, Smile, Star, Tags, UserPlus, Users,
  type LucideIcon,
} from 'lucide-react';
import { LOI_QUAN_TRI, NHOM_QUAN_TRI, dangOQuanTri, type MaDem } from '@/lib/quan-tri-loi-di';
import { gop } from '@/lib/tien-ich';

/* Viết tay từng dòng: `import * as` kéo cả nghìn biểu tượng vào bản dựng. */
const BANG: Record<string, LucideIcon> = {
  ClipboardCheck, Flag, FolderTree, Gamepad2, Inbox, LayoutDashboard, MessageSquare, Settings, Smile, Star, Tags, UserPlus, Users,
};

/**
 * Danh sách lối đi của khu quản trị — ruột của ngăn kéo.
 *
 * Trước đây đây là THANH BÊN, một cột đứng cố định ở mép trái từ `lg` trở lên,
 * và tên cũ `ThanhBenQuanTri` nói đúng chuyện đó. Nay cả khu chỉ còn một nút
 * ba gạch, nên cái tên ấy chỉ vào một thứ không còn tồn tại — mà một cái tên
 * sai thì tệ hơn một cái tên mờ: nó bảo người đọc đi tìm nhầm chỗ.
 *
 * Mười ba mục chia ba nhóm, và TIÊU ĐỀ NHÓM là thứ phải giữ. Bản dải ngang cũ
 * bỏ chúng đi vì hàng ngang không có chỗ, rồi mười ba mục thành một dãy phẳng
 * không nói được cái nào thuộc về cái nào.
 *
 * HUY HIỆU chỉ gắn ở mục có việc tồn đọng, và ẩn hẳn khi số bằng không: một
 * vòng tròn ghi "0" vẫn ăn chỗ và vẫn kéo mắt về phía nó, để rồi báo rằng
 * không có gì phải xem.
 */
export function LoiDiQuanTri({ dem }: { dem: Record<MaDem, number> }) {
  const duongDan = usePathname();

  return (
    <nav className="space-y-6" aria-label="Khu quản trị">
      {NHOM_QUAN_TRI.map((nhom) => (
        <div key={nhom}>
          <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-vo-qt-chu/40">
            {nhom}
          </p>
          <ul className="space-y-0.5">
            {LOI_QUAN_TRI.filter((l) => l.nhom === nhom).map((l) => {
              const Hinh = BANG[l.icon] ?? LayoutDashboard;
              const mo = dangOQuanTri(duongDan, l.duongDan);
              const so = l.demCho ? dem[l.demCho] : 0;

              return (
                <li key={l.duongDan}>
                  <Link href={l.duongDan} aria-current={mo ? 'page' : undefined}
                    className={gop(
                      'flex items-center gap-3 rounded-nut px-3 py-2 text-[13px] transition-colors',
                      mo ? 'bg-vo-qt-chu/15 font-bold text-vo-qt-chu' : 'font-medium text-vo-qt-chu/65 hover:bg-vo-qt-chu/10 hover:text-vo-qt-chu',
                    )}>
                    <Hinh size={16} className="shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{l.ten}</span>
                    {so > 0 && (
                      <span className="shrink-0 rounded-full bg-cam px-1.5 py-0.5 text-[10px] font-bold leading-none text-chu">
                        {so > 99 ? '99+' : so}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
