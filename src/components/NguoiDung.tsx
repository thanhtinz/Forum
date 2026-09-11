import Link from 'next/link';
import { gop } from '@/lib/tien-ich';

/**
 * Ảnh đại diện và tên người dùng — dùng chung ở diễn đàn, đánh giá và trang
 * hồ sơ.
 *
 * Gom về một chỗ vì ba nơi ấy trước đây mỗi nơi tự vẽ một vòng tròn chữ cái
 * riêng, lệch nhau cỡ chữ lẫn màu nền. Mà vòng tròn ấy là thứ người đọc dùng
 * để nhận ra "lại anh này nữa" khi lướt một trang dài — nó phải giống hệt
 * nhau ở mọi chỗ thì mới nhận ra được.
 */

/** Lối tới hồ sơ công khai. Một chỗ duy nhất dựng đường dẫn ấy. */
export function duongDanHoSo(tenDangNhap: string): string {
  return `/thanh-vien/${encodeURIComponent(tenDangNhap)}`;
}

export function AnhDaiDien({ ten, anh, co = 32, chuCo }: {
  ten: string;
  anh?: string | null;
  /** Đường kính tính bằng pixel. */
  co?: number;
  /** Cỡ chữ cái thay thế; mặc định lấy 40% đường kính cho cân. */
  chuCo?: number;
}) {
  const canh = { width: co, height: co };

  if (anh) {
    return (
      // Ảnh do người dùng dán vào từ máy chủ bất kỳ, `next/image` không nhận
      // được miền lạ nên dùng thẻ thường.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={anh} alt="" style={canh} className="shrink-0 rounded-full object-cover" />
    );
  }

  return (
    <span aria-hidden style={{ ...canh, fontSize: chuCo ?? Math.round(co * 0.4) }}
      className="grid shrink-0 place-items-center rounded-full bg-nhan/12 font-bold text-nhan">
      {ten.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * Tên người viết, bấm được sang hồ sơ.
 *
 * `tenDangNhap` có thể thiếu — vài chỗ hiển thị tên người đã bị xoá, hoặc
 * lượt chọn dữ liệu chưa lấy cột ấy. Khi thiếu thì hiện chữ thường, không hiện
 * một liên kết dẫn tới trang 404.
 */
export function TenNguoi({ ten, tenDangNhap, lop }: {
  ten: string;
  tenDangNhap?: string | null;
  lop?: string;
}) {
  if (!tenDangNhap) return <span className={lop}>{ten}</span>;
  return (
    <Link href={duongDanHoSo(tenDangNhap)} className={gop('hover:underline', lop)}>
      {ten}
    </Link>
  );
}
