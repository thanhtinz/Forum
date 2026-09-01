import { mauHe, tenHe, theKhac } from '@/lib/rong-const';
import { cn } from '@/lib/utils';

/**
 * Cái nhãn hệ ngũ hành.
 *
 * Màu nền lấy thẳng từ bảng hệ chứ không đặt lớp Tailwind cho từng hệ: thêm
 * một hệ nữa thì chỉ thêm một dòng dữ liệu, không phải đi sửa năm chỗ CSS.
 */
export function TheHe({ he, className }: { he: number; className?: string }) {
  return (
    <span
      className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-bold leading-4 text-white', className)}
      style={{ backgroundColor: mauHe(he) }}>
      {tenHe(he)}
    </span>
  );
}

/**
 * Nhãn cho biết hệ bên mình ăn hay bị ăn khi gặp hệ bên kia.
 *
 * Đây mới là chỗ khắc chế thành ra CÓ ÍCH: bày hệ suông thì người chơi phải tự
 * thuộc vòng ngũ hành mới biết nên chọn đối thủ nào, mà chẳng ai thuộc.
 */
export function TheKhacChe({ cuaToi, cuaDoi }: { cuaToi: number; cuaDoi: number }) {
  const t = theKhac(cuaToi, cuaDoi);
  if (t === 'ngang') return null;
  return (
    <span className={cn(
      'inline-block rounded px-1.5 py-0.5 text-[10px] font-bold leading-4',
      t === 'khac'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    )}>
      {t === 'khac' ? 'bạn khắc' : 'khắc bạn'}
    </span>
  );
}
