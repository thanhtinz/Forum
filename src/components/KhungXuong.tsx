import { gop } from '@/lib/tien-ich';

/** Một vệt xám. `w`/`h` truyền bằng lớp Tailwind để gọi chỗ nào cũng chỉnh được. */
export function Vet({ className }: { className?: string }) {
  return <span className={gop('xuong block', className)} aria-hidden />;
}

/**
 * Khung xương của một danh sách game.
 *
 * Dựng đúng hình dáng hàng thật — biểu tượng vuông 56, hai dòng chữ, nút cài
 * bên phải — chứ không phải mấy vạch xám chung chung. Khung xương sai hình thì
 * lúc nội dung thật hiện ra cả trang giật một cái, mà chính cú giật ấy là thứ
 * khung xương sinh ra để tránh.
 */
export function XuongDanhSach({ so = 6 }: { so?: number }) {
  return (
    <ul className="space-y-3.5" aria-hidden>
      {Array.from({ length: so }, (_, i) => (
        <li key={i} className="flex items-center gap-3">
          <Vet className="size-14 shrink-0 rounded-icon" />
          <span className="min-w-0 flex-1 space-y-1.5">
            <Vet className="h-3.5 w-2/5" />
            <Vet className="h-3 w-3/5" />
          </span>
          <Vet className="h-8 w-20 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}
