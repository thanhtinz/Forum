import { gop } from '@/lib/tien-ich';

/**
 * Dấu hiệu nhận biết của trang: ô vuông biểu tượng + chữ "SunnyStore".
 *
 * Chữ dựng bằng CHỮ THẬT chứ không dùng ảnh chữ trong bộ logo. Ba lẽ:
 *   • ảnh chữ mờ trên màn hình mật độ cao, mà thanh bên chỉ cao chừng 20px;
 *   • bộ đọc màn hình và máy tìm kiếm đọc được tên trang;
 *   • nền tối đổi được màu chữ, còn ảnh thì đứng nguyên một màu.
 *
 * Hai màu chia đúng như logo: "Sunny" cam, "Store" xanh.
 */
export function DauHieu({ co = 32, chu = true, className }: {
  co?: number;
  chu?: boolean;
  className?: string;
}) {
  return (
    <span className={gop('flex items-center gap-2', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/bieu-tuong-192.png" alt="" width={co} height={co}
        style={{ width: co, height: co }} className="shrink-0" />
      {chu && (
        <span className="text-[19px] font-extrabold tracking-tight">
          <span className="text-cam">Sunny</span>
          <span className="text-nhan">Store</span>
        </span>
      )}
    </span>
  );
}
