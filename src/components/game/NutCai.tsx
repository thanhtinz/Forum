import Link from 'next/link';

/**
 * Nút "Cài đặt" dạng viên thuốc, đứng ở cuối mỗi hàng game.
 *
 * Đây là chi tiết dễ nhận ra nhất của một cửa hàng ứng dụng: mỗi dòng trong
 * danh sách đều kết thúc bằng đúng một nút, luôn cùng một chỗ, luôn cùng một
 * dáng. Nhờ nó mà mắt quét dọc cả danh sách vẫn biết ngay bấm vào đâu.
 *
 * Nút dẫn thẳng tới phần tải trong trang game chứ không tự tải: máy nào tải
 * bản nào là chuyện phải chọn, mà chọn thì cần chỗ rộng hơn một viên thuốc.
 */
export function NutCai({ duongDan, chu = 'Cài đặt' }: { duongDan: string; chu?: string }) {
  return (
    <Link href={`/game/${duongDan}#tai`} className="nut-cai">
      {chu}
    </Link>
  );
}
